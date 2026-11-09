# Pano: Design system

> Status: v0.1, approved by the owner (2026-11-06). Product: [product.md](product.md)
>
> This file must be self-contained: agents building the UI must not invent values beyond the tokens and rules here. If a value is missing, ask; if adding a new value, update this file too.

Target stack: React + Vite + Tailwind v4 + shadcn/ui + lucide-react.

## 1. Principles

1. **Operate mode.** Pano is a work tool: scannability, consistency, and familiar macOS patterns come before expressiveness. Branding lives in small details.
2. **macOS feel.** Left sidebar, thin translucent toolbar, centered sheet, one accent color (Apple blue), system font.
3. **Only critical information.** Information the user does not constantly consult stays off the screen; details are one click away. No repeated metric boxes.
4. **AI does the work; the user stays in control.** When something is expected of the user (Test), it is the most visible signal: orange "Waiting for you".
5. **Hierarchy:** spacing > weight > size > color. One primary action per screen.
6. **Accessible as designed.** Real `<button>`/`<a>`/`<input>` elements, visible focus, AA contrast, no meaning conveyed by color alone, 44px touch targets on mobile.

## 2. Tokens

### Colors

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `bg` | `#f5f5f7` | `#000000` | Page background |
| `sidebar` | `#fbfbfd` | `#161617` | Sidebar background |
| `toolbar` | `rgba(245,245,247,0.82)` | `rgba(0,0,0,0.72)` | Toolbar, with `backdrop-filter: saturate(180%) blur(20px)` |
| `card` | `#ffffff` | `#1c1c1e` | Card and input background |
| `sheet` | `#ffffff` | `#2c2c2e` | Sheet/dialog (one level lighter in dark mode) |
| `window` | `#f5f5f7` | `#1c1c1e` | Application settings window |
| `text` | `#1d1d1f` | `#f5f5f7` | Main text |
| `muted` | `#636366` | `#a1a1a6` | Secondary text, icons |
| `[placeholder]` | `#636366` | `#aeaeb2` | Input/textarea placeholder (theme-aware; never used as the sole label) |
| `skeleton` | `rgba(0,0,0,0.07)` | `rgba(255,255,255,0.10)` | Loading skeleton bars |
| `notice-bg` | `rgba(0,0,0,0.035)` | `rgba(255,255,255,0.04)` | Connection banner background (calm, not a warning color) |
| `tooltip-bg` / `tooltip-fg` | `#1d1d1f` / `#ffffff` | `#f5f5f7` / `#1d1d1f` | Tooltip |
| `line` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.10)` | Border, divider (0.10 / 0.12 in the settings window) |
| `field` | `rgba(0,0,0,0.05)` | `rgba(255,255,255,0.08)` | Segment background, count badge, code block |
| `track` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.12)` | Progress bar track |
| `primary` | `#0071e3` | `#0071e3` | Primary button background, enabled switch, avatar (with white text) |
| `accent` | `#0071e3` | `#0a84ff` | Unseen dot, In Progress dot, link button |
| `accent-text` | `#0058b0` | `#4da3ff` | Text on a light blue background, links |
| `accent-soft` | `rgba(0,113,227,0.10)` | `rgba(10,132,255,0.18)` | Assignee chip, active sidebar item, information banner |
| `active-border` | `rgba(0,113,227,0.35)` | `rgba(10,132,255,0.55)` | Border of a card being worked on (In Progress) |
| `focus` | `#0071e3` | `#0a84ff` | `:focus-visible` ring |
| `selection` | `rgba(0,113,227,0.22)` | `rgba(10,132,255,0.30)` | `::selection` |
| `p1` / `p1-bg` | `#d70015` / `rgba(215,0,21,0.08)` | `#ff6961` / `rgba(255,105,97,0.15)` | High priority |
| `wait` / `wait-bg` / `wait-line` | `#8a4b00` / `rgba(255,159,10,0.14)` / `rgba(255,159,10,0.35)` | `#ffb340` / `rgba(255,159,10,0.18)` / `rgba(255,159,10,0.40)` | "Waiting for you", Test status |
| `on-wait` | `#ffffff` | `#1c1c1e` | Text in count badges with a `wait` background |
| `star` | `#ff9f0a` | `#ffb340` | Star (icon only, not text) |
| `success` / `success-bg` | `#1c6e30` / `rgba(52,199,89,0.14)` | `#30d158` / `rgba(48,209,88,0.16)` | Passed, check records, "Pano is up to date" |
| `progress` | `#248a3d` | `#30d158` | Progress bar fill, Done dot |
| `danger` | `#c4001a` | `#ff6961` | Destructive button text ("Cancel PBI…") |
| `fail` / `fail-bg` | `#b8001a` / `rgba(255,59,48,0.10)` | `#ff6961` / `rgba(255,105,97,0.16)` | Failed |
| `diff-del` / `diff-del-bg` | `#9e0016` / `rgba(255,59,48,0.08)` | `#ff8a84` / `rgba(255,105,97,0.14)` | Deleted diff line |
| `diff-add` / `diff-add-bg` | `#1c6e30` / `rgba(52,199,89,0.12)` | `#4cd964` / `rgba(48,209,88,0.14)` | Added diff line |
| `scrim` | `rgba(0,0,0,0.30)` | `rgba(0,0,0,0.60)` | Behind the sheet |
| `shadow-card` | `0 1px 2px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.04)` | `none` | Card |
| `shadow-sheet` | `0 30px 90px rgba(0,0,0,0.30)` | same | Sheet |

Status dots: Backlog `muted`, In Progress `accent`, Test `star`/orange `#ff9f0a`, Done `progress`.

### Contrast

Calculated pairs (WCAG 2.x, all targeting ≥ 4.5:1):

- `muted #636366` / `bg #f5f5f7` ≈ 5.4 · / `card #fff` ≈ 5.9
- White / `primary #0071e3` ≈ 4.6 (this is why the button background is the same in light and dark mode)
- `accent-text #0058b0` / `accent-soft` (over white) ≈ 6.0
- `wait #8a4b00` / `wait-bg` (over white) ≈ 5.6
- `p1 #d70015` / `p1-bg` ≈ 5.2
- `success #1c6e30` / `success-bg` ≈ 5.9
- Dark: `muted #a1a1a6` / `card #1c1c1e` ≈ 6.7 · `accent-text #4da3ff` / `#1c1c1e` ≈ 6.3
- Placeholder: light `#636366` / `field` (over white ≈ `#f2f2f2`) ≈ 5.4 · dark `#aeaeb2` / `field` (over sheet `#2c2c2e` ≈ `#3a3a3c`) ≈ 5.1. The old `#636366` on a dark sheet field was 1.8 (Codex review).

> Priority: **High / Medium / Low** (API: `high/medium/low`). Only High uses a colored `p1`/`p1-bg` badge. Medium and Low are plain 12px `muted` text; cards hide the default Medium and show Low. When adding a color pair, calculate its contrast and record it here.

### CSS variables

```css
:root {
  --bg: #f5f5f7;
  --sidebar: #fbfbfd;
  --toolbar: rgba(245, 245, 247, 0.82);
  --card: #ffffff;
  --sheet: #ffffff;
  --window: #f5f5f7;
  --text: #1d1d1f;
  --muted: #636366;
  --line: rgba(0, 0, 0, 0.08);
  --placeholder: #636366;
  --skeleton: rgba(0, 0, 0, 0.07);
  --notice-bg: rgba(0, 0, 0, 0.035);
  --tooltip-bg: #1d1d1f;
  --tooltip-fg: #ffffff;
  --field: rgba(0, 0, 0, 0.05);
  --track: rgba(0, 0, 0, 0.08);
  --primary: #0071e3;
  --accent: #0071e3;
  --accent-text: #0058b0;
  --accent-soft: rgba(0, 113, 227, 0.1);
  --active-border: rgba(0, 113, 227, 0.35);
  --focus: #0071e3;
  --selection: rgba(0, 113, 227, 0.22);
  --p1: #d70015;
  --p1-bg: rgba(215, 0, 21, 0.08);
  --wait: #8a4b00;
  --wait-bg: rgba(255, 159, 10, 0.14);
  --wait-line: rgba(255, 159, 10, 0.35);
  --on-wait: #ffffff;
  --star: #ff9f0a;
  --progress: #248a3d;
  --success: #1c6e30;
  --success-bg: rgba(52, 199, 89, 0.14);
  --danger: #c4001a;
  --fail: #b8001a;
  --fail-bg: rgba(255, 59, 48, 0.1);
  --diff-del: #9e0016;
  --diff-del-bg: rgba(255, 59, 48, 0.08);
  --diff-add: #1c6e30;
  --diff-add-bg: rgba(52, 199, 89, 0.12);
  --scrim: rgba(0, 0, 0, 0.3);
  --shadow-card: 0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 14px rgba(0, 0, 0, 0.04);
  --shadow-sheet: 0 30px 90px rgba(0, 0, 0, 0.3);
  color-scheme: light;
}

/* Dark theme: when the user selects "Dark" */
:root[data-theme="dark"] {
  /* same values as the block below */
}

/* "Automatic": follow the system if data-theme is absent or "auto" */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* values below */
  }
}

/* Dark values (applied to both selectors) */
:root[data-theme="dark"] {
  --bg: #000000;
  --sidebar: #161617;
  --toolbar: rgba(0, 0, 0, 0.72);
  --card: #1c1c1e;
  --sheet: #2c2c2e;
  --window: #1c1c1e;
  --text: #f5f5f7;
  --muted: #a1a1a6;
  --line: rgba(255, 255, 255, 0.1);
  --placeholder: #aeaeb2;
  --skeleton: rgba(255, 255, 255, 0.1);
  --notice-bg: rgba(255, 255, 255, 0.04);
  --tooltip-bg: #f5f5f7;
  --tooltip-fg: #1d1d1f;
  --field: rgba(255, 255, 255, 0.08);
  --track: rgba(255, 255, 255, 0.12);
  --primary: #0071e3;
  --accent: #0a84ff;
  --accent-text: #4da3ff;
  --accent-soft: rgba(10, 132, 255, 0.18);
  --active-border: rgba(10, 132, 255, 0.55);
  --focus: #0a84ff;
  --selection: rgba(10, 132, 255, 0.3);
  --p1: #ff6961;
  --p1-bg: rgba(255, 105, 97, 0.15);
  --wait: #ffb340;
  --wait-bg: rgba(255, 159, 10, 0.18);
  --wait-line: rgba(255, 159, 10, 0.4);
  --on-wait: #1c1c1e;
  --star: #ffb340;
  --progress: #30d158;
  --success: #30d158;
  --success-bg: rgba(48, 209, 88, 0.16);
  --danger: #ff6961;
  --fail: #ff6961;
  --fail-bg: rgba(255, 105, 97, 0.16);
  --diff-del: #ff8a84;
  --diff-del-bg: rgba(255, 105, 97, 0.14);
  --diff-add: #4cd964;
  --diff-add-bg: rgba(48, 209, 88, 0.14);
  --scrim: rgba(0, 0, 0, 0.6);
  --shadow-card: none;
  color-scheme: dark;
}
```

Keep dark values in one source in the application (e.g. a mixin or build step in `tokens.css`) and apply them to both `[data-theme="dark"]` and `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`. Read the theme from `localStorage` with a small inline script in `<head>` before the first paint (no flash).

### Tailwind v4 mapping

```css
@import "tailwindcss";
@theme inline {
  --color-bg: var(--bg); --color-sidebar: var(--sidebar); --color-toolbar: var(--toolbar);
  --color-card: var(--card); --color-sheet: var(--sheet);
  --color-fg: var(--text); --color-muted: var(--muted); --color-line: var(--line);
  --color-field: var(--field); --color-track: var(--track);
  --color-primary: var(--primary); --color-accent: var(--accent);
  --color-accent-text: var(--accent-text); --color-accent-soft: var(--accent-soft);
  --color-p1: var(--p1); --color-p1-bg: var(--p1-bg);
  --color-wait: var(--wait); --color-wait-bg: var(--wait-bg);
  --color-star: var(--star); --color-progress: var(--progress);
  --color-success: var(--success); --color-success-bg: var(--success-bg);
  --color-danger: var(--danger); --color-fail: var(--fail); --color-fail-bg: var(--fail-bg);
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, monospace;
  --radius-sm: 8px; --radius-md: 10px; --radius-lg: 12px; --radius-xl: 16px; --radius-sheet: 24px;
  --shadow-card: var(--shadow-card); --shadow-sheet: var(--shadow-sheet);
}
```

shadcn tokens map to these: `--background → --bg`, `--foreground → --text`, `--card → --card`, `--popover → --sheet`, `--primary → --primary` (`--primary-foreground: #fff`), `--muted-foreground → --muted`, `--border`/`--input → --line`, `--ring → --focus`, `--destructive → --danger`, `--radius: 10px`.

## 3. Typography

Font: `-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif` (SF on macOS, Inter elsewhere; load Inter `400/500/600/700`). Code and paths: `ui-monospace, "SF Mono", Menlo, monospace`, 12px. `-webkit-font-smoothing: antialiased`.

| Role | Size / weight | Line height | Letter-spacing | Where |
| --- | --- | --- | --- | --- |
| Toolbar title | 26 / 700 | 1.25 | −0.025em | Board, Projects toolbar |
| Sheet title | 24 / 700 | 1.25 | −0.02em | Dialog title |
| Brand | 19 / 600 | 1 | −0.02em | "Pano" in the sidebar |
| Mobile title | 34 / 700 | 1.1 | −0.03em | Mobile only (iOS Large Title) |
| Card title / section heading | 15 / 600 | 1.35 | −0.01em | Card `h3`, column `h2`, sheet section `h3` |
| Body | 15 / 400 | 1.45–1.6 | 0 | Sheet content, scenario step, timeline |
| List / sidebar | 14 / 500 | - | 0 | Sidebar items, secondary buttons |
| Small text / button | 13 / 500–600 | 1.45 | 0 | Toolbar button, segment, summary line, metadata |
| Caption | 12 / 600 (key) or 400 (help) | - | 0 | PBI key, priority badge, help text |

Numbers (PBI key, column count, criterion progress `1/3`, time) use `font-variant-numeric: tabular-nums`. No text below 12px (exceptions: avatar letter 9–10px, `aria-hidden`; mobile segment label 11px).

## 4. Spacing, radius, size

- **Rhythm:** 4/8. Spacing values used: 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32.
- **Sidebar:** `flex: 1 1 260px; max-width: 280px`, padding `28px 18px`, 26px between sections, item height 40px ("Waiting for you" 44px).
- **Toolbar:** 52px, padding `0 16px 0 28px`, `position: sticky; top: 0`, bottom border `1px solid var(--line)`.
- **Content:** padding `18px 28px 56px`, 22px between blocks.
- **Board column:** 4 columns `repeat(4, minmax(0,1fr))`, gap 20px, `min-width: 960px` (horizontal scrolling container on narrow screens). 12px between cards within a column. No column background.
- **Card:** padding `16px 18px`, internal gap 10px, radius 16px, border `1px solid var(--line)` (`--active-border` for In Progress cards).
- **Sheet:** `max-width: 760px`, radius 24px, top offset 64px, header padding `28px 32px 20px`, content sections `14–16px 32px`, footer padding `18px 32px`.

| Control | Desktop | Mobile |
| --- | --- | --- |
| Toolbar icon button | 36×32, radius 8 | 44×44, radius 22 |
| Toolbar primary button | 32, padding `0 12px 0 10px`, radius 8 | 44 circle (icon) |
| Sheet footer button | 36, padding `0 14–18px`, radius 10 | ≥44 |
| Status popup / segment | 30–32, radius 8 (segment background radius 10, padding 3) | 52px segment (radius 12) |
| Passed/Failed | 32, radius 8 | ≥44 |
| Badge (priority) | 20–22, radius 10–11 | same |
| Assignee chip | 24 (card), 28 (sheet), full radius | 26 |
| Switch | 38×22, thumb 18 | same, row ≥44 |

Radius scale: 6 (focus ring), 8 (small control), 10 (button, segment), 12 (field, list box), 14 (scenario row), 16 (card), 20 (project card), 24 (sheet), full (pill, chip, avatar).

## 5. Layout

```
┌ sidebar 260–280 ┬ toolbar 52 (sticky, translucent) ───────────────┐
│ Pano            │ Project name ★              ⫶ filter  🔍  [+ New PBI] │
│ Waiting for you 1 ├──────────────────────────────────────────────┤
│ Projects        │ summary (progress · remaining · start · high) │
│ Agents          │ Backlog │ In Progress │ Test │ Done            │
│ …               │  cards …                                       │
│ Archive · Settings │                                              │
└─────────────────┴────────────────────────────────────────────────┘
```

- Root: `display: flex; flex-wrap: wrap`. Sidebar `flex: 1 1 260px`, content `flex: 999 1 560px; min-width: 0` (sidebar moves above content on narrow screens).
- **On desktop, the shell fits the viewport (100dvh):** the board page does not scroll; the top bar and summary stay fixed, and only columns scroll internally. Other pages scroll within the content area. Normal page scrolling below 700px.
- **The page never scrolls horizontally at any width.** Only the board grid scrolls inside its own `overflow-x: auto` container.
- **Mobile (< 640px):** an iOS-style top section replaces the toolbar ("Projects" back link, icon buttons, 34px title, summary line, orange "Waiting for you" row). The column view has four equal full-width segments (`role="tablist"`, `grid-template-columns: repeat(4, minmax(0, 1fr))`): 358×52px on a 390px screen; 17/600 count above, 11px Backlog / In Progress / Test / Done label below (`white-space: nowrap`). In light mode the selected segment has a white `card` background; below it, the selected column's cards appear in one column. Side margins 16px.
- Project settings and PBI details are sheets above the board; application settings open as a macOS Settings window over the current page; `/settings` also opens this window (720 wide, icon tabs at the top).

## 6. Component rules

**Logo:** The Pano logo is a three-column board icon.

Every component: real HTML element, `:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; border-radius: 6px }`; no `outline: none` anywhere.

**Sidebar item**: `<a>`; icon (18px lucide or 22px colored project square, radius 6) + name + count on the right (12px, tabular). Active: `accent-soft` background, `accent-text` text, `aria-current="page"`. "Waiting for you": `wait-bg` background, `wait` text, count badge with `wait` background / `on-wait` text; above the project list. One "Projects" list: starred first; a star button aligned right in each row (filled and always visible when starred, outlined on hover/focus when unstarred); clicking it does not navigate to the project. Section heading 12/600 `muted`. _shadcn:_ `Sidebar` (menu button) or plain list.

**Toolbar and icon button**: `role="toolbar"` + `aria-label`. Left: `h1` (26/700) + star toggle (`aria-pressed`), spacing, then icon buttons on the right (filter, search, project settings) and a primary button. Icon buttons require `aria-label`. Filter menu: assignee, priority, "Show cancelled" (checkbox item), "Clear filters" when active; selecting does not close the menu, and active filters show a count badge on the icon. Clicking the search icon expands it into a field; when empty, it closes on blur and Esc. _shadcn:_ `Button variant="ghost" size="icon"`, `DropdownMenu`.

**Buttons and sheet footer order**: Primary: `primary` background, white text, 600. Secondary: transparent, `1px line` border, `text`. Destructive: transparent, `line` border, `danger` text, ending in "…" (requires confirmation). macOS footer order: **destructive/secondary action on the left, "Cancel" + default (primary) on the right**. Examples: `Send back | Cancel  Approve`, `Archive project | Cancel  Save`. Progress details have no footer; close with header X or Esc; "Cancel PBI…" is in the header's "More actions" (…) menu. Test and settings footers remain. Return triggers the default action; Esc cancels. One primary action per screen. _shadcn:_ `Button` (default/outline/ghost; outline + danger text instead of destructive).

**PBI card**: `<article>`; title `<h3><a href>` (opens card details; the title, not the whole card, is the link, with the focus ring on the title).

- Top row: number (12/600 `muted`, tabular; `#4` within a project) · High badge (`p1-bg`/`p1`); Medium hidden, Low plain 12px `muted` text · unseen dot on the right.
- **Unseen dot:** 8×8 `accent` circle, no text; inside a 24×24 focusable `<button aria-label="Unseen, cleared when opened">`. On focus or hover, a tooltip (`role="tooltip"`, `tooltip-bg`/`tooltip-fg`, 12/500, radius 8): "Unseen, cleared when opened". Rule: cleared when the user opens the card; reappears if the card leaves Done and returns to Done. _shadcn:_ `Tooltip`.
- The assignee chip shows only the tool (`Claude`); full identity is in `title`; PBI details show muted role text alongside it, history shows full identity. Agent avatars use a stable color derived from the name (`#4f46b8`, `#7a3bb0`, `#a62f78`, `#0f766e`, `#1c6e30`, `#8a5a00`, `#4b5563`; all AA with white text, calculated by tests); humans use `primary`. Known tools (Claude, Codex, Cursor, Gemini, Copilot, OpenCode) show a white monochrome logo on a brand background (2026-11-07, the owner's decision; contrast: `#bc5a36` 4.51, `#836ca5` 4.51, `#767679` 4.53; black backgrounds become `#767679` in dark mode); unknown tools retain an initial and color.
- If tokens have been reported, show a compact value in the card's bottom row; otherwise show nothing.
- Bottom row: assignee chip (`accent-soft` background, `accent-text` text, 16px avatar + initial, `aria-hidden` avatar) · criterion progress (4px bar `track`/`progress`, `aria-hidden`; `1/3` text beside it).
- A Test card waiting for the user: `wait-line` border + "Waiting for you" badge (`wait-bg`/`wait`, with text). In Progress card: `active-border`.
- States: hover `translateY(-1px)` + slightly stronger shadow; pressed `scale(0.985)`; dragging uses a lighter version of `shadow-sheet`.
- Keyboard: open with the title link; move using the dnd-kit keyboard sensor (Space to pick up, arrows, Space to drop) + "Move…" alternative in the card menu.

**Column heading**: 8px status dot (`aria-hidden`) + `h2` (15/600) + count badge (22px, `field` background, `muted`, 12/600, tabular). "Add" ghost button below (40px). If many cards, "N more PBIs" secondary button.

**Summary line:** one `<button aria-haspopup="dialog">` below the toolbar: 160×4 progress bar + text `1 / 14 completed · 13 remaining · started Nov 5 · 6 high priority · Last updated 2 minutes ago` (13px `muted`, first part 600 `text`, durations tabular) + small chevron. Clicking opens an approximately 360px popover, scrollable within the available screen height: cancelled count, last 7 days, remaining by priority, and daily progress from opening to today. For projects older than 180 days, show at most 180 evenly spaced samples including the first and last day. The chart is two stepped areas with no title, legend, or axes: total work in `track` behind, completed work in `progress` in front; the area between is remaining work. Within a 320×160 SVG, drawing coordinates are x=8..216, y=48..144; direct labels on the right are 12px tabular `28 items` (`muted`) and `25 done` (`success`, 600), at least 20 units apart. Labels sit outside the fill with AA contrast. Below, show the opening date in the selected language's `Intl` format and “Today” on the right; daily data represents UTC days. Mouse and touch show a vertical `text` line at the nearest sample and a fixed centered `tooltip-bg`/`tooltip-fg` tooltip above: `Nov 6 · 25 / 28 done`. On the focusable chart, left/right arrows move between samples, and `aria-live` announces the selection; the SVG has `role="img"` and a summary label. Tooltip transitions use only opacity over 120ms; transitions are disabled with reduced-motion. With fewer than two days of data, replace the chart with “Opened today, 5 items completed”, or “Opened today, no items completed yet” when none are completed; retain the empty project explanation. No box/card. _shadcn:_ `Popover`.

**Agent row (sidebar)**: one row per tool, avatar + name + `#N · duration`; fade the avatar when quiet. Humans are not in this list.

**Data age**: "Last updated N minutes ago" in the summary line; resets on every SSE event. Sidebar Agents row: dot + name + `#4 · 3 minutes ago` on the right (work + time since last record). After more than 30 minutes without a record, use a `muted` dot and "Quiet for 35 minutes"; no warning color, do not say "stuck" (not known for certain).

**Connection banner**: if the server is unreachable, directly below the toolbar, full width, 40px, `notice-bg` background, bottom `line` border, `role="status"`: wifi-off icon (`muted`) + "Cannot connect to the server: the displayed data is 5 minutes old." + "Retry" secondary button on the right (28px). No red/orange; content stays visible. Disappears automatically when the connection returns.

**Sheet (PBI details)**: _shadcn `Dialog`_ (shadcn `Sheet` slides in from an edge and **must not be used** here). `role="dialog" aria-modal="true" aria-labelledby`. Scrim `--scrim`; covers the entire page including toolbar and sidebar (overlay `z-index: 10`, toolbar `2`). Header: key + priority + `Details | History · N` on the right (`role="tablist"`, segmented appearance) + close X (36px, `aria-label="Close"`), `h2` title (24/700), status popup below. Clicking the title edits it inline.

- **Property row (2026-11-06):** below the title, Status, Priority, and Assignee popup menus, Acceptance criteria count, and Updated appear on one row. Long descriptions are truncated and expanded with "Show all". Moving a Test card to In Progress from the status menu opens the send-back note.
- **Status popup:** `<button aria-haspopup="menu">In Progress ▾</button>` (32px, `line` border, 14/600); menu contains Backlog, In Progress, Test (absent if disabled in project settings), Done. Cancellation is not in this popup; it is in the header's "More actions" (…) menu. _shadcn:_ `DropdownMenu` + `DropdownMenuRadioGroup`.
- Progress metadata row: three equal grid columns, `align-items: start`; 12px `muted` labels aligned with 16px line height; 15px values and assignee chip aligned with 24px line height. Acceptance criteria: `padding: 6px 0`, `min-height: 36px`, `box-sizing: border-box`, no row divider.
- Modes: **Details** (metadata: assignee, criteria, updated; Purpose; Acceptance criteria checkbox list; read-only Test results outside Test when the card has scenarios or AI checks; recent records + "Show full history"), **Test** (below), **History** (below), **Project settings** (below).

**Test mode and scenario row**: `wait-bg` information banner at the top: "Claude · PO wants you to test this work". Scenario row: box with 14px radius, `line` border, padding `14px 16px`; number · step (15px) + expected text below (13px `muted`, no visible label) · two `aria-pressed` buttons inside `role="group" aria-label="Scenario N result"`: **Passed** (✓ icon + text, `success-bg`/`success` when selected) and **Failed** (✕ icon + text, `fail-bg`/`fail`) · `…` menu (Edit, Delete…). Editing opens inside the card; deletion requires inline confirmation. Marking Failed opens a "What happened?" note on the card. Below: "Add scenario" accent ghost button. "AI checks": check badges (30px pill, `success-bg`/`success`, ✓ icon + text, e.g. "Unit 18/18 passed"). _shadcn:_ `ToggleGroup type="single"`.

**Approval rule (Test footer)**: If any scenario is **Failed**: "Approve" has `aria-disabled="true"` (transparent, `line` border, `muted` text, `cursor: not-allowed`, linked to the reason with `aria-describedby`), and **"Send back" becomes default/primary**. Reason on the footer's left: exclamation icon + `fail` 13/600 "1 scenario failed: fix it to approve, or send back". Unmarked scenarios do not block approval; below, `muted` information "1 scenario unmarked". If none failed: secondary "Send back" on the left, "Cancel" + primary "Approve" on the right. Footer: `[reason/information] … Cancel · Approve · Send back(primary)`.

**Send-back form + screenshot**: expands below on "Send back"; summarizes failed scenarios and their notes; a general note is not required if a scenario note exists. Multiple screenshots can be attached, each with a thumbnail and individual removal. `<label for>` "Send-back note (required)" + `textarea required aria-required` (12px radius, `field` background, 15px, placeholder "What needs fixing?") + 13px `muted` help below: "Claude · PO will see it on the next check. The note and attachments are written to history as one record." Attachments: thumbnail (120×84, 12px radius, filename · size), 24px "Remove" icon button at the top right (`aria-label="Remove attachment: error.png"`); drop area with dashed `line` border, "Paste or drag a screenshot, or" + visible **Choose file…** button (hidden `<input type="file" accept="image/png,image/jpeg">`) + "PNG or JPG, maximum 10 MB". Submitting with an empty note shows a `fail` error below the field; upload errors appear below the attachment, and the note is retained.

**Activity timeline and diff**: group records by day (12/600 `muted` day heading, one `<ol>` per day); each `<li>`: 10px dot + vertical line on the left (`aria-hidden`), single-line event on the right (14px, actor 600), right-aligned time (12px `muted`). Status transitions use colored station badges: `● Backlog → ● In Progress`; the dot uses the target status color (Backlog `muted`, In Progress `accent`, Test `star`, Done `progress`, Cancelled `danger`). Filter pills: **Important** (default) · Decisions · Tests · All (`aria-pressed`). Important hides only viewing, ordering, criterion checking, and scenario result records; deleted and edited scenarios or criteria remain visible with their text (previous and new values). Tests: AI tests, scenario results, approval, and send-back. The "Reason" line appears only when a real reason exists. No records are deleted. Send-back notes appear in a quote box. Edit records have a "Reason: …" line and "Show changes" (`aria-expanded`). Diff: non-monospace 13px, `−` / `+` prefix on each line **and** color (`diff-del-bg`/`diff-del`, `diff-add-bg`/`diff-add`), padding `4px 12px`, container radius 10px. Check records use ✓/✕ icons.

**Switch**: `<button role="switch" aria-checked>` 38×22, `primary` background when on (not green), `track` when off; 18px white thumb, `0 1px 2px rgba(0,0,0,0.25)`. Label linked with `aria-labelledby`; 12px `muted` description below. _shadcn:_ `Switch`.

**Appearance selector**: `<fieldset>` + `<legend>Theme:</legend>`; three `<label>` elements: 96×64 preview (radius 8; Light `#f5f5f7`/`#fff`, Dark `#000`/`#1c1c1e`, Automatic split half-and-half) + `<input type="radio" name="theme">` + text. Selected preview has a `2px primary` border. Default Automatic. _shadcn:_ `RadioGroup`.

**Application settings window** (the "Your name" field in General changes `userName`): 720 wide, radius 12, `window` background; 30px window title (selected tab name, 13/600 `muted`); `role="tablist"` with 4 icon tabs (96×56, 22px icon + 12px label; selected has a darker `field` background + `accent-text`): General, Appearance, Agent connection, About. Content uses a macOS form grid: `grid-template-columns: 180px 1fr`, labels right-aligned, 13px, ending in ":". New version banner `accent-soft` + `accent-text` ("v0.2.0 is ready · Release notes · Show update command").

**Project card date and agent (2026-11-07)**: relative date on one line, full date in `title`. Large card bottom row: `Updated 3 hours ago` and `2 active agents` (tool count; muted if 0). Small cards have one information row; star and `…` appear only on hover/focus, always visible on touch devices.

**Project card (Projects screen)**: radius 20, padding 24; 44px colored square + name (18/600) + key; description (hidden if empty, changed in project settings); if tests are waiting, an `<a>` badge below the description, "1 test is waiting for you" (28px pill, `wait-bg`/`wait`, icon + text, links to the Waiting for you list); 4 status counts (20/600 tabular + 12px label); bottom row with last update + working agent. Icon star toggle; beside it, top right, an `aria-label="More actions"` (…) icon button; sidebar project rows have the same button. The button and right-click open the same macOS menu (`role="menu"`, items `button role="menuitem"`): "Project settings" (opens on the current page; starring has its own card button), "Archive project…", divider, "Delete permanently… (archive first)". The last item is gray and disabled for active projects; permanent deletion is available only in the archive, confirmed by typing the project name. The Pano reference card shows the menu open. Other projects use compact row cards (padding `20px 24px`); if a test is waiting, show a smaller version of the same badge on the right. No badge if no tests are waiting.

**Waiting for you list**: "Waiting for you" in the sidebar opens a page spanning all projects (`wait-line` inner border when `aria-current="page"`). Toolbar title "Waiting for you"; 13px `muted` below: "Work waiting for you to test. When AI finishes work and sends it to you for testing, it appears here. N items · oldest first". Clicking a row opens the card directly. Project groups: 22px project square + `h2` project name + "N items" on the right; hide empty groups. Row `<a>` (min 64px, radius 14, `wait-line` border, `card` background): key + priority · title (15/600, long titles `overflow-wrap: anywhere`) · "3 scenarios · Claude · PO" (13px `muted`) · chevron. Empty state when no work: "Nothing is waiting for you".

**Empty, loading, and error states**: all use the same centered pattern within a card of min height 360px: 26px `muted` icon in a 52px square with `field` background + title (17/600) + single-line description (14px `muted`, max 280px) + at most one action.

- **Empty project:** board icon, "No PBIs yet", "Give AI its first task; its PBIs will appear here.", secondary "Show agent connection" (opens application settings).
- **Loading:** replace the title with 13/600 `muted` "Loading board…", `aria-busy="true"`; 3 skeleton cards (`skeleton` bars, same dimensions as cards). Animate only an opacity pulse (1.6s) and only with `prefers-reduced-motion: no-preference`.
- **Error:** wifi-off icon, "Cannot reach the server", "Is Pano running? Start it with `pano serve` in the terminal.", primary "Retry". (If data was previously loaded, use the connection banner instead of a full-page error.)
- Dashed boxes are only for drop areas.

**Dialog position**: All dialogs are anchored approximately 10vh from the top and horizontally centered; content scrolls within a maximum height of 80vh. The top edge stays fixed as content grows.

**Closing Dialog/Sheet**: Empty or unchanged forms and read-only windows close on outside click and Esc. Every window has a close X at the top right. For a changed form, outside click, Esc, X, and Cancel show “You have unsaved changes” within the same window: default focus on “Keep editing”, other option “Close without saving”. Do not open a second modal; Create/Save do not trigger this question. Permanent deletion dialogs block outside clicks; Esc and Cancel close without asking about the confirmation text. Shared `ManagedDialog` provides this behavior; read-only uses omit `dirty`.

## 7. Motion

- Everything touched/dragged uses a **spring**: damping 1.0 (no bounce), response 0.3–0.4s. Damping 0.8 for momentum release. Sheet/dialog: damping 0.8, response 0.3. (Framer Motion: `type: "spring", bounce: 0, duration: 0.35`.)
- Feedback starts on pointer-down; transitions are interruptible, and input is not locked during animation.
- Only `transform` and `opacity`. A sheet grows from its trigger (card), closes along the same path; scrim uses opacity.
- When a card moves, animate layout changes with `layout` (FLIP); the same applies to changes received through SSE.
- Hover 120ms, color transitions 150ms `ease-out`.
- `prefers-reduced-motion: reduce` → 150ms cross-fade instead of slide/spring; `prefers-reduced-transparency` → opaque `--bg` toolbar.

## 8. Text and language

- The interface supports 14 languages (PANO-27). Selector order and names: English (en), Türkçe (tr), Azərbaycan (az), 中文 (zh, simplified), हिन्दी (hi), Español (es), Deutsch (de), Français (fr), Português (pt), 日本語 (ja), Nederlands (nl), 한국어 (ko), Svenska (sv), Polski (pl).
- On startup, use the browser's saved selection first. If none exists, scan `navigator.languages` in order and select the first supported base language (`pt-BR` → `pt`, `zh-TW` → `zh`). Fall back to English if none matches. Server settings do not override browser preferences. HTML `lang` follows the selected language.
- Text comes from keys in `apps/web/src/i18n/<code>.json` (`<code>` means language code); do not hardcode text. English is bundled as a fallback; other languages load dynamically only when selected. The first render waits for translations to load; `t()` remains synchronous. Missing keys fall back to English.
- New translations are machine translated, aiming for a natural, concise tone; native-speaker review can improve them. Tests check key and placeholder parity and character corruption.
- **Known technical terms stay in English in every language:** Backlog, In Progress, Test, Done, PBI, MCP, CLI, build, Key, Token, Definition of Done. No forced translations.
- PBI numbers within a project (board, card, details, mobile) use `#N`; cross-project lists and links (Waiting for you, Projects badges), commits, and agent commands use `KEY-N` (`PANO-4`).
- Sentence case ("New PBI", "Waiting for you"); no Title Case or ALL CAPS.
- Display dates/times with `Intl.DateTimeFormat` and relative times with `Intl.RelativeTimeFormat` in the selected language. Preserve short Turkish relative text ("just now", "2 minutes ago"). The summary's opening day and chart's "Today" label follow the user's local day; send the browser's time zone to the chart API. For example, English uses "Nov 5, 2026, 11:10 PM"; Turkish uses a localized month and 24-hour time.
- Tone: calm, concise, informal "you" in Turkish ("Waiting for you", "What needs fixing?"). Actors use a readable name + role: `Claude · PO`, `Claude · Design`, `Codex`, the user; avatar initials are uppercase. Technical identity (`claude:po`) may remain as small `muted` text in the API and history details.
- Destructive action labels end in "…" and require confirmation.
- No filler text, invented metrics, or lorem ipsum; unknown values use `[placeholder]`.

## 9. Do not use

- Metric/summary boxes on the board (there is a single summary line).
- A small label above the heading (eyebrow, e.g. "PANO").
- Text badges such as "New · unseen"; unseen is only a dot.
- A separate "Cancelled" button; it belongs in the filter menu.
- Column background boxes.
- Emoji; gradients; cards with left-edge stripes; glow/neon.
- Meaning conveyed by color alone (priority has text, passed/failed has icon + text, diff has − / + signs).
- `outline: none` or any style that hides focus.
- Edge-sliding shadcn `Sheet` (details use a centered `Dialog`).
- A segmented control for status selection (use a popup; segments are only for switching views).
- Green switches or a second accent besides blue.
- Readable text below 12px (except 11px mobile segment labels); click targets below 32px on desktop or 44px on mobile.
- Buttons that directly start agent work ("Assign to Codex"); Pano does not run agents.

## 10. Screen references

Test detail order: What changed, How to test, test scenarios, AI's own tests, description, criteria; fixed Approve / Send back area at the bottom (Reassign back was removed on 2026-11-06: the only concept is "Send back"). Failed scenarios block approval; unmarked scenarios produce a warning.

Design reference artboards:

| Artboard | Content |
| --- | --- |
| Projects (`Main`) | Toolbar, starred project cards, other projects |
| Board | Sidebar, toolbar, summary line (with data age), 4 columns, card states; `connection` tweak: ok / stale (quiet agent) / offline (connection banner) |
| Board, mobile (`Mobile`) | 390×844, column tabs, "Waiting for you" row |
| PBI details (In Progress) (`Detail`) | Details tab, status popup, header actions menu; no footer |
| Board, dark (`BoardDark`) | Dark tokens |
| PBI details (Test, waiting for you) (`TestDetail`) | Scenarios, AI tests, approval rule (Approve disabled + reason), send-back note + attachments |
| PBI history (`History`) | Timeline, filters, diff |
| Project settings (`Settings`) | Test column, AI can move to Done, Definition of Done |
| Application settings (`AppSettings`) | General, Appearance, Agent connection, About |
| Waiting for you (`Waiting`) | Waiting tests across all projects, list grouped by project |
| Empty, loading, and error states (`States`) | Empty project, skeleton loading, server error, unseen tooltip |
