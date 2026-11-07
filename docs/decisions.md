# Decisions

This log preserves past decisions in chronological order. Later decisions may supersede earlier ones. See product.md and architecture.md for current product and architecture behavior.

| Date | Decision | Reason |
| ---------- | ---------- | ---------- |
| 2026-11-05 | We are building our own tool instead of using an existing one (Backlog.md, Vibe Kanban) | Existing tools do not combine a central multi-project board, starring/archiving, and agent assignment |
| 2026-11-05 | Stack: Bun + Hono + SQLite + React/Vite + shadcn/ui | One language (TS), single-file binary, DB with no installation |
| 2026-11-05 | Agent interface: REST core; MCP (HTTP, embedded in the server) + CLI (same binary) + `/agents.md` | Nobody should need to install anything separately; MCP connects with just a URL |
| 2026-11-05 | Limit MCP tools to 7 | Every tool consumes tokens in every agent conversation |
| 2026-11-05 | Repo: `Metonya/pano`, private, MIT; public in v0.1 | - |
| 2026-11-05 | 4 fixed statuses in v0.1: Backlog, In Progress, Test, Done | Start simple; custom columns later |
| 2026-11-05 | Until Pano can manage itself, keep the backlog in `backlog/*.md` + `board.html` | Will move to Pano with PBI-009 |
| 2026-11-05 | Design: spacious density, left sidebar navigation, PBI details in a centered sheet, Apple blue accent (#0071e3 / #0a84ff), light + dark following the system | Chosen together with the owner (PBI-004) |
| 2026-11-05 | Keep the name "Pano"; no domain will be bought | A small personal project on GitHub has the same name, but no commercial product; low risk |
| 2026-11-05 | Pano does not run agents, only tracks them | Keep it lightweight and compatible with every agent; assignments from the UI become requests to the orchestrator |
| 2026-11-05 | AI moves simple work that does not need human testing to Done itself; assigns work that needs it to the user with test scenarios | The user should not have to interact with a card unless AI assigns it to them |
| 2026-11-05 | AI runs its own tests within In Progress and writes results as "check" records; the Test column is only for human verification | Cards should not move between columns on every failed test |
| 2026-11-05 | The Test column and "AI Done'a çekebilir" [AI can move to Done] are project settings; Definition of Done is free text per project | Each project's testing needs differ (unit, pipeline, Sonar...) |
| 2026-11-05 | Nothing is deleted: cancellation is a status, and every change is recorded with previous/new values | The user can see how work grew/changed; agents receive only a summary by default |
| 2026-11-05 | Open question: immediately triggering AI when a card is sent back (watch/webhook) | Unnecessary complexity for now; the orchestrator sees it on its next check |
| 2026-11-05 | Open question: where project decisions/documents belong in Pano; product introduction page | Deferred |
| 2026-11-05 | Application settings: language (TR/EN, default system language), appearance (Açık/Koyu/Otomatik [Light/Dark/Automatic], default Automatic), version information and update check; updates through `pano update` with user approval | Users expect these in settings; automatic updates risk losing trust |
| 2026-11-05 | No summary boxes on the board; only critical information in a thin single line. "Seni bekliyor" [Waiting for you] in the sidebar, unseen completed work marked by a small dot on the card (no text), cancelled items in the filter menu | Information that is not constantly consulted should not clutter the screen (design review + the owner) |
| 2026-11-05 | macOS-style unified toolbar: project name on the left, icon actions on the right | Apple HIG; more room for cards |
| 2026-11-05 | PBI details remain a centered sheet | The owner liked the current version |
| 2026-11-05 | Known technical terms (Backlog, In Progress, Test, Done, PBI...) stay in English in every language | Avoid forced translations |
| 2026-11-06 | After Codex review (7/10): Onayla [Approve] is disabled when a scenario has "kaldı" [failed]; a send-back note is required; data age and connection state are visible, a quiet agent is not labeled "takıldı" [stuck]; "Seni bekliyor" [Waiting for you] is a cross-project list | In an observation product, users must be able to trust how current the displayed data is |
| 2026-11-06 | Priority is written as Yüksek / Orta / Düşük [High / Medium / Low] in the UI; only High is colored; `high/medium/low` in the API | "P1" is not clear at first glance (the owner's canvas comment) |
| 2026-11-06 | PBI number is `#4` within a project; `PANO-4` across projects (Waiting for you, commits, agent commands) | The project is already clear on the board; avoid repetition |
| 2026-11-06 | Project actions are in the card's … button and right-click menu; permanent deletion only for archived projects, by typing the project name | Prevent accidental loss of history |
| 2026-11-06 | Agents appear in the UI with a readable name + role (Claude · PO, Claude · Tasarım [Design], Codex, the user); technical identity (`claude:po`) in the API and history details | Lowercase technical identities look odd to users |
| 2026-11-06 | Codex uses Pano through the terminal (CLI/REST) rather than MCP; work is given to Codex in a terminal tab so the owner can watch | The CLI path works |
| 2026-11-06 | A new project asks only for a name; the key is generated from it automatically and can be edited with "Değiştir" [Change] | The key is a technical detail; users should not have to think about it (the owner's test) |
| 2026-11-06 | Click outside a dialog / Esc: closes if empty; if the user has typed something, asks "Yazdıkların silinsin mi?" [Discard what you wrote?]; permanent deletion confirmation does not close on outside click; read-only windows always close | Prevent accidental loss of work without unnecessary barriers |
| 2026-11-06 | No Active/Archive selector on the Projects screen; access the archive from the left menu | Two controls for the same task are unnecessary (the owner's test) |
| 2026-11-06 | Drag the whole card; a short click opens it; no separate handle. The whole project card opens the project | the owner's test: a separate handle and clicking only the text did not feel good |
| 2026-11-06 | Dialogs are anchored from the top rather than vertically centered | Prevent the window from jumping as content grows |
| 2026-11-06 | Give work with non-overlapping files to Codex in parallel in separate terminals | the owner's request; speed |
| 2026-11-06 | Test card: Ne değişti [What changed], Nasıl denerim [How to test], scenarios, AI tests; actions Onayla [Approve], Geri gönder [Send back], Geri ata [Reassign back]. No deferral or person selector | The minimum needed for the manager to try the product; until teams arrive, "someone else" means AI |
| 2026-11-06 | The Done column puts the most recently completed work first, with no manual ordering; other columns sort by priority and position | Done reads like a logbook: "what finished most recently" (the owner) |
| 2026-11-06 | Geri ata [Reassign back] was removed; the only return action in the Test panel is Geri gönder [Send back] (the card moves to In Progress and is assigned to AI). Also removed from the API and CLI; old records remain readable in history | Both meant "let AI look at it"; one concept is enough (the owner) |
| 2026-11-06 | The default history view is Önemli [Important]; status transitions use colored station badges, and all records remain under Tümü [All] | History contained everything, relevant or not (the owner) |

The `pano update` entry records the original decision. The current command updates a compiled binary when explicitly run; Docker installations are directed to pull a new image and restart. On Windows, the updater currently looks for a `pano-win32-x64.exe` asset, while the release workflow names it `pano-windows-x64.exe`, so that update path cannot find the published asset.
