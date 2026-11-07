import { language, t } from "@/lib/i18n";

export function latestActivity(
  values: (string | null | undefined)[],
  fallback: string,
): string {
  return (
    values.reduce<string>(
      (latest, value) => (value && value > latest ? value : latest),
      "",
    ) || fallback
  );
}

export function localDate(value: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (name: string) => parts.find((p) => p.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function openedSummary(
  startedAt: string,
  completed: number,
  now = new Date(),
  timeZone?: string,
): string {
  const started = new Date(startedAt);
  const today = localDate(started, timeZone) === localDate(now, timeZone);
  const todayKey =
    completed === 0 ? "summaryOpenedTodayZero" : "summaryOpenedToday";
  const dateKey = completed === 0 ? "summaryOpenedOnZero" : "summaryOpenedOn";
  return t(today ? todayKey : dateKey)
    .replace("{count}", String(completed))
    .replace(
      "{date}",
      new Intl.DateTimeFormat(language(), {
        day: "numeric",
        month: "short",
        timeZone,
      }).format(started),
    );
}

export function chartDateLabel(
  day: string,
  now = new Date(),
  timeZone?: string,
): string {
  if (day === localDate(now, timeZone)) return t("summaryToday");
  // API dates are calendar labels, not instants to shift to another timezone.
  return new Intl.DateTimeFormat(language(), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}
