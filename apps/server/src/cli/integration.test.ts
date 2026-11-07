import { expect, test } from "bun:test";
import { createApp, createCore } from "../app";
import type { Fetch } from "./client";
import { runCli } from "./index";

function setup() {
  const core = createCore(":memory:");
  const app = createApp({ core, dataDir: "unused-cli-test", token: "secret" });
  const env = {
    PANO_URL: "http://pano.test",
    PANO_TOKEN: "secret",
    PANO_ACTOR: "codex:cli",
  };
  const fetcher: Fetch = async (url, init) => app.fetch(new Request(url, init));
  const run = async (args: string[], fetch: Fetch = fetcher) => {
    let out = "";
    let err = "";
    const code = await runCli(args, {
      env,
      fetch,
      stdout: (s) => {
        out += s;
      },
      stderr: (s) => {
        err += s;
      },
    });
    return { code, out, err };
  };
  return { core, app, run };
}

test("CLI creates criteria, moves through REST, emits SSE and preserves actor", async () => {
  const { run, app, core } = setup();
  expect(
    (await run(["project", "create", "PANO", "Türkçe İşler", "--json"])).code,
  ).toBe(0);
  const created = await run([
    "task",
    "create",
    "PANO",
    "Başlık",
    "--criteria",
    "A",
    "--criteria",
    "B",
    "--json",
  ]);
  const item = JSON.parse(created.out);
  expect(item.key).toBe("PANO-1");
  expect(item.criteria.map((c: { text: string }) => c.text)).toEqual([
    "A",
    "B",
  ]);
  const response = await app.request("/api/v1/events?project=PANO", {
    headers: { Authorization: "Bearer secret" },
  });
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Missing SSE stream");
  try {
    await reader.read();
    const next = reader.read();
    expect((await run(["task", "move", "PANO-1", "test", "--json"])).code).toBe(
      0,
    );
    const event = await Promise.race([
      next,
      Bun.sleep(1000).then(() => {
        throw new Error("SSE timeout");
      }),
    ]);
    expect(new TextDecoder().decode(event.value)).toContain(
      "event: item.moved",
    );
    expect(core.activity.list("PANO-1")[0]).toMatchObject({
      actor: "codex:cli",
      kind: "moved",
    });
  } finally {
    await reader.cancel();
  }
  const board = await run(["board", "PANO"]);
  for (const column of [
    "backlog (0)",
    "in_progress (0)",
    "test (1)",
    "done (0)",
  ])
    expect(board.out).toContain(column);
  expect(board.out).toContain("Başlık");
  expect((await run(["task", "create", "PANO", "İkinci"])).out).toContain(
    "PANO-2",
  );
});

test("all commands produce JSON; project toggles, assignment, check and note work", async () => {
  const { run } = setup();
  const json = async (args: string[]) => {
    const result = await run([...args, "--json"]);
    expect(result.err).toBe("");
    expect(result.code).toBe(0);
    return JSON.parse(result.out);
  };
  await json(["project", "create", "PANO", "Pano"]);
  await json(["project", "list"]);
  expect((await json(["project", "star", "PANO"])).starred).toBe(1);
  expect((await json(["project", "star", "PANO", "--off"])).starred).toBe(0);
  const item = await json([
    "task",
    "create",
    "PANO",
    "İş",
    "--criteria",
    "Ölçüt",
    "--priority",
    "high",
  ]);
  await json(["task", "show", "PANO-1", "--history"]);
  expect((await json(["task", "assign", "PANO-1", "mert"])).assignee).toBe(
    "mert",
  );
  expect(
    (await json(["task", "assign", "PANO-1", "none"])).assignee,
  ).toBeNull();
  await json(["task", "check", "PANO-1", item.criteria[0].id]);
  expect((await json(["task", "show", "PANO-1"])).criteria[0].done).toBe(1);
  await json(["task", "check", "PANO-1", item.criteria[0].id, "--undo"]);
  await json(["task", "note", "PANO-1", "Türkçe not"]);
  expect((await json(["task", "move", "PANO-1", "in-progress"])).status).toBe(
    "in_progress",
  );
  await json(["board", "PANO"]);
  await json([
    "task",
    "move",
    "PANO-1",
    "cancelled",
    "--reason",
    "Gerek kalmadı",
  ]);
  expect((await json(["project", "archive", "PANO"])).archived_at).toBeTruthy();
  expect(await json(["project", "list"])).toHaveLength(0);
  expect(await json(["project", "list", "--all"])).toHaveLength(1);
  await json(["project", "archive", "PANO", "--off"]);
  await json(["--help"]);
  for (const target of ["claude", "codex", "cursor"]) {
    const config = await json(["mcp-config", target]);
    expect(config).toContain("http://pano.test/mcp");
    if (target === "claude")
      expect(config).toStartWith("claude mcp add --transport http pano");
    if (target === "cursor")
      expect(JSON.parse(config).mcpServers.pano.url).toBe(
        "http://pano.test/mcp",
      );
  }
});

test("task usage sends only the given values and rejects bad ones", async () => {
  const { run, core } = setup();
  await run(["project", "create", "PANO", "Pano"]);
  await run(["task", "create", "PANO", "İş"]);
  const result = await run([
    "task",
    "usage",
    "PANO-1",
    "--model",
    "gpt-6.1-sol",
    "--effort",
    "high",
    "--input",
    "1",
    "--output",
    "2",
    "--duration",
    "3",
    "--json",
  ]);
  expect(result.err).toBe("");
  expect(result.code).toBe(0);
  const record = JSON.parse(result.out);
  expect(record).toMatchObject({ kind: "usage", actor: "codex:cli" });
  expect(JSON.parse(record.after_json)).toEqual({
    model: "gpt-6.1-sol",
    effort: "high",
    input_tokens: 1,
    output_tokens: 2,
    duration_ms: 3,
  });
  expect(core.items.get("PANO-1").usage.total_tokens).toBe(3);
  const totals = await run([
    "task",
    "usage",
    "PANO-1",
    "--total",
    "100",
    "--context",
    "45",
    "--json",
  ]);
  expect(totals.code).toBe(0);
  expect(JSON.parse(JSON.parse(totals.out).after_json)).toEqual({
    total_tokens: 100,
    context_tokens: 45,
  });
  expect(core.items.get("PANO-1").usage).toMatchObject({
    total_tokens: 103,
    peak_context: 45,
    runs: 2,
  });
  for (const args of [
    ["task", "usage", "PANO-1"],
    ["task", "usage", "PANO-1", "--input", "-1"],
    ["task", "usage", "PANO-1", "--output", "many"],
    ["task", "usage", "PANO-1", "--total", "-1"],
    ["task", "usage", "PANO-1", "--context", "many"],
    ["task", "usage", "--model", "x"],
  ]) {
    const failed = await run(args);
    expect(failed.code).toBe(1);
    expect(failed.out).toBe("");
  }
  expect(core.items.get("PANO-1").usage.runs).toBe(2);
});

test("help is offline; serve JSON dispatch is injectable; default URL and headers", async () => {
  let out = "";
  const offline: Fetch = async () => {
    throw new Error("must not fetch");
  };
  expect(
    await runCli([], {
      fetch: offline,
      stdout: (s) => {
        out += s;
      },
    }),
  ).toBe(0);
  expect(out).toContain("Pano CLI");
  let served = false;
  out = "";
  expect(
    await runCli(["serve", "--json"], {
      env: {},
      serve: async () => {
        served = true;
      },
      stdout: (s) => {
        out += s;
      },
    }),
  ).toBe(0);
  expect(served).toBe(true);
  expect(JSON.parse(out).port).toBe(7777);
  const fetcher: Fetch = async (url, init) => {
    expect(url).toBe("http://127.0.0.1:7777/api/v1/projects");
    expect(init?.headers).toEqual({});
    return Response.json([]);
  };
  expect(
    await runCli(["--json", "project", "list"], {
      env: {},
      fetch: fetcher,
      stdout: () => {},
    }),
  ).toBe(0);
});

test("validation, offline and API errors go to stderr with code 1 and no trace", async () => {
  const { run } = setup();
  for (const args of [
    ["task", "move", "PANO-1", "cancelled"],
    ["task", "move", "PANO-1", "unknown"],
    ["task", "create", "PANO", "İş", "--priority", "urgent"],
    ["project", "list", "--unknown"],
    ["board"],
    ["mcp-config", "unknown"],
    ["task", "show", "MISSING-1"],
    ["unknown"],
  ]) {
    const result = await run([...args, "--json"]);
    expect(result.code).toBe(1);
    expect(result.out).toBe("");
    expect(JSON.parse(result.err).error.message).toBeTruthy();
  }
  const result = await run(["project", "list"], async () => {
    throw new Error("ECONNREFUSED\nstack");
  });
  expect(result.code).toBe(1);
  expect(result.out).toBe("");
  expect(result.err).toBe(
    "Error: Could not connect to the server (http://pano.test); start it with pano serve.\n",
  );
  expect(result.err).not.toContain("stack");
  const unauthorized = await run(["project", "list", "--json"], async () =>
    Response.json({ error: { message: "Unauthorized" } }, { status: 401 }),
  );
  expect(unauthorized.code).toBe(1);
  expect(JSON.parse(unauthorized.err).error.message).toBe("Unauthorized");
});
