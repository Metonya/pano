import { parse, requireArgs } from "./args";
import { type Client, segment } from "./client";

export async function projects(args: string[], api: Client) {
  const [command, ...rest] = args;
  const nonCreateOptions: Record<string, { type: "boolean" }> =
    command === "list"
      ? { all: { type: "boolean" as const } }
      : { off: { type: "boolean" as const } };
  const { values, positionals } = parse(
    rest,
    command === "create"
      ? { description: { type: "string" } }
      : nonCreateOptions,
  );
  switch (command) {
    case "list":
      requireArgs(positionals, 0, "project list [--all]");
      return api(`/projects${values.all ? "?includeArchived=true" : ""}`);
    case "create":
      requireArgs(
        positionals,
        2,
        'project create <KEY> "Name" [--description "Text"]',
      );
      return api("/projects", "POST", {
        key: positionals[0],
        name: positionals[1],
        description: values.description,
      });
    case "star":
    case "archive":
      requireArgs(positionals, 1, `project ${command} <KEY> [--off]`);
      return api(`/projects/${segment(positionals[0])}/${command}`, "POST", {
        [command === "star" ? "starred" : "archived"]: !values.off,
      });
    default:
      throw new Error("Usage: pano project list|create|star|archive --help");
  }
}
