import type { Context } from "../context";
import { usageTotals } from "./usage";

const DAY = 86400000;
const MAX_POINTS = 180;

export function createSummary({ project, all, str, now }: Context) {
  return (key: string, timeZone = "UTC") => {
    const calendar = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const localDay = (instant: number) => {
      const parts = calendar.formatToParts(instant);
      const part = (name: string) => parts.find((p) => p.type === name)?.value;
      return `${part("year")}-${part("month")}-${part("day")}`;
    };
    // Find the first instant of a local calendar day, including DST transitions.
    const midnight = (day: number) => {
      if (timeZone === "UTC") return day;
      const target = new Date(day).toISOString().slice(0, 10);
      let low = day - 2 * DAY;
      let high = day + 2 * DAY;
      while (low < high) {
        const middle = Math.floor((low + high) / 2);
        if (localDay(middle) < target) low = middle + 1;
        else high = middle;
      }
      return low;
    };
    const p = project(key);
    const items = all("SELECT * FROM items WHERE project_id = ?", str(p.id));
    const active = items.filter((item) => item.status !== "cancelled");
    const remaining = active.filter((item) => item.status !== "done");
    const end = new Date(now()).getTime();
    const today = localDay(end);
    const lastDay = Date.parse(`${today}T00:00:00.000Z`);
    const opened = Date.parse(
      `${localDay(Date.parse(str(p.created_at)))}T00:00:00.000Z`,
    );
    const start = Math.min(opened, lastDay);
    const days = (lastDay - start) / DAY + 1;
    const count = Math.min(days, MAX_POINTS);
    const history = all(
      "SELECT * FROM activity WHERE project_id = ? AND item_id IS NOT NULL ORDER BY created_at, rowid",
      str(p.id),
    );
    // Replay status changes, including creation, cancellation and reopening.
    // Date labels use the requested calendar; points show each local day's end.
    // Clients without a timezone keep the UTC API default.
    // Long projects are thinned evenly; the first and last day always stay.
    const states = new Map<string, string>();
    const recent = new Set<string>();
    let cursor = 0;
    const burn_up = Array.from({ length: count }, (_, index) => {
      const day =
        start +
        (count > 1 ? Math.round((index * (days - 1)) / (count - 1)) : 0) * DAY;
      const cutoff = Math.min(midnight(day + DAY) - 1, end);
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
      // Cancelled items count too: their tokens were spent all the same.
      usage: usageTotals(history.filter((entry) => entry.kind === "usage")),
    };
  };
}
