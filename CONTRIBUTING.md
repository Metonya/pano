# Contributing

Open an issue before starting a larger change so its scope and approach can be discussed. Corrections to documentation and translations are welcome.

## Setup and checks

Use Bun 1.3 or newer. Run these commands from the repository root:

```sh
bun install
bun run dev
bun run lint
bun run typecheck
bun run test
bun run build
```

The development web URL appears in the terminal. The API defaults to port 7777; set `PANO_PORT` to change it. For browser tests, install Chromium from `apps/web` with `bunx playwright install chromium`, then run `bun run test:e2e` from the repository root. See [Development](README.md#development) for further checks.

## Pull requests

Keep PRs small and focused. Describe the problem, resulting behavior, and how you verified it. Link the related issue or PBI and include screenshots for visible UI changes.

Tests are required for behavior changes: add or update tests that cover the change and run the relevant checks above. Explain any checks you could not run. Update documentation when behavior or setup changes.

Decisions in [docs/](docs/) are binding. Follow [AGENTS.md](AGENTS.md) and the [design system](docs/DESIGN.md). Never use the em dash character (U+2014) in UI text, documentation, code, comments, tests, or commit messages. Use a period, colon, or comma instead. Save text as UTF-8 without a BOM.

Commit messages are written in English and follow the rules in `AGENTS.md`.

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
