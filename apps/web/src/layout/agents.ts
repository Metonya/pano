import { agentInfo, isAiActor } from "@/features/agents/agentInfo";
import type { BoardItem } from "@/features/board/types";

const SILENT_MS = 30 * 60000;

/** One row per tool: `claude:po` and `claude:design` are one Claude. The person is no agent. */
export function latestPerAgent<T extends { item: BoardItem }>(
  work: T[],
): (T & { name: string })[] {
  const latest = new Map<string, T>();
  for (const entry of work) {
    if (!isAiActor(entry.item.assignee)) continue;
    const name = agentInfo(entry.item.assignee as string).name;
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
