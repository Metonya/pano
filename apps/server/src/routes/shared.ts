import { z } from "@hono/zod-openapi";
import type { Context } from "hono";
export const text = z.string().trim().min(1);
export const status = z.enum([
  "backlog",
  "in_progress",
  "test",
  "done",
  "cancelled",
]);
export const priority = z.enum(["high", "medium", "low"]);
export const project = z
  .object({
    key: z.string().regex(/^[A-Z0-9]{2,10}$/),
    name: text,
    description: z.string().optional(),
    test_column: z.boolean().optional(),
    ai_can_close: z.boolean().optional(),
    dod_md: z.string().optional(),
  })
  .strict();
export const item = z
  .object({
    title: text,
    body_md: z.string().optional(),
    priority: priority.optional(),
    assignee: text.nullable().optional(),
    criteria: z.array(text).optional(),
  })
  .strict();
export const itemPatch = z
  .object({
    title: text.optional(),
    body_md: z.string().optional(),
    status: status.optional(),
    priority: priority.optional(),
    assignee: text.nullable().optional(),
    position: z.number().finite().optional(),
    reason: text.optional(),
  })
  .strict();
export const scenario = z
  .object({
    steps_md: text,
    expected_md: text,
    author: text,
    result: z.enum(["pending", "passed", "failed"]).optional(),
    position: z.number().finite().optional(),
  })
  .strict();

export const actor = (c: Context) =>
  c.req.header("X-Pano-Actor") ?? "anonymous";
export const key = (c: Context) => c.req.param("key") as string;
export const id = (c: Context) => c.req.param("id") as string;
export const json = async <T extends z.ZodType>(
  c: Context,
  schema: T,
): Promise<z.output<T>> => schema.parse(await c.req.json());
export type Route = (
  method: "get" | "post" | "patch" | "delete",
  path: string,
  handler: (c: Context) => Response | Promise<Response>,
  body?: z.ZodType,
  query?: z.ZodObject,
) => void;
