import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { Popover } from "radix-ui";
import { useEffect, useId, useState } from "react";
import { type Project, request } from "@/lib/api";
import { t } from "@/lib/i18n";
import { relativeTime } from "./format";
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
  const maximum = Math.max(1, ...data.burn_up.map((day) => day.total));
  const points = (field: "total" | "completed") =>
    data.burn_up
      .map(
        (day, i) =>
          `${16 + (i / 29) * 288},${112 - (day[field] / maximum) * 96}`,
      )
      .join(" ");
  const first = data.burn_up[0]?.date ?? "";
  const last = data.burn_up.at(-1)?.date ?? "";
  return (
    <figure className="summary-chart">
      <figcaption>{t("summaryBurnUp")}</figcaption>
      <svg
        viewBox="0 0 320 128"
        role="img"
        aria-label={`${t("summaryBurnUp")}: ${first} – ${last}. ${t("summaryTotal")} ${data.total}, ${t("summaryCompleted")} ${data.completed}.`}
      >
        <path d="M16 16V112H304" className="summary-axis" />
        <polyline points={points("total")} className="summary-total-line" />
        <polyline
          points={points("completed")}
          className="summary-completed-line"
        />
      </svg>
      <div className="summary-dates">
        <span>{first}</span>
        <span>{last}</span>
      </div>
      <div className="summary-legend">
        <span>
          {t("summaryTotal")} ({data.total}) · {t("summaryDashed")}
        </span>
        <span>
          {t("summaryCompleted")} ({data.completed}) · {t("summarySolid")}
        </span>
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
  const query = useQuery<Summary>({
    // Existing SSE invalidation covers every query under "board".
    queryKey: ["board", project.key, "summary"],
    queryFn: () => request(`/projects/${project.key}/summary`),
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
  ).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
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
