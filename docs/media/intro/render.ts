// Renders index.html frame by frame into ../pano-intro.mp4 and ../pano-intro.gif.
// Usage: node --experimental-strip-types docs/media/intro/render.ts
// Options: --stills 1.5,20 --out <dir> writes those moments as PNG files and stops.
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const here = import.meta.dirname;
const FPS = 30;

/** Finds apps/web walking upward, so a git worktree can use the main checkout's install. */
function loadPlaywright() {
  let dir = here;
  while (true) {
    const web = join(dir, "apps/web");
    if (existsSync(join(web, "node_modules/@playwright/test"))) {
      return createRequire(join(web, "package.json"))("@playwright/test");
    }
    const parent = dirname(dir);
    if (parent === dir) throw new Error("Run bun install: @playwright/test not found.");
    dir = parent;
  }
}

const args = process.argv.slice(2);
const option = (name: string) => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  colorScheme: "light",
});
page.on("request", (request: { url(): string }) => {
  if (!request.url().startsWith("file:")) throw new Error(`Network request: ${request.url()}`);
});
await page.goto(pathToFileURL(join(here, "index.html")).href);
await page.evaluate(() => document.fonts.ready);
const duration: number = await page.evaluate("window.DURATION");
const draw = (seconds: number) => page.evaluate((s: number) => (window as any).seek(s), seconds);

const stills = option("--stills");
if (stills) {
  const out = resolve(option("--out") ?? ".");
  for (const moment of stills.split(",").map(Number)) {
    await draw(moment);
    await page.screenshot({ path: join(out, `t${moment.toFixed(2).padStart(6, "0")}.png`) });
  }
  await browser.close();
  process.exit(0);
}

const mp4 = resolve(here, "../pano-intro.mp4");
const gif = resolve(here, "../pano-intro.gif");
const encoder = spawn(
  "ffmpeg",
  ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
    "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p",
    "-vf", "scale=out_color_matrix=bt709:out_range=tv",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
    "-movflags", "+faststart", mp4],
  { stdio: ["pipe", "inherit", "inherit"] },
);
const finished = new Promise<number>((done) => encoder.on("close", done));
const total = Math.round(duration * FPS);
for (let frame = 0; frame < total; frame++) {
  await draw(frame / FPS);
  const png: Buffer = await page.screenshot({ type: "png" });
  if (!encoder.stdin.write(png)) await new Promise((go) => encoder.stdin.once("drain", go));
  if (frame % 150 === 0) console.log(`frame ${frame}/${total}`);
}
encoder.stdin.end();
if ((await finished) !== 0) throw new Error("ffmpeg failed on the video.");
await browser.close();

// Preview for the README: sped up, smaller, its own palette. Needs no temporary files.
const preview = spawnSync(
  "ffmpeg",
  ["-y", "-loglevel", "error", "-i", mp4, "-filter_complex",
    "setpts=PTS/1.85,fps=12,scale=960:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle",
    "-loop", "0", gif],
  { stdio: "inherit" },
);
if (preview.status !== 0) throw new Error("ffmpeg failed on the GIF.");
console.log(`Done: ${total} frames, ${duration}s`);
