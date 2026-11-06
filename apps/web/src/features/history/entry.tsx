import { ArrowRight } from "lucide-react";
import { type Detail, labels, type Status } from "@/features/board/types";
import { parseSnapshot } from "./DiffView";

type Entry = Detail["activity"][number];

/** Criterion ticks were once stored as `check` records with the message "check". */
export function isLegacyCheck(entry: Entry): boolean {
  return entry.kind === "check" && "done" in parseSnapshot(entry.after_json);
}

const quiet = new Set(["seen", "criterion_checked"]);
const scopeFields = ["title", "body_md", "priority"];

/** The default history view: what changed the course of the work, without bookkeeping. */
export function isImportant(entry: Entry): boolean {
  if (quiet.has(entry.kind) || entry.kind.startsWith("scenario_")) return false;
  if (isLegacyCheck(entry)) return false;
  const after = parseSnapshot(entry.after_json);
  if (entry.kind === "moved") return "status" in after;
  if (entry.kind === "edited") return scopeFields.some((f) => f in after);
  return true;
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

export function StatusChip({ status }: { status: Status }) {
  return (
    <span className={`status-chip status-${status}`}>
      <span className="status-dot" aria-hidden="true" />
      {labels[status]}
    </span>
  );
}

export function StatusFlow({ from, to }: { from: Status; to: Status }) {
  return (
    <span className="status-flow">
      <StatusChip status={from} />
      <ArrowRight size={14} aria-hidden="true" />
      <StatusChip status={to} />
    </span>
  );
}
