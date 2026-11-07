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
  .extend({
    starred: z.boolean().optional(),
    test_items_destination: z.enum(["in_progress", "done"]).optional(),
  })
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
    what_changed_md: z.string().optional(),
    how_to_test_md: z.string().optional(),
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
const usageCount = z.number().int().nonnegative().optional();
/** What an agent reports about a run. Pano stores these values, it does not measure them. */
export const usageFields = z.object({
  model: text.optional(),
  effort: text.optional(),
  input_tokens: usageCount,
  output_tokens: usageCount,
  cache_tokens: usageCount,
  total_tokens: usageCount,
  context_tokens: usageCount,
  duration_ms: usageCount,
  note: text.optional(),
});
export const usageCreate = usageFields
  .strict()
  .refine(
    (usage) => Object.values(usage).some((value) => value !== undefined),
    "At least one usage field is required",
  );
export const attachmentSchema = z
  .object({
    activity_id: z.string().optional(),
    file_name: text,
    mime: text,
    size: z.number().int().nonnegative(),
  })
  .strict();
