import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { chmod, copyFile, rename, unlink, writeFile } from "node:fs/promises";

export interface UpdateOptions {
  execPath?: string;
  dockerMarkerPath?: string;
  platform?: NodeJS.Platform;
  arch?: string;
  rename?: typeof rename;
}

async function installUpdate(
  path: string,
  platform: NodeJS.Platform,
  move: typeof rename,
  bytes: Buffer,
) {
  const temp = `${path}.new`,
    backup = `${path}.bak`;
  const old = `${path}.old`;
  let backedUp = false;
  let moved = false;
  try {
    await writeFile(temp, bytes, { mode: 0o755 });
    await chmod(temp, 0o755);
    await copyFile(path, backup);
    backedUp = true;
    // Windows allows renaming a running executable, but not overwriting it.
    if (platform === "win32") {
      await move(path, old);
      moved = true;
    }
    await move(temp, path);
  } catch (error) {
    await unlink(temp).catch(() => {});
    try {
      if (moved) await move(old, path);
      else if (backedUp && platform !== "win32") await copyFile(backup, path);
    } catch (restoreError) {
      throw new Error(
        `Update failed: ${error instanceof Error ? error.message : String(error)}. Could not restore the previous binary: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}. Backup: ${backup}${moved ? `; previous executable: ${old}` : ""}.`,
        { cause: error },
      );
    }
    throw new Error(
      `Update failed; the previous binary was preserved: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

export async function update(
  fetcher: (input: string, init?: RequestInit) => Promise<Response> = fetch,
  options: UpdateOptions = {},
) {
  const path = options.execPath ?? process.execPath;
  const platform = options.platform ?? process.platform;
  const move = options.rename ?? rename;
  if (existsSync(options.dockerMarkerPath ?? "/.dockerenv"))
    return "Docker: docker pull ghcr.io/metonya/pano:latest; restart the container.";
  if (/^bun(?:\.exe)?$/i.test(path.split(/[\\/]/).pop() ?? ""))
    return "Run pano update from a compiled Pano binary.";
  const name = `pano-${platform}-${options.arch ?? process.arch}${platform === "win32" ? ".exe" : ""}`;
  const response = await fetcher(
    "https://api.github.com/repos/Metonya/pano/releases/latest",
  );
  if (response.status === 404)
    throw new Error(
      "Latest release not found (404). The repository may be private or have no published releases; download a release with authorized GitHub access.",
    );
  if (!response.ok)
    throw new Error(
      `Could not retrieve the latest release (HTTP ${response.status}).`,
    );
  const release = (await response.json()) as {
    assets: { name: string; browser_download_url: string }[];
  };
  const binary = release.assets.find((a) => a.name === name);
  const sums = release.assets.find((a) => a.name === "SHA256SUMS.txt");
  if (!binary || !sums) throw new Error(`Release assets missing for ${name}.`);
  const [binaryResponse, sumsResponse] = await Promise.all([
    fetcher(binary.browser_download_url),
    fetcher(sums.browser_download_url),
  ]);
  if (!binaryResponse.ok || !sumsResponse.ok)
    throw new Error("Could not download release assets.");
  const bytes = Buffer.from(await binaryResponse.arrayBuffer());
  const checksum = (await sumsResponse.text())
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/))
    .find((parts) => parts[1]?.replace(/^\*/, "") === name)?.[0];
  if (
    !checksum ||
    createHash("sha256").update(bytes).digest("hex") !== checksum.toLowerCase()
  )
    throw new Error("SHA-256 checksum mismatch; binary was not changed.");
  await installUpdate(path, platform, move, bytes);
  return "Update installed. Run pano --version to check it.";
}
