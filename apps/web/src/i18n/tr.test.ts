import { expect, test } from "bun:test";
import tr from "./tr.json";

// Guards against tools that write Turkish text with a lossy encoding,
// which silently turns "Arşiv" into "Ar?iv".
test("Turkish strings keep their characters", () => {
  for (const [key, value] of Object.entries(tr)) {
    expect(`${key}: ${value}`).not.toMatch(/\p{L}\?\p{L}|\?{2}|�/u);
  }
  expect(tr.archive).toBe("Arşiv");
});
