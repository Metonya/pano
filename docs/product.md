# Pano: Product

> Status: v0.1 draft (2026-11-05). Architecture: [architecture.md](architecture.md) · Decisions: [decisions.md](decisions.md)

## Who it is for and why

**Someone building a project alone and having AI agents do the work.** The person gives work to AI in chat; AI creates PBIs, distributes them to agents, progresses them, and closes them. The person sees the project's state by **looking at** Pano.

Pano is an **observation and control panel**, not a work management form:

- AI manages the work. The user does not have to interact with a card, but can.
- Everything is recorded: who changed what, when, and why.
- Pano does not run agents. It only tracks them; agents update Pano through MCP, CLI, or REST.

## Questions the user needs answered

| Question | Where in Pano |
|---|---|
| What stage is the project at? When did I start, and how much work remains? | Project summary: start date, open/closed counts, priority distribution |
| What is being worked on now, and by which agent? | Board: In Progress cards and the assigned agent |
| What is expected of me? | "Waiting for you" list: Test cards assigned to you |
| Have I looked at completed work? | "unseen" marker on Done cards |
| How has this work changed? Did it grow or get cancelled? | Card activity history: the previous and new values of every change |

## Workflow

```
Backlog → In Progress → (Test) → Done
                 ↑          │
                 └─ send back (note + screenshot)
Cancel: from any stage; the card is not deleted and stays in the "Cancelled" filter.
```

- **AI runs its own tests within In Progress.** Unit tests, build, lint, and its own functional checks (it decides which tools to use). Results appear on the card as **check** records ("unit test: 42/42 passed"). Failed tests do not move the card back and forth between columns; they become records.
- **The Test column is for human verification.** AI assigns work it cannot verify itself or that the user needs to see (UI, feel, business rules) to the user with test scenarios, and says in chat, "PANO-12 is waiting for you in Test."
- **The user:** adds/removes/edits scenarios; "Approve" → Done, "Send back" → In Progress (with a note and screenshot). This is one action and one record.
- **Default:** AI moves simple work that does not need human testing to Done itself.

### Project settings (simple)

| Setting | Default |
|---|---|
| Test column enabled | On (when disabled, AI closes all work using its own tests) |
| AI can move work to Done | Yes (for work that does not need human testing) |
| Definition of Done | Free text + a list, e.g. "unit tests exist, lint is clean, CI is green". Varies by project (Sonar, pipeline, etc.); Pano only records it and shows it to AI |

## Agents

- **The orchestrator (main agent)** does not implement work; it creates PBIs, distributes them to agents, verifies results, and updates cards.
- **Agents** identify themselves as `tool:role` (`claude:po`, `codex`, `cursor:review`), with no registration step. Assignment is at the tool level (`Claude`, `Codex`); the role appears in details and history.
- **The human** is identified by the `userName` setting; an agent assigns work to them with `assignee: "human"`. A Test card is waiting for the human when its assignee is empty or matches `userName`.
- **Usage:** The agent reports its own model, reasoning level, tokens, and duration. Pano does not measure these or estimate cost; the interface states that the values are reported.
- A user's assignment in the UI ("give it to codex") is only a **request record**; the orchestrator sees and applies it on its next check.

## Open questions (deliberately deferred)

- Notifying AI immediately when the user sends a card back (`pano watch`, webhook). In v0.1, the orchestrator sees it at the next session/check.
- Where project decisions and documents belong in Pano (remain in the repo or appear in Pano).
- Product introduction page (GitHub Pages).
- Multi-user / team use.
