import { expect, test } from "bun:test";
import { createApp, createCore } from "../app";

test("summary REST response, missing project, authentication and OpenAPI", async () => {
  const core = createCore(":memory:");
  try {
    core.projects.create({ key: "DEMO", name: "Demo" }, "seed");
    for (let i = 1; i <= 4; i++)
      core.items.create("DEMO", { title: `Work ${i}` }, "seed");
    const app = createApp({ core, dataDir: "test", token: "summary-test" });
    const get = (path: string) =>
      app.request(`/api/v1${path}`, {
        headers: { Authorization: "Bearer summary-test" },
      });
    expect((await app.request("/api/v1/projects/DEMO/summary")).status).toBe(
      401,
    );
    expect((await get("/projects/MISSING/summary")).status).toBe(404);
    const response = await get("/projects/DEMO/summary");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      total: 4,
      completed: 0,
      remaining: 4,
    });
    core.items.move("DEMO-1", "done", "seed");
    expect(await (await get("/projects/DEMO/summary")).json()).toMatchObject({
      total: 4,
      completed: 1,
      remaining: 3,
      completed_last_7_days: 1,
    });
    const spec = await (await get("/openapi.json")).json();
    expect(
      spec.paths["/api/v1/projects/{key}/summary"].get.responses["200"].content[
        "application/json"
      ].schema.properties.burn_up.type,
    ).toBe("array");
  } finally {
    core.close();
  }
});
