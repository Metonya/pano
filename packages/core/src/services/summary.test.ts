import { afterEach, expect, test } from "bun:test";
import { createContext } from "../context";
import { createCore } from "../index";
import { createSummary } from "./summary";

const cores: ReturnType<typeof createCore>[] = [];
afterEach(() => {
  for (const core of cores.splice(0)) core.close();
});
function setup() {
  const core = createCore(":memory:");
  cores.push(core);
  core.projects.create({ key: "DEMO", name: "Demo" }, "seed");
  core.db
    .query("UPDATE projects SET created_at = ?")
    .run("2026-09-01T00:00:00.000Z");
  const summary = createSummary({
    ...createContext(core.db, core.events),
    now: () => "2026-11-06T12:00:00.000Z",
  });
  function at(date: string, action: () => unknown) {
    action();
    core.db
      .query(
        "UPDATE activity SET created_at = ? WHERE rowid = (SELECT MAX(rowid) FROM activity)",
      )
      .run(date);
  }
  return { core, summary, at };
}

test("seed-shaped project has four remaining items and excludes other projects", () => {
  const { core, summary, at } = setup();
  for (let i = 1; i <= 4; i++)
    at("2026-09-01T01:00:00.000Z", () =>
      core.items.create(
        "DEMO",
        { title: `Örnek iş ${i}`, criteria: ["Kabul kriteri"] },
        "seed",
      ),
    );
  core.projects.create({ key: "OTHER", name: "Other" }, "seed");
  core.items.create("OTHER", { title: "Unrelated", priority: "high" }, "seed");
  expect(summary("DEMO")).toMatchObject({
    started_at: "2026-09-01T00:00:00.000Z",
    total: 4,
    completed: 0,
    remaining: 4,
    cancelled: 0,
    remaining_by_priority: { high: 0, medium: 4, low: 0 },
    completed_last_7_days: 0,
  });
  expect(
    summary("DEMO").burn_up.every(
      (day) => day.total === 4 && day.completed === 0,
    ),
  ).toBe(true);
  expect(core.projects.summary("DEMO").total).toBe(4);
  expect(() => summary("MISSING")).toThrow("Project not found");
});

test("every UTC day since opening replays completion, reopening, cancellation and restoration", () => {
  const { core, summary, at } = setup();
  at("2026-09-01T01:00:00.000Z", () =>
    core.items.create("DEMO", { title: "Old", priority: "high" }, "seed"),
  );
  at("2026-09-02T01:00:00.000Z", () =>
    core.items.move("DEMO-1", "done", "seed"),
  );
  at("2026-10-30T12:00:00.000Z", () =>
    core.items.move("DEMO-1", "backlog", "seed"),
  );
  at("2026-10-31T12:00:00.000Z", () =>
    core.items.move("DEMO-1", "done", "seed"),
  );
  at("2026-11-01T12:00:00.000Z", () =>
    core.items.create("DEMO", { title: "Cancelled", priority: "low" }, "seed"),
  );
  at("2026-11-02T12:00:00.000Z", () =>
    core.items.move("DEMO-2", "cancelled", "seed", undefined, "Duplicate"),
  );
  at("2026-11-03T12:00:00.000Z", () =>
    core.items.move("DEMO-2", "backlog", "seed"),
  );
  at("2026-11-04T12:00:00.000Z", () =>
    core.items.move("DEMO-2", "cancelled", "seed", undefined, "Duplicate"),
  );
  at("2026-11-05T12:00:00.000Z", () =>
    core.items.create("DEMO", { title: "High", priority: "high" }, "seed"),
  );
  at("2026-11-05T12:00:00.000Z", () =>
    core.items.create("DEMO", { title: "Low", priority: "low" }, "seed"),
  );
  const result = summary("DEMO");
  expect(result).toMatchObject({
    total: 3,
    completed: 1,
    remaining: 2,
    cancelled: 1,
    remaining_by_priority: { high: 1, medium: 0, low: 1 },
    completed_last_7_days: 1,
  });
  // 2026-09-01 .. 2026-11-06, both ends included.
  expect(result.burn_up).toHaveLength(67);
  expect(result.burn_up[0]).toEqual({
    date: "2026-09-01",
    total: 1,
    completed: 0,
  });
  expect(result.burn_up.find((day) => day.date === "2026-09-02")).toEqual({
    date: "2026-09-02",
    total: 1,
    completed: 1,
  });
  expect(result.burn_up.find((day) => day.date === "2026-10-30")).toEqual({
    date: "2026-10-30",
    total: 1,
    completed: 0,
  });
  expect(result.burn_up.find((day) => day.date === "2026-11-01")?.total).toBe(
    2,
  );
  expect(result.burn_up.find((day) => day.date === "2026-11-02")?.total).toBe(
    1,
  );
  expect(result.burn_up.find((day) => day.date === "2026-11-03")?.total).toBe(
    2,
  );
  expect(result.burn_up.at(-1)).toEqual({
    date: "2026-11-06",
    total: 3,
    completed: 1,
  });
});

test("last seven days includes boundary once, excludes old and reopened completions", () => {
  const { core, summary, at } = setup();
  for (let i = 1; i <= 4; i++)
    at("2026-10-01T00:00:00.000Z", () =>
      core.items.create("DEMO", { title: `Work ${i}` }, "seed"),
    );
  at("2026-10-30T11:59:59.999Z", () =>
    core.items.move("DEMO-1", "done", "seed"),
  );
  at("2026-10-30T12:00:00.000Z", () =>
    core.items.move("DEMO-2", "done", "seed"),
  );
  at("2026-11-01T00:00:00.000Z", () =>
    core.items.move("DEMO-3", "done", "seed"),
  );
  at("2026-11-02T00:00:00.000Z", () =>
    core.items.move("DEMO-3", "backlog", "seed"),
  );
  at("2026-11-03T00:00:00.000Z", () =>
    core.items.move("DEMO-2", "backlog", "seed"),
  );
  at("2026-11-04T00:00:00.000Z", () =>
    core.items.move("DEMO-2", "done", "seed"),
  );
  at("2026-11-05T00:00:00.000Z", () =>
    core.items.move("DEMO-4", "done", "seed"),
  );
  at("2026-11-05T01:00:00.000Z", () =>
    core.items.move("DEMO-4", "cancelled", "seed", undefined, "Cancelled"),
  );
  expect(summary("DEMO").completed_last_7_days).toBe(1);
});

test("empty project returns zero days from opening to today", () => {
  const { summary } = setup();
  const result = summary("DEMO");
  expect(result.total).toBe(0);
  expect(result.burn_up).toHaveLength(67);
  expect(
    result.burn_up.every((day) => day.total === 0 && day.completed === 0),
  ).toBe(true);
});

test("project opened today returns a single point with today's state", () => {
  const { core, summary, at } = setup();
  core.db
    .query("UPDATE projects SET created_at = ?")
    .run("2026-11-06T08:00:00.000Z");
  at("2026-11-06T09:00:00.000Z", () =>
    core.items.create("DEMO", { title: "Bugün" }, "seed"),
  );
  at("2026-11-06T10:00:00.000Z", () =>
    core.items.move("DEMO-1", "done", "seed"),
  );
  expect(summary("DEMO").burn_up).toEqual([
    { date: "2026-11-06", total: 1, completed: 1 },
  ]);
});

test("exactly 180 days stay daily, longer projects thin evenly to 180", () => {
  const { core, summary, at } = setup();
  const ONE_DAY = 86400000;
  const today = Date.parse("2026-11-06T00:00:00.000Z");
  const dates = (result: ReturnType<typeof summary>) =>
    result.burn_up.map((day) => Date.parse(`${day.date}T00:00:00.000Z`));

  const openedDaysAgo = (days: number) =>
    core.db
      .query("UPDATE projects SET created_at = ?")
      .run(new Date(today - days * ONE_DAY).toISOString());

  openedDaysAgo(179);
  const daily = dates(summary("DEMO"));
  expect(daily).toHaveLength(180);
  expect(new Set(daily.slice(1).map((d, i) => d - (daily[i] ?? 0)))).toEqual(
    new Set([ONE_DAY]),
  );

  openedDaysAgo(999);
  at("2024-03-01T00:00:00.000Z", () =>
    core.items.create("DEMO", { title: "Old" }, "seed"),
  );
  at("2026-11-06T11:00:00.000Z", () =>
    core.items.move("DEMO-1", "done", "seed"),
  );
  const result = summary("DEMO");
  const thinned = dates(result);
  expect(thinned).toHaveLength(180);
  expect(thinned[0]).toBe(today - 999 * ONE_DAY);
  expect(thinned.at(-1)).toBe(today);
  const gaps = thinned
    .slice(1)
    .map((d, i) => (d - (thinned[i] ?? 0)) / ONE_DAY);
  // 999 days across 179 gaps: every gap is 5 or 6 days, none is skipped.
  expect(new Set(gaps)).toEqual(new Set([5, 6]));
  // Thinning does not lose the final state or the recent completion.
  expect(result.burn_up.at(-1)).toMatchObject({ total: 1, completed: 1 });
  expect(result.completed_last_7_days).toBe(1);
});

test("seven-day boundary is inclusive and an older completion is excluded", () => {
  const { core, summary, at } = setup();
  for (let i = 1; i <= 2; i++)
    at("2026-10-01T00:00:00.000Z", () =>
      core.items.create("DEMO", { title: `Boundary ${i}` }, "seed"),
    );
  at("2026-10-30T11:59:59.999Z", () =>
    core.items.move("DEMO-1", "done", "seed"),
  );
  expect(summary("DEMO").completed_last_7_days).toBe(0);
  at("2026-10-30T12:00:00.000Z", () =>
    core.items.move("DEMO-2", "done", "seed"),
  );
  expect(summary("DEMO").completed_last_7_days).toBe(1);
});
