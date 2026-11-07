import { beforeEach, expect, test } from "bun:test";
import { setLanguage } from "@/lib/i18n";
import { activityReason, activityText, relativeTime } from "./format";
import { tokensLabel, usageRecordLine, usageSummaryLine } from "./usage";

const record = {
  id: "1",
  actor: "codex",
  kind: "",
  message: "Usage recorded",
  before_json: null,
  after_json: "{}",
  created_at: "",
};

beforeEach(async () => {
  await setLanguage("tr", false);
});

test("usage lines follow the language and leave out what was not reported", async () => {
  const compact = (value: number, locale: string) =>
    new Intl.NumberFormat(locale, { notation: "compact" }).format(value);
  expect(tokensLabel(42000)).toBe(`${compact(42000, "tr")} token`);
  expect(
    usageRecordLine({
      model: "gpt-6.1-sol",
      effort: "high",
      input_tokens: 12000,
      output_tokens: 3000,
      cache_tokens: 0,
      duration_ms: 120000,
    }),
  ).toBe(
    `gpt-6.1-sol · high · ${compact(12000, "tr")} giriş · ${compact(3000, "tr")} çıkış · ${new Intl.NumberFormat("tr", { style: "unit", unit: "minute", unitDisplay: "short" }).format(2)}`,
  );
  expect(usageRecordLine({ note: "Note only" })).toBe("");
  expect(usageRecordLine({ total_tokens: 90000, context_tokens: 45000 })).toBe(
    `${compact(90000, "tr")} token · ${compact(45000, "tr")} context`,
  );
  const usage = {
    total_tokens: 42000,
    runs: 3,
    models: ["gpt-6.1-sol"],
    actors: ["codex"],
    efforts: ["high"],
    peak_context: 0,
    duration_ms: 0,
  };
  expect(usageSummaryLine(usage)).toBe(
    `gpt-6.1-sol · yüksek · ${compact(42000, "tr")} token · 3 çalışma`,
  );
  expect(
    usageSummaryLine({ ...usage, peak_context: 45000, duration_ms: 420000 }),
  ).toBe(
    `gpt-6.1-sol · yüksek · ${compact(42000, "tr")} token · ${compact(45000, "tr")} context · ${new Intl.NumberFormat("tr", { style: "unit", unit: "minute", unitDisplay: "short" }).format(7)} · 3 çalışma`,
  );
  expect(
    usageSummaryLine({
      ...usage,
      total_tokens: 0,
      runs: 1,
      models: [],
      efforts: [],
    }),
  ).toBe("1 çalışma");
  await setLanguage("en", false);
  expect(usageSummaryLine({ ...usage, runs: 1 })).toBe(
    "gpt-6.1-sol · high · 42K tokens · 1 run",
  );
  expect(usageSummaryLine({ ...usage, peak_context: 45000, runs: 1 })).toBe(
    "gpt-6.1-sol · high · 42K tokens · 45K context · 1 run",
  );
  expect(activityText({ ...record, kind: "usage" })).toBe(
    "Codex recorded a run",
  );
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

test("scenario records say what happened to which scenario", async () => {
  await setLanguage("en", false);
  const steps = { id: "s", steps_md: "Open the cart" };
  expect(
    activityText(
      entry("scenario_removed", { ...steps, expected_md: "x" }, { id: "s" }),
    ),
  ).toBe("Mert deleted the scenario: Open the cart");
  expect(activityText(entry("scenario_added", null, steps))).toBe(
    "Mert added a scenario: Open the cart",
  );
  expect(
    activityText(
      entry(
        "scenario_edited",
        { ...steps, expected_md: "Old" },
        { ...steps, expected_md: "New" },
      ),
    ),
  ).toBe("Mert edited the scenario: Open the cart");
  for (const [result, text] of [
    ["failed", "Mert marked the scenario Failed: Open the cart"],
    ["passed", "Mert marked the scenario Passed: Open the cart"],
    ["pending", "Mert cleared the scenario result: Open the cart"],
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

test("criterion records carry their text", async () => {
  await setLanguage("en", false);
  expect(
    activityText(entry("criterion_added", null, { id: "c", text: "Fast" })),
  ).toBe("Mert added criterion: Fast");
  expect(
    activityText(
      entry("criterion_removed", { id: "c", text: "Fast" }, { id: "c" }),
    ),
  ).toBe("Mert deleted criterion: Fast");
  expect(
    activityText(
      entry(
        "criterion_updated",
        { id: "c", text: "A" },
        { id: "c", text: "B" },
      ),
    ),
  ).toBe("Mert edited criterion");
});

test("long multi-line scenario steps stay one line in the summary", async () => {
  await setLanguage("en", false);
  expect(
    activityText(
      entry(
        "scenario_removed",
        { steps_md: `\n${"a".repeat(150)}\nsecond` },
        {},
      ),
    ),
  ).toBe(`Mert deleted the scenario: ${"a".repeat(100)}…`);
});

test("edit records name the changed fields", async () => {
  await setLanguage("en", false);
  const edited = (before: unknown, after: unknown) =>
    activityText(entry("edited", before, after, "Item updated"));
  expect(edited({ title: "A" }, { title: "B" })).toBe("Mert changed the title");
  expect(edited({ body_md: "A" }, { body_md: "B" })).toBe(
    "Mert changed the description",
  );
  expect(edited({ priority: "medium" }, { priority: "high" })).toBe(
    "Mert changed priority Medium → High",
  );
  expect(edited({ what_changed_md: "" }, { what_changed_md: "B" })).toBe(
    "Mert updated the What changed text",
  );
  expect(edited({ how_to_test_md: "" }, { how_to_test_md: "B" })).toBe(
    "Mert updated the How to test text",
  );
  expect(
    edited({ title: "A", body_md: "A" }, { title: "B", body_md: "B" }),
  ).toBe("Mert changed the title, changed the description");
  expect(edited({}, {})).toBe("Mert edited PBI");
});

test("old records without content fall back to a general sentence", async () => {
  await setLanguage("en", false);
  expect(
    activityText(
      entry("scenario_removed", { id: "s", removed_at: null }, { id: "s" }),
    ),
  ).toBe("Mert deleted a scenario");
  expect(activityText(entry("scenario_edited", { id: "s" }, { id: "s" }))).toBe(
    "Mert edited a scenario",
  );
  expect(
    activityText(
      entry(
        "scenario_edited",
        { id: "s", result: "pending" },
        { id: "s", result: "failed" },
      ),
    ),
  ).toBe("Mert marked a scenario Failed");
  expect(
    activityText(
      entry("criterion_removed", { id: "c", removed_at: null }, { id: "c" }),
    ),
  ).toBe("Mert deleted a criterion");
});

test("summaries never leak kind names, system messages or broken JSON", async () => {
  await setLanguage("en", false);
  const broken = entry("edited", null, null, "Item updated");
  broken.after_json = "not json";
  expect(activityText(broken)).toBe("Mert edited PBI");
  expect(activityText(entry("mystery", null, null))).toBe("Mert edited PBI");
  expect(activityText(entry("moved", {}, {}, "Item updated"))).toBe(
    "Mert edited PBI",
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
  ).toBe("Mert added an attachment: a.png");
});

test("a reason is only what someone actually wrote", async () => {
  await setLanguage("en", false);
  const reason = (kind: string, message: string, after: unknown = {}) =>
    activityReason(entry(kind, {}, after, message));
  expect(reason("edited", "Scope expanded")).toBe("Scope expanded");
  expect(reason("cancelled", "No longer needed")).toBe("No longer needed");
  expect(reason("moved", "x", { reason: "Reverted" })).toBe("Reverted");
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
    ["decision", "Decision text"],
    ["sent_back", "Send-back note"],
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
test("activity describes status changes", async () => {
  await setLanguage("en", false);
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
  ).toBe("Mert moved");
});
