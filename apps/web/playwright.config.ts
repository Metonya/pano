import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const dataDir = mkdtempSync(join(tmpdir(), "pano-e2e-"));
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:15173", ...devices["Desktop Chrome"] },
  webServer: [
    {
      command: "bun ../server/src/main.ts serve",
      cwd: import.meta.dir,
      env: { PANO_PORT: "17777", PANO_DATA_DIR: dataDir },
      url: "http://127.0.0.1:17777/api/v1/health",
      reuseExistingServer: false,
    },
    {
      command: "bun run dev --host 127.0.0.1 --port 15173 --strictPort",
      cwd: import.meta.dir,
      env: { PANO_PORT: "17777" },
      url: "http://127.0.0.1:15173",
      reuseExistingServer: false,
    },
  ],
});
