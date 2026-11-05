import { z } from "zod";
export const projectKeySchema = z.string().regex(/^[A-Z0-9]{2,10}$/);
export const itemKeySchema = z.string().regex(/^[A-Z0-9]{2,10}-[1-9][0-9]*$/);
export const statusSchema = z.enum([
  "backlog",
  "in_progress",
  "test",
  "done",
  "cancelled",
]);
export const prioritySchema = z.enum(["high", "medium", "low"]);
export const actorSchema = z.string().trim().min(1);
export const text = z.string().trim().min(1);
export const projectCreate = z
  .object({
    key: projectKeySchema,
    name: text,
    description: z.string().optional(),
    test_column: z.boolean().optional(),
    ai_can_close: z.boolean().optional(),
    dod_md: z.string().optional(),
  })
  .strict();
export const projectPatch = projectCreate
  .omit({ key: true })
  .partial()
  .extend({ starred: z.boolean().optional() })
  .strict();
export const itemCreate = z
  .object({
    title: text,
    body_md: z.string().optional(),
    priority: prioritySchema.optional(),
    assignee: text.nullable().optional(),
    criteria: z.array(text).optional(),
  })
  .strict();
export const itemPatch = z
  .object({
    title: text.optional(),
    body_md: z.string().optional(),
    status: statusSchema.optional(),
    priority: prioritySchema.optional(),
    assignee: text.nullable().optional(),
    position: z.number().finite().optional(),
    reason: text.optional(),
  })
  .strict();
export const scenarioCreate = z
  .object({
    steps_md: text,
    expected_md: text,
    author: text,
    result: z.enum(["pending", "passed", "failed"]).optional(),
    position: z.number().finite().optional(),
  })
  .strict();
export const attachmentSchema = z
  .object({
    activity_id: z.string().optional(),
    file_name: text,
    mime: text,
    size: z.number().int().nonnegative(),
  })
  .strict();
