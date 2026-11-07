import { language, t } from "@/lib/i18n";
import { agentName, type Detail } from "./types";

type Snapshot = Record<string, unknown>;

export const formatTokens = (value: number) =>
  new Intl.NumberFormat(language(), {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

/** "42K tokens" in the selected language. */
export const tokensLabel = (value: number) =>
  t("usageTokens").replace("{value}", formatTokens(value));

function formatDuration(ms: number): string {
  const unit = (value: number, name: "second" | "minute" | "hour") =>
    new Intl.NumberFormat(language(), {
      style: "unit",
      unit: name,
      unitDisplay: "short",
      maximumFractionDigits: name === "hour" ? 1 : 0,
    }).format(value);
  if (ms < 60000) return unit(Math.max(1, Math.round(ms / 1000)), "second");
  if (ms < 3600000) return unit(Math.round(ms / 60000), "minute");
  return unit(ms / 3600000, "hour");
}

/** A report's values on one line; anything not reported, or zero, stays out. */
export function usageRecordLine(after: Snapshot): string {
  const amount = (field: string) =>
    typeof after[field] === "number" && after[field] > 0
      ? (after[field] as number)
      : 0;
  const token = (
    field: string,
    label: "usageInput" | "usageOutput" | "usageCache",
  ) =>
    amount(field)
      ? [t(label).replace("{value}", formatTokens(amount(field)))]
      : [];
  return [
    ...(typeof after.model === "string" ? [after.model] : []),
    ...(typeof after.effort === "string" ? [after.effort] : []),
    ...token("input_tokens", "usageInput"),
    ...token("output_tokens", "usageOutput"),
    ...token("cache_tokens", "usageCache"),
    ...(amount("duration_ms") ? [formatDuration(amount("duration_ms"))] : []),
  ].join(" · ");
}

const effortLabel = (effort: string) =>
  effort === "high" || effort === "medium" || effort === "low"
    ? t(effort).toLocaleLowerCase(language())
    : effort;

/** The item's totals: "Codex · gpt-6.1-sol · high · 42K tokens · 3 runs". */
export function usageSummaryLine(usage: NonNullable<Detail["usage"]>): string {
  const list = (values: string[]) => (values.length ? [values.join(", ")] : []);
  return [
    ...list(usage.actors.map(agentName)),
    ...list(usage.models),
    ...list(usage.efforts.map(effortLabel)),
    ...(usage.total_tokens > 0 ? [tokensLabel(usage.total_tokens)] : []),
    t(usage.runs === 1 ? "usageRunOne" : "usageRunMany").replace(
      "{count}",
      String(usage.runs),
    ),
  ].join(" · ");
}
