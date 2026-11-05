import { Hono } from "hono";
import { version } from "../../../package.json";

export const app = new Hono();
app.get("/api/v1/health", (c) => c.json({ ok: true, version }));
