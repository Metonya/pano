import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
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
      const attachmentId = randomUUID();
      const destination = join(dir, attachmentId);
      await writeFile(temp, new Uint8Array(await file.arrayBuffer()));
      try {
        await rename(temp, destination);
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
            attachmentId,
          );
          return c.json(result);
        } catch (error) {
          await rm(destination, { force: true });
          throw error;
        }
      } finally {
        await rm(temp, { force: true });
      }
    },
    upload,
  );
  route("get", "/attachments/:id", async (c) => {
    const attachment = core.attachments.get(c.req.param("id") as string);
    if (!attachment) return c.notFound();
    try {
      const bytes = await readFile(
        join(dataDir, "attachments", String(attachment.id)),
      );
      return new Response(bytes, {
        headers: {
          "Content-Type": String(attachment.mime),
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      return c.notFound();
    }
  });
}
