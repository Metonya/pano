import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { languages } from "../lib/i18n";
import tr from "./tr.json";

// Guards against tools that write Turkish text with a lossy encoding,
// which silently turns "Arşiv" into "Ar?iv".
test("all translations keep their characters", () => {
  for (const code of languages) {
    const dictionary = JSON.parse(
      readFileSync(`${import.meta.dir}/${code}.json`, "utf8"),
    );
    for (const [key, value] of Object.entries(dictionary)) {
      expect(`${code}.${key}: ${value}`).not.toMatch(
        /\p{L}\?\p{L}|\?{2}|\uFFFD/u,
      );
      expect(value).not.toContain("\u2014");
    }
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
