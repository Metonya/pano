import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "@hono/zod-openapi";
import type { Core } from "@pano/core";
import { actor, key, type Route } from "./shared";

export function registerAttachments(route: Route, core: Core, dataDir: string) {
  const upload = z.object({
    file: z.string().openapi({ type: "string", format: "binary" }),
    activity_id: z.string().optional(),
  });
  route(
    "post",
    "/items/:key/attachments",
    async (c) => {
      let form: FormData;
      try {
        form = await c.req.formData();
      } catch {
        return c.json(
          {
            error: {
              code: "validation_error",
              message: "Invalid multipart form",
            },
          },
          400,
        );
      }
      const file = form.get("file");
      const activityId = form.get("activity_id");
      if (
        !(file instanceof File) ||
        !["image/png", "image/jpeg"].includes(file.type) ||
        file.size > 10 * 1024 * 1024 ||
        (activityId !== null && typeof activityId !== "string")
      )
        return c.json(
          {
            error: {
              code: "validation_error",
              message: "A PNG or JPEG file of at most 10 MB is required",
            },
          },
          400,
        );
      const dir = join(dataDir, "attachments");
      await mkdir(dir, { recursive: true });
      const temp = join(dir, `.upload-${randomUUID()}`);
      await writeFile(temp, new Uint8Array(await file.arrayBuffer()));
      try {
        const result = core.attachments.add(
          key(c),
          {
            file_name: file.name,
            mime: file.type,
            size: file.size,
            ...(activityId ? { activity_id: activityId } : {}),
          },
          actor(c),
        );
        await rename(temp, join(dir, result.id));
        return c.json(result);
      } finally {
        await rm(temp, { force: true });
      }
    },
    upload,
  );
}
