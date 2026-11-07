import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseBacklog } from "./import";
import { runCli } from "./index";

test("parser preserves CRLF Markdown and ignores fenced examples when extracting criteria", () => {
  const before =
    "\r\n## Amaç\r\n```md\r\n## Kabul kriterleri\r\n- [x] Example\r\n```\r\n";
  const after = "## Test planı\r\nKontrol et.\r\n";
  const parsed = parseBacklog(
    "\uFEFF---\r\nid: PBI-012\r\ntitle: 'Türkçe: başlık'\r\nstatus: done\r\npriority: P3\r\nassignee: -\r\n---\r\n" +
      before +
      "## Kabul kriterleri\r\n- [X] Tamam\r\n### Ayrıntı\r\n- [ ] Bekler\r\n" +
      after,
  );
  expect(parsed.item).toMatchObject({
    title: "Türkçe: başlık",
    priority: "low",
    assignee: null,
    body_md: `Kaynak: PBI-012\n\n${before}${after}`,
  });
  expect(parsed.status).toBe("done");
  expect(parsed.criteria).toEqual([
    { text: "Tamam", done: true },
    { text: "Bekler", done: false },
  ]);
});

test("frontmatter closing separators require a complete line and may end at EOF", () => {
  const prefix =
    "---\nid: PBI-012\ntitle: Boundary\nstatus: backlog\npriority: P2\n";
  expect(parseBacklog(`${prefix}--- \t`).id).toBe("PBI-012");
  expect(
    parseBacklog(`${prefix}---not: separator\n---\n## Body\nKept.`).item
      .body_md,
  ).toBe("Kaynak: PBI-012\n\n## Body\nKept.");

  const malformed = `${prefix}${"---not a separator\n".repeat(10_000)}`;
  expect(() => parseBacklog(malformed)).toThrow("PBI frontmatter bulunamadı.");
});

test("backlog fixtures parse with their source IDs and checkbox completion", async () => {
  const folder = resolve(import.meta.dir, "fixtures/backlog");
  const files = Array.from(new Bun.Glob("PBI-*.md").scanSync(folder));
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    const source = await readFile(join(folder, file), "utf8");
    const parsed = (() => {
      try {
        return parseBacklog(source);
      } catch (error) {
        throw new Error(`${file}: ${(error as Error).message}`);
      }
    })();
    expect(file.startsWith(parsed.id)).toBe(true);
    expect(parsed.criteria.length).toBeGreaterThan(0);
    expect(parsed.item.body_md).toStartWith(`Kaynak: ${parsed.id}\n\n`);
    expect(parsed.item.body_md).not.toContain("## Kabul kriterleri");
    expect(parsed.criteria.filter((criterion) => criterion.done)).toHaveLength(
      [...source.matchAll(/^- \[[xX]\]/gm)].length,
    );
  }
});

test("CLI imports through injected fetch and skips source IDs on a second run", async () => {
  const folder = await mkdtemp(join(tmpdir(), "pano-import-unit-"));
  const item = {
    key: "DEMO-5",
    body_md: "",
    criteria: [{ id: "criterion-1" }, { id: "criterion-2" }],
  };
  const calls: { path: string; method: string; body: unknown }[] = [];
  let exists = false;
  let created = false;
  const execute = async (json: boolean) => {
    let out = "";
    let err = "";
    const code = await runCli(
      ["import", folder, "--project", "DEMO", ...(json ? ["--json"] : [])],
      {
        env: {
          PANO_URL: "http://stub.test",
          PANO_TOKEN: "secret",
          PANO_ACTOR: "codex",
        },
        fetch: async (url, init) => {
          expect(init?.headers).toMatchObject({
            Authorization: "Bearer secret",
            "X-Pano-Actor": "codex",
          });
          const path = url.slice("http://stub.test/api/v1".length);
          const method = init?.method ?? "GET";
          const body = init?.body ? JSON.parse(String(init.body)) : undefined;
          calls.push({ path, method, body });
          if (path === "/projects?includeArchived=true")
            return Response.json(exists ? [{ key: "DEMO" }] : []);
          if (path === "/projects" && method === "POST") {
            exists = true;
            return Response.json(body);
          }
          if (path === "/projects/DEMO/items" && method === "POST") {
            created = true;
            item.body_md = body.body_md;
            return Response.json(item);
          }
          if (path === "/projects/DEMO/items")
            return Response.json(created ? [item] : []);
          if (path === "/projects/DEMO/items?status=cancelled")
            return Response.json([]);
          if (
            path === "/items/DEMO-5/criteria/criterion-1" ||
            path === "/items/DEMO-5/move"
          )
            return Response.json({ ok: true });
          throw new Error(`Unexpected request: ${method} ${path}`);
        },
        stdout: (text) => {
          out += text;
        },
        stderr: (text) => {
          err += text;
        },
      },
    );
    return { code, out, err };
  };
  try {
    await writeFile(
      join(folder, "PBI-012.md"),
      `---
id: PBI-012
title: Türkçe başlık
status: in-progress
priority: P2
assignee: codex
---
## Amaç
İçerik.
## Kabul kriterleri
- [x] Çalışır
- [ ] Bekler
## Test planı
Kontrol et.
`,
      "utf8",
    );
    const first = await execute(true);
    expect(first.code).toBe(0);
    expect(first.err).toBe("");
    expect(JSON.parse(first.out)).toEqual({
      project: "DEMO",
      added: 1,
      skipped: 0,
    });
    expect(calls.filter((call) => call.method !== "GET")).toEqual([
      {
        path: "/projects",
        method: "POST",
        body: { key: "DEMO", name: "DEMO" },
      },
      {
        path: "/projects/DEMO/items",
        method: "POST",
        body: {
          title: "Türkçe başlık",
          priority: "medium",
          assignee: "codex",
          body_md:
            "Kaynak: PBI-012\n\n## Amaç\nİçerik.\n## Test planı\nKontrol et.\n",
          criteria: ["Çalışır", "Bekler"],
        },
      },
      {
        path: "/items/DEMO-5/criteria/criterion-1",
        method: "PATCH",
        body: { done: true },
      },
      {
        path: "/items/DEMO-5/move",
        method: "POST",
        body: {
          status: "in_progress",
          reason: "Markdown içe aktarımı: PBI-012",
        },
      },
    ]);
    calls.length = 0;
    expect(await execute(false)).toEqual({
      code: 0,
      out: "DEMO: 0 eklendi, 1 atlandı.\n",
      err: "",
    });
    expect(calls.every((call) => call.method === "GET")).toBe(true);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
