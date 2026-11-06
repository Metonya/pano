import { expect, test } from "bun:test";
import type { BoardItem } from "@/features/board/types";
import { latestPerAgent, silentMinutes } from "./agents";

const work = (
  number: number,
  assignee: string | null,
  last_activity: string,
  project = "PANO",
) => ({
  item: { number, assignee, last_activity } as BoardItem,
  project,
});

test("an agent with several items gets one row, using the latest activity", () => {
  const rows = latestPerAgent([
    work(1, "claude:po", "2026-11-06T10:00:00Z"),
    work(2, "claude:po", "2026-11-06T11:30:00Z"),
    work(3, "claude:po", "2026-11-06T11:00:00Z"),
  ]);
  expect(rows).toHaveLength(1);
  expect(rows[0].name).toBe("Claude · PO");
  expect(rows[0].item.number).toBe(2);
});

test("the latest item is found across projects and keeps its project", () => {
  const rows = latestPerAgent([
    work(1, "codex", "2026-11-06T10:00:00Z", "PANO"),
    work(9, "codex", "2026-11-06T12:00:00Z", "SITE"),
  ]);
  expect(rows.map((r) => [r.item.number, r.project])).toEqual([[9, "SITE"]]);
});

test("spellings of the same agent merge; different roles stay apart", () => {
  const rows = latestPerAgent([
    work(1, "claude:po", "2026-11-06T10:00:00Z"),
    work(2, "Claude:PO", "2026-11-06T11:00:00Z"),
    work(3, "claude:design", "2026-11-06T09:00:00Z"),
    work(4, "codex", "2026-11-06T08:00:00Z"),
  ]);
  expect(rows.map((r) => [r.name, r.item.number])).toEqual([
    ["Claude · PO", 2],
    ["Claude · Tasarım", 3],
    ["Codex", 4],
  ]);
});

test("items without an assignee are left out", () => {
  expect(latestPerAgent([work(1, null, "2026-11-06T10:00:00Z")])).toEqual([]);
});

test("an agent is silent only after more than 30 minutes", () => {
  const now = Date.parse("2026-11-06T12:00:00Z");
  expect(silentMinutes("2026-11-06T11:57:00Z", now)).toBeNull();
  expect(silentMinutes("2026-11-06T11:30:00Z", now)).toBeNull();
  expect(silentMinutes("2026-11-06T11:29:59Z", now)).toBe(30);
  expect(silentMinutes("2026-11-06T11:25:00Z", now)).toBe(35);
  expect(silentMinutes("2026-11-06T12:05:00Z", now)).toBeNull();
});
