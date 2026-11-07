import { parse, requireArgs } from "./args";
import { type Client, segment } from "./client";

export async function tasks(args: string[], api: Client) {
  const [command, ...rest] = args;
  const options =
    command === "create"
      ? {
          criteria: { type: "string", multiple: true },
          body: { type: "string" },
          priority: { type: "string" },
          assignee: { type: "string" },
        }
      : command === "move"
        ? { reason: { type: "string" } }
        : command === "show"
          ? { history: { type: "boolean" } }
          : command === "check"
            ? { undo: { type: "boolean" } }
            : command === "usage"
              ? {
                  model: { type: "string" },
                  effort: { type: "string" },
                  input: { type: "string" },
                  output: { type: "string" },
                  cache: { type: "string" },
                  duration: { type: "string" },
                  note: { type: "string" },
                }
              : {};
  const { values, positionals: p } = parse(
    rest,
    options as Record<
      string,
      { type: "string" | "boolean"; multiple?: boolean }
    >,
  );
  const path = `/items/${segment(p[0] ?? "")}`;
  switch (command) {
    case "approve":
      requireArgs(p, 1, "task approve <KEY>");
      return api(`${path}/approve`, "POST", {});
    case "send-back":
      requireArgs(p, 2, 'task send-back <KEY> "Not"');
      return api(`${path}/send-back`, "POST", { note: p[1] });
    case "create":
      requireArgs(
        p,
        2,
        'task create <PROJECT> "Başlık" [--criteria "A"] [--priority high|medium|low] [--body "Metin"] [--assignee actor]',
      );
      if (
        values.priority &&
        !["high", "medium", "low"].includes(String(values.priority))
      )
        throw new Error("Öncelik high, medium veya low olmalı.");
      return api(`/projects/${segment(p[0])}/items`, "POST", {
        title: p[1],
        criteria: values.criteria,
        body_md: values.body,
        priority: values.priority,
        assignee: values.assignee,
      });
    case "show":
      requireArgs(p, 1, "task show <KEY> [--history]");
      return api(`${path}${values.history ? "?history=true" : ""}`);
    case "move": {
      requireArgs(p, 2, 'task move <KEY> <status> [--reason "Neden"]');
      const status = p[1] === "in-progress" ? "in_progress" : p[1];
      if (
        !["backlog", "in_progress", "test", "done", "cancelled"].includes(
          status,
        )
      )
        throw new Error(
          "Durum: backlog, in_progress (in-progress), test, done, cancelled.",
        );
      if (status === "cancelled" && !String(values.reason ?? "").trim())
        throw new Error("İptal için --reason zorunlu.");
      return api(`${path}/move`, "POST", { status, reason: values.reason });
    }
    case "assign":
      requireArgs(p, 2, "task assign <KEY> <actor|none>");
      return api(`${path}/assign`, "POST", {
        assignee: p[1] === "none" ? null : p[1],
      });
    case "check":
      requireArgs(p, 2, "task check <KEY> <criterion-id> [--undo]");
      return api(`${path}/criteria/${segment(p[1])}`, "PATCH", {
        done: !values.undo,
      });
    case "note":
      requireArgs(p, 2, 'task note <KEY> "Not"');
      return api(`${path}/records`, "POST", { kind: "note", message: p[1] });
    case "usage": {
      requireArgs(
        p,
        1,
        'task usage <KEY> [--model ad] [--effort seviye] [--input n] [--output n] [--cache n] [--duration ms] [--note "Not"]',
      );
      const count = (flag: "input" | "output" | "cache" | "duration") => {
        const value = values[flag];
        if (value === undefined) return undefined;
        if (!/^\d+$/.test(String(value)))
          throw new Error(`--${flag} negatif olmayan bir tam sayı olmalı.`);
        return Number(value);
      };
      const usage = {
        model: values.model,
        effort: values.effort,
        input_tokens: count("input"),
        output_tokens: count("output"),
        cache_tokens: count("cache"),
        duration_ms: count("duration"),
        note: values.note,
      };
      if (Object.values(usage).every((value) => value === undefined))
        throw new Error("En az bir kullanım alanı gerekli.");
      return api(`${path}/usage`, "POST", usage);
    }
    default:
      throw new Error(
        "Kullanım: pano task create|show|move|assign|check|note|usage|approve|send-back --help",
      );
  }
}
