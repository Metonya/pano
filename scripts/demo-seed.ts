// Run only against a disposable demo installation. Never the working Pano database.
import { stripTrailingSlashes } from "../packages/core/src/url";

const base = process.env.PANO_URL
  ? stripTrailingSlashes(process.env.PANO_URL)
  : undefined;
const token = process.env.PANO_TOKEN;
if (!base || !token)
  throw new Error("Set PANO_URL and PANO_TOKEN for the demo installation.");

type Item = { key: string; criteria: { id: string }[] };
type Status = "backlog" | "in_progress" | "test" | "done";
type Card = {
  title: string;
  body: string;
  criteria: string[];
  priority: "high" | "medium" | "low";
  status: Status;
};

async function api<T>(
  path: string,
  body?: object,
  actor = "claude:po",
  method = "POST",
): Promise<T> {
  const response = await fetch(`${base}/api/v1${path}`, {
    method: body ? method : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Pano-Actor": actor,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok)
    throw new Error(`${method} ${path}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

const cards: Card[] = [
  {
    title: "Save an article from its URL",
    body: "## Goal\nKeep an article with its title and source URL.\n\nReject unsupported URLs before fetching metadata.",
    criteria: [
      "HTTP and HTTPS URLs can be saved",
      "Duplicate URLs open the existing article",
    ],
    priority: "high",
    status: "done",
  },
  {
    title: "Store the reading library in SQLite",
    body: "## Goal\nKeep the library on the user's own server.\n\nApply migrations automatically on startup.",
    criteria: [
      "Articles survive a restart",
      "Migrations preserve existing articles",
    ],
    priority: "high",
    status: "done",
  },
  {
    title: "Extract readable article content",
    body: "## Goal\nRemove navigation and adverts from saved pages.\n\nKeep headings, links and code blocks in the reading view.",
    criteria: [
      "Article structure is preserved",
      "Failed extraction keeps the original link",
    ],
    priority: "high",
    status: "done",
  },
  {
    title: "Archive finished articles",
    body: "## Goal\nSeparate finished reading from the inbox.\n\nAllow archived articles to return to the inbox.",
    criteria: [
      "Archived articles leave the inbox",
      "Restoring an article preserves its tags",
    ],
    priority: "medium",
    status: "done",
  },
  {
    title: "Add a keyboard-friendly reading view",
    body: "## Goal\nRead long articles without leaving the library.\n\nSupport keyboard navigation and adjustable text size.",
    criteria: [
      "Escape returns to the inbox",
      "Text size persists after reload",
      "Links can be reached with the keyboard",
    ],
    priority: "high",
    status: "test",
  },
  {
    title: "Filter the inbox by tags",
    body: "## Goal\nFind saved articles by topic.\n\nKeep the selected tag in the URL so filtered views can be shared.",
    criteria: [
      "Selecting a tag filters the inbox",
      "Clearing the filter restores all articles",
    ],
    priority: "medium",
    status: "test",
  },
  {
    title: "Search article titles and content",
    body: "## Goal\nFind a saved article using words from its title or text.\n\nUse SQLite full-text search and show a short matching excerpt.",
    criteria: [
      "Search matches titles and article text",
      "Empty searches show the inbox",
      "Results include a matching excerpt",
    ],
    priority: "high",
    status: "in_progress",
  },
  {
    title: "Remember reading position",
    body: "## Goal\nResume a long article where the reader stopped.\n\nSave position after scrolling settles.",
    criteria: [
      "Reopening an article restores its position",
      "Short articles open at the top",
    ],
    priority: "medium",
    status: "in_progress",
  },
  {
    title: "Import bookmarks from an HTML file",
    body: "## Goal\nBring an existing reading list into Driftwood.\n\nShow a preview before importing browser bookmarks.",
    criteria: [
      "Netscape bookmark files are accepted",
      "Duplicate URLs are skipped",
      "Import reports saved and skipped counts",
    ],
    priority: "medium",
    status: "in_progress",
  },
  {
    title: "Export the library as JSON",
    body: "## Goal\nLet readers take their library elsewhere.\n\nInclude source links, tags and reading state.",
    criteria: [
      "Export includes archived articles",
      "Exported JSON has a documented version",
    ],
    priority: "medium",
    status: "backlog",
  },
  {
    title: "Add a browser bookmarklet",
    body: "## Goal\nSave the current page without copying its URL.\n\nProvide a bookmarklet in library settings.",
    criteria: [
      "Bookmarklet pre-fills the current page URL",
      "Expired sessions request authentication",
    ],
    priority: "medium",
    status: "backlog",
  },
  {
    title: "Support an offline reading cache",
    body: "## Goal\nRead previously opened articles without a connection.\n\nMake cache size and removal explicit in settings.",
    criteria: [
      "Cached articles open offline",
      "Readers can clear the local cache",
    ],
    priority: "low",
    status: "backlog",
  },
  {
    title: "Document backup and restore",
    body: "## Goal\nExplain how to protect a self-hosted library.\n\nCover SQLite backups and uploaded assets.",
    criteria: [
      "Backup instructions include a restore check",
      "Docker volume paths are documented",
    ],
    priority: "low",
    status: "backlog",
  },
  {
    title: "Add a compact list layout",
    body: "## Goal\nFit more article titles on smaller screens.\n\nOffer a list layout alongside the default article cards.",
    criteria: [
      "Layout choice persists per browser",
      "Both layouts expose reading state",
    ],
    priority: "low",
    status: "backlog",
  },
];

async function prepareTest(key: string, index: number) {
  const reading = index === 4;
  await api(
    `/items/${key}`,
    {
      what_changed_md: reading
        ? "Added a focused reader with keyboard navigation and saved text size."
        : "Added tag filters with shareable URLs and a clear-filter action.",
      how_to_test_md: reading
        ? "Open any saved article. Try the keyboard and change the text size."
        : "Choose a tag in the inbox, then reload or clear the filter.",
    },
    "codex",
    "PATCH",
  );
  const scenarios = reading
    ? [
        [
          "Open an article and press Escape.",
          "The inbox returns with the same selection.",
        ],
        [
          "Increase text size, then reload the article.",
          "The larger text size is retained.",
        ],
        [
          "Press Tab to move through article links.",
          "Each link has a visible focus indicator.",
        ],
      ]
    : [
        [
          "Select the Design tag in the inbox.",
          "Only articles tagged Design appear.",
        ],
        [
          "Reload the filtered URL, then clear the tag.",
          "The filter survives reload; clearing it restores the inbox.",
        ],
      ];
  for (const [steps_md, expected_md] of scenarios)
    await api(
      `/items/${key}/scenarios`,
      { steps_md, expected_md, author: "codex" },
      "codex",
    );
  for (const message of ["Unit tests 142/142 passed", "Lint clean"])
    await api(`/items/${key}/records`, { kind: "check", message }, "codex");
}

async function seedCard(card: Card, index: number) {
  const item = await api<Item>("/projects/DRIFT/items", {
    title: card.title,
    body_md: card.body,
    criteria: card.criteria,
    priority: card.priority,
    assignee: card.status === "backlog" ? "claude:po" : "codex",
  });
  if (card.status === "backlog") return;
  await api(`/items/${item.key}/move`, { status: "in_progress" }, "codex");
  const complete = card.status === "done" || card.status === "test";
  for (const criterion of complete ? item.criteria : item.criteria.slice(0, 1))
    await api(
      `/items/${item.key}/criteria/${criterion.id}`,
      { done: true },
      "codex",
      "PATCH",
    );
  if (card.status === "test") {
    await prepareTest(item.key, index);
    await api(`/items/${item.key}/assign`, { assignee: "human" }, "codex");
    await api(`/items/${item.key}/move`, { status: "test" }, "codex");
  } else if (card.status === "done") {
    await api(
      `/items/${item.key}/records`,
      {
        kind: "check",
        message: "Acceptance criteria verified; unit tests passed",
      },
      "codex",
    );
    await api(`/items/${item.key}/move`, { status: "done" }, "codex");
  }
  if (index === 4) {
    await api(
      `/items/${item.key}/send-back`,
      {
        note: "Text size resets after reload. Please persist the reader preference before another review.",
      },
      "alex",
    );
    await api(
      `/items/${item.key}`,
      {
        body_md: `${card.body}\n\nPersist text size in browser storage and restore it before rendering.`,
      },
      "codex",
      "PATCH",
    );
    await api(`/items/${item.key}/records`, {
      kind: "decision",
      message:
        "Keep text size per browser so shared-server readers can choose independently.",
    });
    await api(
      `/items/${item.key}/records`,
      {
        kind: "note",
        message:
          "Fixed preference restoration and checked reload behavior. Ready for another review.",
      },
      "codex",
    );
    await api(`/items/${item.key}/assign`, { assignee: "human" }, "codex");
    await api(`/items/${item.key}/move`, { status: "test" }, "codex");
  }
}

async function main() {
  const projects = await api<{ key: string }[]>(
    "/projects?includeArchived=true",
  );
  if (projects.some((project) => project.key === "DRIFT")) {
    console.log("DRIFT already exists. Leaving existing data untouched.");
    return;
  }
  await api("/projects", {
    key: "DRIFT",
    name: "Driftwood",
    description: "A self-hosted read-later app",
    test_column: true,
    ai_can_close: true,
    dod_md:
      "- Acceptance criteria verified\n- Automated checks recorded\n- Human-facing changes reviewed in Test",
  });
  await api("/settings", { userName: "alex" }, "alex", "PATCH");
  await api("/projects/DRIFT/star", { starred: true }, "alex");
  for (const [index, card] of cards.entries()) await seedCard(card, index);
  if (!projects.some((project) => project.key === "NOTES")) {
    await api("/projects", {
      key: "NOTES",
      name: "Field Notes",
      description: "A small personal notebook for ideas and research",
    });
    await api("/projects/NOTES/items", {
      title: "Capture a quick note",
      body_md:
        "## Goal\nSave an idea as plain Markdown without choosing a folder first.",
      criteria: [
        "New notes save automatically",
        "The first line becomes the note title",
      ],
      priority: "medium",
      assignee: "claude:po",
    });
    await api("/projects/NOTES/items", {
      title: "Find notes by title",
      body_md: "## Goal\nFilter the notebook as the reader types.",
      criteria: [
        "Title search ignores case",
        "Clearing the query restores all notes",
      ],
      priority: "low",
    });
  }
  console.log("Created Driftwood and Field Notes demo data.");
}

await main();
