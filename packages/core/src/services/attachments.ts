import { ulid } from "ulid";
import type { z } from "zod";
import type { Context } from "../context";
import { attachmentSchema } from "../schemas";
export function createAttachments(context: Context) {
  const { item, str, get, insert, log, write, event } = context;
  const attachments = {
    add(
      key: string,
      input: z.input<typeof attachmentSchema>,
      actor: string,
      attachmentId = ulid(),
    ) {
      const data = attachmentSchema.parse(input);
      return write(actor, () => {
        const row = item(key);
        const id = str(row.id);
        const pid = str(row.project_id);
        if (
          data.activity_id &&
          !get(
            "SELECT id FROM activity WHERE id = ? AND item_id = ?",
            data.activity_id,
            id,
          )
        )
          throw new Error("Activity does not belong to item");
        const attachment = {
          id: attachmentId,
          item_id: id,
          activity_id: data.activity_id ?? null,
          file_name: data.file_name,
          mime: data.mime,
          size: data.size,
        };
        insert("attachments", attachment);
        log(
          pid,
          id,
          actor,
          "attachment_added",
          null,
          attachment,
          "Attachment added",
        );
        return {
          value: attachment,
          event: event(pid, id, "attachment_added", actor),
        };
      });
    },
    get(id: string) {
      return get("SELECT * FROM attachments WHERE id = ?", id);
    },
  };
  return attachments;
}
