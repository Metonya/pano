import { Database } from "bun:sqlite";
import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ZodError } from "zod";
import { createCore, positionBetween } from "./index";

const cores: ReturnType<typeof createCore>[] = [];
test("project key suggestions transliterate, shorten and remain valid", () => {
  const core = createCore(":memory:");
  cores.push(core);
  for (const [name, expected] of [
    ["Pano", "PANO"],
    ["Snakeful", "SNAKEF"],
    ["Örnek Proje", "OP"],
    ["ŞĞÜÖÇİIı", "SGUOCI"],
    ["  bir iki üç dört beş  ", "BIUD"],
    ["", "PRJ"],
    ["123 !", "PRJ"],
    ["a", "AP"],
    ["İ 123", "IP"],
  ]) {
    expect(core.projects.suggestKey(name as string)).toBe(expected);
  }
});
test("project suggestions skip active and archived keys and cap suffix length", () => {
  const core = createCore(":memory:");
  cores.push(core);
  core.projects.create({ key: "OP", name: "Örnek Proje" }, "mert");
  core.projects.archive("OP", true, "mert");
  core.projects.create({ key: "OP2", name: "Diğer" }, "mert");
  expect(core.projects.suggestKey("Örnek Proje")).toBe("OP3");
  for (let suffix = 1; suffix <= 12; suffix++) {
    core.projects.create(
      { key: `SNAKEF${suffix === 1 ? "" : suffix}`, name: "Snakeful" },
      "mert",
    );
  }
  expect(core.projects.suggestKey("Snakeful")).toBe("SNAKEF13");
  expect(core.projects.suggestKey("Snakeful")).toMatch(/^[A-Z0-9]{2,10}$/);
});
function setup() {
  const core = createCore(":memory:");
  cores.push(core);
  core.projects.create({ key: "PANO", name: "Pano" }, "mert");
  return core;
}
test("board list reports active criteria and a new completion becomes unseen", () => {
  const c = setup();
  c.items.create("PANO", { title: "Task", criteria: ["one", "two"] }, "mert");
  const criterion = c.items.get("PANO-1").criteria[0];
  c.criteria.check("PANO-1", String(criterion?.id), true, "mert");
  const row = c.items.list("PANO")[0];
  expect(row?.criteria_total).toBe(2);
  expect(row?.criteria_done).toBe(1);
  expect(row?.last_activity).toBeTruthy();
  c.items.move("PANO-1", "done", "mert");
  c.items.markSeen("PANO-1", "mert");
  c.items.move("PANO-1", "backlog", "mert");
  expect(c.items.move("PANO-1", "done", "mert").seen_at).toBeNull();
});
afterEach(() => {
  for (const core of cores.splice(0)) core.close();
});
test("migrations repeat and foreign keys are active", () => {
  const c = setup();
  c.migrate();
  c.migrate();
  expect(c.db.query("SELECT * FROM schema_version").all()).toHaveLength(2);
  expect(c.db.query("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
  expect(() =>
    c.db
      .query(
        "INSERT INTO criteria (id,item_id,text,position) VALUES ('x','missing','x',1)",
      )
      .run(),
  ).toThrow();
});
test("database rejects invalid status, priority and scenario result", () => {
  const c = setup();
  c.items.create("PANO", { title: "Task" }, "mert");
  const scenario = c.scenarios.add(
    "PANO-1",
    { steps_md: "open", expected_md: "works", author: "mert" },
    "mert",
  );
  expect(() =>
    c.db.query("UPDATE items SET status = 'invalid'").run(),
  ).toThrow();
  expect(() =>
    c.db.query("UPDATE items SET priority = 'invalid'").run(),
  ).toThrow();
  expect(() =>
    c.db
      .query("UPDATE test_scenarios SET result = 'invalid' WHERE id = ?")
      .run(scenario.id),
  ).toThrow();
});
test("version 1 databases receive purge audit, indexes and value enforcement", () => {
  const dir = mkdtempSync(join(tmpdir(), "pano-upgrade-"));
  const path = join(dir, "legacy.db");
  const old = new Database(path);
  try {
    const sql = readFileSync(
      join(import.meta.dir, "../migrations/001_init.sql"),
      "utf8",
    )
      .replace(/ CHECK \(status IN \([^)]+\)\)/, "")
      .replace(/ CHECK \(priority IN \([^)]+\)\)/, "")
      .replace(/ CHECK \(result IN \([^)]+\)\)/, "");
    old.exec(sql);
    old.exec(
      "CREATE TABLE schema_version (version INTEGER PRIMARY KEY, name TEXT NOT NULL); INSERT INTO schema_version VALUES (1, '001_init.sql')",
    );
  } finally {
    old.close();
  }
  const core = createCore(path);
  try {
    expect(core.db.query("SELECT * FROM schema_version").all()).toHaveLength(2);
    core.projects.create({ key: "OLD", name: "Old" }, "mert");
    core.items.create("OLD", { title: "Task" }, "mert");
    expect(() =>
      core.db.query("UPDATE items SET status = 'bad'").run(),
    ).toThrow();
    core.projects.archive("OLD", true, "mert");
    core.projects.purge("OLD", "Old", "mert");
    expect(
      core.db.query("SELECT project_key, item_count FROM purge_log").get(),
    ).toEqual({ project_key: "OLD", item_count: 1 });
  } finally {
    core.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("50 concurrent items get consecutive unique numbers", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pano-concurrency-"));
  const path = join(dir, "test.db");
  const core = createCore(path);
  const workers: Worker[] = [];
  try {
    core.projects.create({ key: "PANO", name: "Pano" }, "mert");
    const barrier = new Int32Array(new SharedArrayBuffer(8));
    const tasks = Array.from({ length: 2 }, (_, worker) => {
      const thread = new Worker(
        new URL("./concurrency-worker.ts", import.meta.url),
      );
      workers.push(thread);
      return new Promise<number[]>((resolve, reject) => {
        thread.onmessage = (
          event: MessageEvent<{ numbers?: number[]; error?: string }>,
        ) => {
          if (event.data.error) reject(new Error(event.data.error));
          else resolve(event.data.numbers ?? []);
        };
        thread.onerror = (event) => reject(new Error(event.message));
        thread.postMessage({ path, worker, barrier: barrier.buffer });
      });
    });
    const deadline = Date.now() + 5000;
    while (Atomics.load(barrier, 0) < 2 && Date.now() < deadline)
      await Bun.sleep(1);
    expect(Atomics.load(barrier, 0)).toBe(2);
    Atomics.store(barrier, 1, 1);
    Atomics.notify(barrier, 1);
    const numbers = (await Promise.all(tasks)).flat().sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    expect(core.items.list("PANO")).toHaveLength(50);
  } finally {
    for (const worker of workers) worker.terminate();
    core.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("stars, archive, restore and confirmed purge", () => {
  const c = setup();
  c.projects.create({ key: "ZZ", name: "Zed" }, "mert");
  c.projects.star("ZZ", true, "mert");
  expect(c.projects.list().map((p) => p.key)).toEqual(["ZZ", "PANO"]);
  expect(() => c.projects.purge("ZZ", "Zed", "mert")).toThrow();
  c.projects.archive("ZZ", true, "mert");
  expect(c.projects.list()).toHaveLength(1);
  expect(c.projects.list({ includeArchived: true })).toHaveLength(2);
  expect(() => c.projects.purge("ZZ", "wrong", "mert")).toThrow();
  expect(c.db.query("SELECT * FROM purge_log").all()).toHaveLength(0);
  c.projects.archive("ZZ", false, "mert");
  c.projects.archive("ZZ", true, "mert");
  c.items.create("ZZ", { title: "discard" }, "mert");
  c.db.exec(
    "CREATE TRIGGER fail_purge BEFORE DELETE ON projects BEGIN SELECT RAISE(ABORT, 'failure'); END",
  );
  expect(() => c.projects.purge("ZZ", "Zed", "mert")).toThrow();
  expect(c.db.query("SELECT * FROM purge_log").all()).toHaveLength(0);
  expect(c.projects.get("ZZ").name).toBe("Zed");
  c.db.exec("DROP TRIGGER fail_purge");
  c.projects.purge("ZZ", "Zed", "mert");
  expect(c.projects.list({ includeArchived: true })).toHaveLength(1);
  const purge = c.db.query("SELECT * FROM purge_log").get() as Record<
    string,
    unknown
  >;
  expect(purge).toMatchObject({
    project_key: "ZZ",
    project_name: "Zed",
    actor: "mert",
    item_count: 1,
  });
  expect(purge.purged_at).toBeTruthy();
});
test("history retains three intermediate states, actor and change events", () => {
  const c = setup();
  const events: string[] = [];
  c.events.on("change", (e) => events.push(e.kind));
  c.items.create(
    "PANO",
    { title: "T0", body_md: "B0", criteria: ["one"] },
    "codex",
  );
  for (let i = 1; i <= 3; i++)
    c.items.update(
      "PANO-1",
      { title: `T${i}`, body_md: `B${i}`, reason: "scope" },
      "codex",
    );
  c.items.move("PANO-1", "in_progress", "codex");
  c.items.assign("PANO-1", "mert", "codex");
  c.criteria.check(
    "PANO-1",
    String(c.items.get("PANO-1").criteria[0]?.id),
    true,
    "mert",
  );
  const history = c.activity.list("PANO-1");
  const edits = history.filter((a) => a.kind === "edited").reverse();
  expect(edits.map((a) => JSON.parse(String(a.before_json)).title)).toEqual([
    "T0",
    "T1",
    "T2",
  ]);
  expect(edits.map((a) => JSON.parse(String(a.after_json)).body_md)).toEqual([
    "B1",
    "B2",
    "B3",
  ]);
  expect(edits.every((a) => a.actor === "codex" && a.message === "scope")).toBe(
    true,
  );
  for (const kind of ["moved", "assigned", "check"]) {
    const record = history.find((a) => a.kind === kind);
    expect(record?.before_json).toBeTruthy();
    expect(record?.after_json).toBeTruthy();
    expect(events).toContain(kind);
  }
  expect(c.items.get("PANO-1").activity).toHaveLength(5);
  expect(c.items.get("PANO-1", { history: true }).activity).toHaveLength(7);
});
test("cancellation is filtered and invalid inputs rejected", () => {
  const c = setup();
  c.items.create("PANO", { title: "Task" }, "mert");
  expect(() =>
    c.items.update("PANO-1", { status: "cancelled" }, "mert"),
  ).toThrow("reason");
  c.items.update("PANO-1", { status: "cancelled", reason: "obsolete" }, "mert");
  expect(c.items.list("PANO")).toHaveLength(0);
  expect(c.items.list("PANO", { status: "cancelled" })).toHaveLength(1);
  expect(() => c.items.get("bad")).toThrow(ZodError);
  expect(() => c.projects.create({ key: "bad", name: "x" }, "mert")).toThrow(
    ZodError,
  );
  expect(() =>
    c.items.update("PANO-1", { status: "wrong" } as never, "mert"),
  ).toThrow(ZodError);
  expect("delete" in c.items).toBe(false);
});
test("test settings, approval, return note, done and seen", () => {
  const c = setup();
  c.items.create("PANO", { title: "Task" }, "mert");
  c.projects.update(
    "PANO",
    { test_column: false, ai_can_close: false, dod_md: "lint" },
    "mert",
  );
  expect(() => c.items.move("PANO-1", "test", "mert")).toThrow("disabled");
  expect(() => c.items.move("PANO-1", "done", "codex")).toThrow("AI");
  c.projects.update("PANO", { test_column: true }, "mert");
  c.items.move("PANO-1", "test", "mert");
  const s = c.scenarios.add(
    "PANO-1",
    { steps_md: "open", expected_md: "works", author: "mert" },
    "mert",
  );
  expect(() => c.items.move("PANO-1", "done", "mert")).toThrow("Pending");
  expect(() => c.items.move("PANO-1", "in_progress", "mert")).toThrow("reason");
  c.scenarios.update("PANO-1", s.id, { result: "passed" }, "mert");
  c.items.move("PANO-1", "done", "mert");
  expect(c.items.get("PANO-1").done_at).toBeTruthy();
  expect(c.items.markSeen("PANO-1", "mert").seen_at).toBeTruthy();
  expect(c.items.move("PANO-1", "in_progress", "mert").done_at).toBeNull();
});
test("records, scenarios, criteria and attachments retain history", () => {
  const c = setup();
  c.items.create("PANO", { title: "Task" }, "codex");
  const criterion = c.criteria.add("PANO-1", "accept", "codex", 2);
  c.criteria.check("PANO-1", criterion.id, true, "codex");
  c.criteria.remove("PANO-1", criterion.id, "codex");
  const s = c.scenarios.add(
    "PANO-1",
    { steps_md: "step", expected_md: "expected", author: "codex", position: 3 },
    "codex",
  );
  c.scenarios.update("PANO-1", s.id, { result: "failed" }, "mert");
  c.scenarios.remove("PANO-1", s.id, "mert");
  const record = c.records.add(
    "PANO-1",
    { kind: "check", message: "tests passed" },
    "codex",
  );
  c.attachments.add(
    "PANO-1",
    {
      file_name: "a.png",
      mime: "image/png",
      size: 5,
      activity_id: String(record?.id),
    },
    "mert",
  );
  expect(() =>
    c.attachments.add(
      "PANO-1",
      { file_name: "x", mime: "x", size: 1, activity_id: "bad" },
      "mert",
    ),
  ).toThrow();
  expect(c.items.get("PANO-1").criteria).toHaveLength(0);
  expect(c.items.get("PANO-1").scenarios).toHaveLength(0);
  expect(c.items.get("PANO-1").attachments).toHaveLength(1);
  expect(c.db.query("SELECT * FROM criteria").all()).toHaveLength(1);
  expect(c.db.query("SELECT * FROM test_scenarios").all()).toHaveLength(1);
  expect(c.items.get("PANO-1").status).toBe("backlog");
  expect(positionBetween(1, 3)).toBe(2);
  expect(() => positionBetween(2, 1)).toThrow();
  expect(() =>
    c.criteria.check("PANO-1", criterion.id, false, "mert"),
  ).toThrow();
});

test("project summaries count statuses and exclude AI assignees from waiting", () => {
  const c = setup();
  c.items.create("PANO", { title: "Human", assignee: "mert" }, "mert");
  c.items.create("PANO", { title: "AI", assignee: "claude:po" }, "mert");
  c.items.create("PANO", { title: "Unassigned" }, "mert");
  c.items.create("PANO", { title: "Working", assignee: "codex" }, "mert");
  for (const id of [1, 2, 3]) c.items.move(`PANO-${id}`, "test", "mert");
  c.items.move("PANO-4", "in_progress", "mert");
  const project = c.projects.list()[0];
  expect(project?.counts).toEqual({
    backlog: 0,
    in_progress: 1,
    test: 3,
    done: 0,
  });
  expect(project?.waiting.map((item) => item.title)).toEqual([
    "Human",
    "Unassigned",
  ]);
  expect(project?.agents).toBe(1);
});
