import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "./index";
import * as updater from "./update";
import { type UpdateOptions, update } from "./update";

const original = "previous executable";
const replacement = "new executable";
const releaseUrl = "https://api.github.com/repos/Metonya/pano/releases/latest";
let directory: string;
let options: UpdateOptions & { execPath: string; dockerMarkerPath: string };
let requests: string[];

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "pano-update-test-"));
  options = {
    execPath: join(directory, "pano.exe"),
    dockerMarkerPath: join(directory, ".dockerenv"),
    platform: "win32",
    arch: "x64",
  };
  requests = [];
  await writeFile(options.execPath, original);
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

function fetchRelease({
  checksum = createHash("sha256").update(replacement).digest("hex"),
  releaseStatus = 200,
  downloadStatus = 200,
  missingAssets = false,
} = {}): (input: string) => Promise<Response> {
  const name = `pano-${options.platform}-${options.arch}${options.platform === "win32" ? ".exe" : ""}`;
  return async (url) => {
    requests.push(url);
    if (url === releaseUrl)
      return Response.json(
        {
          assets: missingAssets
            ? []
            : [
                { name, browser_download_url: "https://example.test/binary" },
                {
                  name: "SHA256SUMS.txt",
                  browser_download_url: "https://example.test/checksums",
                },
              ],
        },
        { status: releaseStatus },
      );
    if (url === "https://example.test/binary")
      return new Response(replacement, { status: downloadStatus });
    if (url === "https://example.test/checksums")
      return new Response(
        `unrelated  another-file\r\n${checksum}  *${name}\r\n`,
      );
    throw new Error(`Unexpected request: ${url}`);
  };
}

async function expectUnchanged() {
  expect(await readFile(options.execPath, "utf8")).toBe(original);
  for (const suffix of [".new", ".bak", ".old"])
    expect(existsSync(`${options.execPath}${suffix}`)).toBe(false);
}

test("checksum mismatch leaves the binary untouched and CLI returns exit code 1", async () => {
  // Keep CLI integration local to this test without changing process globals.
  const implementation = update;
  const injected = spyOn(updater, "update").mockImplementation((fetcher) =>
    implementation(fetcher, options),
  );
  let out = "";
  let err = "";
  try {
    const code = await runCli(["update"], {
      fetch: fetchRelease({ checksum: "0".repeat(64) }),
      stdout: (text) => {
        out += text;
      },
      stderr: (text) => {
        err += text;
      },
    });
    expect(code).toBe(1);
    expect(out).toBe("");
    expect(err).toContain("SHA-256 checksum mismatch; binary was not changed");
    await expectUnchanged();
  } finally {
    injected.mockRestore();
  }
});

test.each(["linux", "darwin", "win32"] as const)(
  "%s update installs the verified binary and preserves a backup",
  async (platform) => {
    options.platform = platform;
    const moves: [string, string][] = [];
    options.rename = async (from, to) => {
      moves.push([String(from), String(to)]);
      if (platform === "win32" && String(from).endsWith(".new"))
        expect(existsSync(options.execPath)).toBe(false);
      await rename(from, to);
    };
    expect(await update(fetchRelease(), options)).toContain("Update installed");
    expect(await readFile(options.execPath, "utf8")).toBe(replacement);
    expect(await readFile(`${options.execPath}.bak`, "utf8")).toBe(original);
    expect(existsSync(`${options.execPath}.new`)).toBe(false);
    if (platform === "win32") {
      expect(moves).toEqual([
        [options.execPath, `${options.execPath}.old`],
        [`${options.execPath}.new`, options.execPath],
      ]);
      expect(await readFile(`${options.execPath}.old`, "utf8")).toBe(original);
    } else {
      expect(moves).toEqual([[`${options.execPath}.new`, options.execPath]]);
    }
  },
);

test.each(["linux", "win32"] as const)(
  "%s replacement failure restores the previous executable",
  async (platform) => {
    options.platform = platform;
    options.rename = async (from, to) => {
      if (String(from).endsWith(".new")) {
        // Simulate a failed replacement after the destination was removed.
        await rm(options.execPath, { force: true });
        throw new Error("replacement denied");
      }
      await rename(from, to);
    };
    await expect(update(fetchRelease(), options)).rejects.toThrow(
      "previous binary was preserved: replacement denied",
    );
    expect(await readFile(options.execPath, "utf8")).toBe(original);
    expect(await readFile(`${options.execPath}.bak`, "utf8")).toBe(original);
    expect(existsSync(`${options.execPath}.new`)).toBe(false);
    expect(existsSync(`${options.execPath}.old`)).toBe(false);
  },
);

test("failure to move a running Windows executable preserves it", async () => {
  options.rename = async () => {
    throw new Error("executable is locked");
  };
  await expect(update(fetchRelease(), options)).rejects.toThrow(
    "executable is locked",
  );
  expect(await readFile(options.execPath, "utf8")).toBe(original);
  expect(existsSync(`${options.execPath}.new`)).toBe(false);
});

test("rollback failure reports recoverable backups and both errors", async () => {
  options.rename = async (from, to) => {
    if (String(from).endsWith(".new")) throw new Error("install denied");
    if (String(from).endsWith(".old")) throw new Error("restore denied");
    await rename(from, to);
  };
  await expect(update(fetchRelease(), options)).rejects.toThrow(
    `Update failed: install denied. Could not restore the previous binary: restore denied. Backup: ${options.execPath}.bak; previous executable: ${options.execPath}.old.`,
  );
  expect(await readFile(`${options.execPath}.bak`, "utf8")).toBe(original);
  expect(await readFile(`${options.execPath}.old`, "utf8")).toBe(original);
  expect(existsSync(`${options.execPath}.new`)).toBe(false);
});

test.each(["bun", "bun.exe", "BUN.EXE"])(
  "%s runtime explains that a compiled binary is required without fetching",
  async (runtime) => {
    expect(
      await update(fetchRelease(), {
        ...options,
        execPath: join(directory, runtime),
      }),
    ).toContain("compiled Pano binary");
    expect(requests).toEqual([]);
    await expectUnchanged();
  },
);

test("Docker explains pull and restart without fetching", async () => {
  await writeFile(options.dockerMarkerPath, "");
  expect(await update(fetchRelease(), options)).toBe(
    "Docker: docker pull ghcr.io/metonya/pano:latest; restart the container.",
  );
  expect(requests).toEqual([]);
  await expectUnchanged();
});

test("404 explains private repositories and missing published releases", async () => {
  await expect(
    update(fetchRelease({ releaseStatus: 404 }), options),
  ).rejects.toThrow("repository may be private or have no published releases");
  expect(requests).toEqual([releaseUrl]);
  await expectUnchanged();
});

test.each([
  { releaseStatus: 503 },
  { downloadStatus: 403 },
  { missingAssets: true },
  { checksum: "" },
])("release or download failure preserves the binary: %j", async (scenario) => {
  await expect(update(fetchRelease(scenario), options)).rejects.toThrow();
  await expectUnchanged();
});
