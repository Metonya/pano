import { ulid } from "ulid";
import { z } from "zod";
import type { Context } from "../context";
import { projectCreate, projectPatch } from "../schemas";
import type { Row, Values } from "../types";
import { isAiActor, isAwaitingHuman } from "./waiting";
export function createProjects(context: Context) {
  const {
    db,
    all,
    project,
    write,
    now,
    insert,
    log,
    event,
    str,
    changed,
    update,
    get,
  } = context;
  const projects = {
    suggestKey(name: string) {
      const words = name
        .replace(/[ıİ]/g, "I")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .split(/\s+/)
        .map((word) => word.replace(/[^A-Z]/g, ""))
        .filter(Boolean);
      let base =
        words.length > 1
          ? words
              .slice(0, 4)
              .map((word) => word[0])
              .join("")
          : (words[0] ?? "PRJ").slice(0, 6);
      if (base.length < 2) base = base.padEnd(2, "P");
      const used = new Set(
        all("SELECT key FROM projects").map((row) => row.key),
      );
      let key = base;
      for (let suffix = 2; used.has(key); suffix++) {
        const number = String(suffix);
        key = base.slice(0, 10 - number.length) + number;
      }
      return key;
    },
    list(options: { includeArchived?: boolean } = {}) {
      return all(
        `SELECT * FROM projects ${options.includeArchived ? "" : "WHERE archived_at IS NULL"} ORDER BY starred DESC, updated_at DESC, key`,
      ).map(
        (
          project,
        ): Row & {
          counts: Record<string, number>;
          waiting: Row[];
          agents: number;
        } => {
          const items = all(
            "SELECT * FROM items WHERE project_id = ? AND status != 'cancelled'",
            str(project.id),
          );
          const counts = Object.fromEntries(
            ["backlog", "in_progress", "test", "done"].map((status) => [
              status,
              items.filter((item) => item.status === status).length,
            ]),
          );
          const waiting = items.filter(
            (item) => !!project.test_column && isAwaitingHuman(item),
          );
          const agents = new Set(
            items
              .filter(
                (item) =>
                  item.status === "in_progress" && isAiActor(item.assignee),
              )
              .map((item) => item.assignee),
          ).size;
          return { ...project, counts, waiting, agents } as unknown as Row & {
            counts: Record<string, number>;
            waiting: Row[];
            agents: number;
          };
        },
      );
    },
    get: project,
    attachmentIds(key: string) {
      const row = project(key);
      return all(
        "SELECT a.id FROM attachments a JOIN items i ON i.id = a.item_id WHERE i.project_id = ?",
        str(row.id),
      ).map((entry) => str(entry.id));
    },
    create(input: z.input<typeof projectCreate>, actor: string) {
      const data = projectCreate.parse(input);
      if (data.test_column === false && data.ai_can_close === false)
        throw new Error("Test column and AI Done cannot both be disabled");
      return write(actor, () => {
        const id = ulid();
        const timestamp = now();
        insert("projects", {
          id,
          key: data.key,
          name: data.name,
          description: data.description ?? "",
          starred: 0,
          archived_at: null,
          test_column: Number(data.test_column ?? true),
          ai_can_close: Number(data.ai_can_close ?? true),
          dod_md: data.dod_md ?? "",
          next_number: 1,
          created_at: timestamp,
          updated_at: timestamp,
        });
        const row = project(data.key);
        log(id, null, actor, "created", null, row, "Project created");
        return { value: row, event: event(id, null, "created", actor) };
      });
    },
    update(key: string, input: z.input<typeof projectPatch>, actor: string) {
      const data = projectPatch.parse(input);
      return write(actor, () => {
        const row = project(key);
        const id = str(row.id);
        const enabled = data.test_column ?? Boolean(row.test_column);
        const canClose = data.ai_can_close ?? Boolean(row.ai_can_close);
        if (!enabled && !canClose)
          throw new Error("Test column and AI Done cannot both be disabled");
        if (!enabled && row.test_column) {
          const testing = all(
            "SELECT * FROM items WHERE project_id = ? AND status = 'test'",
            id,
          );
          if (testing.length && !data.test_items_destination)
            throw new Error("Choose where Test items should move");
          for (const entry of testing) {
            const status = data.test_items_destination;
            if (!status) throw new Error("Choose where Test items should move");
            if (
              status === "done" &&
              get(
                "SELECT id FROM test_scenarios WHERE item_id = ? AND removed_at IS NULL AND result = 'failed'",
                str(entry.id),
              )
            )
              throw new Error("Failed test scenarios prevent moving to Done");
            update("items", str(entry.id), {
              status,
              updated_at: now(),
              done_at: status === "done" ? now() : null,
              seen_at: null,
            });
            log(
              id,
              str(entry.id),
              actor,
              "moved",
              { status: "test" },
              { status },
              "Test column disabled",
            );
          }
        }
        const patch: Values = {};
        for (const [k, v] of Object.entries(data))
          if (v !== undefined && k !== "test_items_destination")
            patch[k] = typeof v === "boolean" ? Number(v) : v;
        const delta = changed(row, patch);
        if (Object.keys(delta.after).length) {
          update("projects", id, { ...delta.after, updated_at: now() });
          log(
            id,
            null,
            actor,
            "edited",
            delta.before,
            delta.after,
            "Project updated",
          );
        }
        return { value: project(key), event: event(id, null, "edited", actor) };
      });
    },
    star(key: string, starred: boolean, actor: string) {
      return projects.update(key, { starred }, actor);
    },
    archive(key: string, archived: boolean, actor: string) {
      z.boolean().parse(archived);
      return write(actor, () => {
        const row = project(key);
        const id = str(row.id);
        const archivedAt = archived ? now() : null;
        update("projects", id, { archived_at: archivedAt, updated_at: now() });
        log(
          id,
          null,
          actor,
          "archived",
          { archived_at: row.archived_at },
          { archived_at: archivedAt },
          archived ? "Project archived" : "Project restored",
        );
        return {
          value: project(key),
          event: event(id, null, "archived", actor),
        };
      });
    },
    purge(key: string, confirmName: string, actor: string) {
      return write(actor, () => {
        const row = project(key);
        const id = str(row.id);
        if (!row.archived_at || row.name !== confirmName)
          throw new Error(
            "Only archived projects can be purged with their exact name",
          );
        const count = get(
          "SELECT COUNT(*) AS count FROM items WHERE project_id = ?",
          id,
        );
        insert("purge_log", {
          project_key: key,
          project_name: str(row.name),
          actor,
          purged_at: now(),
          item_count: Number(count?.count ?? 0),
        });
        log(
          id,
          null,
          actor,
          "purged",
          row,
          null,
          "Project permanently deleted",
        );
        db.query("DELETE FROM projects WHERE id = ?").run(id);
        return { value: undefined, event: event(id, null, "purged", actor) };
      });
    },
  };
  return projects;
}
