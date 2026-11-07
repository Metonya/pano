import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const pythonAvailable = (() => {
  try {
    return Bun.spawnSync(["python", "--version"]).exitCode === 0;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
})();

function readUsage(script: string, entries: unknown[], args: string[] = []) {
  const dir = mkdtempSync(join(tmpdir(), "pano-usage-"));
  try {
    const fixture = join(dir, "session.jsonl");
    writeFileSync(
      fixture,
      entries.map((entry) => JSON.stringify(entry)).join("\n"),
    );
    const path = fileURLToPath(
      new URL(`../../../skills/pano/scripts/${script}`, import.meta.url),
    );
    const result = Bun.spawnSync(["python", path, fixture, ...args]);
    expect(result.stderr.toString()).toBe("");
    expect(result.exitCode).toBe(0);
    return JSON.parse(result.stdout.toString());
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test.skipIf(!pythonAvailable)(
  "Claude usage deduplicates messages, excludes cache reads, and honors --since",
  () => {
    const message = (id: string, timestamp: string, output: number) => ({
      timestamp,
      message: {
        id,
        role: "assistant",
        model: "claude-example",
        usage: {
          input_tokens: 10,
          cache_creation_input_tokens: 5,
          cache_read_input_tokens: 100,
          output_tokens: output,
        },
      },
    });
    const entries = [
      message("old", "2026-11-07T14:59:00Z", 20),
      message("first", "2026-11-07T15:00:00Z", 1),
      message("first", "2026-11-07T15:00:01Z", 3),
      message("second", "2026-11-07T15:00:02Z", 4),
    ];
    expect(readUsage("usage_from_claude.py", entries)).toEqual({
      model: "claude-example",
      input_tokens: 45,
      output_tokens: 27,
      cache_tokens: 300,
      total_tokens: 72,
      context_tokens: 115,
      duration_ms: 62000,
      messages: 3,
    });
    expect(
      readUsage("usage_from_claude.py", entries, [
        "--since",
        "2026-11-07T15:00:00Z",
      ]),
    ).toEqual({
      model: "claude-example",
      input_tokens: 30,
      output_tokens: 7,
      cache_tokens: 200,
      total_tokens: 37,
      context_tokens: 115,
      duration_ms: 2000,
      messages: 2,
    });
  },
);

test.skipIf(!pythonAvailable)(
  "Codex usage uses cumulative totals without cached reads and keeps peak context",
  () => {
    const count = (
      timestamp: string,
      input: number,
      cached: number,
      output: number,
      context: number,
    ) => ({
      timestamp,
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: {
            input_tokens: input,
            cached_input_tokens: cached,
            output_tokens: output,
          },
          last_token_usage: { input_tokens: context },
        },
      },
    });
    expect(
      readUsage("usage_from_codex.py", [
        {
          timestamp: "2026-11-07T15:00:00Z",
          type: "session_meta",
          payload: { cwd: "/example/project" },
        },
        { type: "turn_context", payload: { model: "codex-example" } },
        count("2026-11-07T15:00:01Z", 120, 100, 3, 120),
        count("2026-11-07T15:00:03Z", 200, 150, 7, 80),
      ]),
    ).toEqual({
      file: "session.jsonl",
      cwd: "/example/project",
      model: "codex-example",
      input_tokens: 50,
      output_tokens: 7,
      cache_tokens: 150,
      total_tokens: 57,
      context_tokens: 120,
      duration_ms: 3000,
    });
  },
);
