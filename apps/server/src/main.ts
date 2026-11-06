import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { createApp, createCore, defaultDataDir } from "./app";

export function serverConfig(env: NodeJS.ProcessEnv) {
  const hostname = env.PANO_HOST || "127.0.0.1";
  const token = env.PANO_TOKEN || undefined;
  if (hostname !== "127.0.0.1" && !token)
    throw new Error("PANO_TOKEN is required when PANO_HOST is not 127.0.0.1");
  return { hostname, token, port: Number(env.PANO_PORT ?? 7777) };
}
if (import.meta.main) {
  const config = serverConfig(process.env);
  mkdirSync(defaultDataDir, { recursive: true });
  const core = createCore(join(defaultDataDir, "pano.db"));
  const app = createApp({ core, dataDir: defaultDataDir, token: config.token });
  // SSE and MCP streams stay open; Bun's default 10s idle timeout would cut them
  // before the 15s heartbeat. 255s is Bun's maximum.
  Bun.serve({
    hostname: config.hostname,
    port: config.port,
    idleTimeout: 255,
    fetch: app.fetch,
  });
}
