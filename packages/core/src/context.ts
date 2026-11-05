import type { Database } from "bun:sqlite";
import type { EventEmitter } from "node:events";
import { ulid } from "ulid";
import { actorSchema, itemKeySchema, projectKeySchema } from "./schemas";
import type { ChangeEvent, ItemRow, Row, Values } from "./types";
export function createContext(db: Database, events: EventEmitter) {
  const get = (sql: string, ...params: (string | number | null)[]) =>
    db.query(sql).get(...params) as Row | null;
  const all = (sql: string, ...params: (string | number | null)[]) =>
    db.query(sql).all(...params) as Row[];
  const now = () => new Date().toISOString();
  function project(key: string) {
    projectKeySchema.parse(key);
    const row = get("SELECT * FROM projects WHERE key = ?", key);
    if (!row) throw new Error("Project not found");
    return row;
  }
  function item(key: string) {
    itemKeySchema.parse(key);
    const split = key.lastIndexOf("-");
    const row = get(
      "SELECT i.*, p.key AS project_key FROM items i JOIN projects p ON p.id = i.project_id WHERE p.key = ? AND i.number = ?",
      key.slice(0, split),
      Number(key.slice(split + 1)),
    );
    if (!row) throw new Error("Item not found");
    return row as ItemRow;
  }
  function insert(table: string, data: Values) {
    const keys = Object.keys(data);
    db.query(
      `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
    ).run(...Object.values(data));
  }
  function update(table: string, id: string, data: Values) {
    const keys = Object.keys(data);
    if (keys.length)
      db.query(
        `UPDATE ${table} SET ${keys.map((key) => `${key} = ?`).join(",")} WHERE id = ?`,
      ).run(...Object.values(data), id);
  }
  function log(
    projectId: string,
    itemId: string | null,
    actor: string,
    kind: string,
    before: unknown,
    after: unknown,
    message: string,
  ) {
    actorSchema.parse(actor);
    const id = ulid();
    insert("activity", {
      id,
      project_id: projectId,
      item_id: itemId,
      actor,
      kind,
      before_json: before == null ? null : JSON.stringify(before),
      after_json: after == null ? null : JSON.stringify(after),
      message,
      created_at: now(),
    });
    return id;
  }
  function write<T>(
    actor: string,
    action: () => { value: T; event: ChangeEvent },
  ) {
    actorSchema.parse(actor);
    const result = db.transaction(action).immediate();
    events.emit("change", result.event);
    return result.value;
  }
  const event = (
    projectId: string,
    itemId: string | null,
    kind: string,
    actor: string,
  ): ChangeEvent => ({ projectId, itemId, kind, actor });
  const str = (value: string | number | null) => String(value);
  function changed(row: Row, patch: Values) {
    const before: Values = {};
    const after: Values = {};
    for (const [key, value] of Object.entries(patch)) {
      if (row[key] !== value) {
        before[key] = row[key] ?? null;
        after[key] = value;
      }
    }
    return { before, after };
  }
  return {
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
  };
}
export type Context = ReturnType<typeof createContext>;
