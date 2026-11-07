import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

test("CLI does not import the entry module and deadlock server startup", () => {
  const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
  expect(source).not.toMatch(
    /(?:from\s*|import\s*\(\s*|require\s*\(\s*|import\s*)["']\.\.\/main(?:\.ts)?["']/,
  );
});
