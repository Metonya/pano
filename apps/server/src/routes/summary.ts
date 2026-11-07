import { z } from "@hono/zod-openapi";
import type { Core } from "@pano/core";
import { key, type Route } from "./shared";

export function registerSummary(route: Route, core: Core) {
  const count = z.number().int().nonnegative();
  const query = z.object({
    timeZone: z
      .string()
      .max(100)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, "Invalid time zone")
      .optional(),
  });
  route(
    "get",
    "/projects/:key/summary",
    (c) =>
      c.json(
        core.projects.summary(key(c), query.parse(c.req.query()).timeZone),
      ),
    undefined,
    query,
    z.object({
      started_at: z.string().datetime(),
      total: count,
      completed: count,
      remaining: count,
      cancelled: count,
      remaining_by_priority: z.object({
        high: count,
        medium: count,
        low: count,
      }),
      completed_last_7_days: count,
      burn_up: z
        .array(
          z.object({ date: z.string().date(), total: count, completed: count }),
        )
        .min(1)
        .max(180),
      usage: z.object({
        total_tokens: count,
        runs: count,
        models: z.array(z.string()),
      }),
    }),
  );
}
