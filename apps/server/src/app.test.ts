import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp, createCore } from "./app";
import { serverConfig } from "./main";

const core = createCore(":memory:");
const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0))
    await rm(dir, { recursive: true, force: true });
});
const request = (
  app: ReturnType<typeof createApp>,
  path: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
) =>
  app.request(`/api/v1${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

test("project, item, actor, validation, conflicts and OpenAPI", async () => {
  const app = createApp({ core, dataDir: "test" });
  expect(
    (await request(app, "/projects", "POST", { key: "API", name: "API" }))
      .status,
  ).toBe(200);
  expect(
    (
      await request(app, "/projects/API/items", "POST", {
        title: "Work",
        priority: "high",
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await request(
        app,
        "/items/API-1/move",
        "POST",
        { status: "test" },
        { "X-Pano-Actor": "codex:test" },
      )
    ).status,
  ).toBe(200);
  const activity = await (await request(app, "/items/API-1/activity")).json();
  expect(activity[0]).toMatchObject({ actor: "codex:test", kind: "moved" });
  expect(
    (await request(app, "/items/API-1/move", "POST", { status: "unknown" }))
      .status,
  ).toBe(400);
  expect((await request(app, "/items/API-99")).status).toBe(404);
  expect(
    (await request(app, "/projects", "POST", { key: "API", name: "Duplicate" }))
      .status,
  ).toBe(409);
  const spec = await (await request(app, "/openapi.json")).json();
  expect(spec.openapi).toBe("3.1.0");
  expect(spec.paths["/api/v1/items/{key}/move"].post).toBeDefined();
  expect(spec.paths["/api/v1/openapi.json"].get).toBeDefined();
});

test("suggest-key is a documented GET route and creating still requires key", async () => {
  const isolated = createCore(":memory:");
  try {
    const app = createApp({ core: isolated, dataDir: "test" });
    const path = `/projects/suggest-key?name=${encodeURIComponent("Örnek Proje")}`;
    expect(await (await request(app, path)).json()).toEqual({ key: "OP" });
    isolated.projects.create({ key: "OP", name: "Örnek Proje" }, "mert");
    isolated.projects.archive("OP", true, "mert");
    expect(await (await request(app, path)).json()).toEqual({ key: "OP2" });
    expect((await request(app, "/projects/suggest-key")).status).toBe(400);
    expect(
      (await request(app, "/projects", "POST", { name: "Örnek Proje" })).status,
    ).toBe(400);
    const spec = await (await request(app, "/openapi.json")).json();
    const endpoint = spec.paths["/api/v1/projects/suggest-key"].get;
    expect(endpoint.parameters).toContainEqual(
      expect.objectContaining({ name: "name", in: "query", required: true }),
    );
    expect(
      endpoint.responses[200].content["application/json"].schema.properties.key
        .type,
    ).toBe("string");
  } finally {
    isolated.close();
  }
});

test("host security and bearer authentication", async () => {
  expect(() => serverConfig({ PANO_HOST: "0.0.0.0" })).toThrow("PANO_TOKEN");
  expect(
    serverConfig({ PANO_HOST: "0.0.0.0", PANO_TOKEN: "secret" }).token,
  ).toBe("secret");
  const app = createApp({ core, dataDir: "test", token: "secret" });
  expect((await request(app, "/health")).status).toBe(200);
  expect((await request(app, "/system")).status).toBe(401);
  expect(
    (
      await request(app, "/system", "GET", undefined, {
        Authorization: "Bearer secret",
      })
    ).status,
  ).toBe(200);
});

test("local Docker mode restricts host and browser origins while supporting native clients", async () => {
  const config = serverConfig({ PANO_HOST: "0.0.0.0", PANO_LOCAL_DOCKER: "1" });
  expect(config.localDocker).toBe(true);
  expect(() =>
    serverConfig({
      PANO_HOST: "0.0.0.0",
      PANO_LOCAL_DOCKER: "1",
      PANO_TOKEN: "secret",
    }),
  ).toThrow();
  expect(() => serverConfig({ PANO_LOCAL_DOCKER: "1" })).toThrow();
  expect(() =>
    serverConfig({ PANO_HOST: "0.0.0.0", PANO_LOCAL_DOCKER: "true" }),
  ).toThrow();
  const app = createApp({ core, dataDir: "test", localOnly: true });
  const call = (
    path: string,
    headers: Record<string, string>,
    method = "GET",
  ) => app.request(`http://localhost:7777${path}`, { method, headers });
  for (const host of ["localhost:7777", "127.0.0.1:7777"]) {
    expect((await call("/api/v1/projects", { host })).status).toBe(200);
    expect(
      (
        await call("/api/v1/projects", {
          host,
          origin: `http://${host}`,
          "sec-fetch-site": "same-origin",
        })
      ).status,
    ).toBe(200);
  }
  for (const path of ["/", "/api/v1/projects", "/api/v1/health", "/mcp"]) {
    expect((await call(path, { host: "evil.example:7777" })).status).toBe(403);
    expect(
      (
        await call(path, {
          host: "localhost:7777",
          origin: "https://evil.example",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call(path, {
          host: "localhost:7777",
          "sec-fetch-site": "cross-site",
        })
      ).status,
    ).toBe(403);
  }
  expect(
    (
      await call(
        "/api/v1/projects",
        {
          host: "localhost:7777",
          origin: "null",
          "content-type": "text/plain",
        },
        "POST",
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await call("/api/v1/projects", {
        host: "localhost:7777",
        origin: "http://localhost:9999",
      })
    ).status,
  ).toBe(403);
  expect(
    (await call("/api/v1/projects", { host: "localhost.evil.example:7777" }))
      .status,
  ).toBe(403);
  expect(
    (await (await call("/api/v1/system", { host: "localhost:7777" })).json())
      .authRequired,
  ).toBe(false);
});

test("SSE sends moves promptly and releases the listener", async () => {
  const app = createApp({ core, dataDir: "test" });
  await request(app, "/projects", "POST", { key: "SSE", name: "SSE" });
  await request(app, "/projects/SSE/items", "POST", { title: "Stream" });
  const before = core.events.listenerCount("change");
  const response = await request(app, "/events?project=SSE");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Missing event stream");
  await reader.read();
  const next = reader.read();
  await request(app, "/items/SSE-1/move", "POST", { status: "test" });
  const result = await Promise.race([
    next,
    Bun.sleep(1000).then(() => {
      throw new Error("SSE timeout");
    }),
  ]);
  expect(new TextDecoder().decode(result.value)).toContain("event: item.moved");
  await reader.cancel();
  expect(core.events.listenerCount("change")).toBe(before);
});

test("multipart attachments and child services", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pano-api-"));
  dirs.push(dir);
  const app = createApp({ core, dataDir: dir });
  await request(app, "/projects", "POST", { key: "FILE", name: "Files" });
  await request(app, "/projects/FILE/items", "POST", { title: "Item" });
  const form = new FormData();
  form.set("file", new File(["png"], "test.png", { type: "image/png" }));
  const response = await app.request("/api/v1/items/FILE-1/attachments", {
    method: "POST",
    body: form,
  });
  expect(response.status).toBe(200);
  const attachment = await response.json();
  expect(await Bun.file(join(dir, "attachments", attachment.id)).text()).toBe(
    "png",
  );
  const criterion = await (
    await request(app, "/items/FILE-1/criteria", "POST", { text: "Check" })
  ).json();
  expect(
    (
      await request(app, `/items/FILE-1/criteria/${criterion.id}`, "PATCH", {
        done: true,
      })
    ).status,
  ).toBe(200);
  const scenario = await (
    await request(app, "/items/FILE-1/scenarios", "POST", {
      steps_md: "Do",
      expected_md: "See",
      author: "mert",
    })
  ).json();
  expect(
    (
      await request(app, `/items/FILE-1/scenarios/${scenario.id}`, "PATCH", {
        result: "passed",
      })
    ).status,
  ).toBe(200);
  expect(
    (await request(app, `/items/FILE-1/scenarios/${scenario.id}`, "DELETE"))
      .status,
  ).toBe(200);
  expect(
    (
      await request(app, "/items/FILE-1/records", "POST", {
        kind: "check",
        message: "OK",
      })
    ).status,
  ).toBe(200);
});
