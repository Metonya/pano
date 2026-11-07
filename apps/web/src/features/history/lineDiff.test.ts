import { expect, test } from "bun:test";
import { lineDiff } from "./lineDiff";

test("line diff preserves shared lines and marks replacements", () => {
  expect(lineDiff("title\nold\nlast", "title\nnew\nlast")).toEqual([
    { kind: "same", text: "title" },
    { kind: "removed", text: "old" },
    { kind: "added", text: "new" },
    { kind: "same", text: "last" },
  ]);
});
test("empty, repeated, CRLF and trailing blank lines reconstruct both versions", () => {
  for (const [before, after] of [
    ["", ""],
    ["", "new"],
    ["old", ""],
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
