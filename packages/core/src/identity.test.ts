import { afterEach, expect, test } from "bun:test";
import { userInfo } from "node:os";
import { type Core, createCore, defaultUserName } from "./index";

const opened: Core[] = [];
function setup(userName = "mert") {
  const core = createCore(":memory:");
  opened.push(core);
  core.db.query("INSERT INTO settings VALUES ('userName', ?)").run(userName);
  core.projects.create({ key: "PANO", name: "Pano" }, userName);
  return core;
}
afterEach(() => {
  for (const core of opened.splice(0)) core.close();
});

test("a Test card waits when unassigned or assigned to the person, in any case", () => {
  const c = setup();
  for (const [title, assignee] of [
    ["Empty", null],
    ["Mine", "MERT"],
    ["Unknown agent", "cursor"],
    ["Role", "cursor:review"],
    ["Known", "claude:po"],
  ] as const) {
    const { key } = c.items.create("PANO", { title, assignee }, "codex");
    c.items.move(key, "test", "codex");
  }
  expect(c.items.board("PANO").waiting.map((i) => i.title)).toEqual([
    "Empty",
    "Mine",
  ]);
  expect(
    c.projects
      .list()[0]
      ?.waiting.map((i) => i.title)
      .sort(),
  ).toEqual(["Empty", "Mine"]);
});

test("an unknown agent counts as an agent on the project card", () => {
  const c = setup();
  const { key } = c.items.create(
    "PANO",
    { title: "Work", assignee: "cursor" },
    "cursor",
  );
  c.items.move(key, "in_progress", "cursor");
  const mine = c.items.create(
    "PANO",
    { title: "Own", assignee: "mert" },
    "mert",
  );
  c.items.move(mine.key, "in_progress", "mert");
  expect(c.projects.list()[0]?.agents).toBe(1);
});

test("the project card counts agents per tool: three Claude roles and Codex are two", () => {
  const c = setup();
  for (const assignee of [
    "claude:kimlik",
    "claude:kullanim",
    "Claude:po",
    "codex",
    "mert",
  ]) {
    const { key } = c.items.create("PANO", { title: assignee, assignee }, "x");
    c.items.move(key, "in_progress", "x");
  }
  // A tool that is not working right now does not count.
  c.items.create("PANO", { title: "Idle", assignee: "cursor" }, "x");
  expect(c.projects.list()[0]?.agents).toBe(2);
});

test("the human alias resolves to the current name, in create, update and assign", () => {
  const c = setup();
  const created = c.items.create(
    "PANO",
    { title: "Alias", assignee: "human" },
    "codex",
  );
  expect(created.assignee).toBe("mert");
  c.items.assign(created.key, "codex", "codex");
  expect(c.items.assign(created.key, "Human", "codex").assignee).toBe("mert");
  c.items.assign(created.key, null, "codex");
  expect(
    c.items.update(created.key, { assignee: "human" }, "codex").assignee,
  ).toBe("mert");
});

test("renaming leaves existing records as they are", () => {
  const c = setup();
  const { key } = c.items.create(
    "PANO",
    { title: "Old", assignee: "mert" },
    "x",
  );
  c.items.move(key, "test", "x");
  c.db.query("UPDATE settings SET value = 'alex' WHERE key = 'userName'").run();
  expect(c.userName()).toBe("alex");
  expect(c.items.get(key).assignee).toBe("mert");
  expect(c.items.board("PANO").waiting).toHaveLength(0);
});

test("sending back returns to the last actor who is not the person", () => {
  const c = setup();
  const { key } = c.items.create("PANO", { title: "Back" }, "cursor:dev");
  c.items.update(key, { status: "test", assignee: "human" }, "cursor:dev");
  c.items.sendBack(key, { note: "Fix" }, "mert");
  expect(c.items.get(key)).toMatchObject({
    status: "in_progress",
    assignee: "cursor:dev",
  });
});

test("sending back ignores the anonymous actor and leaves no agent unassigned", () => {
  const c = setup();
  const { key } = c.items.create("PANO", { title: "Solo" }, "mert");
  c.items.move(key, "test", "anonymous");
  c.items.sendBack(key, { note: "Again" }, "MERT");
  expect(c.items.get(key)).toMatchObject({
    status: "in_progress",
    assignee: null,
  });
});

test("an unknown agent cannot close when AI closing is off, the person can", () => {
  const c = setup();
  c.projects.update("PANO", { ai_can_close: false }, "mert");
  const { key } = c.items.create("PANO", { title: "Close" }, "mert");
  expect(() => c.items.move(key, "done", "cursor")).toThrow("AI cannot close");
  expect(c.items.move(key, "done", "mert").status).toBe("done");
});

test("the default name is PANO_USER, else the lowercase system account", () => {
  const before = process.env.PANO_USER;
  try {
    process.env.PANO_USER = "Sam";
    expect(defaultUserName()).toBe("Sam");
    delete process.env.PANO_USER;
    expect(defaultUserName()).toBe(userInfo().username.toLowerCase());
  } finally {
    if (before === undefined) delete process.env.PANO_USER;
    else process.env.PANO_USER = before;
  }
});
