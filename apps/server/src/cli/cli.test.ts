import { expect, test } from "bun:test";
import type { Fetch } from "./client";
import { runCli } from "./index";

async function run(
  args: string[],
  fetcher: Fetch = async () =>
    Response.json({ key: "PANO-3", title: "Başlık", criteria: [] }),
  env: NodeJS.ProcessEnv = {},
) {
  let out = "";
  let err = "";
  const code = await runCli(args, {
    env,
    fetch: fetcher,
    stdout: (s) => {
      out += s;
    },
    stderr: (s) => {
      err += s;
    },
  });
  return { code, out, err };
}

test("create sends criteria, auth and actor through REST and prints Turkish key/title", async () => {
  const result = await run(
    ["task", "create", "PANO", "Başlık", "--criteria", "A", "--criteria", "B"],
    async (url, init) => {
      expect(url).toBe("http://example.test/base/api/v1/projects/PANO/items");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({
        Authorization: "Bearer secret",
        "X-Pano-Actor": "codex",
        "Content-Type": "application/json",
      });
      expect(JSON.parse(String(init?.body))).toEqual({
        title: "Başlık",
        criteria: ["A", "B"],
      });
      return Response.json({ key: "PANO-3", title: "Başlık" });
    },
    {
      PANO_URL: "http://example.test/base/",
      PANO_TOKEN: "secret",
      PANO_ACTOR: "codex",
    },
  );
  expect(result.code).toBe(0);
  expect(result.err).toBe("");
  expect(result.out).toContain("PANO-3  Başlık");
});

test("every CLI command supports JSON without opening a port", async () => {
  const commands = [
    ["project", "list"],
    ["project", "create", "PANO", "Pano"],
    ["project", "star", "PANO"],
    ["project", "archive", "PANO"],
    ["task", "create", "PANO", "İş"],
    ["task", "show", "PANO-3"],
    ["task", "move", "PANO-3", "test"],
    ["task", "assign", "PANO-3", "codex"],
    ["task", "check", "PANO-3", "criterion-id"],
    ["task", "note", "PANO-3", "Not"],
    ["task", "usage", "PANO-3", "--model", "x"],
    ["board", "PANO"],
    ["mcp-config", "claude"],
    ["mcp-config", "codex"],
    ["mcp-config", "cursor"],
    ["--help"],
    [],
  ];
  for (const command of commands) {
    const result = await run([...command, "--json"], async (url) =>
      Response.json(
        url.endsWith("/items") ? [] : { key: "PANO-3", title: "İş" },
      ),
    );
    expect(result.code).toBe(0);
    expect(result.err).toBe("");
    expect(() => JSON.parse(result.out)).not.toThrow();
  }
  let served = false;
  let out = "";
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
  expect(JSON.parse(out)).toMatchObject({ serving: true, port: 7777 });
});

test("four readable board columns and custom MCP URL", async () => {
  const board = await run(["board", "PANO"], async () =>
    Response.json([
      {
        number: 3,
        title: "Başlık",
        status: "test",
        priority: "high",
        assignee: "codex",
      },
    ]),
  );
  for (const text of [
    "backlog (0)",
    "in_progress (0)",
    "test (1)",
    "done (0)",
    "PANO-3",
    "Başlık",
  ])
    expect(board.out).toContain(text);
  expect(
    (
      await run(["mcp-config", "claude"], undefined, {
        PANO_URL: "http://example.test:8888/",
      })
    ).out.trim(),
  ).toBe('claude mcp add --transport http pano "http://example.test:8888/mcp"');
  const cursor = await run(["mcp-config", "cursor"], undefined, {
    PANO_URL: "http://example.test/",
  });
  expect(JSON.parse(cursor.out).mcpServers.pano.url).toBe(
    "http://example.test/mcp",
  );
});

test("validation prevents requests; offline and API errors are concise stderr JSON", async () => {
  let requested = false;
  const failFetch: Fetch = async () => {
    requested = true;
    throw new Error("ECONNREFUSED\nstack trace");
  };
  for (const args of [
    ["task", "move", "PANO-3", "cancelled"],
    ["task", "move", "PANO-3", "invalid"],
    ["task", "create", "PANO", "İş", "--priority", "urgent"],
    ["board"],
    ["unknown"],
    ["task", "show", "--unknown"],
  ]) {
    const result = await run([...args, "--json"], failFetch);
    expect(result.code).toBe(1);
    expect(result.out).toBe("");
    expect(JSON.parse(result.err).error.message).toBeTruthy();
  }
  expect(requested).toBe(false);
  expect((await run([], failFetch)).code).toBe(0);
  expect(requested).toBe(false);
  const offline = await run(["project", "list", "--json"], failFetch);
  expect(offline.code).toBe(1);
  expect(offline.out).toBe("");
  expect(JSON.parse(offline.err).error.message).toContain(
    "pano serve ile başlat",
  );
  expect(offline.err).not.toContain("stack trace");
  const rejected = await run(["task", "show", "PANO-3", "--json"], async () =>
    Response.json({ error: { message: "Unauthorized" } }, { status: 401 }),
  );
  expect(rejected.code).toBe(1);
  expect(JSON.parse(rejected.err).error.message).toBe("Unauthorized");
});

test("status alias, cancellation reason and default URL are sent correctly", async () => {
  for (const [status, reason] of [
    ["in-progress", undefined],
    ["cancelled", "Gerek kalmadı"],
  ] as const) {
    const args: string[] = ["task", "move", "PANO-3", status];
    if (reason) args.push("--reason", reason);
    const result = await run(args, async (url, init) => {
      expect(url).toBe("http://127.0.0.1:7777/api/v1/items/PANO-3/move");
      expect(JSON.parse(String(init?.body))).toEqual({
        status: status === "in-progress" ? "in_progress" : status,
        ...(reason ? { reason } : {}),
      });
      return Response.json({ ok: true });
    });
    expect(result.code).toBe(0);
  }
});

test("healthcheck exits 0 only when the local server answers", async () => {
  const ok = await runCli(["healthcheck"], {
    env: { PANO_PORT: "1234" },
    fetch: (async (url: string) => {
      expect(url).toBe("http://127.0.0.1:1234/api/v1/health");
      return new Response("{}");
    }) as never,
  });
  expect(ok).toBe(0);
  const down = await runCli(["healthcheck"], {
    env: {},
    fetch: (async () => {
      throw new Error("offline");
    }) as never,
  });
  expect(down).toBe(1);
});
