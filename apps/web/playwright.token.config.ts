import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const dataDir = mkdtempSync(join(tmpdir(), "pano-token-e2e-"));
export default defineConfig({
  testDir: "./token-e2e",
  use: {
    locale: "tr-TR",
    baseURL: "http://127.0.0.1:15174",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: "bun ../server/src/main.ts serve",
      cwd: import.meta.dir,
      env: {
        PANO_PORT: "17778",
        PANO_TOKEN: "test-token",
        PANO_DATA_DIR: dataDir,
      },
      url: "http://127.0.0.1:17778/api/v1/health",
      reuseExistingServer: false,
    },
    {
      command: "bun run dev --host 127.0.0.1 --port 15174 --strictPort",
      cwd: import.meta.dir,
      env: { PANO_PORT: "17778" },
      url: "http://127.0.0.1:15174",
      reuseExistingServer: false,
    },
  ],
});
