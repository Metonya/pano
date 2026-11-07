import { ArrowRight } from "lucide-react";
import {
  parseSnapshot,
  scenarioContentChanged,
  scenarioResultChanged,
} from "@/features/board/format";
import { type Detail, labels, type Status } from "@/features/board/types";
import { t } from "@/lib/i18n";

type Entry = Detail["activity"][number];
export type HistoryFilter = "important" | "decision" | "check" | "all";

/** Criterion ticks were once stored as `check` records with the message "check". */
export function isLegacyCheck(entry: Entry): boolean {
  return entry.kind === "check" && "done" in parseSnapshot(entry.after_json);
}

const quiet = new Set(["seen", "criterion_checked", "usage"]);
const scopeFields = [
  "title",
  "body_md",
  "priority",
  "what_changed_md",
  "how_to_test_md",
];

/** The default history view: what changed the course of the work, without bookkeeping. */
export function isImportant(entry: Entry): boolean {
  if (quiet.has(entry.kind) || isLegacyCheck(entry)) return false;
  const after = parseSnapshot(entry.after_json);
  if (entry.kind === "moved") return "status" in after;
  if (entry.kind === "edited") return scopeFields.some((f) => f in after);
  if (entry.kind === "scenario_edited") return scenarioContentChanged(entry);
  return true;
}

/** Everything that says how testing went: AI checks, scenario results and the verdict. */
export function isTestRecord(entry: Entry): boolean {
  if (entry.kind === "check") return !isLegacyCheck(entry);
  if (entry.kind === "scenario_edited") return scenarioResultChanged(entry);
  return entry.kind === "approved" || entry.kind === "sent_back";
}

export function matchesFilter(entry: Entry, filter: HistoryFilter): boolean {
  if (filter === "important") return isImportant(entry);
  if (filter === "decision") return entry.kind === "decision";
  if (filter === "check") return isTestRecord(entry);
  return true;
}

/** The text of a deleted or added scenario/criterion, shown under its history row. */
export function childContent(
  entry: Entry,
): { kind: "added" | "removed"; lines: string[] } | null {
  const before = parseSnapshot(entry.before_json);
  const after = parseSnapshot(entry.after_json);
  const expected = (value: unknown) =>
    typeof value === "string" ? [`${t("historyExpected")}: ${value}`] : [];
  let lines: string[] = [];
  if (entry.kind === "scenario_removed")
    lines = [
      ...(typeof before.steps_md === "string" ? [before.steps_md] : []),
      ...expected(before.expected_md),
    ];
  else if (
    entry.kind === "criterion_removed" &&
    typeof before.text === "string"
  )
    lines = [before.text];
  else if (entry.kind === "scenario_added") lines = expected(after.expected_md);
  if (!lines.length) return null;
  return {
    kind: entry.kind === "scenario_added" ? "added" : "removed",
    lines: lines.flatMap((line) => line.replaceAll("\r\n", "\n").split("\n")),
  };
}

export function statusFlow(entry: Entry): { from: Status; to: Status } | null {
  const before = parseSnapshot(entry.before_json).status;
  const after = parseSnapshot(entry.after_json).status;
  if (
    typeof before === "string" &&
    typeof after === "string" &&
    before !== after &&
    before in labels &&
    after in labels
  )
    return { from: before as Status, to: after as Status };
  return null;
}

export function StatusChip({ status }: Readonly<{ status: Status }>) {
  return (
    <span className={`status-chip status-${status}`}>
      <span className="status-dot" aria-hidden="true" />
      {labels[status]}
    </span>
  );
}

export function StatusFlow({
  from,
  to,
}: Readonly<{ from: Status; to: Status }>) {
  return (
    <span className="status-flow">
      <StatusChip status={from} />
      <ArrowRight size={14} aria-hidden="true" />
      <StatusChip status={to} />
    </span>
  );
}
