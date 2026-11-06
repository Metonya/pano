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

test("30 UTC days replay old completion, reopening, cancellation and restoration", () => {
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
  expect(result.burn_up).toHaveLength(30);
  expect(result.burn_up[0]).toEqual({
    date: "2026-10-08",
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

test("empty project returns thirty zero days", () => {
  const { summary } = setup();
  const result = summary("DEMO");
  expect(result.total).toBe(0);
  expect(result.burn_up).toHaveLength(30);
  expect(
    result.burn_up.every((day) => day.total === 0 && day.completed === 0),
  ).toBe(true);
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
