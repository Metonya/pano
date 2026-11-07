import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const out = "dist/site";
await rm(out, { recursive: true, force: true });
await cp("site", out, { recursive: true });
await mkdir(join(out, "images"), { recursive: true });
await mkdir(join(out, "media"), { recursive: true });
await cp("apps/web/public/favicon.svg", join(out, "images/favicon.svg"));
for (const name of ["board.png", "board-dark.png", "projects.png", "test.png", "history.png"]) {
  await cp(join("docs/images", name), join(out, "images", name));
}
await cp("docs/media/pano-intro.mp4", join(out, "media/pano-intro.mp4"));
console.log(`Built ${out}`);
