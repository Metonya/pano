import { expect, test } from "bun:test";
import { createApp, createCore } from "../app";

test("userName defaults, saves, travels to /system and rejects a colon", async () => {
  const core = createCore(":memory:");
  try {
    const app = createApp({ core, dataDir: "test" });
    const read = async (path: string) =>
      (await (await app.request(`/api/v1${path}`)).json()) as {
        userName: string;
      };
    const patch = (userName: string) =>
      app.request("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName }),
      });
    expect((await read("/settings")).userName).toBeTruthy();
    expect((await patch("  Şükrü ")).status).toBe(200);
    expect((await read("/settings")).userName).toBe("Şükrü");
    expect((await read("/system")).userName).toBe("Şükrü");
    expect((await patch("claude:po")).status).toBe(400);
    expect((await patch("   ")).status).toBe(400);
  } finally {
    core.close();
  }
});

test("a percent-encoded actor header is recorded as the real name", async () => {
  const core = createCore(":memory:");
  try {
    const app = createApp({ core, dataDir: "test" });
    const response = await app.request("/api/v1/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Pano-Actor": encodeURIComponent("Şükrü"),
      },
      body: JSON.stringify({ key: "NAME", name: "Name" }),
    });
    expect(response.status).toBe(200);
    expect(core.db.query("SELECT actor FROM activity LIMIT 1").get()).toEqual({
      actor: "Şükrü",
    });
  } finally {
    core.close();
  }
});

test("the API resolves assignee human without the agent knowing the name", async () => {
  const core = createCore(":memory:");
  try {
    const app = createApp({ core, dataDir: "test" });
    core.db.query("INSERT INTO settings VALUES ('userName', 'alex')").run();
    core.projects.create({ key: "NAME", name: "Name" }, "alex");
    const response = await app.request("/api/v1/projects/NAME/items", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Pano-Actor": "codex" },
      body: JSON.stringify({ title: "Task", assignee: "human" }),
    });
    expect((await response.json()).assignee).toBe("alex");
  } finally {
    core.close();
  }
});

test("settings accept all 14 UI languages and reject unsupported codes", async () => {
  const core = createCore(":memory:");
  try {
    const app = createApp({ core, dataDir: "test" });
    const patch = (language: string) =>
      app.request("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });
    for (const language of [
      "en",
      "tr",
      "az",
      "zh",
      "hi",
      "es",
      "de",
      "fr",
      "pt",
      "ja",
      "nl",
      "ko",
      "sv",
      "pl",
    ]) {
      expect((await patch(language)).status).toBe(200);
      expect(
        await (await app.request("/api/v1/settings")).json(),
      ).toMatchObject({ language });
    }
    expect((await patch("ru")).status).toBe(400);
  } finally {
    core.close();
  }
});
