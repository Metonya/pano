import { isAwaitingHuman as isCoreAwaitingHuman } from "@pano/core/identity";
import { t } from "@/lib/i18n";
import { currentUser } from "@/lib/identity";

export { agentName, isAiActor } from "@/features/agents/agentInfo";

export type Status = "backlog" | "in_progress" | "test" | "done" | "cancelled";
export type Priority = "high" | "medium" | "low";
export type BoardItem = {
  done_at?: string | null;
  id: string;
  number: number;
  title: string;
  status: Status;
  priority: Priority;
  assignee: string | null;
  position: number;
  seen_at: string | null;
  updated_at: string;
  last_activity: string;
  criteria_total: number;
  criteria_done: number;
  usage?: UsageTotals;
};
export type UsageTotals = {
  total_tokens: number;
  runs: number;
  models: string[];
};
export type Detail = Omit<BoardItem, "usage"> & {
  usage?: UsageTotals & {
    actors: string[];
    efforts: string[];
    peak_context: number;
    duration_ms: number;
  };
  body_md: string;
  what_changed_md: string;
  how_to_test_md: string;
  scenarios: {
    id: string;
    steps_md: string;
    expected_md: string;
    result: "pending" | "passed" | "failed";
  }[];
  criteria: { id: string; text: string; done: number }[];
  activity: {
    id: string;
    actor: string;
    message: string;
    kind: string;
    before_json: string | null;
    after_json: string | null;
    created_at: string;
  }[];
};
export const labels: Record<Status, string> = {
  backlog: "Backlog",
  in_progress: "In Progress",
  test: "Test",
  done: "Done",
  get cancelled() {
    return t("cancelled");
  },
};
export const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
export const sortItems = (items: BoardItem[]) =>
  [...items].sort(
    (a, b) =>
      rank[a.priority] - rank[b.priority] ||
      a.position - b.position ||
      a.number - b.number,
  );
export const isAwaitingHuman = (item: BoardItem) =>
  isCoreAwaitingHuman(item, currentUser() ?? "");

/** Done reads like a log: the most recently finished item comes first. */
export const sortColumn = (status: Status, items: BoardItem[]) =>
  status === "done"
    ? [...items].sort((a, b) =>
        String(b.done_at ?? "").localeCompare(String(a.done_at ?? "")),
      )
    : sortItems(items);
