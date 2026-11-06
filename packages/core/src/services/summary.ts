import type { Context } from "../context";

const DAY = 86400000;

export function createSummary({ project, all, str, now }: Context) {
  return (key: string) => {
    const p = project(key);
    const items = all("SELECT * FROM items WHERE project_id = ?", str(p.id));
    const active = items.filter((item) => item.status !== "cancelled");
    const remaining = active.filter((item) => item.status !== "done");
    const end = new Date(now()).getTime();
    const today = new Date(end).toISOString().slice(0, 10);
    const start = Date.parse(`${today}T00:00:00.000Z`) - 29 * DAY;
    const history = all(
      "SELECT * FROM activity WHERE project_id = ? AND item_id IS NOT NULL ORDER BY created_at, rowid",
      str(p.id),
    );
    // Replay status changes, including creation, cancellation and reopening.
    // Days use UTC and represent the state at the end of each day (today: now).
    const states = new Map<string, string>();
    const recent = new Set<string>();
    let cursor = 0;
    const burn_up = Array.from({ length: 30 }, (_, index) => {
      const day = start + index * DAY;
      const cutoff = Math.min(day + DAY - 1, end);
      while (cursor < history.length) {
        const entry = history[cursor];
        if (!entry || Date.parse(str(entry.created_at)) > cutoff) break;
        const after = JSON.parse(str(entry.after_json ?? "{}"));
        const id = str(entry.item_id);
        if (typeof after.status === "string") {
          if (
            after.status === "done" &&
            states.get(id) !== "done" &&
            Date.parse(str(entry.created_at)) >= end - 7 * DAY
          )
            recent.add(id);
          states.set(id, after.status);
        }
        cursor++;
      }
      const statuses = [...states.values()];
      return {
        date: new Date(day).toISOString().slice(0, 10),
        total: statuses.filter((status) => status !== "cancelled").length,
        completed: statuses.filter((status) => status === "done").length,
      };
    });
    return {
      started_at: str(p.created_at),
      total: active.length,
      completed: active.length - remaining.length,
      remaining: remaining.length,
      cancelled: items.length - active.length,
      remaining_by_priority: {
        high: remaining.filter((item) => item.priority === "high").length,
        medium: remaining.filter((item) => item.priority === "medium").length,
        low: remaining.filter((item) => item.priority === "low").length,
      },
      completed_last_7_days: active.filter(
        (item) => item.status === "done" && recent.has(str(item.id)),
      ).length,
      burn_up,
    };
  };
}
