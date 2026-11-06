import { z } from "zod";
import type { Context } from "../context";
import { text } from "../schemas";
import { createChildren } from "./children";
export function createCriteria(context: Context) {
  const { now } = context;
  const { childAdd, childMutation } = createChildren(context);
  const criteria = {
    add(key: string, value: string, actor: string, position?: number) {
      return childAdd(
        "criteria",
        key,
        {
          text: text.parse(value),
          done: 0,
          ...(position === undefined
            ? {}
            : { position: z.number().finite().parse(position) }),
        },
        actor,
        "criterion_added",
      );
    },
    update(key: string, id: string, value: string, actor: string) {
      return childMutation(
        "criteria",
        key,
        id,
        { text: text.parse(value) },
        actor,
        "criterion_updated",
      );
    },
    check(key: string, id: string, done: boolean, actor: string) {
      return childMutation(
        "criteria",
        key,
        id,
        { done: Number(z.boolean().parse(done)) },
        actor,
        "criterion_checked",
      );
    },
    remove(key: string, id: string, actor: string) {
      return childMutation(
        "criteria",
        key,
        id,
        { removed_at: now() },
        actor,
        "criterion_removed",
      );
    },
  };
  return criteria;
}
