import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const web = join(root, "apps/web/dist");
const dist = join(root, "dist");
const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function run(args: string[]) {
  const process = Bun.spawn(args, { cwd: root, stdout: "inherit", stderr: "inherit" });
  if ((await process.exited) !== 0) throw new Error(`Command failed: ${args.join(" ")}`);
}

await run(["bun", "run", "--cwd", "apps/web", "build"]);
const assets: Record<string, { body: string; type: string }> = {};
async function collect(dir: string): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) await collect(file);
    else if (entry.isFile()) {
      const path = `/${relative(web, file).replaceAll("\\", "/")}`;
      assets[path] = {
        body: (await readFile(file)).toString("base64"),
        type: types[extname(file).toLowerCase()] ?? "application/octet-stream",
      };
    }
  }
}
await collect(web);
if (!assets["/index.html"]) throw new Error("Web build did not produce index.html");
await mkdir(dist, { recursive: true });
const entry = join(dist, "bin-entry.ts");
await writeFile(entry, `import { runCli } from "../apps/server/src/cli";\n(globalThis as any).panoAssets = ${JSON.stringify(assets)};\nprocess.exitCode = await runCli(process.argv.slice(2));\n`);
const target = process.env.PANO_BUILD_TARGET;
const output = join(dist, target?.startsWith("bun-windows") || (!target && process.platform === "win32") ? "pano.exe" : "pano");
try {
  await run(["bun", "build", "--compile", ...(target ? [`--target=${target}`] : []), `--outfile=${output}`, entry]);
} finally {
  await unlink(entry);
}
