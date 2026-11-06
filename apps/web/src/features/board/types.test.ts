import { expect, test } from "bun:test";
import { agentName } from "./types";

test("agent identities are readable", () => {
  expect(agentName("claude:po")).toBe("Claude · PO");
  expect(agentName("claude:design")).toBe("Claude · Tasarım");
  expect(agentName("codex")).toBe("Codex");
  expect(agentName("mert")).toBe("Mert");
});
