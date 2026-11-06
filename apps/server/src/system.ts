import { statSync } from "node:fs";
import { join } from "node:path";
import type { Core } from "@pano/core";
import { version } from "../../../package.json";

const buildDate = () =>
  (globalThis as typeof globalThis & { panoBuildDate?: string })
    .panoBuildDate ?? "";
export function createSystem(
  core: Core,
  dataDir: string,
  fetcher: typeof fetch = fetch,
) {
  let latestVersion: string | undefined;
  const settings = () =>
    Object.fromEntries(
      (
        core.db.query("SELECT key, value FROM settings").all() as {
          key: string;
          value: string;
        }[]
      ).map((row) => [row.key, row.value]),
    );
  async function check() {
    if (settings().updateCheck === "false") return;
    try {
      const response = await fetcher(
        "https://api.github.com/repos/Metonya/pano/releases/latest",
        { headers: { Accept: "application/vnd.github+json" } },
      );
      if (!response.ok) return;
      const release = (await response.json()) as { tag_name?: unknown };
      if (
        typeof release.tag_name === "string" &&
        /^v?\d+\.\d+\.\d+$/.test(release.tag_name)
      )
        latestVersion = release.tag_name;
    } catch {
      /* Offline and private repositories are expected. */
    }
  }
  function info() {
    let dbSize = 0;
    try {
      dbSize = statSync(join(dataDir, "pano.db")).size;
    } catch {
      /* In-memory database. */
    }
    const parts = (v: string) => v.replace(/^v/, "").split(".").map(Number);
    const current = parts(version),
      latest = parts(latestVersion ?? version);
    const updateAvailable =
      settings().updateCheck !== "false" &&
      latest.some(
        (n, i) =>
          n > current[i] &&
          latest.slice(0, i).every((x, j) => x === current[j]),
      );
    return {
      version,
      buildDate: buildDate(),
      dataDir,
      dbSize,
      latestVersion,
      updateAvailable,
    };
  }
  return { settings, check, info };
}
