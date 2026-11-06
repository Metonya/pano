import { expect, test } from "bun:test";
import { createApp, createCore } from "../app";

test("history API validates pagination, filters records and restores cancellation", async () => {
  const core = createCore(":memory:");
  try {
    const app = createApp({ core, dataDir: "test" });
    core.projects.create({ key: "HISTORY", name: "Geçmiş" }, "mert");
    core.items.create("HISTORY", { title: "Geçmiş" }, "codex");
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
      "Gerek kalmadı",
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
