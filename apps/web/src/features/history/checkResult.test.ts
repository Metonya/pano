import { expect, test } from "bun:test";
import { checkResult } from "./checkResult";

test("check badges distinguish explicit results, text results and unknown records", () => {
  expect(checkResult("Unit 18/18 geçti", {})).toBe("passed");
  expect(checkResult("42 passed, 0 failed", {})).toBe("passed");
  expect(checkResult("Build failed", {})).toBe("failed");
  expect(checkResult("Test kaldı", {})).toBe("failed");
  expect(checkResult("başarısız", {})).toBe("failed");
  expect(checkResult("başarılı", {})).toBe("passed");
  expect(checkResult("✓ başarılı", { result: "failed" })).toBe("failed");
  expect(checkResult("Unit tests", { passed: true })).toBe("passed");
  expect(checkResult("Denetim: 6.5/10", {})).toBe("unknown");
});
