import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { itemCreate, projectKeySchema, statusSchema } from "@pano/core";
import { z } from "zod";
import { parse, requireArgs } from "./args";
import { type Client, segment } from "./client";

const frontmatter = z.object({
  id: z.string().regex(/^PBI-\d+$/),
  title: z.string().trim().min(1),
  status: z.string(),
  priority: z.enum(["P1", "P2", "P3"]),
  assignee: z.string().nullable().optional(),
});

export function parseBacklog(source: string) {
  const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(
    source,
  );
  if (!match) throw new Error("PBI frontmatter bulunamadı.");
  // The legacy backlog uses a bare '-' for an unassigned item (not valid YAML).
  const yaml = match[1].replace(
    /^assignee:[ \t]*-[ \t]*\r?$/gm,
    "assignee: null",
  );
  const meta = frontmatter.parse(Bun.YAML.parse(yaml));
  const status = statusSchema.parse(
    meta.status === "in-progress" ? "in_progress" : meta.status,
  );
  const criteria: { text: string; done: boolean }[] = [];
  const kept: string[] = [];
  let section = 0;
  let fence: { char: string; length: number } | undefined;
  for (const line of source.slice(match[0].length).split(/(?<=\n)/)) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)/.exec(line);
    const inFence = !!fence;
    if (marker) {
      if (!fence) fence = { char: marker[1][0], length: marker[1].length };
      else if (
        marker[1][0] === fence.char &&
        marker[1].length >= fence.length &&
        !marker[2].trim()
      )
        fence = undefined;
    }
    if (!inFence && !marker) {
      const heading = /^ {0,3}(#{1,6})[ \t]+(.+?)\s*$/.exec(line);
      if (heading) {
        const level = heading[1].length;
        if (section && level <= section) section = 0;
        if (
          heading[2].replace(/[ \t]+#+$/, "").toLocaleLowerCase("tr") ===
          "kabul kriterleri"
        )
          section = level;
      }
      if (section) {
        const checkbox = /^\s*[-*+]\s+\[([ xX])\]\s+(.+?)\s*$/.exec(line);
        if (checkbox)
          criteria.push({ text: checkbox[2], done: checkbox[1] !== " " });
      }
    }
    if (!section) kept.push(line);
  }
  const assignee = meta.assignee?.trim();
  return {
    id: meta.id,
    status,
    criteria,
    item: itemCreate.parse({
      title: meta.title,
      body_md: `Kaynak: ${meta.id}\n\n${kept.join("")}`,
      priority: { P1: "high", P2: "medium", P3: "low" }[meta.priority],
      assignee: !assignee || assignee === "-" ? null : assignee,
      criteria: criteria.map((criterion) => criterion.text),
    }),
  };
}

export async function importBacklog(args: string[], api: Client) {
  const { values, positionals } = parse(args, { project: { type: "string" } });
  requireArgs(positionals, 1, "import <backlog-klasörü> --project KEY");
  const project = projectKeySchema.parse(values.project);
  const folder = positionals[0];
  const files = (await readdir(folder, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /^PBI-.*\.md$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  // Validate the whole source before making any REST mutations.
  const entries = await Promise.all(
    files.map(async (file) => {
      try {
        return parseBacklog(await readFile(join(folder, file), "utf8"));
      } catch (error) {
        throw new Error(`${file}: ${(error as Error).message}`);
      }
    }),
  );
  const projects = (await api("/projects?includeArchived=true")) as {
    key: string;
  }[];
  if (!projects.some((entry) => entry.key === project))
    await api("/projects", "POST", { key: project, name: project });
  const path = `/projects/${segment(project)}/items`;
  // The default list excludes cancelled items; those must also prevent duplicates.
  const items = [
    ...((await api(path)) as { body_md: string }[]),
    ...((await api(`${path}?status=cancelled`)) as { body_md: string }[]),
  ];
  const imported = new Set(
    items
      .map((item) => /^Kaynak: (PBI-\d+)(?:\r?\n|$)/.exec(item.body_md)?.[1])
      .filter((id) => id !== undefined),
  );
  let added = 0;
  let skipped = 0;
  for (const entry of entries) {
    if (imported.has(entry.id)) {
      skipped++;
      continue;
    }
    const created = (await api(path, "POST", entry.item)) as {
      key: string;
      criteria: { id: string }[];
    };
    const itemPath = `/items/${segment(created.key)}`;
    for (const [index, criterion] of entry.criteria.entries()) {
      if (criterion.done)
        await api(
          `${itemPath}/criteria/${segment(created.criteria[index].id)}`,
          "PATCH",
          { done: true },
        );
    }
    if (entry.status !== "backlog")
      await api(`${itemPath}/move`, "POST", {
        status: entry.status,
        reason: `Markdown içe aktarımı: ${entry.id}`,
      });
    imported.add(entry.id);
    added++;
  }
  return { project, added, skipped };
}
