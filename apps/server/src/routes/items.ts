import { z } from "@hono/zod-openapi";
import type { Core } from "@pano/core";
import {
  actor,
  item,
  itemPatch,
  json,
  key,
  type Route,
  status,
  text,
} from "./shared";

export function registerItems(route: Route, core: Core) {
  route(
    "get",
    "/projects/:key/items",
    (c) =>
      c.json(
        core.items.list(key(c), {
          status: status.optional().parse(c.req.query("status")),
        }),
      ),
    undefined,
    z.object({ status: status.optional() }),
  );
  route(
    "post",
    "/projects/:key/items",
    async (c) =>
      c.json(core.items.create(key(c), await json(c, item), actor(c))),
    item,
  );
  route(
    "get",
    "/items/:key",
    (c) =>
      c.json(
        core.items.get(key(c), {
          history:
            z
              .enum(["true", "false"])
              .optional()
              .parse(c.req.query("history")) === "true",
        }),
      ),
    undefined,
    z.object({ history: z.enum(["true", "false"]).optional() }),
  );
  route(
    "patch",
    "/items/:key",
    async (c) =>
      c.json(core.items.update(key(c), await json(c, itemPatch), actor(c))),
    itemPatch,
  );
  const move = z
    .object({
      status,
      position: z.number().finite().optional(),
      reason: text.optional(),
    })
    .strict();
  route(
    "post",
    "/items/:key/move",
    async (c) => {
      const data = await json(c, move);
      return c.json(
        core.items.move(
          key(c),
          data.status,
          actor(c),
          data.position,
          data.reason,
        ),
      );
    },
    move,
  );
  const assign = z.object({ assignee: text.nullable() }).strict();
  route("post", "/items/:key/restore", (c) =>
    c.json(core.items.restore(key(c), actor(c))),
  );
  route(
    "post",
    "/items/:key/assign",
    async (c) =>
      c.json(
        core.items.assign(key(c), (await json(c, assign)).assignee, actor(c)),
      ),
    assign,
  );
  route("post", "/items/:key/seen", (c) =>
    c.json(core.items.markSeen(key(c), actor(c))),
  );
  route("post", "/items/:key/approve", (c) =>
    c.json(core.items.approve(key(c), actor(c))),
  );
  const sendBack = z
    .object({ note: text, attachmentIds: z.array(z.string()).optional() })
    .strict();
  route(
    "post",
    "/items/:key/send-back",
    async (c) =>
      c.json(core.items.sendBack(key(c), await json(c, sendBack), actor(c))),
    sendBack,
  );
}
