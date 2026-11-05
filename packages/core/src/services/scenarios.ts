import type { z } from "zod";
import type { Context } from "../context";
import { scenarioCreate } from "../schemas";
import type { Values } from "../types";
import { createChildren } from "./children";
export function createScenarios(context: Context) {
  const { now } = context;
  const { childAdd, childMutation } = createChildren(context);
  const scenarios = {
    add(key: string, input: z.input<typeof scenarioCreate>, actor: string) {
      const data = scenarioCreate.parse(input);
      return childAdd(
        "test_scenarios",
        key,
        { ...data, result: data.result ?? "pending" },
        actor,
        "scenario_added",
      );
    },
    update(
      key: string,
      id: string,
      input: Partial<z.input<typeof scenarioCreate>>,
      actor: string,
    ) {
      const data = scenarioCreate.partial().parse(input);
      const patch: Values = {};
      for (const [k, v] of Object.entries(data))
        if (v !== undefined) patch[k] = v;
      return childMutation(
        "test_scenarios",
        key,
        id,
        patch,
        actor,
        "scenario_edited",
      );
    },
    remove(key: string, id: string, actor: string) {
      return childMutation(
        "test_scenarios",
        key,
        id,
        { removed_at: now() },
        actor,
        "scenario_removed",
      );
    },
  };
  return scenarios;
}
