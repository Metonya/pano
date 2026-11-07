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

/**
 * Sums `usage` records. Cache tokens stay out of the total: Codex already counts
 * them inside its input, and cache reads would otherwise dwarf the real work.
 */
export function usageTotals(rows: Row[]): UsageTotals {
  const records = rows.map(parse);
  return {
    total_tokens: records.reduce(
      (sum, usage) =>
        sum + count(usage.input_tokens) + count(usage.output_tokens),
      0,
    ),
    runs: records.length,
    models: distinct(records.map((usage) => usage.model)),
  };
}

/** The item detail also names who reported and at which effort. */
export function usageDetail(rows: Row[]) {
  return {
    ...usageTotals(rows),
    actors: distinct(rows.map((row) => row.actor)),
    efforts: distinct(rows.map(parse).map((usage) => usage.effort)),
  };
}
