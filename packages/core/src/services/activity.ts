import { z } from "zod";
import type { Context } from "../context";
import { text } from "../schemas";
export function createActivity(context: Context) {
  const { all, item, str, write, log, event, get } = context;
  const activity = {
    list(key: string, options: { limit?: number } = {}) {
      const row = item(key);
      const limit =
        options.limit === undefined
          ? -1
          : z.number().int().nonnegative().parse(options.limit);
      return all(
        "SELECT * FROM activity WHERE item_id = ? ORDER BY rowid DESC LIMIT ?",
        str(row.id),
        limit,
      );
    },
  };
  const records = {
    add(
      key: string,
      input: { kind: "note" | "check" | "decision"; message: string },
      actor: string,
    ) {
      const data = z
        .object({ kind: z.enum(["note", "check", "decision"]), message: text })
        .strict()
        .parse(input);
      return write(actor, () => {
        const row = item(key);
        const id = str(row.id);
        const pid = str(row.project_id);
        const recordId = log(
          pid,
          id,
          actor,
          data.kind,
          null,
          { message: data.message },
          data.message,
        );
        return {
          value: get("SELECT * FROM activity WHERE id = ?", recordId),
          event: event(pid, id, data.kind, actor),
        };
      });
    },
  };
  return { activity, records };
}
