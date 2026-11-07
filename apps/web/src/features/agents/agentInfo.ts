import {
  isAiActor as isCoreAiActor,
  isHumanActor,
  toolOf,
} from "@pano/core/identity";
import { t } from "@/lib/i18n";
import { currentUser } from "@/lib/identity";
import { toolLogos } from "./logos";

const TOOLS: Record<string, string> = {
  claude: "Claude",
  codex: "Codex",
  cursor: "Cursor",
  gemini: "Gemini",
  copilot: "Copilot",
};

/** Each carries white initials at AA or better (4.5:1); see agentInfo.test.ts. */
export const AVATAR_COLORS = [
  "#4f46b8",
  "#7a3bb0",
  "#a62f78",
  "#0f766e",
  "#1c6e30",
  "#8a5a00",
  "#4b5563",
];

const capitalized = (text: string) =>
  text === text.toLowerCase()
    ? text.charAt(0).toUpperCase() + text.slice(1)
    : text;

function roleLabel(role: string) {
  const roles: Record<string, string> = {
    po: "PO",
    design: t("designRole"),
    tasarim: t("designRole"),
  };
  return roles[role.toLowerCase()] ?? capitalized(role);
}

function colorOf(tool: string) {
  let hash = 0;
  for (const char of tool) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] as string;
}

export const isHuman = (id: string) => {
  const user = currentUser();
  return user !== null && isHumanActor(id, user);
};

export function agentInfo(id: string) {
  const human = isHuman(id);
  const colon = id.indexOf(":");
  const raw = colon < 0 ? id : id.slice(0, colon);
  const rawRole = colon < 0 ? "" : id.slice(colon + 1);
  const tool = raw.toLowerCase();
  const name = TOOLS[tool] ?? capitalized(raw);
  const role = rawRole ? roleLabel(rawRole) : null;
  return {
    id,
    tool,
    name,
    role,
    /** The full identity, for history lines: `Claude · PO`. */
    label: role ? `${name} · ${role}` : name,
    initial: name.charAt(0).toUpperCase(),
    human,
    /** Null means the person, who keeps the primary colour. */
    color: human ? null : colorOf(tool),
    logo: human ? null : (toolLogos[tool] ?? null),
  };
}

export const agentName = (id: string) => agentInfo(id).label;

/** One line per tool: every role of a tool shares a key, the person keeps theirs. */
export const assigneeKey = (id: string) =>
  isHuman(id) ? (currentUser() as string) : toolOf(id);

/** The person first, then tools: known ones (when asked for) and those in use. */
export function assigneeKeys(
  assignees: (string | null | undefined)[],
  { includeKnown = false, includeUser = false } = {},
) {
  const user = currentUser();
  const seen = assignees
    .filter((a): a is string => !!a)
    .map((a) => assigneeKey(a));
  const person = user && (includeUser || seen.includes(user)) ? [user] : [];
  return [
    ...new Set([
      ...person,
      ...(includeKnown ? Object.keys(TOOLS) : []),
      ...seen,
    ]),
  ];
}

export const UNASSIGNED_FILTER = "unassigned:";

export function matchesAssignee(assignee: string | null, filter: string) {
  if (!filter) return true;
  if (filter === UNASSIGNED_FILTER) return !assignee;
  return !!assignee && assigneeKey(assignee) === filter;
}

/** An agent is anyone but the person, without knowing the tool in advance. */
export const isAiActor = (actor: string | null | undefined) =>
  isCoreAiActor(actor, currentUser() ?? "");
