import { ulid } from "ulid";
import type { z } from "zod";
import type { Context } from "../context";
import { itemCreate, itemPatch, statusSchema } from "../schemas";
import type { Values } from "../types";
import type { createActivity } from "./activity";
export function createItems(
  context: Context,
  activity: ReturnType<typeof createActivity>["activity"],
) {
  const {
    db,
    get,
    all,
    now,
    project,
    item,
    insert,
    update,
    log,
    write,
    event,
    str,
    changed,
  } = context;
  const items = {
    list(
      projectKey: string,
      options: { status?: z.input<typeof statusSchema> } = {},
    ) {
      const p = project(projectKey);
      const status =
        options.status === undefined
          ? undefined
          : statusSchema.parse(options.status);
      return status
        ? all(
            "SELECT * FROM items WHERE project_id = ? AND status = ? ORDER BY position, number",
            str(p.id),
            status,
          )
        : all(
            "SELECT * FROM items WHERE project_id = ? AND status != 'cancelled' ORDER BY position, number",
            str(p.id),
          );
    },
    get(key: string, options: { history?: boolean } = {}) {
      const row = item(key);
      const id = str(row.id);
      return {
        ...row,
        key,
        criteria: all(
          "SELECT * FROM criteria WHERE item_id = ? AND removed_at IS NULL ORDER BY position",
          id,
        ),
        scenarios: all(
          "SELECT * FROM test_scenarios WHERE item_id = ? AND removed_at IS NULL ORDER BY position",
          id,
        ),
        attachments: all("SELECT * FROM attachments WHERE item_id = ?", id),
        activity: activity.list(key, {
          limit: options.history ? undefined : 5,
        }),
      };
    },
    create(
      projectKey: string,
      input: z.input<typeof itemCreate>,
      actor: string,
    ) {
      const data = itemCreate.parse(input);
      return write(actor, () => {
        const p = project(projectKey);
        const pid = str(p.id);
        const id = ulid();
        const timestamp = now();
        const number = Number(p.next_number);
        db.query(
          "UPDATE projects SET next_number = next_number + 1, updated_at = ? WHERE id = ?",
        ).run(timestamp, pid);
        const last = get(
          "SELECT MAX(position) AS pos FROM items WHERE project_id = ? AND status = 'backlog'",
          pid,
        );
        insert("items", {
          id,
          project_id: pid,
          number,
          title: data.title,
          body_md: data.body_md ?? "",
          status: "backlog",
          priority: data.priority ?? "medium",
          assignee: data.assignee ?? null,
          position: Number(last?.pos ?? 0) + 1,
          seen_at: null,
          created_at: timestamp,
          updated_at: timestamp,
          done_at: null,
        });
        for (const [index, criterion] of (data.criteria ?? []).entries())
          insert("criteria", {
            id: ulid(),
            item_id: id,
            text: criterion,
            done: 0,
            position: index + 1,
            removed_at: null,
          });
        const result = items.get(`${projectKey}-${number}`);
        log(
          pid,
          id,
          actor,
          "created",
          null,
          { ...result, activity: undefined },
          "Item created",
        );
        return {
          value: items.get(`${projectKey}-${number}`),
          event: event(pid, id, "created", actor),
        };
      });
    },
    update(key: string, input: z.input<typeof itemPatch>, actor: string) {
      const data = itemPatch.parse(input);
      return write(actor, () => {
        const row = item(key);
        const id = str(row.id);
        const pid = str(row.project_id);
        const p = project(str(row.project_key));
        if (
          data.status === "cancelled" &&
          row.status !== "cancelled" &&
          !data.reason
        )
          throw new Error("Cancellation requires a reason");
        if (data.status === "test" && !p.test_column)
          throw new Error("Test column is disabled for this project");
        if (
          data.status === "done" &&
          !p.ai_can_close &&
          /^(codex|claude|agent)(:|$)/i.test(actor)
        )
          throw new Error("AI cannot close items in this project");
        if (
          data.status === "done" &&
          row.status === "test" &&
          get(
            "SELECT id FROM test_scenarios WHERE item_id = ? AND removed_at IS NULL AND result = 'pending' LIMIT 1",
            id,
          )
        )
          throw new Error(
            "Pending test scenarios must be completed before approval",
          );
        if (
          data.status === "in_progress" &&
          row.status === "test" &&
          !data.reason
        )
          throw new Error("Sending an item back requires a reason");
        const { reason, ...fields } = data;
        const patch: Values = {};
        for (const [k, v] of Object.entries(fields))
          if (v !== undefined) patch[k] = v;
        if (data.status && data.status !== row.status)
          patch.done_at = data.status === "done" ? now() : null;
        const delta = changed(row, patch);
        const kind =
          data.status && data.status !== row.status
            ? data.status === "cancelled"
              ? "cancelled"
              : "moved"
            : data.assignee !== undefined && data.assignee !== row.assignee
              ? "assigned"
              : "edited";
        if (Object.keys(delta.after).length) {
          update("items", id, { ...delta.after, updated_at: now() });
          log(
            pid,
            id,
            actor,
            kind,
            delta.before,
            delta.after,
            reason ?? "Item updated",
          );
        }
        return { value: items.get(key), event: event(pid, id, kind, actor) };
      });
    },
    move(
      key: string,
      status: z.input<typeof statusSchema>,
      actor: string,
      position?: number,
      reason?: string,
    ) {
      return items.update(key, { status, position, reason }, actor);
    },
    assign(key: string, assignee: string | null, actor: string) {
      return items.update(key, { assignee }, actor);
    },
    markSeen(key: string, actor: string) {
      return write(actor, () => {
        const row = item(key);
        const id = str(row.id);
        const pid = str(row.project_id);
        const seen = now();
        update("items", id, { seen_at: seen, updated_at: seen });
        log(
          pid,
          id,
          actor,
          "seen",
          { seen_at: row.seen_at },
          { seen_at: seen },
          "Item seen",
        );
        return { value: items.get(key), event: event(pid, id, "seen", actor) };
      });
    },
  };
  return items;
}
