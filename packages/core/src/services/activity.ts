import { z } from "zod";
import type { Context } from "../context";
import { text, usageCreate } from "../schemas";
export function createActivity(context: Context) {
  const { all, item, str, write, log, event, get } = context;
  const activity = {
    list(
      key: string,
      options: {
        limit?: number;
        offset?: number;
        kind?: "decision" | "check";
      } = {},
    ) {
      const row = item(key);
      const limit =
        options.limit === undefined
          ? -1
          : z.number().int().nonnegative().parse(options.limit);
      const offset = z
        .number()
        .int()
        .nonnegative()
        .parse(options.offset ?? 0);
      const kind = z.enum(["decision", "check"]).optional().parse(options.kind);
      return all(
        "SELECT * FROM activity WHERE item_id = ? AND (? IS NULL OR kind = ?) ORDER BY rowid DESC LIMIT ? OFFSET ?",
        str(row.id),
        kind ?? null,
        kind ?? null,
        limit,
        offset,
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
    usage(key: string, input: z.input<typeof usageCreate>, actor: string) {
      const data = usageCreate.parse(input);
      return write(actor, () => {
        const row = item(key);
        const id = str(row.id);
        const pid = str(row.project_id);
        const recordId = log(
          pid,
          id,
          actor,
          "usage",
          null,
          data,
          "Usage recorded",
        );
        return {
          value: get("SELECT * FROM activity WHERE id = ?", recordId),
          event: event(pid, id, "usage", actor),
        };
      });
    },
  };
  return { activity, records };
}
