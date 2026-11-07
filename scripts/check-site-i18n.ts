import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function checkTextFiles(directory: string) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await checkTextFiles(path);
    } else {
      const bytes = await readFile(path);
      const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
      if (text.includes("\u2014") || text.charCodeAt(0) === 0xfeff || text.includes("\ufffd")) throw new Error(`Invalid character in ${path}`);
    }
  }
}

await checkTextFiles("site");

const byName = (a: string, b: string) => a.localeCompare(b);
const dir = "site/i18n";
const files = (await readdir(dir)).filter((name) => name.endsWith(".json"));
const expected = ["az", "de", "en", "es", "fr", "hi", "ja", "ko", "nl", "pl", "pt", "sv", "tr", "zh"];
if (files.map((file) => file.slice(0, -5)).sort(byName).join() !== expected.join()) throw new Error("Locale list differs");
const english: Record<string, string> = JSON.parse(await readFile(`${dir}/en.json`, "utf8"));
const reference = Object.keys(english).sort(byName);
// These are product terms shared unchanged across languages.
const allowedIdentical = new Set(["skills"]);
// "Suggestions" is also the natural French heading.
const localeIdentical: Record<string, Set<string>> = { fr: new Set(["suggestions"]) };
const preserved = ["Pano", "AI", "MCP", "CLI", "PO", "Backlog", "In Progress", "Test", "Done", "skill", "SKILL.md", "GitHub", "Claude", "Codex", "OpenCode", "Claude Code", "Docker", "macOS", "Linux", "Windows", "pano serve", "http://localhost:7777", "skills/pano", "skills/pano-po", "https://github.com/Metonya/pano", "~/.claude/skills/"];
const errors: string[] = [];
for (const file of files) {
  const raw = await readFile(`${dir}/${file}`, "utf8");
  if (raw.includes("\u2014") || raw.charCodeAt(0) === 0xfeff || raw.includes("\ufffd")) throw new Error(`Invalid character in ${file}`);
  const data = JSON.parse(raw);
  if (Object.keys(data).sort(byName).join() !== reference.join()) errors.push(`Key mismatch in ${file}`);
  if (Object.values(data).some((value) => typeof value !== "string" || !value)) errors.push(`Empty value in ${file}`);
  for (const key of reference) {
    const value = data[key];
    if (typeof value !== "string") continue;
    if (/[<>]/.test(value.replace(/<strong>[^<>]+<\/strong>/g, ""))) errors.push(`Unsafe or unbalanced markup in ${file}: ${key}`);
    if ((value.match(/<strong>/g) || []).length !== (english[key].match(/<strong>/g) || []).length) errors.push(`Emphasis mismatch in ${file}: ${key}`);
  }
  if (file !== "en.json") {
    for (const key of reference) {
      if (data[key] === english[key] && !allowedIdentical.has(key) && !localeIdentical[file.slice(0, -5)]?.has(key)) errors.push(`Untranslated ${file}: ${key}`);
      for (const term of preserved) {
        if (english[key].includes(term) && !data[key]?.includes(term)) errors.push(`Missing ${term} in ${file}: ${key}`);
      }
    }
  }
}
if (errors.length) throw new Error(errors.join("\n"));
const promptRaw = await readFile("site/prompts.json", "utf8");
if (promptRaw.includes("\u2014") || promptRaw.charCodeAt(0) === 0xfeff || promptRaw.includes("\ufffd")) throw new Error("Invalid character in prompts.json");
const prompts: Record<string, string> = JSON.parse(promptRaw);
if (Object.keys(prompts).sort(byName).join() !== expected.join()) throw new Error("Prompt locale list differs");
for (const code of expected) {
  const prompt = prompts[code];
  if (typeof prompt !== "string" || !prompt || (code !== "en" && prompt === prompts.en)) throw new Error(`Untranslated starter prompt: ${code}`);
  for (const term of ["pano-po", "skill", "PO", "APP", "Pano"]) {
    if (!prompt.includes(term)) throw new Error(`Missing ${term} in starter prompt: ${code}`);
  }
}
console.log(`Checked ${files.length} locales`);
