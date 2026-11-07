import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dataDir = mkdtempSync(join(tmpdir(), "pano-e2e-"));
try {
  const test = Bun.spawn(
    [
      "node",
      "node_modules/@playwright/test/cli.js",
      "test",
      ...process.argv.slice(2),
    ],
    {
      cwd: import.meta.dir,
      env: { ...process.env, PANO_E2E_DATA_DIR: dataDir },
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    },
  );
  process.exitCode = await test.exited;
} finally {
  rmSync(dataDir, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200,
  });
}
