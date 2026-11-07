# Agent guide

## Repository

- `apps/server`: Hono HTTP server.
- `apps/web`: React, Vite, Tailwind and shadcn/ui frontend.
- `packages/core`: shared domain code.
- `docs/`: product and architecture decisions; decisions in `docs/` are binding.
- Pano: project backlog and PBI history.
- `.github/workflows/`: CI configuration.

## Commands

Use Bun 1.3 or newer. Run `bun install`, `bun run dev`, `bun run build`, `bun run lint`, `bun run typecheck`, and `bun run test` from the repository root. The server uses port 7777 by default; set `PANO_PORT` to change it.

## PBI workflow

Read the relevant PBI in Pano and the applicable decisions in `docs/` before starting. Implement its scope and verify its acceptance criteria; record progress in the relevant PBI when authorized.

## Writing

Never use the em dash character (U+2014) anywhere in this project: UI text, docs, code, comments, tests, commit messages or PBIs. Use a period, colon or comma instead.

## Commits

Write commit messages in Turkish, retain English technical terms, and use simple language a product owner can understand. Start the title with the PBI number and describe the outcome, for example `PBI-012: İnsan testi akışı eklendi`. The body lists 2–5 user-facing changes. Before committing, check `git status` and `git diff --staged`: no scratch files, build output, secrets or personal paths. Agents working on a PBI do not commit or push; the orchestrator does.
