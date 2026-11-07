import { readdir, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
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

function withoutClosingHeadingHashes(text: string) {
  let end = text.length;
  while (end > 0 && text[end - 1] === "#") end--;
  if (end === text.length) return text;
  let space = end;
  while (space > 0 && (text[space - 1] === " " || text[space - 1] === "\t"))
    space--;
  return space === end ? text : text.slice(0, space);
}

function lineContent(rest: string, heading: boolean): string | undefined {
  let start = 0;
  const isSeparator = (char: string) =>
    heading ? char === " " || char === "\t" : /\s/.test(char);
  while (start < rest.length && isSeparator(rest[start])) start++;
  let end = start;
  while (end < rest.length && !/[\r\n\u2028\u2029]/.test(rest[end])) end++;
  if (rest.slice(end).trim()) return undefined;
  if (end > start) return rest.slice(start, end).trimEnd() || rest[start];
  while (start > 0) {
    start--;
    if (!/[\r\n\u2028\u2029]/.test(rest[start])) return rest[start];
  }
  return undefined;
}

export function headingLine(line: string) {
  const prefix = /^ {0,3}(#{1,6})[ \t]/.exec(line);
  if (!prefix) return undefined;
  const text = lineContent(line.slice(prefix[0].length), true);
  return text === undefined ? undefined : { level: prefix[1].length, text };
}

export function checkboxLine(line: string) {
  const prefix = /^\s*[-*+]\s+\[([ xX])\]\s/.exec(line);
  if (!prefix) return undefined;
  const text = lineContent(line.slice(prefix[0].length), false);
  return text === undefined ? undefined : { text, done: prefix[1] !== " " };
}

type Fence = { char: string; length: number } | undefined;

function nextFence(fence: Fence, marker: RegExpExecArray | null): Fence {
  if (!marker) return fence;
  if (!fence) return { char: marker[1][0], length: marker[1].length };
  if (
    marker[1].startsWith(fence.char) &&
    marker[1].length >= fence.length &&
    !marker[2].trim()
  )
    return undefined;
  return fence;
}

function nextSection(section: number, line: string) {
  const heading = headingLine(line);
  if (!heading) return section;
  if (
    withoutClosingHeadingHashes(heading.text).toLocaleLowerCase("tr") ===
    "kabul kriterleri"
  )
    return heading.level;
  return section && heading.level <= section ? 0 : section;
}

function extractCriteria(body: string) {
  const criteria: { text: string; done: boolean }[] = [];
  const kept: string[] = [];
  let section = 0;
  let fence: Fence;
  for (const line of body.split(/(?<=\n)/)) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)/.exec(line);
    const inFence = !!fence;
    fence = nextFence(fence, marker);
    if (!inFence && !marker) {
      section = nextSection(section, line);
      if (section) {
        const checkbox = checkboxLine(line);
        if (checkbox) criteria.push(checkbox);
      }
    }
    if (!section) kept.push(line);
  }
  return { criteria, kept };
}

function closingFrontmatter(source: string, openingLineEnd: number) {
  let closingStart = source.indexOf("\n---", openingLineEnd);
  let closingEnd = -1;
  while (closingStart !== -1) {
    const markerStart = closingStart + 1;
    let lineEnd = markerStart + 3;
    while (source[lineEnd] === " " || source[lineEnd] === "\t") lineEnd++;
    if (
      source[lineEnd] === "\n" ||
      (source[lineEnd] === "\r" && source[lineEnd + 1] === "\n")
    ) {
      closingEnd = source[lineEnd] === "\r" ? lineEnd + 2 : lineEnd + 1;
      break;
    }
    if (lineEnd === source.length) {
      closingEnd = lineEnd;
      break;
    }
    closingStart = source.indexOf("\n---", markerStart + 3);
  }
  if (closingEnd === -1) throw new Error("PBI frontmatter not found.");
  return { closingStart, closingEnd };
}

function splitFrontmatter(source: string) {
  const bomOffset = source.startsWith("\uFEFF") ? 1 : 0;
  const openingEnd = bomOffset + 3;
  if (!source.startsWith("---", bomOffset))
    throw new Error("PBI frontmatter not found.");
  const openingLineEnd =
    source[openingEnd] === "\r" ? openingEnd + 2 : openingEnd + 1;
  if (
    source[openingEnd] !== "\n" &&
    !(source[openingEnd] === "\r" && source[openingEnd + 1] === "\n")
  )
    throw new Error("PBI frontmatter not found.");
  const { closingStart, closingEnd } = closingFrontmatter(
    source,
    openingLineEnd,
  );
  const yamlEnd =
    source[closingStart - 1] === "\r" ? closingStart - 1 : closingStart;
  const yaml = source.slice(openingLineEnd, yamlEnd);
  return { yaml, bodyStart: closingEnd };
}

export function parseBacklog(source: string) {
  const { yaml, bodyStart } = splitFrontmatter(source);
  // The legacy backlog uses a bare '-' for an unassigned item (not valid YAML).
  const normalizedYaml = yaml.replace(
    /^assignee:[ \t]*-[ \t]*\r?$/gm,
    "assignee: null",
  );
  const meta = frontmatter.parse(Bun.YAML.parse(normalizedYaml));
  const status = statusSchema.parse(
    meta.status === "in-progress" ? "in_progress" : meta.status,
  );
  const { criteria, kept } = extractCriteria(source.slice(bodyStart));
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
  requireArgs(positionals, 1, "import <backlog-folder> --project KEY");
  const project = projectKeySchema.parse(values.project);
  const cwd = await realpath(process.cwd());
  const withinCwd = (path: string) => {
    const difference = relative(cwd, path);
    return (
      difference !== ".." &&
      !difference.startsWith(`..${sep}`) &&
      !isAbsolute(difference)
    );
  };
  const requested = resolve(cwd, positionals[0]);
  if (!withinCwd(requested))
    throw new Error(
      "Import folder must be inside the current working directory.",
    );
  const folder = await realpath(requested);
  if (!withinCwd(folder))
    throw new Error(
      "Import folder must be inside the current working directory.",
    );
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
        reason: `Markdown import: ${entry.id}`,
      });
    imported.add(entry.id);
    added++;
  }
  return { project, added, skipped };
}
