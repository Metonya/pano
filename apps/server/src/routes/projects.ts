import { z } from "@hono/zod-openapi";
import type { Core } from "@pano/core";
import { actor, json, key, project, type Route } from "./shared";

export function registerProjects(route: Route, core: Core) {
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
  route("get", "/projects/:key", (c) => c.json(core.projects.get(key(c))));
  const projectPatch = project
    .omit({ key: true })
    .partial()
    .extend({ starred: z.boolean().optional() })
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
      core.projects.purge(key(c), (await json(c, purge)).confirmName, actor(c));
      return c.json({ ok: true });
    },
    purge,
  );
}
