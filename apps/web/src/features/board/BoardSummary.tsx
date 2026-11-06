import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { Popover } from "radix-ui";
import { useEffect, useId, useState } from "react";
import { type Project, request } from "@/lib/api";
import { language, t } from "@/lib/i18n";
import { relativeTime } from "./format";
import { chartDateLabel, openedSummary } from "./summaryDates";
import type { BoardItem } from "./types";
import "./summary.css";

type Summary = {
  started_at: string;
  total: number;
  completed: number;
  remaining: number;
  cancelled: number;
  remaining_by_priority: Record<"high" | "medium" | "low", number>;
  completed_last_7_days: number;
  burn_up: { date: string; total: number; completed: number }[];
};

function BurnUp({ data }: { data: Summary }) {
  const [selected, setSelected] = useState<number | null>(null);
  const hintId = useId();
  const days = data.burn_up;
  const maximum = Math.max(1, ...data.burn_up.map((day) => day.total));
  const first = days[0];
  const last = days.at(-1);
  const format = new Intl.DateTimeFormat(language(), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const date = (value: string) => format.format(new Date(value));
  if (!first || !last || days.length < 2) {
    return <p>{openedSummary(data.started_at, data.completed)}</p>;
  }
  const start = Date.parse(first.date);
  const duration = Date.parse(last.date) - start;
  const x = (day: Summary["burn_up"][number]) =>
    8 + ((Date.parse(day.date) - start) / duration) * 208;
  const y = (value: number) => 144 - (value / maximum) * 96;
  const area = (field: "total" | "completed") =>
    `M8 144 V${y(first[field])} ${days
      .slice(1)
      .map((day) => `H${x(day)} V${y(day[field])}`)
      .join(" ")} V144 Z`;
  const totalY = Math.max(48, Math.min(124, y(last.total)));
  const completedY = Math.min(144, Math.max(totalY + 20, y(last.completed)));
  const active =
    selected === null ? undefined : days[Math.min(selected, days.length - 1)];
  const tooltip = active
    ? t("summaryChartDay")
        .replace("{date}", date(active.date))
        .replace("{completed}", String(active.completed))
        .replace("{total}", String(active.total))
    : "";
  const summary = t("summaryChartLabel")
    .replace("{start}", date(first.date))
    .replace("{end}", date(last.date))
    .replace("{total}", String(data.total))
    .replace("{completed}", String(data.completed));
  const selectAt = (clientX: number, bounds: DOMRect) => {
    const position = ((clientX - bounds.left) / bounds.width) * 320;
    const target = start + ((position - 8) / 208) * duration;
    let nearest = 0;
    let distance = Infinity;
    days.forEach((day, index) => {
      const candidate = Math.abs(Date.parse(day.date) - target);
      if (candidate < distance) {
        nearest = index;
        distance = candidate;
      }
    });
    setSelected(nearest);
  };
  return (
    <figure className="summary-chart">
      <button
        type="button"
        className="summary-chart-interaction"
        aria-label={summary}
        aria-describedby={hintId}
        onFocus={() => setSelected(days.length - 1)}
        onBlur={() => setSelected(null)}
        onPointerMove={(event) =>
          selectAt(event.clientX, event.currentTarget.getBoundingClientRect())
        }
        onPointerDown={(event) => {
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          selectAt(event.clientX, event.currentTarget.getBoundingClientRect());
        }}
        onPointerLeave={(event) => {
          if (!event.currentTarget.matches(":focus")) setSelected(null);
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          setSelected((current) =>
            Math.max(
              0,
              Math.min(
                days.length - 1,
                (current ?? days.length - 1) +
                  (event.key === "ArrowLeft" ? -1 : 1),
              ),
            ),
          );
        }}
      >
        <span className="sr-only" id={hintId}>
          {t("summaryChartKeyboard")}
        </span>
        <svg viewBox="0 0 320 160" role="img" aria-label={summary}>
          <path d={area("total")} className="summary-total-area" />
          <path d={area("completed")} className="summary-completed-area" />
          {active && (
            <line
              x1="0"
              x2="0"
              y1="40"
              y2="144"
              className="summary-cursor"
              style={{ transform: `translateX(${x(active)}px)` }}
            />
          )}
        </svg>
        <span
          className="summary-total-label"
          aria-hidden="true"
          style={{ top: `${(totalY / 160) * 100}%` }}
        >
          {t("summaryChartTotal").replace("{count}", String(data.total))}
        </span>
        <span
          className="summary-completed-label"
          aria-hidden="true"
          style={{
            top: `max(calc(${(totalY / 160) * 100}% + 20px), ${(completedY / 160) * 100}%)`,
          }}
        >
          {t("summaryChartCompleted").replace(
            "{count}",
            String(data.completed),
          )}
        </span>
        <span
          className="summary-chart-tooltip"
          aria-hidden="true"
          data-visible={!!active}
        >
          {tooltip}
        </span>
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {tooltip}
        </span>
      </button>
      <div className="summary-dates">
        <span>{date(first.date)}</span>
        <span>{chartDateLabel(last.date)}</span>
      </div>
    </figure>
  );
}

export function BoardSummary({
  items,
  project,
}: {
  items: BoardItem[];
  project: Project;
}) {
  const [now, setNow] = useState(Date.now());
  const titleId = useId();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const query = useQuery<Summary>({
    // Existing SSE invalidation covers every query under "board".
    queryKey: ["board", project.key, "summary", timeZone],
    queryFn: () =>
      request(
        `/projects/${project.key}/summary?timeZone=${encodeURIComponent(timeZone)}`,
      ),
  });
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const active = items.filter((item) => item.status !== "cancelled");
  const completed =
    query.data?.completed ??
    active.filter((item) => item.status === "done").length;
  const total = query.data?.total ?? active.length;
  const remaining = query.data?.remaining ?? total - completed;
  const high =
    query.data?.remaining_by_priority.high ??
    active.filter((item) => item.priority === "high" && item.status !== "done")
      .length;
  const last =
    items
      .map((item) => item.last_activity)
      .filter(Boolean)
      .sort()
      .at(-1) ?? project.updated_at;
  const started = new Date(
    query.data?.started_at ?? project.created_at,
  ).toLocaleDateString(language(), { day: "numeric", month: "short" });
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className="board-summary">
          <span className="track" aria-hidden="true">
            <span
              style={{ width: `${total ? (completed / total) * 100 : 0}%` }}
            />
          </span>
          <span aria-live="polite" aria-atomic="true">
            <strong>
              <span aria-hidden="true">
                {completed} / {total} {t("summaryCompleted")}
              </span>
              <span className="sr-only">
                {t("summaryTotal")} {total}, {completed} {t("summaryCompleted")}
              </span>
            </strong>
            {" · "}
            {remaining} {t("remaining")} · {started} {t("started")} · {high}{" "}
            {t("highPriority")} · {t("updated")} {relativeTime(last, now)}
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="summary-popover"
          sideOffset={8}
          collisionPadding={16}
          align="start"
          aria-labelledby={titleId}
        >
          <h2 id={titleId}>{t("summaryDetails")}</h2>
          {query.isError ? (
            <p role="alert">
              {t("failed")}{" "}
              <button type="button" onClick={() => void query.refetch()}>
                {t("summaryRetry")}
              </button>
            </p>
          ) : !query.data ? (
            <p role="status">{t("summaryLoading")}</p>
          ) : (
            <>
              <dl>
                <div>
                  <dt>{t("summaryCancelled")}</dt>
                  <dd>{query.data.cancelled}</dd>
                </div>
                <div>
                  <dt>{t("summaryLastSeven")}</dt>
                  <dd>{query.data.completed_last_7_days}</dd>
                </div>
              </dl>
              <h3>{t("summaryPriorities")}</h3>
              <dl>
                {(["high", "medium", "low"] as const).map((priority) => (
                  <div key={priority}>
                    <dt>{t(priority)}</dt>
                    <dd>{query.data?.remaining_by_priority[priority]}</dd>
                  </div>
                ))}
              </dl>
              {query.data.total + query.data.cancelled === 0 ? (
                <p>{t("summaryEmpty")}</p>
              ) : (
                <BurnUp data={query.data} />
              )}
            </>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
