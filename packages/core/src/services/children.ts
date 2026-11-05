import { ulid } from "ulid";
import type { Context } from "../context";
import type { Values } from "../types";
export function createChildren(context: Context) {
  const { get, item, update, log, write, event, str, changed, insert } =
    context;
  function childMutation(
    table: "criteria" | "test_scenarios",
    key: string,
    id: string,
    patch: Values,
    actor: string,
    kind: string,
  ) {
    return write(actor, () => {
      const row = item(key);
      const itemId = str(row.id);
      const pid = str(row.project_id);
      const child = get(
        `SELECT * FROM ${table} WHERE id = ? AND item_id = ? AND removed_at IS NULL`,
        id,
        itemId,
      );
      if (!child) throw new Error("Entry not found");
      const delta = changed(child, patch);
      if (Object.keys(delta.after).length) {
        update(table, id, delta.after);
        log(
          pid,
          itemId,
          actor,
          kind,
          { id, ...delta.before },
          { id, ...delta.after },
          kind,
        );
      }
      return {
        value: get(`SELECT * FROM ${table} WHERE id = ?`, id),
        event: event(pid, itemId, kind, actor),
      };
    });
  }
  function childAdd(
    table: "criteria" | "test_scenarios",
    key: string,
    fields: Values,
    actor: string,
    kind: string,
  ) {
    return write(actor, () => {
      const row = item(key);
      const itemId = str(row.id);
      const pid = str(row.project_id);
      const id = ulid();
      const last = get(
        `SELECT MAX(position) AS pos FROM ${table} WHERE item_id = ?`,
        itemId,
      );
      const data = {
        id,
        item_id: itemId,
        position: Number(last?.pos ?? 0) + 1,
        removed_at: null,
        ...fields,
      };
      insert(table, data);
      log(pid, itemId, actor, kind, null, data, kind);
      return { value: data, event: event(pid, itemId, kind, actor) };
    });
  }
  return { childMutation, childAdd };
}
