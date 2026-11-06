import { language, t } from "@/lib/i18n";
import { agentName, type Detail } from "./types";

export function relativeTime(value: string, now = Date.now()): string {
  const minutes = Math.max(
    0,
    Math.floor((now - new Date(value).getTime()) / 60000),
  );
  if (language() === "en" && minutes >= 1) {
    const [value, unit] =
      minutes < 60
        ? ([minutes, "minute"] as const)
        : minutes < 1440
          ? ([Math.floor(minutes / 60), "hour"] as const)
          : ([Math.floor(minutes / 1440), "day"] as const);
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
      -value,
      unit,
    );
  }
  if (minutes < 1) return t("justNow");
  if (minutes < 60) return `${minutes} ${t("minutesAgo")}`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} ${t("hoursAgo")}`;
  return `${Math.floor(minutes / 1440)} ${t("daysAgo")}`;
}

type Entry = Detail["activity"][number];
type Snapshot = Record<string, unknown>;

export function parseSnapshot(value: string | null): Snapshot {
  try {
    const parsed = JSON.parse(value ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

const isChanged = (before: Snapshot, after: Snapshot, field: string) =>
  field in after && before[field] !== after[field];

/** The scenario's wording changed, as opposed to its result or position. */
export function scenarioContentChanged(entry: Entry): boolean {
  const before = parseSnapshot(entry.before_json);
  const after = parseSnapshot(entry.after_json);
  return ["steps_md", "expected_md"].some((f) => isChanged(before, after, f));
}

export function scenarioResultChanged(entry: Entry): boolean {
  return isChanged(
    parseSnapshot(entry.before_json),
    parseSnapshot(entry.after_json),
    "result",
  );
}

export function priorityLabel(value: unknown): string {
  return value === "high" || value === "medium" || value === "low"
    ? t(value)
    : "";
}

/** Keeps a summary on one line; the full text stays in the row's diff. */
function brief(value: string): string {
  const line = value
    .split("\n")
    .map((part) => part.trim())
    .find(Boolean);
  if (!line) return "";
  return line.length > 100 ? `${line.slice(0, 100)}…` : line;
}

function named(
  label: Parameters<typeof t>[0],
  generic: Parameters<typeof t>[0],
  value: unknown,
): string {
  const text = typeof value === "string" ? brief(value) : "";
  return text ? `${t(label)}: ${text}` : t(generic);
}

function scenarioText(entry: Entry, before: Snapshot, after: Snapshot): string {
  const step = after.steps_md ?? before.steps_md;
  if (entry.kind === "scenario_added")
    return named("activityScenarioAdded", "activityScenarioAdded", step);
  if (entry.kind === "scenario_removed")
    return named(
      "activityScenarioRemoved",
      "historyScenarioRemovedGeneric",
      step,
    );
  const content = scenarioContentChanged(entry);
  if (!content && scenarioResultChanged(entry)) {
    if (after.result === "passed")
      return named(
        "activityScenarioPassed",
        "historyScenarioPassedGeneric",
        step,
      );
    if (after.result === "failed")
      return named(
        "activityScenarioFailed",
        "historyScenarioFailedGeneric",
        step,
      );
    return named("activityScenarioReset", "historyScenarioResetGeneric", step);
  }
  if (!content && isChanged(before, after, "position"))
    return t("activityReordered");
  return named("activityScenarioEdited", "historyScenarioEditedGeneric", step);
}

function editedText(before: Snapshot, after: Snapshot): string {
  const changes: string[] = [];
  if (isChanged(before, after, "title")) changes.push(t("historyEditedTitle"));
  if (isChanged(before, after, "body_md")) changes.push(t("historyEditedBody"));
  if (isChanged(before, after, "priority"))
    changes.push(
      t("historyEditedPriority")
        .replace("{from}", priorityLabel(before.priority))
        .replace("{to}", priorityLabel(after.priority)),
    );
  if (isChanged(before, after, "what_changed_md"))
    changes.push(t("historyEditedWhatChanged"));
  if (isChanged(before, after, "how_to_test_md"))
    changes.push(t("historyEditedHowToTest"));
  if (isChanged(before, after, "position"))
    changes.push(t("activityReordered"));
  return changes.join(", ") || t("activityEdited");
}

const systemMessages = new Set([
  "Item updated",
  "Item created",
  "Item seen",
  "Item approved",
  "Cancellation undone",
  "Attachment added",
  "Test column disabled",
  "Project updated",
]);

/** Text Pano wrote itself: never a reason a person or an agent gave. */
function isSystemMessage(message: string, kind: string): boolean {
  return message === kind || systemMessages.has(message);
}

const reasonKinds = new Set(["edited", "moved", "assigned", "cancelled"]);

/** The rationale someone actually gave for this record, if there is one. */
export function activityReason(entry: Entry): string | null {
  const stated = parseSnapshot(entry.after_json).reason;
  const reason =
    typeof stated === "string"
      ? stated
      : reasonKinds.has(entry.kind)
        ? entry.message
        : "";
  return reason.trim() && !isSystemMessage(reason, entry.kind) ? reason : null;
}

export function activityText(entry: Entry): string {
  const after = parseSnapshot(entry.after_json);
  const before = parseSnapshot(entry.before_json);
  const actor = agentName(entry.actor);
  const handedTo =
    typeof after.assignee === "string"
      ? ` · ${t("assignee")}: ${agentName(after.assignee)}`
      : "";
  if (entry.kind === "moved" && typeof after.status === "string")
    return `${actor} ${t("activityMoved")}${handedTo}`;
  if (entry.kind === "moved" && before.position !== after.position)
    return `${actor} ${t("activityReordered")}`;
  if (entry.kind === "assigned")
    return `${actor} ${t("activityAssigned")} ${typeof after.assignee === "string" ? agentName(after.assignee) : t("activityUnassigned")}`;
  if (entry.kind === "sent_back" || entry.kind === "reassigned")
    return `${actor} ${t(entry.kind === "sent_back" ? "activitySentBack" : "activityReassigned")}${handedTo}`;
  if (entry.kind.startsWith("scenario_"))
    return `${actor} ${scenarioText(entry, before, after)}`;
  const actions: Record<string, string> = {
    created: t("activityCreated"),
    edited: editedText(before, after),
    cancelled: t("activityCancelled"),
    seen: t("activitySeen"),
    check:
      "done" in after ? t("historyCriterionChecked") : t("activityChecked"),
    criterion_checked: after.done
      ? t("historyCriterionChecked")
      : t("historyCriterionUnchecked"),
    restored: t("historyRestored"),
    decision: t("historyDecisionRecorded"),
    note: t("historyNoteRecorded"),
    criterion_updated: t("activityCriterionUpdated"),
    criterion_added: named(
      "activityCriterionAdded",
      "activityCriterionAdded",
      after.text,
    ),
    criterion_removed: named(
      "activityCriterionRemoved",
      "historyCriterionRemovedGeneric",
      before.text,
    ),
    attachment_added: named(
      "historyAttachmentAdded",
      "historyAttachmentAdded",
      after.file_name,
    ),
    approved: t("activityApproved"),
  };
  const action =
    actions[entry.kind] ??
    (isSystemMessage(entry.message, entry.kind)
      ? t("activityEdited")
      : entry.message);
  return `${actor} ${action}`;
}
