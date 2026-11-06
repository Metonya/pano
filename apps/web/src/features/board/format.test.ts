import { expect, test } from "bun:test";
import { activityText, relativeTime } from "./format";

test("relative time uses Turkish minute, hour and day units", () => {
  const now = Date.parse("2026-11-06T12:00:00Z");
  expect(relativeTime("2026-11-06T11:59:59Z", now)).toBe("az önce");
  expect(relativeTime("2026-11-06T11:58:00Z", now)).toBe("2 dk önce");
  expect(relativeTime("2026-11-06T10:00:00Z", now)).toBe("2 saat önce");
  expect(relativeTime("2026-11-04T12:00:00Z", now)).toBe("2 gün önce");
});
test("activity describes status changes", () => {
  expect(
    activityText({
      id: "1",
      actor: "mert",
      kind: "moved",
      message: "Item updated",
      before_json: '{"status":"backlog"}',
      after_json: '{"status":"test"}',
      created_at: "",
    }),
  ).toBe("Mert taşıdı");
});
