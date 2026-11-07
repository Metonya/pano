import type { Row } from "../types";

export type UsageTotals = {
  total_tokens: number;
  runs: number;
  models: string[];
};

const count = (value: unknown) => (typeof value === "number" ? value : 0);
const distinct = (values: unknown[]) => [
  ...new Set(values.filter((v): v is string => typeof v === "string")),
];
const parse = (row: Row): Record<string, unknown> =>
  JSON.parse(String(row.after_json ?? "{}"));

/** What a record adds to the total: the agent's own total when it reported one. */
const recordTotal = (usage: Record<string, unknown>) =>
  typeof usage.total_tokens === "number"
    ? usage.total_tokens
    : count(usage.input_tokens) + count(usage.output_tokens);

/**
 * Sums `usage` records. Cache tokens stay out of the total: Codex already counts
 * them inside its input, and cache reads would otherwise dwarf the real work.
 * Context stays out too: it is the size of a window, not work done.
 */
export function usageTotals(rows: Row[]): UsageTotals {
  const records = rows.map(parse);
  return {
    total_tokens: records.reduce((sum, usage) => sum + recordTotal(usage), 0),
    runs: records.length,
    models: distinct(records.map((usage) => usage.model)),
  };
}

/** The item detail also names who reported, at which effort, and for how long. */
export function usageDetail(rows: Row[]) {
  const records = rows.map(parse);
  return {
    ...usageTotals(rows),
    actors: distinct(rows.map((row) => row.actor)),
    efforts: distinct(records.map((usage) => usage.effort)),
    peak_context: Math.max(
      0,
      ...records.map((usage) => count(usage.context_tokens)),
    ),
    duration_ms: records.reduce(
      (sum, usage) => sum + count(usage.duration_ms),
      0,
    ),
  };
}
