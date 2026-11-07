import { ulid } from "ulid";
import type { z } from "zod";
import type { Context } from "../context";
import { HUMAN_ALIAS, isAiActor, isAwaitingHuman } from "../identity";
import { itemCreate, itemPatch, statusSchema } from "../schemas";
import type { Row, Values } from "../types";
import type { createActivity } from "./activity";
import { usageDetail, usageTotals } from "./usage";
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
    userName,
  } = context;
  /** Agents can hand work to the person without knowing their name. */
  const resolveAssignee = (assignee: string | null | undefined) =>
    assignee?.toLowerCase() === HUMAN_ALIAS ? userName() : assignee;
  function validateItemUpdate(
    data: z.output<typeof itemPatch>,
    row: Row,
    p: Row,
    id: string,
    actor: string,
  ) {
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
      isAiActor(actor, userName())
    )
      throw new Error("AI cannot close items in this project");
    if (
      data.status === "done" &&
      row.status === "test" &&
      get(
        "SELECT id FROM test_scenarios WHERE item_id = ? AND removed_at IS NULL AND result = 'failed' LIMIT 1",
        id,
      )
    )
      throw new Error("Failed test scenarios prevent approval");
    if (data.status === "in_progress" && row.status === "test" && !data.reason)
      throw new Error("Sending an item back requires a reason");
  }
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
      const rows = status
        ? all(
            "SELECT * FROM items WHERE project_id = ? AND status = ? ORDER BY position, number",
            str(p.id),
            status,
          )
        : all(
            "SELECT * FROM items WHERE project_id = ? AND status != 'cancelled' ORDER BY position, number",
            str(p.id),
          );
      // One query for the whole project, so a large board stays a single read.
      const usage = new Map<unknown, Row[]>();
      for (const record of all(
        "SELECT item_id, after_json FROM activity WHERE project_id = ? AND kind = 'usage' ORDER BY rowid",
        str(p.id),
      ))
        usage.set(record.item_id, [
          ...(usage.get(record.item_id) ?? []),
          record,
        ]);
      return rows.map((row) => {
        const counts: Row & { criteria_total: number; criteria_done: number } =
          {
            ...row,
            criteria_total: Number(
              get(
                "SELECT COUNT(*) AS n FROM criteria WHERE item_id = ? AND removed_at IS NULL",
                str(row.id),
              )?.n ?? 0,
            ),
            criteria_done: Number(
              get(
                "SELECT COUNT(*) AS n FROM criteria WHERE item_id = ? AND removed_at IS NULL AND done = 1",
                str(row.id),
              )?.n ?? 0,
            ),
            last_activity:
              get(
                "SELECT MAX(created_at) AS time FROM activity WHERE item_id = ?",
                str(row.id),
              )?.time ?? row.updated_at,
          };
        return Object.assign(counts, {
          usage: usageTotals(usage.get(row.id) ?? []),
        });
      });
    },
    board(projectKey: string) {
      const project = context.project(projectKey);
      const items = this.list(projectKey);
      const columns = Object.fromEntries(
        ["backlog", "in_progress", "test", "done"].map((status) => [
          status,
          items.filter((item) => item.status === status),
        ]),
      );
      return {
        project,
        columns,
        waiting: project.test_column
          ? items.filter((item) => isAwaitingHuman(item, userName()))
          : [],
      };
    },
    get(key: string, options: { history?: boolean } = {}) {
      const row = item(key);
      const id = str(row.id);
      const history = activity.list(key);
      const sentBack = history.find((entry) => {
        if (entry.kind === "sent_back" || entry.kind === "reassigned")
          return true;
        if (
          entry.kind !== "moved" ||
          typeof entry.before_json !== "string" ||
          typeof entry.after_json !== "string"
        )
          return false;
        return (
          JSON.parse(entry.before_json).status === "test" &&
          JSON.parse(entry.after_json).status === "in_progress"
        );
      });
      return {
        return_note: sentBack?.message ?? null,
        return_attachments: sentBack
          ? all(
              "SELECT *, '/api/v1/attachments/' || id AS url FROM attachments WHERE activity_id = ?",
              str(sentBack.id),
            )
          : [],
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
        usage: usageDetail(
          history.filter((entry) => entry.kind === "usage").reverse(),
        ),
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
          assignee: resolveAssignee(data.assignee) ?? null,
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
          { ...result, activity: undefined, usage: undefined },
          "Item created",
        );
        return {
          value: items.get(`${projectKey}-${number}`),
          event: event(pid, id, "created", actor),
        };
      });
    },
    update(key: string, input: z.input<typeof itemPatch>, actor: string) {
      const parsed = itemPatch.parse(input);
      const data = { ...parsed, assignee: resolveAssignee(parsed.assignee) };
      return write(actor, () => {
        const row = item(key);
        const id = str(row.id);
        const pid = str(row.project_id);
        const p = project(str(row.project_key));
        validateItemUpdate(data, row, p, id, actor);
        const { reason, ...fields } = data;
        const patch: Values = {};
        for (const [k, v] of Object.entries(fields))
          if (v !== undefined) patch[k] = v;
        if (data.status === "done" && row.status !== "done")
          patch.seen_at = null;
        if (data.status && data.status !== row.status)
          patch.done_at = data.status === "done" ? now() : null;
        const delta = changed(row, patch);
        const kind = itemUpdateKind(data, row);
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
    restore(key: string, actor: string) {
      return write(actor, () => {
        const row = item(key);
        if (row.status !== "cancelled")
          throw new Error("Item must be cancelled");
        const cancellation = activity
          .list(key)
          .find((entry) => entry.kind === "cancelled");
        if (!cancellation) throw new Error("Cancellation history is missing");
        const before = JSON.parse(String(cancellation.before_json));
        const status = statusSchema.parse(before.status);
        if (status === "cancelled")
          throw new Error("Previous status must be active");
        const id = str(row.id),
          pid = str(row.project_id);
        const patch = {
          status,
          done_at: before.done_at ?? null,
          updated_at: now(),
        };
        update("items", id, patch);
        log(
          pid,
          id,
          actor,
          "restored",
          { status: "cancelled" },
          { status },
          "Cancellation undone",
        );
        return {
          value: items.get(key),
          event: event(pid, id, "restored", actor),
        };
      });
    },
    approve(key: string, actor: string) {
      return transition(key, "approved", "", [], actor);
    },
    sendBack(
      key: string,
      input: { note: string; attachmentIds?: string[] },
      actor: string,
    ) {
      return transition(
        key,
        "sent_back",
        input.note,
        input.attachmentIds ?? [],
        actor,
      );
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
  function itemUpdateKind(data: z.output<typeof itemPatch>, row: Row) {
    let kind =
      data.assignee !== undefined && data.assignee !== row.assignee
        ? "assigned"
        : "edited";
    if (data.status && data.status !== row.status)
      kind = data.status === "cancelled" ? "cancelled" : "moved";
    return kind;
  }
  function previousAiAssignee(key: string): string | null {
    const history = activity.list(key);
    // Back to whoever worked on it last; nobody yet leaves it unassigned.
    let assignee: string | null = null;
    for (const entry of history) {
      const candidates = [entry.actor];
      for (const value of [entry.after_json, entry.before_json]) {
        if (typeof value === "string")
          candidates.push(JSON.parse(value).assignee);
      }
      const found = candidates.find((value) => isAiActor(value, userName()));
      if (typeof found === "string") {
        assignee = found;
        break;
      }
    }
    return assignee;
  }
  function transition(
    key: string,
    kind: "approved" | "sent_back",
    note: string,
    attachmentIds: string[],
    actor: string,
  ) {
    if (kind !== "approved" && !note.trim())
      throw new Error("A note is required");
    return write(actor, () => {
      const row = item(key);
      const id = str(row.id),
        pid = str(row.project_id);
      if (row.status !== "test") throw new Error("Item must be in Test");
      if (
        kind === "approved" &&
        get(
          "SELECT id FROM test_scenarios WHERE item_id = ? AND removed_at IS NULL AND result = 'failed' LIMIT 1",
          id,
        )
      )
        throw new Error("Failed test scenarios prevent approval");
      for (const attachmentId of attachmentIds) {
        if (
          !get(
            "SELECT id FROM attachments WHERE id = ? AND item_id = ? AND activity_id IS NULL",
            attachmentId,
            id,
          )
        )
          throw new Error(
            "Attachment does not belong to item or is already linked",
          );
      }
      const assignee = previousAiAssignee(key);
      const patch: Values =
        kind === "approved"
          ? { status: "done", done_at: now(), seen_at: null }
          : { status: "in_progress", assignee };
      update("items", id, { ...patch, updated_at: now() });
      const activityId = log(
        pid,
        id,
        actor,
        kind,
        { status: row.status, assignee: row.assignee },
        patch,
        kind === "approved" ? "Item approved" : note.trim(),
      );
      for (const attachmentId of attachmentIds)
        update("attachments", attachmentId, { activity_id: activityId });
      return { value: items.get(key), event: event(pid, id, kind, actor) };
    });
  }
  return items;
}
