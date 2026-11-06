import { beforeEach, expect, test } from "bun:test";
import { setLanguage } from "@/lib/i18n";
import { chartDateLabel, openedSummary } from "./summaryDates";

beforeEach(async () => {
  await setLanguage("tr", false);
});
const timeZone = "Europe/Istanbul";

test("one-point projects use the user's calendar day across UTC midnight", () => {
  // Both instants are Nov 6 in UTC, but opening was yesterday in Istanbul.
  const now = new Date("2026-11-06T22:30:00Z");
  expect(openedSummary("2026-11-06T10:00:00Z", 25, now, timeZone)).toBe(
    "6 Kas'ta açıldı, 25 iş tamamlandı",
  );
  expect(openedSummary("2026-11-06T21:30:00Z", 25, now, timeZone)).toBe(
    "Bugün açıldı, 25 iş tamamlandı",
  );
  expect(openedSummary("2026-11-06T10:00:00Z", 0, now, timeZone)).toBe(
    "6 Kas'ta açıldı, henüz tamamlanan iş yok",
  );
  expect(openedSummary("2026-11-06T21:30:00Z", 0, now, timeZone)).toBe(
    "Bugün açıldı, henüz tamamlanan iş yok",
  );
  expect(chartDateLabel("2026-11-07", now, timeZone)).toBe("Bugün");
  expect(chartDateLabel("2026-11-06", now, timeZone)).toBe("6 Kas");
});

test("local day works west of UTC too", () => {
  const timeZone = "America/Los_Angeles";
  const now = new Date("2026-11-07T01:00:00Z");
  expect(openedSummary("2026-11-06T23:00:00Z", 2, now, timeZone)).toBe(
    "Bugün açıldı, 2 iş tamamlandı",
  );
  expect(chartDateLabel("2026-11-06", now, timeZone)).toBe("Bugün");
  expect(chartDateLabel("2026-11-07", now, timeZone)).toBe("7 Kas");
});
