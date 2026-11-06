import { agentName, type BoardItem } from "@/features/board/types";

const SILENT_MS = 30 * 60000;

/** One row per agent: the display name decides, so `claude:po` and `Claude:PO` are one agent. */
export function latestPerAgent<T extends { item: BoardItem }>(
  work: T[],
): (T & { name: string })[] {
  const latest = new Map<string, T>();
  for (const entry of work) {
    if (!entry.item.assignee) continue;
    const name = agentName(entry.item.assignee);
    const current = latest.get(name);
    if (
      !current ||
      Date.parse(entry.item.last_activity) >
        Date.parse(current.item.last_activity)
    )
      latest.set(name, entry);
  }
  return [...latest]
    .map(([name, entry]) => ({ ...entry, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Minutes without a record once past the 30-minute limit, otherwise null. */
export function silentMinutes(lastActivity: string, now = Date.now()) {
  const elapsed = now - Date.parse(lastActivity);
  return elapsed > SILENT_MS ? Math.floor(elapsed / 60000) : null;
}
