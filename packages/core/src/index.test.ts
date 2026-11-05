import { expect, test } from "bun:test";

test("core module loads", async () => {
  expect(await import("./index")).toBeDefined();
});
