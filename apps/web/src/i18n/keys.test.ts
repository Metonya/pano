import { expect, test } from "bun:test";
import en from "./en.json";
import tr from "./tr.json";

test("translations have identical keys", () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(tr).sort());
});
