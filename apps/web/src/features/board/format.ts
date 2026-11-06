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

export function activityText(entry: Detail["activity"][number]): string {
  let after: Record<string, unknown> = {};
  let before: Record<string, unknown> = {};
  try {
    after = JSON.parse(entry.after_json ?? "{}") ?? {};
    before = JSON.parse(entry.before_json ?? "{}") ?? {};
  } catch {
    /* Old activity may not contain JSON. */
  }
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
  if (entry.kind.startsWith("scenario_")) {
    const label =
      after.result === "passed"
        ? "activityScenarioPassed"
        : after.result === "failed"
          ? "activityScenarioFailed"
          : after.result === "pending"
            ? "activityScenarioReset"
            : entry.kind === "scenario_added"
              ? "activityScenarioAdded"
              : entry.kind === "scenario_removed"
                ? "activityScenarioRemoved"
                : "activityScenarioEdited";
    const step = after.steps_md ?? before.steps_md;
    return `${actor} ${t(label)}${typeof step === "string" ? `: ${step}` : ""}`;
  }
  const actions: Record<string, string> = {
    created: t("activityCreated"),
    edited: t("activityEdited"),
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
    criterion_added: t("activityCriterionAdded"),
    criterion_removed: t("activityCriterionRemoved"),
    approved: t("activityApproved"),
  };
  return `${actor} ${actions[entry.kind] ?? entry.message}`;
}
