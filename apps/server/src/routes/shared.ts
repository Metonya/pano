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
    what_changed_md: z.string().optional(),
    how_to_test_md: z.string().optional(),
    status: status.optional(),
    priority: priority.optional(),
    assignee: text.nullable().optional(),
    position: z.number().optional(),
    reason: text.optional(),
  })
  .strict();
export const scenario = z
  .object({
    steps_md: text,
    expected_md: text,
    author: text,
    result: z.enum(["pending", "passed", "failed"]).optional(),
    position: z.number().optional(),
  })
  .strict();
const usageCount = z.number().int().nonnegative().optional();
export const usage = z
  .object({
    model: text.optional(),
    effort: text.optional(),
    input_tokens: usageCount,
    output_tokens: usageCount,
    cache_tokens: usageCount,
    total_tokens: usageCount,
    context_tokens: usageCount,
    duration_ms: usageCount,
    note: text.optional(),
  })
  .strict()
  .refine(
    (fields) => Object.values(fields).some((value) => value !== undefined),
    "At least one usage field is required",
  );

/** Headers carry Latin-1 only, so the web app percent-encodes names like Şükrü. */
export function decodeActor(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
export const actor = (c: Context) =>
  decodeActor(c.req.header("X-Pano-Actor") ?? "anonymous");
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
  response?: z.ZodType,
) => void;
