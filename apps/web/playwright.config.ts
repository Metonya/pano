import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const dataDir = mkdtempSync(join(tmpdir(), "pano-e2e-"));
export default defineConfig({
  testDir: "./e2e",
  use: {
    locale: "tr-TR",
    baseURL: "http://127.0.0.1:15173",
    ...devices["Desktop Chrome"],
  },
  // Renaming the person changes who counts as human for every test, so that
  // spec waits until the parallel tests sharing this database have finished.
  projects: [
    { name: "paralel", testIgnore: /user-name\.spec\.ts/ },
    {
      name: "kullanici-adi",
      testMatch: /user-name\.spec\.ts/,
      dependencies: ["paralel"],
    },
  ],
  webServer: [
    {
      command: "bun ../server/src/main.ts serve",
      cwd: import.meta.dir,
      env: { PANO_PORT: "17777", PANO_DATA_DIR: dataDir, PANO_USER: "mert" },
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
