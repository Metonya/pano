import { type OpenAPIHono, z } from "@hono/zod-openapi";
import type { Core } from "@pano/core";
import type { Context } from "hono";
import { version } from "../../../../package.json";
import { eventsResponse } from "../sse";
import { registerAttachments } from "./attachments";
import { registerChildren } from "./children";
import { registerItems } from "./items";
import { registerProjects } from "./projects";

export function registerRoutes(
  app: OpenAPIHono,
  { core, dataDir }: { core: Core; dataDir: string; token?: string },
) {
  type Method = "get" | "post" | "patch" | "delete";
  const route = (
    method: Method,
    path: string,
    handler: (c: Context) => Response | Promise<Response>,
    body?: z.ZodType,
    query?: z.ZodObject,
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
              : { "application/json": { schema: z.unknown() } },
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
  route("get", "/system", (c) => c.json({ version, dataDir }));
  registerProjects(route, core);
  registerItems(route, core);
  registerChildren(route, core);
  registerAttachments(route, core, dataDir);
  route(
    "get",
    "/events",
    (c) =>
      eventsResponse(
        core,
        z.string().parse(c.req.query("project")),
        c.req.raw.signal,
      ),
    undefined,
    z.object({ project: z.string() }),
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
