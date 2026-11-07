import { beforeEach, expect, test } from "bun:test";
import { isAwaitingHuman } from "@/features/board/types";
import { setLanguage } from "@/lib/i18n";
import { setCurrentUser } from "@/lib/identity";
import {
  AVATAR_COLORS,
  agentInfo,
  agentName,
  assigneeKey,
  assigneeKeys,
  isAiActor,
  matchesAssignee,
  UNASSIGNED_FILTER,
} from "./agentInfo";
import { type ToolLogo, toolLogos } from "./logos";

beforeEach(async () => {
  await setLanguage("tr", false);
  setCurrentUser("mert");
});

test("agentInfo reads the tool and role of an identity", () => {
  expect(agentInfo("claude:po")).toMatchObject({
    tool: "claude",
    name: "Claude",
    role: "PO",
    label: "Claude · PO",
    initial: "C",
  });
  expect(agentInfo("Cursor:review")).toMatchObject({
    name: "Cursor",
    role: "Review",
    label: "Cursor · Review",
  });
  expect(agentInfo("codex").role).toBeNull();
  expect(agentName("claude:design")).toBe("Claude · Tasarım");
  expect(agentName("claude:QA")).toBe("Claude · QA");
});

test("an unknown tool shows its initial and a colour fixed by its name", () => {
  const info = agentInfo("windsurf:dev");
  expect(info).toMatchObject({ name: "Windsurf", initial: "W", logo: null });
  expect(AVATAR_COLORS).toContain(info.color as string);
  expect(agentInfo("windsurf").color).toBe(info.color);
  expect(agentInfo("WINDSURF").color).toBe(info.color);
});

test("a known tool shows its logo, whatever its role", () => {
  for (const [id, name] of [
    ["claude", "Claude"],
    ["codex", "Codex"],
    ["cursor", "Cursor"],
    ["gemini", "Gemini"],
    ["copilot", "Copilot"],
    ["opencode", "OpenCode"],
  ] as const) {
    const logo = toolLogos[id] as ToolLogo;
    expect(agentInfo(id)).toMatchObject({
      name,
      logo: logo.path,
      color: logo.background,
    });
  }
  expect(agentInfo("claude:po").logo).toBe(toolLogos.claude?.path as string);
  expect(agentInfo("CLAUDE:po").logo).toBe(toolLogos.claude?.path as string);
});

test("the person never gets a tool's logo, even when named after one", () => {
  setCurrentUser("claude");
  expect(agentInfo("claude")).toMatchObject({
    human: true,
    logo: null,
    color: null,
    darkColor: null,
  });
});

const luminance = (color: string) => {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [1, 3, 5].map((at) =>
    channel(Number.parseInt(color.slice(at, at + 2), 16)),
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (high + 0.05) / (low + 0.05);
};

test("every avatar colour carries white initials and logos at AA", () => {
  const logos = Object.values(toolLogos);
  for (const color of [
    ...AVATAR_COLORS,
    ...logos.map((logo) => logo.background),
    ...logos.flatMap((logo) => logo.darkBackground ?? []),
  ])
    expect(contrast(color, "#ffffff")).toBeGreaterThanOrEqual(4.5);
});

test("a logo's background stands out from every surface in both themes", () => {
  // DESIGN.md tokens: bg, sidebar, card, sheet.
  const light = ["#f5f5f7", "#fbfbfd", "#ffffff"];
  const dark = ["#000000", "#161617", "#1c1c1e", "#2c2c2e"];
  for (const logo of Object.values(toolLogos)) {
    for (const surface of light)
      expect(contrast(logo.background, surface)).toBeGreaterThanOrEqual(3);
    for (const surface of dark)
      expect(
        contrast(logo.darkBackground ?? logo.background, surface),
      ).toBeGreaterThanOrEqual(3);
  }
});

test("the person keeps the primary avatar, in any letter case", () => {
  expect(agentInfo("MERT")).toMatchObject({ human: true, color: null });
  expect(agentInfo("mert").label).toBe("Mert");
});

test("the rule follows the name: only the person and empty wait", () => {
  const card = (assignee: string | null) =>
    ({ status: "test", assignee }) as Parameters<typeof isAwaitingHuman>[0];
  expect(isAwaitingHuman(card(null))).toBe(true);
  expect(isAwaitingHuman(card("Mert"))).toBe(true);
  expect(isAwaitingHuman(card("cursor"))).toBe(false);
  expect(isAwaitingHuman(card("claude:po"))).toBe(false);
  expect(isAiActor("cursor:review")).toBe(true);
  expect(isAiActor("mert")).toBe(false);
  setCurrentUser("alex");
  expect(isAwaitingHuman(card("mert"))).toBe(false);
  expect(isAwaitingHuman(card("alex"))).toBe(true);
});

test("three Claude roles are one line in the assignee menu", () => {
  const keys = assigneeKeys(
    ["claude:po", "claude:kimlik", "claude:kart", "windsurf:dev", null, "MERT"],
    { includeKnown: true, includeUser: true },
  );
  expect(keys).toEqual([
    "mert",
    "claude",
    "codex",
    "cursor",
    "gemini",
    "copilot",
    "opencode",
    "windsurf",
  ]);
  expect(keys.filter((key) => agentInfo(key).name === "Claude")).toHaveLength(
    1,
  );
});

test("a role keeps its tool selected", () => {
  expect(assigneeKey("claude:kimlik")).toBe("claude");
  expect(assigneeKey("Claude")).toBe("claude");
  expect(assigneeKey("Mert")).toBe("mert");
});

test("filtering by a tool brings all of its roles", () => {
  const assignees = ["claude:po", "claude:kimlik", "codex", "mert", null];
  expect(assigneeKeys(assignees)).toEqual(["mert", "claude", "codex"]);
  expect(assignees.filter((a) => matchesAssignee(a, "claude"))).toEqual([
    "claude:po",
    "claude:kimlik",
  ]);
  expect(assignees.filter((a) => matchesAssignee(a, "mert"))).toEqual(["mert"]);
  expect(
    assignees.filter((a) => matchesAssignee(a, UNASSIGNED_FILTER)),
  ).toEqual([null]);
  expect(assignees.filter((a) => matchesAssignee(a, ""))).toEqual(assignees);
});

test("names matching Object.prototype members stay plain agents", () => {
  for (const id of ["constructor", "__proto__", "toString:valueOf"]) {
    const info = agentInfo(id);
    expect(typeof info.name).toBe("string");
    expect(info.logo).toBeNull();
    expect(typeof info.label).toBe("string");
  }
});
