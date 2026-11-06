const AI_ACTOR = /^(codex|claude|agent)(:|$)/i;

export function isAiActor(actor: unknown): boolean {
  return typeof actor === "string" && AI_ACTOR.test(actor);
}

/** A Test card waits for a person unless an AI agent has taken it back. */
export function isAwaitingHuman(item: Record<string, unknown>): boolean {
  return item.status === "test" && !isAiActor(item.assignee);
}
