import { beforeEach, expect, test } from "bun:test";
import { setLanguage } from "@/lib/i18n";
import { agentName, type BoardItem, sortColumn } from "./types";

beforeEach(async () => {
  await setLanguage("en", false);
});

test("agent identities are readable", () => {
  expect(agentName("claude:po")).toBe("Claude · PO");
  expect(agentName("claude:design")).toBe("Claude · Design");
  expect(agentName("codex")).toBe("Codex");
  expect(agentName("mert")).toBe("Mert");
});

test("Done lists the most recently finished item first", () => {
  const item = (number: number, done_at: string) =>
    ({ number, done_at, priority: "high", position: number }) as BoardItem;
  const items = [
    item(1, "2026-11-01"),
    item(2, "2026-11-03"),
    item(3, "2026-11-02"),
  ];
  expect(sortColumn("done", items).map((i) => i.number)).toEqual([2, 3, 1]);
  expect(sortColumn("backlog", items).map((i) => i.number)).toEqual([1, 2, 3]);
});
