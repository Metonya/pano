# Pano

[![CI](https://github.com/Metonya/pano/actions/workflows/ci.yml/badge.svg)](https://github.com/Metonya/pano/actions/workflows/ci.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Pano is a project board for building software with AI, with you in control. Trust your AI to do the work and run its own team of subagents. Follow along on the board, test the results, and decide what ships. Keep the process light: create as many or as few agents as you like, use your own skills, and change things to suit you.

AI manages cards through MCP, the `pano` CLI, or REST. Pano tracks agents but does not run them, so it works with Claude, Codex, Cursor, OpenCode, and more. When human testing is needed, AI adds instructions and scenarios for you to approve or send back. Failed scenarios prevent approval; projects can let agents close work that needs no human test. Activity retains old and new values, and cancelled cards keep their history. Permanent project deletion is a separate action that requires confirmation.

[![Pano in 60 seconds](docs/media/pano-intro.gif)](docs/media/pano-intro.mp4)

![Driftwood project board](docs/images/board.png)

<a id="installation"></a>

## Install

macOS and Linux:

```sh
curl -fsSL https://raw.githubusercontent.com/Metonya/pano/main/install.sh | sh
```

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/Metonya/pano/main/install.ps1 | iex
```

Docker (any system):

```sh
docker run -d --name pano -p 127.0.0.1:7777:7777 -e PANO_LOCAL_DOCKER=1 -v pano-data:/data ghcr.io/metonya/pano:latest
```

Run `pano serve` and open `http://localhost:7777`; for Docker, just open the URL.

The installer selects the build for your system, verifies its SHA-256 checksum, and needs no Bun or admin rights; Pano is one file and stores data in `~/.pano` by default.

## Connect your AI

With Pano running, print the MCP setup for your tool:

```sh
pano mcp-config claude
pano mcp-config codex
pano mcp-config cursor
```

MCP is optional: an agent can use the CLI. Start a conversation with your agent using this prompt from the [guide](docs/guide.md):

> Use the pano-po skill. You are the PO. Create a project called APP on Pano and plan: add search to my app. Show me the cards before starting.

## How we use it

Keep it light: one PO and a few workers. See the [guide](docs/guide.md), [PO skill](skills/pano-po/SKILL.md), and [Pano skill](skills/pano/SKILL.md); use your own skills and adjust the setup to suit you.

## Features

- Live board updates, priorities, assignments, and light and dark themes.
- Human test scenarios, AI check records, and approval or send-back notes.

![A Test card with instructions and scenarios](docs/images/test.png)

- Activity history with decisions, status changes and text diffs.

![PBI history](docs/images/history.png)

- Markdown descriptions and acceptance criteria on each PBI.

![PBI details](docs/images/detail.png)

- Multiple projects, starred projects, archives, and a cross-project waiting list.

![Projects](docs/images/projects.png)

## More install options

The installers support macOS, Linux, and Windows x64. Linux binaries require glibc; Windows ARM64 is not supported by the installer. On macOS and Linux, the installer tells you if its install directory needs to be added to your PATH. The [release workflow](.github/workflows/release.yml) publishes binaries and the registry image on a `v*` tag; check [GitHub Releases](https://github.com/Metonya/pano/releases) for downloads.

### Build from source

Install Bun 1.3 or newer, then run from the repository root:

```sh
bun install
bun run build:bin
```

Run `./dist/pano serve` on macOS or Linux, or `./dist/pano.exe serve` on Windows. Open `http://localhost:7777`. Stop the server with Ctrl+C. The executable includes the web interface and needs no separate frontend process. When working from source, replace `pano` in CLI examples with `bun run pano`.

### Docker

To build the image locally from the repository root:

```sh
docker build -t ghcr.io/metonya/pano:latest .
docker run -d --name pano -p 127.0.0.1:7777:7777 -e PANO_LOCAL_DOCKER=1 -v pano-data:/data ghcr.io/metonya/pano:latest
```

Open `http://localhost:7777`. No token is needed for this local installation. Data stays in the `pano-data` volume. You can also pull `ghcr.io/metonya/pano:latest` after the image is published.

For Compose, use [docker-compose.example.yml](docker-compose.example.yml). With the local image already built:

```sh
docker compose -f docker-compose.example.yml up -d --pull never
docker compose -f docker-compose.example.yml down
```

After publication, `docker compose -f docker-compose.example.yml up -d` can pull the image. `down` preserves the data volume.

Local Docker mode trusts local processes and containers that can reach its Docker network. Publish its port only on `127.0.0.1`, as in the examples. Host and Origin checks protect browser access; they are not authentication against other local processes or network peers. Do not publish this mode to a LAN, reverse proxy, or untrusted Docker network. For remote access, omit `PANO_LOCAL_DOCKER`, configure a strong `PANO_TOKEN`, and use an authenticated HTTPS reverse proxy.

To migrate an existing Docker installation, first back up the current data volume or bind-mounted directory using a consistent SQLite backup while the server is stopped. Keep the same `/data` volume mapping, replace the published port with `127.0.0.1:7777:7777`, remove `PANO_TOKEN`, add `PANO_LOCAL_DOCKER=1`, and recreate the container using the new image. Do not delete the volume. Verify projects, cards and attachments after restarting; retain the backup until verified. A token stored in the browser is no longer needed.

### Release binaries

When a release is available, download the file for your platform. You can verify its SHA-256 checksum against that release's `SHA256SUMS.txt`.

| Platform | File | Start command |
| --- | --- | --- |
| Windows x64 | `pano-windows-x64.exe` | `./pano-windows-x64.exe serve` |
| macOS Apple Silicon | `pano-darwin-arm64` | `./pano-darwin-arm64 serve` |
| macOS Intel | `pano-darwin-x64` | `./pano-darwin-x64 serve` |
| Linux x64 | `pano-linux-x64` | `./pano-linux-x64 serve` |
| Linux ARM64 | `pano-linux-arm64` | `./pano-linux-arm64 serve` |

On macOS and Linux, first run `chmod +x <downloaded-file>`. Run the start command from the download directory and open `http://localhost:7777`.

### Configuration

| Variable | Purpose |
| --- | --- |
| `PANO_PORT` | Server port, default `7777` |
| `PANO_HOST` | Bind address, default `127.0.0.1`; Docker uses `0.0.0.0` |
| `PANO_DATA_DIR` | Database and attachments directory, default `~/.pano`; Docker uses `/data` |
| `PANO_TOKEN` | Bearer token for the API and MCP; required beyond loopback except in local Docker mode |
| `PANO_LOCAL_DOCKER` | Set to `1` only for local Docker with a loopback-published port; mutually exclusive with `PANO_TOKEN` |
| `PANO_URL` | CLI server URL, default `http://127.0.0.1:7777` |
| `PANO_ACTOR` | Actor recorded for CLI changes, as `tool:role` (`claude:po`, `codex`) |
| `PANO_USER` | Your name until you set one under Settings, default the system account name |

## Agent connection details

Start Pano first. Set `PANO_URL` and, if required, `PANO_TOKEN` in the client environment. The `pano mcp-config` commands above print connection settings.

The Claude output is a connection command; Codex output is TOML; Cursor output is JSON. Claude and Cursor output includes the token when set, so treat it as a secret. Codex references the `PANO_TOKEN` environment variable.

For example, Claude Code with token authentication:

```sh
claude mcp add --transport http pano http://localhost:7777/mcp --header "Authorization: Bearer YOUR_TOKEN"
```

For Codex, add the following to `~/.codex/config.toml` and provide `PANO_TOKEN` in its environment:

```toml
[mcp_servers.pano]
url = "http://localhost:7777/mcp"
bearer_token_env_var = "PANO_TOKEN"
```

For a loopback server without a token, omit the authorization header or `bearer_token_env_var`. The running server provides an agent guide at `/agents.md` and OpenAPI at `/api/v1/openapi.json`.

### CLI

Use the downloaded executable as `pano`. Running it without arguments shows help.

```sh
pano project create APP "My app"
pano project list
pano task create APP "Add search" --criteria "Matches titles" --priority high
pano task assign APP-1 codex
pano task move APP-1 in_progress
pano task note APP-1 "Search implementation started"
pano board APP
pano task show APP-1 --json
pano task check APP-1 <criterion-id>
pano task move APP-1 test
```

Statuses are `backlog`, `in_progress` (also `in-progress`), `test`, `done` and `cancelled`. Cancellation requires `--reason "Reason"`. Use `task show` to find criterion IDs; `task check KEY ID --undo` unchecks one. `task assign KEY none` clears an assignment. `project list --all` includes archives; `project star|archive KEY --off` reverses that action.

When an agent finishes a run, it can report what it used: `pano task usage APP-1 --model gpt-6.1-sol --effort high --input 12000 --output 3000 --total 15000 --context 8000 --duration 120000` (duration in milliseconds), MCP `record_usage`, or `POST /api/v1/items/APP-1/usage`. All fields are optional, but at least one is required. `--total` is the run's own total; without it Pano counts input plus output. `--context` is how full the context window got: the item shows its largest value and it never adds to the total. The card and its history then show the tokens, context, model and effort, marked as values reported by the agent: Pano does not run agents, so it does not measure them.

Commands support `--help` and `--json`; errors go to stderr with exit code 1. `serve --json` prints startup information and keeps the server running. The CLI uses REST, so the web board updates as it works.

To import a Markdown backlog, run `pano import backlog --project APP`. It creates a missing project, preserves statuses, priorities and acceptance criteria, and skips existing records. It also supports `--json`. The folder must resolve inside the current working directory.

### REST

Send `Authorization: Bearer YOUR_TOKEN` when authentication is enabled, and `X-Pano-Actor` to identify who made a change:

```sh
curl http://localhost:7777/api/v1/projects \
  -H 'Authorization: Bearer YOUR_TOKEN'
curl -X POST http://localhost:7777/api/v1/projects/APP/items \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'X-Pano-Actor: codex' \
  -d '{"title":"Add search","priority":"high","criteria":["Matches titles"]}'
curl -X POST http://localhost:7777/api/v1/items/APP-1/move \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'X-Pano-Actor: codex' \
  -d '{"status":"in_progress"}'
curl http://localhost:7777/api/v1/items/APP-1/activity \
  -H 'Authorization: Bearer YOUR_TOKEN'
curl -N 'http://localhost:7777/api/v1/events?project=APP' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

## Languages

The interface supports 14 languages: English, Turkish, Azerbaijani, Chinese, Hindi, Spanish, German, French, Portuguese, Japanese, Dutch, Korean, Swedish and Polish. Translations are machine translated and open to corrections in [apps/web/src/i18n](apps/web/src/i18n). Technical terms such as Backlog, In Progress, Test, Done and PBI stay in English.

## Development

Use Bun 1.3 or newer. From the repository root:

```sh
bun install
bun run dev
bun run lint
bun run typecheck
bun run test
bun run build
```

The development web URL appears in the terminal. The API defaults to port 7777; change it with `PANO_PORT`. For browser tests, install Chromium from `apps/web` with `bunx playwright install chromium`, then run `bun run test:e2e` from the repository root.

The monorepo contains `apps/server` (Hono), `apps/web` (React, Vite, Tailwind and shadcn/ui), and `packages/core` (shared domain services). See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines and [SECURITY.md](SECURITY.md) for private vulnerability reporting.

Product and architecture decisions live in [docs](docs); UI rules are in [docs/DESIGN.md](docs/DESIGN.md).

### Demo data and screenshots

Use a separate, disposable installation with a fresh data volume. Set `PANO_URL` to its web origin, for example `http://localhost:7788`, and `PANO_TOKEN` to its token. Do not target your working Pano instance.

```sh
bun scripts/demo-seed.ts
cd apps/web && node --experimental-strip-types scripts/demo-shots.ts
```

The seed creates the starred Driftwood project with 14 English PBIs and a smaller Field Notes project. It exits without changes if `DRIFT` already exists, including after an interrupted run. Use a fresh demo volume to restart an incomplete seed.

The screenshot script uses Chromium from `@playwright/test`, an English locale, and a 1440×900 viewport. It reads the seeded installation and blocks API writes. It saves `board.png`, `board-dark.png`, `detail.png`, `test.png`, `history.png`, `projects.png`, `waiting.png` and `summary.png` under `docs/images/`. A project opened today shows the summary's opening-day message until there are at least two days of chart data. These are fictional demo records; their AI check messages do not describe checks run on Pano itself.

### Security scans and coverage

Run `bun run audit` for the Bun dependency audit. Scan the lockfile with OSV-Scanner:

```sh
docker run --rm -v "$(pwd):/repo:ro" ghcr.io/google/osv-scanner:latest scan source --lockfile /repo/bun.lock
```

On Windows Git Bash, use:

```sh
MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W):/repo:ro" ghcr.io/google/osv-scanner:latest scan source --lockfile /repo/bun.lock
```

Build the image with `docker build -t pano-scan .` and scan it with `grype pano-scan --only-fixed --fail-on high`.

Run `bun run test:coverage` to create `coverage/lcov.info`. End-to-end runs do not count toward coverage. For SonarCloud coverage, first turn off Automatic analysis at Administration > Analysis method, create a token, add it as the GitHub secret `SONAR_TOKEN`, and push. CI scans are rejected while Automatic analysis is enabled.

## Trademarks

Product names and logos belong to their owners. Pano uses them only to identify which tool an agent runs on and is not affiliated with or endorsed by them.

Logo paths come from [Simple Icons](https://github.com/simple-icons/simple-icons) (CC0; its GitHub Copilot icon is MIT). Simple Icons no longer includes the OpenAI mark, so that path comes from [OpenAI's own repository](https://github.com/openai/build-hours/blob/main/25-realtime-2/public/openai.svg) (MIT).

## License

[MIT](LICENSE). The MIT license covers the code, not the third-party names and logos listed under Trademarks.
