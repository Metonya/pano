import { version } from "../../../../package.json";
import { parse, requireArgs } from "./args";
import { client, type Fetch, segment } from "./client";
import { importBacklog } from "./import";
import { mcpConfig } from "./mcp-config";
import { readable } from "./output";
import { projects } from "./projects";
import { tasks } from "./tasks";
import { update } from "./update";

const help = `Pano CLI
pano serve                            Sunucuyu başlat
pano project list [--all]
pano project create <KEY> "Ad" [--description "Metin"]
pano project star|archive <KEY> [--off]
pano board <KEY>                       Backlog / In Progress / Test / Done
pano import <backlog-klasörü> --project KEY
pano task create <PROJECT> "Başlık" [--criteria "A"] [--criteria "B"] [--priority high|medium|low] [--body "Metin"] [--assignee actor]
pano task show <KEY> [--history]
pano task move <KEY> <backlog|in_progress|test|done|cancelled> [--reason "Neden"]
pano task assign <KEY> <actor|none>
pano task check <KEY> <criterion-id> [--undo]
pano task note <KEY> "Not"
pano task usage <KEY> [--model ad] [--effort seviye] [--input n] [--output n] [--cache n] [--total n] [--context n] [--duration ms] [--note "Not"]
pano mcp-config <claude|codex|cursor>
--help (-h) yardım; --json JSON çıktı (hatalar stderr).
PANO_URL=http://127.0.0.1:7777; PANO_TOKEN=Bearer token; PANO_ACTOR=işlemi yapan.
İptalde --reason zorunlu; in-progress de kabul edilir.
serve --json: başlangıç bilgisi JSON; sunucu çalışmaya devam eder.`;

export async function runCli(
  args: string[],
  options: {
    env?: NodeJS.ProcessEnv;
    fetch?: Fetch;
    stdout?: (text: string) => void;
    stderr?: (text: string) => void;
    serve?: () => Promise<void>;
  } = {},
) {
  const env = options.env ?? process.env;
  const stdout =
    options.stdout ??
    ((text) => {
      process.stdout.write(text, "utf8");
    });
  const stderr =
    options.stderr ??
    ((text) => {
      process.stderr.write(text, "utf8");
    });
  // Used by the Docker HEALTHCHECK: the runtime image has no shell or curl.
  if (args[0] === "healthcheck") {
    const port = env.PANO_PORT ?? "7777";
    const response = await (options.fetch ?? fetch)(
      `http://127.0.0.1:${port}/api/v1/health`,
    ).catch(() => null);
    return response?.ok ? 0 : 1;
  }
  let json = false;
  try {
    // Parse only universal flags here; command parsers validate their own options.
    const global = parse(args, {
      version: { type: "boolean" },
      criteria: { type: "string", multiple: true },
      body: { type: "string" },
      priority: { type: "string" },
      assignee: { type: "string" },
      reason: { type: "string" },
      description: { type: "string" },
      all: { type: "boolean" },
      off: { type: "boolean" },
      undo: { type: "boolean" },
      history: { type: "boolean" },
      project: { type: "string" },
      model: { type: "string" },
      effort: { type: "string" },
      input: { type: "string" },
      output: { type: "string" },
      cache: { type: "string" },
      total: { type: "string" },
      context: { type: "string" },
      duration: { type: "string" },
      note: { type: "string" },
    });
    json = global.values.json === true;
    let data: unknown;
    if (global.values.version) data = version;
    else if (!global.positionals.length || global.values.help) data = help;
    else {
      const api = client(env, options.fetch ?? fetch);
      const flagIndices = new Set(
        global.tokens
          .filter((token) => token.kind === "option" && token.name === "json")
          .map((token) => token.index),
      );
      const [command, ...rest] = args.filter(
        (_, index) => !flagIndices.has(index),
      );
      switch (command) {
        case "update":
          requireArgs(parse(rest).positionals, 0, "update");
          data = await update(options.fetch ?? fetch);
          break;
        case "import":
          data = await importBacklog(rest, api);
          break;
        case "project":
          data = await projects(rest, api);
          break;
        case "task":
          data = await tasks(rest, api);
          break;
        case "board": {
          const { positionals } = parse(rest);
          requireArgs(positionals, 1, "board <KEY>");
          const key = positionals[0];
          const items = (await api(
            `/projects/${segment(key)}/items`,
          )) as Record<string, unknown>[];
          data = {
            columns: Object.fromEntries(
              ["backlog", "in_progress", "test", "done"].map((status) => [
                status,
                items
                  .filter((item) => item.status === status)
                  .map((item) => ({ ...item, key: `${key}-${item.number}` })),
              ]),
            ),
          };
          break;
        }
        case "mcp-config": {
          const { positionals } = parse(rest);
          requireArgs(positionals, 1, "mcp-config <claude|codex|cursor>");
          data = mcpConfig(positionals[0], env);
          break;
        }
        case "serve":
          requireArgs(parse(rest).positionals, 0, "serve");
          await (
            options.serve ??
            (async () => {
              const { serve } = await import("../serve");
              await serve();
            })
          )();
          data = {
            serving: true,
            host: env.PANO_HOST || "127.0.0.1",
            port: Number(env.PANO_PORT ?? 7777),
          };
          break;
        default:
          throw new Error("Bilinmeyen komut. pano --help ile komutları gör.");
      }
    }
    stdout(`${json ? JSON.stringify(data, null, 2) : readable(data)}\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const output =
      json || args.includes("--json")
        ? JSON.stringify({ error: { message } })
        : `Hata: ${message}`;
    stderr(`${output}\n`);
    return 1;
  }
}
