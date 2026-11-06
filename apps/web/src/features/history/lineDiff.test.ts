import { expect, test } from "bun:test";
import { lineDiff } from "./lineDiff";

test("line diff preserves shared lines and marks replacements", () => {
  expect(lineDiff("başlık\neski\nson", "başlık\nyeni\nson")).toEqual([
    { kind: "same", text: "başlık" },
    { kind: "removed", text: "eski" },
    { kind: "added", text: "yeni" },
    { kind: "same", text: "son" },
  ]);
});
test("empty, repeated, CRLF and trailing blank lines reconstruct both versions", () => {
  for (const [before, after] of [
    ["", ""],
    ["", "yeni"],
    ["eski", ""],
    ["a\na\nb\n", "a\nb\na\n"],
    ["a\r\nb", "a\nb"],
    ["a\n", "a"],
  ]) {
    const diff = lineDiff(before, after);
    expect(
      diff
        .filter((line) => line.kind !== "added")
        .map((line) => line.text)
        .join("\n"),
    ).toBe(before.replace(/\r\n/g, "\n"));
    expect(
      diff
        .filter((line) => line.kind !== "removed")
        .map((line) => line.text)
        .join("\n"),
    ).toBe(after);
  }
});
