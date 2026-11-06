import { z } from "@hono/zod-openapi";
import type { Core } from "@pano/core";
import { actor, id, json, key, type Route, scenario, text } from "./shared";

export function registerChildren(route: Route, core: Core) {
  const criterion = z
    .object({ text, position: z.number().finite().optional() })
    .strict();
  route(
    "post",
    "/items/:key/criteria",
    async (c) => {
      const data = await json(c, criterion);
      return c.json(
        core.criteria.add(key(c), data.text, actor(c), data.position),
      );
    },
    criterion,
  );
  const check = z.union([
    z.object({ done: z.boolean() }).strict(),
    z.object({ text }).strict(),
  ]);
  route(
    "patch",
    "/items/:key/criteria/:id",
    async (c) => {
      const data = await json(c, check);
      return c.json(
        "done" in data
          ? core.criteria.check(key(c), id(c), data.done, actor(c))
          : core.criteria.update(key(c), id(c), data.text, actor(c)),
      );
    },
    check,
  );
  route("delete", "/items/:key/criteria/:id", (c) =>
    c.json(core.criteria.remove(key(c), id(c), actor(c))),
  );
  route(
    "post",
    "/items/:key/scenarios",
    async (c) =>
      c.json(core.scenarios.add(key(c), await json(c, scenario), actor(c))),
    scenario,
  );
  route(
    "patch",
    "/items/:key/scenarios/:id",
    async (c) =>
      c.json(
        core.scenarios.update(
          key(c),
          id(c),
          await json(c, scenario.partial()),
          actor(c),
        ),
      ),
    scenario.partial(),
  );
  route("delete", "/items/:key/scenarios/:id", (c) =>
    c.json(core.scenarios.remove(key(c), id(c), actor(c))),
  );
  const record = z
    .object({ kind: z.enum(["note", "check", "decision"]), message: text })
    .strict();
  route(
    "post",
    "/items/:key/records",
    async (c) =>
      c.json(core.records.add(key(c), await json(c, record), actor(c))),
    record,
  );
  route("get", "/items/:key/activity", (c) =>
    c.json(core.activity.list(key(c))),
  );
}
