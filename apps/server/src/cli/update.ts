import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { chmod, copyFile, rename, unlink, writeFile } from "node:fs/promises";

export async function update(
  fetcher: (input: string, init?: RequestInit) => Promise<Response> = fetch,
) {
  if (existsSync("/.dockerenv"))
    return "Docker: docker pull ghcr.io/metonya/pano:latest; restart the container.";
  if (/^bun(?:\.exe)?$/i.test(process.execPath.split(/[\\/]/).pop() ?? ""))
    return "Run pano update from a compiled Pano binary.";
  const name = `pano-${process.platform}-${process.arch}${process.platform === "win32" ? ".exe" : ""}`;
  const response = await fetcher(
    "https://api.github.com/repos/Metonya/pano/releases/latest",
  );
  if (!response.ok) throw new Error("Could not retrieve the latest release.");
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
  const path = process.execPath,
    temp = `${path}.new`,
    backup = `${path}.bak`;
  await writeFile(temp, bytes, { mode: 0o755 });
  try {
    await chmod(temp, 0o755);
    await copyFile(path, backup);
    await rename(temp, path);
  } catch (error) {
    await unlink(temp).catch(() => {});
    throw error;
  }
  return "Update installed. Run pano --version to check it.";
}
