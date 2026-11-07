import { expect, test } from "bun:test";
import { createApp, createCore } from "../app";

test("usage API records reports, validates them and adds up the totals", async () => {
  const core = createCore(":memory:");
  try {
    const app = createApp({ core, dataDir: "test" });
    core.projects.create({ key: "USAGE", name: "Usage" }, "mert");
    core.items.create("USAGE", { title: "Veri var" }, "codex");
    core.items.create("USAGE", { title: "No data" }, "codex");
    const post = (body: unknown, key = "USAGE-1") =>
      app.request(`/api/v1/items/${key}/usage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Pano-Actor": "codex",
        },
        body: JSON.stringify(body),
      });
    const created = await post({
      model: "gpt-6.1-sol",
      effort: "high",
      input_tokens: 12000,
      output_tokens: 3000,
      cache_tokens: 500,
      duration_ms: 120000,
    });
    expect(created.status).toBe(200);
    expect(await created.json()).toMatchObject({
      kind: "usage",
      actor: "codex",
    });
    expect((await post({ note: "Sadece not" })).status).toBe(200);
    for (const invalid of [
      {},
      { input_tokens: -1 },
      { output_tokens: 1.5 },
      { total_tokens: -1 },
      { context_tokens: 1.5 },
      { input_tokens: "12" },
      { model: " " },
      { unknown: 1 },
    ])
      expect((await post(invalid)).status).toBe(400);
    expect((await post({ note: "x" }, "USAGE-99")).status).toBe(404);
    expect(
      (await post({ total_tokens: 100, context_tokens: 45 }, "USAGE-2")).status,
    ).toBe(200);
    expect(
      (await post({ context_tokens: 20, duration_ms: 5 }, "USAGE-2")).status,
    ).toBe(200);
    const items = await (
      await app.request("/api/v1/projects/USAGE/items")
    ).json();
    expect(items[0].usage).toEqual({
      total_tokens: 15000,
      runs: 2,
      models: ["gpt-6.1-sol"],
    });
    expect(items[1].usage).toEqual({ total_tokens: 100, runs: 2, models: [] });
    expect(
      (await (await app.request("/api/v1/items/USAGE-2")).json()).usage,
    ).toMatchObject({ total_tokens: 100, peak_context: 45, duration_ms: 5 });
    const detail = await (await app.request("/api/v1/items/USAGE-1")).json();
    expect(detail.usage).toMatchObject({
      actors: ["codex"],
      efforts: ["high"],
      peak_context: 0,
      duration_ms: 120000,
    });
    const summary = await (
      await app.request("/api/v1/projects/USAGE/summary")
    ).json();
    expect(summary.usage.total_tokens).toBe(15100);
    const openapi = await (await app.request("/api/v1/openapi.json")).json();
    expect(
      openapi.paths["/api/v1/items/{key}/usage"].post.requestBody.content[
        "application/json"
      ].schema.properties,
    ).toContainKeys(["input_tokens", "total_tokens", "context_tokens"]);
  } finally {
    core.db.close();
  }
});

test("history API validates pagination, filters records and restores cancellation", async () => {
  const core = createCore(":memory:");
  try {
    const app = createApp({ core, dataDir: "test" });
    core.projects.create({ key: "HISTORY", name: "History" }, "mert");
    core.items.create("HISTORY", { title: "History" }, "codex");
    for (let i = 0; i < 55; i++)
      core.records.add(
        "HISTORY-1",
        { kind: "decision", message: `Karar ${i}` },
        "codex",
      );
    const response = await app.request(
      "/api/v1/items/HISTORY-1/activity?limit=50&offset=0&kind=decision",
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toHaveLength(50);
    const next = await (
      await app.request(
        "/api/v1/items/HISTORY-1/activity?limit=50&offset=50&kind=decision",
      )
    ).json();
    expect(next).toHaveLength(5);
    expect(next[0].message).toBe("Karar 4");
    for (const query of ["offset=-1", "limit=201", "limit=no", "kind=edited"])
      expect(
        (await app.request(`/api/v1/items/HISTORY-1/activity?${query}`)).status,
      ).toBe(400);
    core.items.move(
      "HISTORY-1",
      "cancelled",
      "mert",
      undefined,
      "No longer needed",
    );
    const restored = await app.request("/api/v1/items/HISTORY-1/restore", {
      method: "POST",
      headers: { "X-Pano-Actor": "mert" },
    });
    expect(restored.status).toBe(200);
    expect(await restored.json()).toMatchObject({ status: "backlog" });
    expect(core.activity.list("HISTORY-1")[0]).toMatchObject({
      kind: "restored",
      actor: "mert",
    });
  } finally {
    core.db.close();
  }
});
