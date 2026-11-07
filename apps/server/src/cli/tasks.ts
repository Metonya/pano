import { parse, requireArgs } from "./args";
import { type Client, segment } from "./client";

function taskOptions(command: string | undefined) {
  switch (command) {
    case "create":
      return {
        criteria: { type: "string", multiple: true },
        body: { type: "string" },
        priority: { type: "string" },
        assignee: { type: "string" },
      };
    case "move":
      return { reason: { type: "string" } };
    case "show":
      return { history: { type: "boolean" } };
    case "check":
      return { undo: { type: "boolean" } };
    case "usage":
      return Object.fromEntries(
        [
          "model",
          "effort",
          "input",
          "output",
          "cache",
          "total",
          "context",
          "duration",
          "note",
        ].map((name) => [name, { type: "string" }]),
      );
    default:
      return {};
  }
}

function usageCount(
  values: Record<string, string | boolean | string[] | undefined>,
  flag: string,
) {
  const value = values[flag];
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(String(value)))
    throw new Error(`--${flag} must be a non-negative integer.`);
  return Number(value);
}

function moveTask(
  p: string[],
  values: Record<string, string | boolean | string[] | undefined>,
  path: string,
  api: Client,
) {
  requireArgs(p, 2, 'task move <KEY> <status> [--reason "Reason"]');
  const status = p[1] === "in-progress" ? "in_progress" : p[1];
  if (!["backlog", "in_progress", "test", "done", "cancelled"].includes(status))
    throw new Error(
      "Status: backlog, in_progress (in-progress), test, done, cancelled.",
    );
  if (status === "cancelled" && !String(values.reason ?? "").trim())
    throw new Error("Cancellation requires --reason.");
  return api(`${path}/move`, "POST", { status, reason: values.reason });
}

export async function tasks(args: string[], api: Client) {
  const [command, ...rest] = args;
  const options = taskOptions(command);
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
      requireArgs(p, 2, 'task send-back <KEY> "Note"');
      return api(`${path}/send-back`, "POST", { note: p[1] });
    case "create":
      requireArgs(
        p,
        2,
        'task create <PROJECT> "Title" [--criteria "A"] [--priority high|medium|low] [--body "Text"] [--assignee actor]',
      );
      if (
        values.priority &&
        !["high", "medium", "low"].includes(String(values.priority))
      )
        throw new Error("Priority must be high, medium or low.");
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
    case "move":
      return moveTask(p, values, path, api);
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
      requireArgs(p, 2, 'task note <KEY> "Note"');
      return api(`${path}/records`, "POST", { kind: "note", message: p[1] });
    case "usage": {
      requireArgs(
        p,
        1,
        'task usage <KEY> [--model name] [--effort level] [--input n] [--output n] [--cache n] [--total n] [--context n] [--duration ms] [--note "Note"]',
      );
      const usage = {
        model: values.model,
        effort: values.effort,
        input_tokens: usageCount(values, "input"),
        output_tokens: usageCount(values, "output"),
        cache_tokens: usageCount(values, "cache"),
        total_tokens: usageCount(values, "total"),
        context_tokens: usageCount(values, "context"),
        duration_ms: usageCount(values, "duration"),
        note: values.note,
      };
      if (Object.values(usage).every((value) => value === undefined))
        throw new Error("At least one usage field is required.");
      return api(`${path}/usage`, "POST", usage);
    }
    default:
      throw new Error(
        "Usage: pano task create|show|move|assign|check|note|usage|approve|send-back --help",
      );
  }
}
