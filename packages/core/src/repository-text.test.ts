import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

test("tracked text files contain no U+2014", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const paths = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    {
      cwd: root,
      encoding: "utf8",
    },
  )
    .split("\0")
    .filter(Boolean);
  const binaryExtensions = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".avif",
    ".ico",
    ".pdf",
    ".zip",
    ".gz",
    ".7z",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".woff",
    ".woff2",
    ".ttf",
    ".otf",
    ".mp3",
    ".mp4",
    ".wasm",
    ".sqlite",
    ".db",
  ]);
  const violations: string[] = [];
  const decoder = new TextDecoder("utf-8", { fatal: true });
  for (const path of paths) {
    if (binaryExtensions.has(extname(path).toLowerCase())) continue;
    if (!existsSync(resolve(root, path))) continue;
    const bytes = readFileSync(resolve(root, path));
    if (bytes.includes(0)) continue;
    let text: string;
    try {
      text = decoder.decode(bytes);
    } catch {
      // Non-UTF-8 binary formats may have an unknown extension and no NUL bytes.
      continue;
    }
    if (text.includes("\u2014")) violations.push(path);
  }
  expect(violations, `U+2014 found in: ${violations.join(", ")}`).toEqual([]);
});
