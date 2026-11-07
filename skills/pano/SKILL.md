---
name: pano
description: Track project work in Pano. Use when asked to plan PBIs, update a board, record verification, or hand work to a person for testing.
---

# Pano

Pano tracks work; it does not run agents. Work within the requested project and scope.

## Connect

Use the available Pano MCP tools, or the `pano` CLI. The default server is `http://127.0.0.1:7777`. Read its `/agents.md` guide for current tool and API details. If MCP is unavailable, use the CLI or REST; do not claim an update succeeded without checking the result. In a source checkout, `bun run pano` runs the CLI.

Set `PANO_URL` if the server uses a different address. If the installation requires authentication, configure `PANO_TOKEN` in the client environment; do not put secrets in cards or output. Identify changes with `PANO_ACTOR` for the CLI, an MCP actor, or `X-Pano-Actor` for REST, using an identity such as `claude:po` or `codex`.

## Workflow

1. Read the board, project settings, Definition of Done, and relevant item before changing work. Create a PBI with a clear outcome and verifiable acceptance criteria when planning new work. Avoid duplicate items.
2. Assign work to the appropriate agent by tool name, such as `codex`, and move the item to In Progress. A PO coordinates and verifies delegated work when the user requests that role.
3. Record decisions, progress, and actual verification results in the item. Use MCP `add_record` with `kind: "check"` or REST for test results; CLI `task note` creates a note. Mark only criteria that have been verified, using their returned IDs.
4. If a person needs to verify the result, add scenarios with steps and expected outcomes, assign to `human`, and move the item to Test. Tell the user what to try. Otherwise, move it to Done after verification if project settings allow agents to close it.
5. Keep history. Cancel obsolete work with a reason rather than deleting it. Report usage with `record_usage` or `pano task usage` only when values are known; never invent measurements.

## Commits

Follow the target repository's `AGENTS.md` and its commit rules. In the Pano repository, the orchestrator writes commit titles in Turkish with the PBI number and a clear outcome, for example `PANO-39: Agent çalışma yönergesi sadeleştirildi`. Keep technical terms in English, add 2 to 5 user-facing changes in the body, and review `git status` and `git diff --staged` before committing. Delegated agents do not commit or push.

## CLI examples

Replace `DEMO` with the requested project key and use the item key and criterion ID returned by Pano:

```sh
pano project list --json
pano board DEMO --json
pano task create DEMO "Add search" --criteria "Search finds matching titles" --priority medium --json
pano task assign DEMO-1 codex
pano task move DEMO-1 in_progress
pano task show DEMO-1 --json
pano task check DEMO-1 <criterion-id>
```

Use `pano --help` for commands and flags. MCP `list_projects`, `get_board`, and `get_item` provide equivalent reads. To report known usage, for example, use `pano task usage DEMO-1 --model MODEL --input 12000 --output 3000 --duration 120000`. Duration is in milliseconds. Only include fields you know; omit unknown values. `--total` is the run's own total, while `--context` is peak context and is not added to token usage.

If asked to migrate a Markdown backlog, use `pano import backlog --project DEMO --json`. It imports `PBI-*.md`, creates a missing project, and skips source IDs already imported. It does not synchronize later Markdown edits.
