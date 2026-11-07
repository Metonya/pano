/**
 * Who is who, shared by the server and the web app. Agents introduce themselves
 * as `tool:role` without registering; the person is whoever `userName` says.
 * No imports: the browser bundle loads this file too.
 */

/** Assignee alias that spares agents from knowing the person's name. */
export const HUMAN_ALIAS = "human";
/** Recorded when a request names no actor, so it identifies nobody. */
const ANONYMOUS = "anonymous";

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function isHumanActor(actor: unknown, userName: string): boolean {
  return typeof actor === "string" && same(actor, userName);
}

export function isAiActor(actor: unknown, userName: string): boolean {
  return (
    typeof actor === "string" &&
    actor !== "" &&
    actor !== ANONYMOUS &&
    !same(actor, userName)
  );
}

/** A Test card waits for the person when it is unassigned or assigned to them. */
export function isAwaitingHuman(
  item: Record<string, unknown>,
  userName: string,
): boolean {
  return (
    item.status === "test" &&
    (!item.assignee || isHumanActor(item.assignee, userName))
  );
}

/** `claude:po` and `Claude` are both the tool `claude`. */
export const toolOf = (id: string) => (id.split(":")[0] ?? id).toLowerCase();
