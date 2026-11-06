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
};
export type Detail = BoardItem & {
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
  cancelled: "İptal",
};
export const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
export const sortItems = (items: BoardItem[]) =>
  [...items].sort(
    (a, b) =>
      rank[a.priority] - rank[b.priority] ||
      a.position - b.position ||
      a.number - b.number,
  );
export function agentName(id: string) {
  const [name, role] = id.split(":");
  const names: Record<string, string> = {
    claude: "Claude",
    codex: "Codex",
    mert: "Mert",
  };
  const roles: Record<string, string> = {
    po: "PO",
    design: "Tasarım",
    tasarim: "Tasarım",
  };
  return `${names[name.toLowerCase()] ?? name}${role ? ` · ${roles[role.toLowerCase()] ?? role}` : ""}`;
}

/** Done reads like a log: the most recently finished item comes first. */
export const sortColumn = (status: Status, items: BoardItem[]) =>
  status === "done"
    ? [...items].sort((a, b) =>
        String(b.done_at ?? "").localeCompare(String(a.done_at ?? "")),
      )
    : sortItems(items);
