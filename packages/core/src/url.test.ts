import { expect, test } from "bun:test";
import { stripTrailingSlashes } from "./url";

test.each([
  ["", ""],
  ["http://localhost:7777", "http://localhost:7777"],
  ["http://localhost:7777/", "http://localhost:7777"],
  ["http://localhost:7777///", "http://localhost:7777"],
  ["////", ""],
  ["///path", "///path"],
])("stripTrailingSlashes(%j) returns %j", (value, expected) => {
  expect(stripTrailingSlashes(value)).toBe(expected);
});

test("large slash runs before a non-slash suffix remain unchanged", () => {
  const value = `${"/".repeat(50_000)}x`;
  expect(stripTrailingSlashes(value)).toBe(value);
});
