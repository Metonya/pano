import { rm } from "node:fs/promises";
import { join } from "node:path";
import { z } from "@hono/zod-openapi";
import type { Core } from "@pano/core";
import { actor, json, key, project, type Route } from "./shared";

export function registerProjects(route: Route, core: Core, dataDir: string) {
  route(
    "get",
    "/projects",
    (c) =>
      c.json(
        core.projects.list({
          includeArchived:
            z
              .enum(["true", "false"])
              .optional()
              .parse(c.req.query("includeArchived")) === "true",
        }),
      ),
    undefined,
    z.object({ includeArchived: z.enum(["true", "false"]).optional() }),
  );
  route(
    "post",
    "/projects",
    async (c) => c.json(core.projects.create(await json(c, project), actor(c))),
    project,
  );
  route(
    "get",
    "/projects/suggest-key",
    (c) =>
      c.json({
        key: core.projects.suggestKey(z.string().parse(c.req.query("name"))),
      }),
    undefined,
    z.object({ name: z.string() }),
    z.object({ key: z.string().regex(/^[A-Z0-9]{2,10}$/) }),
  );
  route("get", "/projects/:key", (c) => c.json(core.projects.get(key(c))));
  const projectPatch = project
    .omit({ key: true })
    .partial()
    .extend({
      starred: z.boolean().optional(),
      test_items_destination: z.enum(["in_progress", "done"]).optional(),
    })
    .strict();
  route(
    "patch",
    "/projects/:key",
    async (c) =>
      c.json(
        core.projects.update(key(c), await json(c, projectPatch), actor(c)),
      ),
    projectPatch,
  );
  const starred = z.object({ starred: z.boolean() }).strict();
  route(
    "post",
    "/projects/:key/star",
    async (c) =>
      c.json(
        core.projects.star(key(c), (await json(c, starred)).starred, actor(c)),
      ),
    starred,
  );
  const archived = z.object({ archived: z.boolean() }).strict();
  route(
    "post",
    "/projects/:key/archive",
    async (c) =>
      c.json(
        core.projects.archive(
          key(c),
          (await json(c, archived)).archived,
          actor(c),
        ),
      ),
    archived,
  );
  const purge = z.object({ confirmName: z.string() }).strict();
  route(
    "post",
    "/projects/:key/purge",
    async (c) => {
      const ids = core.projects.attachmentIds(key(c));
      core.projects.purge(key(c), (await json(c, purge)).confirmName, actor(c));
      await Promise.all(
        ids.map((id) => rm(join(dataDir, "attachments", id), { force: true })),
      );
      return c.json({ ok: true });
    },
    purge,
  );
}
