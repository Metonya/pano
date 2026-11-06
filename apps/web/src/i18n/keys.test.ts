import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { languages } from "../lib/i18n";
import tr from "./tr.json";

const placeholders = (value: string) =>
  [...value.matchAll(/\{[^{}]+\}/g)].map((match) => match[0]).sort();

for (const code of languages) {
  test(`${code}: translations have identical keys and placeholders`, () => {
    const dictionary = JSON.parse(
      readFileSync(`${import.meta.dir}/${code}.json`, "utf8"),
    ) as Record<string, string>;
    expect(Object.keys(dictionary).sort()).toEqual(Object.keys(tr).sort());
    for (const [key, value] of Object.entries(tr)) {
      expect(typeof dictionary[key]).toBe("string");
      expect(dictionary[key]?.trim().length).toBeGreaterThan(0);
      expect(placeholders(dictionary[key] ?? "")).toEqual(placeholders(value));
    }
  });
}
