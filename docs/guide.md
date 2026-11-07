# How we work with Pano

Pano brings project management to building software with AI and keeps you in control. You talk to one agent, which acts as the Product Owner (PO) and plans, delegates, and checks work for you. You create your own agent workers and can let your AI run subagents as needed. Pano helps you follow the project; it tracks agents but does not run them.

| Role | Does | Does not do |
| --- | --- | --- |
| You | Ask for work, decide scope, try changes, approve or send back. | Have to manage cards or coordinate workers. |
| PO agent | Plan, delegate, verify results, and keep the board current. | Write the implementation or treat a worker's report as proof. |
| Worker agents | Implement assigned work, run checks, and report results and usage. Any tool can be a worker: Claude, Codex, Cursor, OpenCode, and others. | Close their own cards or commit. |

## Keep it light

One PO and a few workers are enough. You do not need a big roster of custom agents; let your AI decide when to start a subagent. Change the agents and skills to suit you. These skills are a starting point, and your own skills work just as well.

## Follow the work

The AI updates the board over MCP, the `pano` CLI, or REST. MCP suits agents that support it; the CLI works wherever a shell is available. You do not have to touch the board.

1. **Backlog:** The PO writes a card for one outcome, with acceptance criteria you can check. You review the plan before work starts, unless you already asked the PO to start.
2. **In Progress:** The card is assigned to the agent actually doing the work. Agents record decisions and checks on it. The PO reads the changes, runs tests itself, and verifies each criterion. A failed check stays in In Progress and goes back to the worker with what failed.
3. **Test:** Only work that needs a person comes here. The PO adds what changed, how to try it, and scenarios with expected results. It assigns the card to you, so it appears under **Waiting for you**, and tells you what to test.
4. **Done:** You approve the result, or send it back with a note and optional screenshots. Sent-back work returns to In Progress. Projects can let the PO close verified work that needs no human test.

**Cancelled** keeps the card and its history, with a reason. Work is cancelled rather than deleted.

Your part is to ask, answer product decisions, test, and approve or send back. You never have to touch a card, but you can.

## Trust, checks, and usage

An agent's report is not proof. The PO runs checks itself and records the commands and results as `check` records on the card.

After every run, each agent must report the model, tokens, peak context size, and duration its tool can show on the card. Unknown values stay empty and are never guessed. This shows what the work used. Pano displays agent-reported usage; it does not measure it or calculate a price.

## Get started

1. Install Pano using the [README](../README.md), then start it with `pano serve`.
2. Copy `skills/pano` and `skills/pano-po` into your tool's skills folder. For Claude Code, for example, use `~/.claude/skills/`. If your tool has no skills support, tell it to read both `SKILL.md` files.
3. With Pano running, print the MCP connection setup for your tool:

   ```sh
   pano mcp-config claude
   pano mcp-config codex
   pano mcp-config cursor
   ```

   Use the output for your tool: Claude prints a connection command, Codex prints TOML, and Cursor prints JSON. Set `PANO_URL` for a different server and `PANO_TOKEN` if it requires authentication. Output may contain the token; keep it private. See the [Pano skill](../skills/pano/SKILL.md) for connection and tool details.

4. Start a conversation with your agent and paste:

   > Use the pano-po skill. You are the PO. Create a project called APP on Pano and plan: add search to my app. Show me the cards before starting.

Watch the [intro video](media/pano-intro.mp4), or read the [PO skill](../skills/pano-po/SKILL.md) for the full coordination workflow.
