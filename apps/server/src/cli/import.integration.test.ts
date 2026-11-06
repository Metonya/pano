import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createApp, createCore } from "../app";
import type { Fetch } from "./client";
import { parseBacklog } from "./import";
import { runCli } from "./index";

const markdown = (
  id = "PBI-001",
  status = "in-progress",
  priority = "P1",
  assignee = "codex",
) => `---
id: ${id}
title: 'Türkçe başlık: içe aktarım'
status: ${status}
priority: ${priority}
assignee: ${assignee}
created: 2026-11-05
---

## Amaç
İçerik olduğu gibi kalır.

## Kabul kriterleri
- [x] İlk ölçüt
- [ ] İkinci ölçüt
### Ayrıntı
- [X] Üçüncü ölçüt

## Test planı
Son bölüm.
`;

async function run(args: string[], fetcher: Fetch) {
  let out = "";
  let err = "";
  const code = await runCli(args, {
    env: {
      PANO_URL: "http://import.test",
      PANO_ACTOR: "codex:import",
      PANO_TOKEN: "test-token",
    },
    fetch: fetcher,
    stdout: (text) => {
      out += text;
    },
    stderr: (text) => {
      err += text;
    },
  });
  return { code, out, err };
}

async function fixture(
  files: Record<string, string>,
  check: (
    folder: string,
    core: ReturnType<typeof createCore>,
    fetcher: Fetch,
  ) => Promise<void>,
) {
  const folder = await mkdtemp(join(tmpdir(), "pano-import-"));
  const core = createCore(":memory:");
  const app = createApp({ core, dataDir: folder, token: "test-token" });
  const fetcher: Fetch = async (url, init) => app.fetch(new Request(url, init));
  try {
    for (const [name, content] of Object.entries(files))
      await writeFile(join(folder, name), content, "utf8");
    await check(folder, core, fetcher);
  } finally {
    core.db.close();
    await rm(folder, { recursive: true, force: true });
  }
}

test("parser preserves Markdown and CRLF outside acceptance criteria, including code fences", () => {
  const source = markdown().replace(
    "## Amaç\n",
    "## Amaç\n```md\n## Kabul kriterleri\n- [x] Example only\n```\n",
  );
  const parsed = parseBacklog(`\uFEFF${source.replaceAll("\n", "\r\n")}`);
  expect(parsed).toMatchObject({
    id: "PBI-001",
    status: "in_progress",
    item: {
      title: "Türkçe başlık: içe aktarım",
      priority: "high",
      assignee: "codex",
    },
    criteria: [
      { text: "İlk ölçüt", done: true },
      { text: "İkinci ölçüt", done: false },
      { text: "Üçüncü ölçüt", done: true },
    ],
  });
  expect(parsed.item.body_md).toBe(
    `Kaynak: PBI-001\n\n${source
      .slice(source.indexOf("\n\n## Amaç") + 1)
      .replace(
        /## Kabul kriterleri\n- \[x\] İlk ölçüt[\s\S]*?(?=## Test planı)/,
        "",
      )
      .replaceAll("\n", "\r\n")}`,
  );
  expect(
    parseBacklog(markdown("PBI-002", "backlog", "P3", "-")).item.assignee,
  ).toBeNull();
});

test("import uses authenticated REST for project, status, assignee, priority and checked criteria; reruns skip", async () => {
  const statuses = ["backlog", "in-progress", "test", "done", "cancelled"];
  await fixture(
    Object.fromEntries([
      ...statuses.map((status, index) => [
        `PBI-00${index + 1}.md`,
        markdown(
          `PBI-00${index + 1}`,
          status,
          ["P1", "P2", "P3"][index % 3],
          index ? "-" : "claude:design",
        ),
      ]),
      ["notes.md", "not a PBI"],
      ["PBI-006.txt", "not Markdown"],
    ]),
    async (folder, core, fetcher) => {
      const args = ["import", folder, "--project", "DEMO", "--json"];
      const first = await run(args, fetcher);
      expect(first.err).toBe("");
      expect(first.code).toBe(0);
      expect(JSON.parse(first.out)).toEqual({
        project: "DEMO",
        added: 5,
        skipped: 0,
      });
      expect(core.projects.get("DEMO").name).toBe("DEMO");
      for (const [index, status] of statuses.entries()) {
        const item = core.items.get(`DEMO-${index + 1}`);
        expect(item).toMatchObject({
          status: status === "in-progress" ? "in_progress" : status,
          assignee: index ? null : "claude:design",
          priority: ["high", "medium", "low"][index % 3],
        });
        expect(item.criteria.map((criterion) => criterion.done)).toEqual([
          1, 0, 1,
        ]);
        expect(
          item.activity.every((record) => record.actor === "codex:import"),
        ).toBe(true);
      }
      const activityCount = core.db
        .query("SELECT COUNT(*) AS n FROM activity")
        .get();
      const second = await run(args.slice(0, -1), fetcher);
      expect(second).toEqual({
        code: 0,
        err: "",
        out: "DEMO: 0 eklendi, 5 atlandı.\n",
      });
      expect(core.db.query("SELECT COUNT(*) AS n FROM activity").get()).toEqual(
        activityCount,
      );
    },
  );
});

test("source IDs are exact, project-scoped and duplicates within a batch are skipped", async () => {
  await fixture(
    {
      "PBI-a.md": markdown(),
      "PBI-b.md": markdown(),
    },
    async (folder, core, fetcher) => {
      core.projects.create({ key: "DEMO", name: "Existing" }, "mert");
      core.projects.create({ key: "OTHER", name: "Other" }, "mert");
      core.items.create(
        "OTHER",
        { title: "Other project", body_md: "Kaynak: PBI-001\n" },
        "mert",
      );
      core.items.create(
        "DEMO",
        { title: "Similar ID", body_md: "Kaynak: PBI-0010\n" },
        "mert",
      );
      const result = await run(
        ["import", folder, "--project", "DEMO", "--json"],
        fetcher,
      );
      expect(result.err).toBe("");
      expect(JSON.parse(result.out)).toEqual({
        project: "DEMO",
        added: 1,
        skipped: 1,
      });
      expect(core.projects.get("DEMO").name).toBe("Existing");
    },
  );
});

test("invalid metadata is rejected before REST mutations and errors use stderr JSON", async () => {
  for (const bad of [
    "Missing frontmatter",
    markdown().replace("status: in-progress", "status: invalid"),
    markdown().replace("priority: P1", "priority: P0"),
    markdown().replace("id: PBI-001", "id: OTHER-1"),
    markdown().replace("title: 'Türkçe başlık: içe aktarım'", "title: ''"),
  ]) {
    await fixture(
      { "PBI-001.md": markdown(), "PBI-002.md": bad },
      async (folder) => {
        let requested = false;
        const result = await run(
          ["import", folder, "--project", "DEMO", "--json"],
          async () => {
            requested = true;
            throw new Error("must not fetch");
          },
        );
        expect(result.code).toBe(1);
        expect(result.out).toBe("");
        expect(JSON.parse(result.err).error.message).toContain("PBI-002.md");
        expect(requested).toBe(false);
      },
    );
  }
});

test("empty folders report zero and API errors do not trigger project creation", async () => {
  await fixture({}, async (folder, core, fetcher) => {
    const result = await run(
      ["import", folder, "--project", "DEMO", "--json"],
      fetcher,
    );
    expect(JSON.parse(result.out)).toEqual({
      project: "DEMO",
      added: 0,
      skipped: 0,
    });
    expect(core.items.list("DEMO")).toHaveLength(0);
    const methods: (string | undefined)[] = [];
    const denied = await run(
      ["import", folder, "--project", "DEMO", "--json"],
      async (_url, init) => {
        methods.push(init?.method);
        return Response.json(
          { error: { message: "Unauthorized" } },
          { status: 401 },
        );
      },
    );
    expect(denied.code).toBe(1);
    expect(JSON.parse(denied.err).error.message).toBe("Unauthorized");
    expect(methods).toEqual(["GET"]);
  });
});

test("the repository backlog imports through an injected in-memory API without touching ~/.pano", async () => {
  await fixture({}, async (_folder, core, fetcher) => {
    const folder = resolve(import.meta.dir, "../../../..", "backlog");
    const files = Array.from(new Bun.Glob("PBI-*.md").scanSync(folder)).sort();
    const result = await run(
      ["import", folder, "--project", "PANO", "--json"],
      fetcher,
    );
    expect(result.err).toBe("");
    expect(result.code).toBe(0);
    expect(JSON.parse(result.out)).toEqual({
      project: "PANO",
      added: files.length,
      skipped: 0,
    });
    for (const [index, file] of files.entries()) {
      const expected = parseBacklog(await readFile(join(folder, file), "utf8"));
      const actual = core.items.get(`PANO-${index + 1}`);
      const { criteria: _criteria, ...fields } = expected.item;
      expect(actual).toMatchObject({ ...fields, status: expected.status });
      expect(
        actual.criteria.map((criterion) => ({
          text: criterion.text,
          done: !!criterion.done,
        })),
      ).toEqual(expected.criteria);
    }
    const again = await run(
      ["import", folder, "--project", "PANO", "--json"],
      fetcher,
    );
    expect(JSON.parse(again.out)).toEqual({
      project: "PANO",
      added: 0,
      skipped: files.length,
    });
  });
});
