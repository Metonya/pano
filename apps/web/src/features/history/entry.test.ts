import { beforeAll, expect, test } from "bun:test";
import { setLanguage } from "@/lib/i18n";
import {
  childContent,
  isImportant,
  isTestRecord,
  matchesFilter,
} from "./entry";

beforeAll(async () => {
  await setLanguage("en", false);
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
const steps = { id: "s", steps_md: "Open" };
const result = entry(
  "scenario_edited",
  { ...steps, result: "pending" },
  { ...steps, result: "failed" },
);
const content = entry(
  "scenario_edited",
  { ...steps, expected_md: "Old" },
  { ...steps, expected_md: "New" },
);

test("Important shows content changes and hides bookkeeping", () => {
  for (const visible of [
    entry("scenario_added", null, steps),
    content,
    entry(
      "scenario_edited",
      { id: "s", steps_md: "A" },
      { id: "s", steps_md: "B" },
    ),
    entry("scenario_removed", steps, { id: "s" }),
    entry("scenario_removed", { id: "s" }, { id: "s" }),
    entry("criterion_added", null, { text: "A" }),
    entry("criterion_updated", { text: "A" }, { text: "B" }),
    entry("criterion_removed", { text: "A" }, {}),
    entry("edited", { title: "A" }, { title: "B" }),
    entry("edited", { what_changed_md: "" }, { what_changed_md: "B" }),
    entry("moved", { status: "backlog" }, { status: "test" }),
    entry("decision", null, { message: "Karar" }, "Karar"),
  ])
    expect(isImportant(visible)).toBe(true);
  for (const hidden of [
    result,
    entry(
      "scenario_edited",
      { id: "s", result: "pending" },
      { id: "s", result: "passed" },
    ),
    entry(
      "scenario_edited",
      { ...steps, position: 1 },
      { ...steps, position: 2 },
    ),
    entry("seen", {}, {}),
    entry("criterion_checked", { done: 0 }, { done: 1 }),
    entry("check", { done: 0 }, { done: 1 }, "check"),
    entry("moved", { position: 1 }, { position: 2 }),
  ])
    expect(isImportant(hidden)).toBe(false);
});

test("Tests gathers checks, scenario results and the verdict", () => {
  for (const visible of [
    result,
    entry("check", null, { message: "Unit 18/18" }, "Unit 18/18"),
    entry("approved", {}, {}),
    entry("sent_back", {}, {}, "Not"),
  ])
    expect(isTestRecord(visible)).toBe(true);
  for (const hidden of [
    content,
    entry("check", { done: 0 }, { done: 1 }, "check"),
    entry("decision", null, {}),
    entry("scenario_removed", steps, {}),
  ])
    expect(isTestRecord(hidden)).toBe(false);
});

test("usage records appear only under All", () => {
  const usage = entry("usage", null, { model: "gpt-6.1-sol" });
  expect(matchesFilter(usage, "important")).toBe(false);
  expect(matchesFilter(usage, "decision")).toBe(false);
  expect(matchesFilter(usage, "check")).toBe(false);
  expect(matchesFilter(usage, "all")).toBe(true);
});

test("filters route each record", () => {
  const decision = entry("decision", null, {}, "Karar");
  expect(matchesFilter(decision, "decision")).toBe(true);
  expect(matchesFilter(result, "decision")).toBe(false);
  expect(matchesFilter(result, "check")).toBe(true);
  expect(matchesFilter(result, "important")).toBe(false);
  expect(matchesFilter(result, "all")).toBe(true);
});

test("deleted content lists the steps and the expected result", () => {
  expect(
    childContent(
      entry("scenario_removed", { ...steps, expected_md: "Opens" }, {}),
    ),
  ).toEqual({ kind: "removed", lines: ["Open", "Expected: Opens"] });
  expect(
    childContent(entry("criterion_removed", { text: "A\nB" }, {})),
  ).toEqual({ kind: "removed", lines: ["A", "B"] });
  expect(
    childContent(entry("scenario_added", null, { ...steps, expected_md: "X" })),
  ).toEqual({ kind: "added", lines: ["Expected: X"] });
});

test("old records without text have no content and do not fail", () => {
  expect(
    childContent(entry("scenario_removed", { id: "s", removed_at: null }, {})),
  ).toBeNull();
  expect(childContent(entry("criterion_removed", null, null))).toBeNull();
  expect(childContent(content)).toBeNull();
  const broken = entry("scenario_removed", null, null);
  broken.before_json = "not json";
  expect(childContent(broken)).toBeNull();
  expect(isImportant(broken)).toBe(true);
});
