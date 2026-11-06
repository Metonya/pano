import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import tr from "./tr.json";

// Guards against tools that write Turkish text with a lossy encoding,
// which silently turns "Arşiv" into "Ar?iv".
test("Turkish strings keep their characters", () => {
  for (const [key, value] of Object.entries(tr)) {
    expect(`${key}: ${value}`).not.toMatch(/\p{L}\?\p{L}|\?{2}|�/u);
  }
  expect(tr.archive).toBe("Arşiv");
});

test("source files keep their Turkish characters", () => {
  const root = `${import.meta.dir}/..`;
  const damaged = />[^<>{}]*\p{L}\?\p{L}[^<>{}]*</u;
  for (const file of new Bun.Glob("**/*.tsx").scanSync(root)) {
    const lines = readFileSync(`${root}/${file}`, "utf8").split(/\r?\n/);
    expect(lines.filter((line) => damaged.test(line))).toEqual([]);
  }
});
