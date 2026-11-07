---
name: pano
description: Manage project backlog items, assignments, acceptance criteria, and test records in a running Pano server through MCP or CLI.
---

# Pano

Use this skill when asked to track work in Pano. Pano records work; it does not run agents. Stay within the user's requested project and scope.

## Connect

The default server is `http://127.0.0.1:7777`. Read its `/agents.md` guide before changing items; it documents the current API and workflow. If the server is offline, start it with `pano serve` when authorized.

- MCP: connect your client's Streamable HTTP transport to `<server>/mcp`. `pano mcp-config claude`, `pano mcp-config codex`, or `pano mcp-config cursor` prints client configuration. Use `list_projects`, `get_board`, `get_item`, `create_item`, `update_item`, `check_criterion`, `add_record`, and `record_usage`.
- CLI: use `pano --help`. Set `PANO_URL` for another server, `PANO_TOKEN` when authentication is enabled, and `PANO_ACTOR` to your agent identity (`tool:role`). For MCP or REST, send `Authorization: Bearer <token>` when required; REST uses `X-Pano-Actor` for the actor. Never put tokens into item text.
- CLI commands support `--json`. For operations beyond the CLI, use MCP or the REST endpoints described by `/agents.md`.

## Identity

Introduce yourself as `tool:role`, such as `claude:po`, `codex` or `cursor:review`; there is no registration. When assigning work to an agent as a person or PO, use the tool name (`claude`); when recording yourself, use `tool:role`. Use `assignee: "human"` for the person; the server resolves it to their name.

## Example workflow

```sh
pano project list --json
pano board DEMO --json
pano task create DEMO "Add search" --criteria "Search finds matching titles" --priority medium --json
# Use the returned key in subsequent commands.
pano task assign DEMO-1 codex
pano task move DEMO-1 in_progress
# Later, for human verification: pano task assign DEMO-1 human
pano task show DEMO-1 --json
pano task check DEMO-1 <criterion-id>
```

Read project settings and the Definition of Done. Check the current item and criteria before implementation. Use the returned criterion IDs when marking verified criteria.

Record AI test results while the item remains In Progress: call MCP `add_record` with `kind: "check"` and a factual message such as `Unit tests: 12/12 passed`. Include failures and limitations. CLI `task note` creates a note, so use MCP or REST for check records.

When you finish a run, report it with MCP `record_usage` or `pano task usage DEMO-1 --model gpt-6.1-sol --effort high --input 12000 --output 3000 --duration 120000` (duration in milliseconds). Send only what you actually know; never invent values or send zeros. Pano shows them as reported by the agent, not as measurements.

If human verification is needed, add test scenarios with steps and expected results, assign the item to `human`, and move it to Test. Tell the user which item is waiting and what to verify. Test is for human verification. Otherwise move it to Done after verification, if the project's AI closing setting allows it.

Cancel only with a reason, for example `pano task move DEMO-1 cancelled --reason "Replaced by DEMO-2"`. Never delete items or their history; retain changes and decisions as records.

To migrate a Markdown backlog when requested:

```sh
pano import backlog --project DEMO --json
```

This imports `PBI-*.md`, creates the project if missing, and skips items with an existing source ID on repeat runs. It does not synchronize later Markdown edits.
