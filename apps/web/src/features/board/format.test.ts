import { beforeEach, expect, test } from "bun:test";
import { setLanguage } from "@/lib/i18n";
import { activityReason, activityText, relativeTime } from "./format";

beforeEach(async () => {
  await setLanguage("tr", false);
});

test("relative times follow the selected language", async () => {
  const now = Date.parse("2026-11-07T12:00:00Z");
  const twoMinutesAgo = "2026-11-07T11:58:00Z";
  expect(relativeTime(twoMinutesAgo, now)).toBe("2 dk önce");
  expect(relativeTime(new Date(now).toISOString(), now)).toBe("az önce");
  for (const code of [
    "de",
    "ja",
    "pt",
    "zh",
    "hi",
    "es",
    "fr",
    "nl",
    "ko",
    "sv",
    "pl",
    "az",
    "en",
  ] as const) {
    await setLanguage(code, false);
    expect(relativeTime(twoMinutesAgo, now)).toBe(
      new Intl.RelativeTimeFormat(code, { numeric: "auto" }).format(
        -2,
        "minute",
      ),
    );
  }
});

const entry = (
  kind: string,
  before: unknown,
  after: unknown,
  message: string = kind,
) => ({
  id: "1",
  actor: "mert",
  kind,
  message,
  before_json: before === null ? null : JSON.stringify(before),
  after_json: after === null ? null : JSON.stringify(after),
  created_at: "",
});

test("scenario records say what happened to which scenario", () => {
  const steps = { id: "s", steps_md: "Sepeti aç" };
  expect(
    activityText(
      entry("scenario_removed", { ...steps, expected_md: "x" }, { id: "s" }),
    ),
  ).toBe("Mert senaryoyu sildi: Sepeti aç");
  expect(activityText(entry("scenario_added", null, steps))).toBe(
    "Mert senaryo ekledi: Sepeti aç",
  );
  expect(
    activityText(
      entry(
        "scenario_edited",
        { ...steps, expected_md: "Eski" },
        { ...steps, expected_md: "Yeni" },
      ),
    ),
  ).toBe("Mert senaryoyu düzenledi: Sepeti aç");
  for (const [result, text] of [
    ["failed", "Mert senaryoyu Kaldı işaretledi: Sepeti aç"],
    ["passed", "Mert senaryoyu Geçti işaretledi: Sepeti aç"],
    ["pending", "Mert senaryonun işaretini kaldırdı: Sepeti aç"],
  ])
    expect(
      activityText(
        entry(
          "scenario_edited",
          { ...steps, result: "other" },
          { ...steps, result },
        ),
      ),
    ).toBe(text);
});

test("criterion records carry their text", () => {
  expect(
    activityText(entry("criterion_added", null, { id: "c", text: "Hızlı" })),
  ).toBe("Mert kriter ekledi: Hızlı");
  expect(
    activityText(
      entry("criterion_removed", { id: "c", text: "Hızlı" }, { id: "c" }),
    ),
  ).toBe("Mert kriteri sildi: Hızlı");
  expect(
    activityText(
      entry(
        "criterion_updated",
        { id: "c", text: "A" },
        { id: "c", text: "B" },
      ),
    ),
  ).toBe("Mert kriteri düzenledi");
});

test("long multi-line scenario steps stay one line in the summary", () => {
  expect(
    activityText(
      entry(
        "scenario_removed",
        { steps_md: `\n${"a".repeat(150)}\nikinci` },
        {},
      ),
    ),
  ).toBe(`Mert senaryoyu sildi: ${"a".repeat(100)}…`);
});

test("edit records name the changed fields", () => {
  const edited = (before: unknown, after: unknown) =>
    activityText(entry("edited", before, after, "Item updated"));
  expect(edited({ title: "A" }, { title: "B" })).toBe(
    "Mert başlığı değiştirdi",
  );
  expect(edited({ body_md: "A" }, { body_md: "B" })).toBe(
    "Mert açıklamayı değiştirdi",
  );
  expect(edited({ priority: "medium" }, { priority: "high" })).toBe(
    "Mert önceliği Orta → Yüksek yaptı",
  );
  expect(edited({ what_changed_md: "" }, { what_changed_md: "B" })).toBe(
    "Mert Ne değişti metnini güncelledi",
  );
  expect(edited({ how_to_test_md: "" }, { how_to_test_md: "B" })).toBe(
    "Mert Nasıl denerim metnini güncelledi",
  );
  expect(
    edited({ title: "A", body_md: "A" }, { title: "B", body_md: "B" }),
  ).toBe("Mert başlığı değiştirdi, açıklamayı değiştirdi");
  expect(edited({}, {})).toBe("Mert PBI'yı düzenledi");
});

test("old records without content fall back to a general sentence", () => {
  expect(
    activityText(
      entry("scenario_removed", { id: "s", removed_at: null }, { id: "s" }),
    ),
  ).toBe("Mert bir senaryoyu sildi");
  expect(activityText(entry("scenario_edited", { id: "s" }, { id: "s" }))).toBe(
    "Mert bir senaryoyu düzenledi",
  );
  expect(
    activityText(
      entry(
        "scenario_edited",
        { id: "s", result: "pending" },
        { id: "s", result: "failed" },
      ),
    ),
  ).toBe("Mert bir senaryoyu Kaldı işaretledi");
  expect(
    activityText(
      entry("criterion_removed", { id: "c", removed_at: null }, { id: "c" }),
    ),
  ).toBe("Mert bir kriteri sildi");
});

test("summaries never leak kind names, system messages or broken JSON", () => {
  const broken = entry("edited", null, null, "Item updated");
  broken.after_json = "not json";
  expect(activityText(broken)).toBe("Mert PBI'yı düzenledi");
  expect(activityText(entry("mystery", null, null))).toBe(
    "Mert PBI'yı düzenledi",
  );
  expect(activityText(entry("moved", {}, {}, "Item updated"))).toBe(
    "Mert PBI'yı düzenledi",
  );
  expect(
    activityText(
      entry(
        "attachment_added",
        null,
        { file_name: "a.png" },
        "Attachment added",
      ),
    ),
  ).toBe("Mert ek ekledi: a.png");
});

test("a reason is only what someone actually wrote", () => {
  const reason = (kind: string, message: string, after: unknown = {}) =>
    activityReason(entry(kind, {}, after, message));
  expect(reason("edited", "Kapsam büyüdü")).toBe("Kapsam büyüdü");
  expect(reason("cancelled", "Gerek kalmadı")).toBe("Gerek kalmadı");
  expect(reason("moved", "x", { reason: "Geri alındı" })).toBe("Geri alındı");
  for (const [kind, message] of [
    ["edited", "Item updated"],
    ["created", "Item created"],
    ["restored", "Cancellation undone"],
    ["approved", "Item approved"],
    ["scenario_edited", "scenario_edited"],
    ["criterion_removed", "criterion_removed"],
    ["criterion_checked", "check"],
    ["attachment_added", "Attachment added"],
    ["moved", "Test column disabled"],
    ["decision", "Karar metni"],
    ["sent_back", "Geri gönderme notu"],
    ["edited", "   "],
  ])
    expect(reason(kind, message)).toBeNull();
});

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
