import { homedir } from "node:os";
import { join } from "node:path";
import { OpenAPIHono } from "@hono/zod-openapi";
import { type Core, createCore } from "@pano/core";
import { version } from "../../../package.json";
import { agentsGuide } from "./agents";
import { handleError } from "./errors";
import { handleMcp } from "./mcp";
import { auth } from "./middleware/auth";
import { registerRoutes } from "./routes";

export function createApp(options: {
  core: Core;
  dataDir: string;
  token?: string;
}) {
  const app = new OpenAPIHono();
  app.onError(handleError);
  app.notFound((c) =>
    c.json({ error: { code: "not_found", message: "Route not found" } }, 404),
  );
  app.use("/api/*", auth(options.token));
  app.use("/mcp", auth(options.token));
  app.all("/mcp", (c) => handleMcp(c.req.raw, options.core));
  app.get("/agents.md", (c) =>
    c.text(agentsGuide, 200, {
      "Content-Type": "text/markdown; charset=utf-8",
    }),
  );
  registerRoutes(app, options);
  app.doc31("/api/v1/openapi.json", {
    openapi: "3.1.0",
    info: { title: "Pano API", version },
  });
  return app;
}
export const defaultDataDir =
  process.env.PANO_DATA_DIR || join(homedir(), ".pano");
export { createCore };
