import { type OpenAPIHono, z } from "@hono/zod-openapi";
import type { Core } from "@pano/core";
import type { Context } from "hono";
import { version } from "../../../../package.json";
import { eventsResponse } from "../sse";
import { createSystem } from "../system";
import { registerAttachments } from "./attachments";
import { registerChildren } from "./children";
import { registerItems } from "./items";
import { registerProjects } from "./projects";
import { registerSummary } from "./summary";

export function registerRoutes(
  app: OpenAPIHono,
  {
    core,
    dataDir,
    fetch: fetcher,
    checkUpdates,
  }: {
    core: Core;
    dataDir: string;
    token?: string;
    fetch?: typeof fetch;
    checkUpdates?: boolean;
  },
) {
  type Method = "get" | "post" | "patch" | "delete";
  const route = (
    method: Method,
    path: string,
    handler: (c: Context) => Response | Promise<Response>,
    body?: z.ZodType,
    query?: z.ZodObject,
    response?: z.ZodType,
  ) => {
    const params = [...path.matchAll(/:([A-Za-z]+)/g)].map(
      (m) => m[1] as string,
    );
    const openPath = `/api/v1${path.replace(/:([A-Za-z]+)/g, "{$1}")}`;
    app.openAPIRegistry.registerPath({
      method,
      path: openPath,
      ...(path === "/health" ? {} : { security: [{}, { bearerAuth: [] }] }),
      request: {
        ...(method === "get"
          ? {}
          : { headers: z.object({ "X-Pano-Actor": z.string().optional() }) }),
        ...(params.length
          ? {
              params: z.object(
                Object.fromEntries(params.map((p) => [p, z.string()])),
              ),
            }
          : {}),
        ...(query ? { query } : {}),
        ...(body
          ? {
              body: {
                required: true,
                content: {
                  [path.endsWith("/attachments")
                    ? "multipart/form-data"
                    : "application/json"]: { schema: body },
                },
              },
            }
          : {}),
      },
      responses: {
        200: {
          description: "Success",
          content:
            path === "/events"
              ? { "text/event-stream": { schema: z.string() } }
              : { "application/json": { schema: response ?? z.unknown() } },
        },
        400: { description: "Invalid request" },
        401: { description: "Unauthorized" },
        404: { description: "Not found" },
        409: { description: "Conflict" },
      },
    });
    app.on(method.toUpperCase(), `/api/v1${path}`, handler);
  };
  route("get", "/health", (c) => c.json({ ok: true, version }));
  const system = createSystem(core, dataDir, fetcher);
  route("get", "/system", (c) => c.json(system.info()));
  route("get", "/settings", (c) => c.json(system.settings()));
  route("patch", "/settings", async (c) => {
    const body = z
      .object({
        language: z.enum(["tr", "en"]).optional(),
        theme: z.enum(["light", "dark", "auto"]).optional(),
        updateCheck: z.boolean().optional(),
      })
      .strict()
      .parse(await c.req.json());
    const put = core.db.query(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    );
    core.db.transaction(() => {
      for (const [key, value] of Object.entries(body))
        put.run(key, String(value));
    })();
    return c.json(system.settings());
  });
  if (checkUpdates || fetcher) {
    void system.check();
    const timer = setInterval(() => void system.check(), 86400000);
    timer.unref();
  }
  registerProjects(route, core, dataDir);
  registerSummary(route, core);
  registerItems(route, core);
  registerChildren(route, core);
  registerAttachments(route, core, dataDir);
  route(
    "get",
    "/events",
    (c) =>
      eventsResponse(
        core,
        z.string().optional().parse(c.req.query("project")),
        c.req.raw.signal,
      ),
    undefined,
    z.object({ project: z.string().optional() }),
  );
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/api/v1/openapi.json",
    security: [{}, { bearerAuth: [] }],
    responses: { 200: { description: "OpenAPI 3.1 document" } },
  });
  app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    description: "Required when PANO_TOKEN is configured",
  });
}
