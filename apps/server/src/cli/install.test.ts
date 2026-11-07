import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const windows = process.platform === "win32";
const shell = windows ? Bun.which("powershell.exe") : Bun.which("sh");
const arch =
  process.arch === "x64" ? "x64" : process.arch === "arm64" ? "arm64" : "";
const platform =
  process.platform === "darwin"
    ? "darwin"
    : process.platform === "linux"
      ? "linux"
      : "";
const supported = windows ? process.arch === "x64" : Boolean(platform && arch);
const asset = windows ? "pano-windows-x64.exe" : `pano-${platform}-${arch}`;
const repo = resolve(import.meta.dir, "../../../..");

describe.skipIf(!shell || !supported)("one-line installer", () => {
  let root: string;
  let binary: Buffer;
  let server: ReturnType<typeof Bun.serve>;
  let mode: "good" | "bad" | "missing" = "good";

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "pano-install-test-"));
    binary = windows
      ? await readFile(
          join(process.env.SystemRoot as string, "System32", "cmd.exe"),
        )
      : Buffer.from("#!/bin/sh\necho installer-test-ok\n");
    const hash = createHash("sha256").update(binary).digest("hex");
    server = Bun.serve({
      port: 0,
      fetch(request) {
        if (mode === "missing") return new Response("missing", { status: 404 });
        if (new URL(request.url).pathname === `/${asset}`)
          return new Response(binary);
        if (new URL(request.url).pathname === "/SHA256SUMS.txt") {
          return new Response(
            `${mode === "bad" ? "0".repeat(64) : hash}  ${asset}\n`,
          );
        }
        return new Response("missing", { status: 404 });
      },
    });
  });
  afterAll(async () => {
    server?.stop(true);
    if (root) await rm(root, { recursive: true, force: true });
  });

  async function install(name: string) {
    const dir = join(root, name);
    // Restore the user PATH even if the Windows installer fails.
    const script =
      "$old = [Environment]::GetEnvironmentVariable('Path', 'User'); try { Invoke-Expression ([IO.File]::ReadAllText($env:PANO_TEST_SCRIPT)) } finally { if ([Environment]::GetEnvironmentVariable('Path', 'User') -ne $old) { [Environment]::SetEnvironmentVariable('Path', $old, 'User') } }";
    const args = windows
      ? [shell as string, "-NoProfile", "-NonInteractive", "-Command", script]
      : [shell as string, join(repo, "install.sh")];
    const child = Bun.spawn(args, {
      env: {
        ...process.env,
        PANO_DOWNLOAD_BASE: `http://127.0.0.1:${server.port}`,
        PANO_INSTALL_DIR: dir,
        PANO_TEST_SCRIPT: join(repo, "install.ps1"),
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    return {
      code,
      output: stdout + stderr,
      path: join(dir, windows ? "pano.exe" : "pano"),
    };
  }

  test("installs a verified runnable file", async () => {
    mode = "good";
    const result = await install("good");
    expect(result.code, result.output).toBe(0);
    const child = Bun.spawn(
      [result.path, ...(windows ? ["/c", "echo installer-test-ok"] : [])],
      { stdout: "pipe", stderr: "pipe" },
    );
    expect(await child.exited).toBe(0);
    expect(await new Response(child.stdout).text()).toContain(
      "installer-test-ok",
    );
  }, 30000);
  test("rejects a bad checksum without installing", async () => {
    mode = "bad";
    const result = await install("bad");
    expect(result.code).not.toBe(0);
    expect(result.output).toContain("checksum mismatch");
    expect(await Bun.file(result.path).exists()).toBe(false);
  }, 30000);
  test("explains a missing release", async () => {
    mode = "missing";
    const result = await install("missing");
    expect(result.code).not.toBe(0);
    expect(result.output).toContain("404");
    expect(result.output).toContain("No release may exist yet");
    expect(await Bun.file(result.path).exists()).toBe(false);
  }, 30000);
});
