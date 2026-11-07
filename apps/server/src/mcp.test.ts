import { expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createApp, createCore } from "./app";

test("MCP client exercises all tools, actor precedence and history", async () => {
  const core = createCore(":memory:");
  core.projects.create({ key: "MCP", name: "MCP" }, "setup");
  const app = createApp({ core, dataDir: "unused", token: "secret" });
  const client = new Client({ name: "test", version: "1" });
  const transport = new StreamableHTTPClientTransport(
    new URL("http://localhost/mcp"),
    {
      requestInit: {
        headers: { Authorization: "Bearer secret", "X-Pano-Actor": "header" },
      },
      fetch: async (input, init) => app.fetch(new Request(input, init)),
    },
  );
  try {
    await client.connect(transport);
    expect(
      (await client.listTools()).tools.map((tool) => tool.name).sort(),
    ).toEqual([
      "add_record",
      "check_criterion",
      "create_item",
      "get_board",
      "get_item",
      "list_projects",
      "record_usage",
      "update_item",
    ]);
    const call = async (name: string, args: Record<string, unknown> = {}) => {
      const response = await client.callTool({ name, arguments: args });
      expect(response.isError).not.toBe(true);
      const content = response.content as { type: string; text: string }[];
      if (!content[0]) throw new Error("Missing tool response");
      return JSON.parse(content[0].text);
    };
    expect((await call("list_projects"))[0].key).toBe("MCP");
    const created = await call("create_item", {
      project: "MCP",
      title: "Work",
      criteria: ["Done"],
      actor: "tool",
    });
    expect(created.key).toBe("MCP-1");
    await call("check_criterion", {
      key: "MCP-1",
      id: created.criteria[0].id,
      done: true,
    });
    await call("update_item", {
      key: "MCP-1",
      status: "test",
      scenarios: [
        { action: "add", steps_md: "Do", expected_md: "See", author: "header" },
      ],
    });
    expect((await call("get_board", { project: "MCP" })).waiting).toHaveLength(
      1,
    );
    await call("update_item", {
      key: "MCP-1",
      status: "in_progress",
      reason: "Please fix",
    });
    for (let i = 0; i < 6; i++)
      await call("add_record", {
        key: "MCP-1",
        kind: "check",
        message: `Check ${i}`,
      });
    const item = await call("get_item", { key: "MCP-1" });
    expect(item.return_note).toBe("Please fix");
    expect(item.activity).toHaveLength(5);
    expect(item.scenarios).toHaveLength(1);
    const history = await call("get_item", { key: "MCP-1", history: true });
    expect(history.activity.length).toBeGreaterThan(5);
    expect(history.activity.at(-1).actor).toBe("header");
    const usage = await call("record_usage", {
      key: "MCP-1",
      model: "gpt-6.1-sol",
      effort: "high",
      input_tokens: 10,
      output_tokens: 5,
      actor: "tool",
    });
    expect(usage).toMatchObject({ kind: "usage", actor: "header" });
    expect(JSON.parse(usage.after_json)).toEqual({
      model: "gpt-6.1-sol",
      effort: "high",
      input_tokens: 10,
      output_tokens: 5,
    });
    expect((await call("get_item", { key: "MCP-1" })).usage).toEqual({
      total_tokens: 15,
      runs: 1,
      models: ["gpt-6.1-sol"],
      actors: ["header"],
      efforts: ["high"],
    });
    const empty = await client.callTool({
      name: "record_usage",
      arguments: { key: "MCP-1" },
    });
    expect(empty.isError).toBe(true);
    expect((await app.request("/mcp", { method: "POST" })).status).toBe(401);
    const guide = await app.request("/agents.md");
    expect(guide.status).toBe(200);
    expect(await guide.text()).toContain("record_usage");
  } finally {
    await client.close();
    core.close();
  }
});
