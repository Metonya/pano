import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  activityReason,
  activityText,
  scenarioResultChanged,
} from "@/features/board/format";
import { agentName, type Detail } from "@/features/board/types";
import { authHeaders, request } from "@/lib/api";
import { language, t } from "@/lib/i18n";
import { checkResult } from "./checkResult";
import { ChildContent, DiffView, parseSnapshot } from "./DiffView";
import {
  childContent,
  type HistoryFilter,
  isLegacyCheck,
  matchesFilter,
  StatusFlow,
  statusFlow,
} from "./entry";
import "./history.css";

type Attachment = { id: string; activity_id: string | null; file_name: string };
type Entry = Detail["activity"][number];

function Thumbnail({ attachment }: { attachment: Attachment }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let blobUrl = "";
    void fetch(`/api/v1/attachments/${attachment.id}`, {
      headers: authHeaders(),
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.blob();
      })
      .then((blob) => {
        blobUrl = URL.createObjectURL(blob);
        setUrl(blobUrl);
      })
      .catch(() => {});
    return () => {
      controller.abort();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [attachment.id]);
  return url ? (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt={attachment.file_name} loading="lazy" />
    </a>
  ) : (
    <span>{attachment.file_name}</span>
  );
}

const locale = () => (language() === "tr" ? "tr-TR" : "en-US");
const dayOf = (value: string) =>
  new Intl.DateTimeFormat(locale(), { dateStyle: "long" }).format(
    new Date(value),
  );
const timeOf = (value: string) =>
  new Intl.DateTimeFormat(locale(), { timeStyle: "short" }).format(
    new Date(value),
  );

/** Colours the timeline dot: a move takes its destination's colour. */
function tone(entry: Entry): string {
  const flow = statusFlow(entry);
  if (flow) return `status-${flow.to}`;
  if (entry.kind === "check")
    return `check-${checkResult(entry.message, parseSnapshot(entry.after_json))}`;
  if (entry.kind === "scenario_edited" && scenarioResultChanged(entry))
    return `check-${checkResult("", parseSnapshot(entry.after_json))}`;
  return entry.kind === "decision" ? "decision" : "plain";
}

const diffKinds = new Set(["edited", "criterion_updated", "scenario_edited"]);

function Row({
  entry,
  attachments,
}: {
  entry: Entry;
  attachments: Attachment[];
}) {
  const after = parseSnapshot(entry.after_json);
  const before = parseSnapshot(entry.before_json);
  const actor = agentName(entry.actor);
  const summary = activityText(entry);
  const result = checkResult(entry.message, after);
  const flow = statusFlow(entry);
  const reason = activityReason(entry);
  const quoted = entry.kind === "sent_back" || entry.kind === "reassigned";
  const content = childContent(entry);
  return (
    <li>
      <span className={`history-track ${tone(entry)}`} aria-hidden="true">
        <span />
      </span>
      <div className="history-entry">
        <div className="history-line">
          <div>
            <strong title={entry.actor}>{actor}</strong>
            {summary.startsWith(actor)
              ? summary.slice(actor.length)
              : ` ${summary}`}
          </div>
          <time dateTime={entry.created_at}>{timeOf(entry.created_at)}</time>
        </div>
        {flow && <StatusFlow from={flow.from} to={flow.to} />}
        {entry.kind === "check" && !isLegacyCheck(entry) && (
          <span className={`history-check ${result}`}>
            {result === "passed"
              ? `✓ ${t("scenarioPassed")}: `
              : result === "failed"
                ? `✕ ${t("scenarioFailed")}: `
                : ""}
            {entry.message}
          </span>
        )}
        {reason && (
          <p>
            {t("historyReason")}: {reason}
          </p>
        )}
        {quoted && <blockquote>{entry.message}</blockquote>}
        {(entry.kind === "note" || entry.kind === "decision") && (
          <p>{entry.message}</p>
        )}
        {diffKinds.has(entry.kind) && (
          <DiffView before={before} after={after} />
        )}
        {content && <ChildContent kind={content.kind} lines={content.lines} />}
        {attachments.some((a) => a.activity_id === entry.id) && (
          <div className="history-attachments">
            {attachments
              .filter((a) => a.activity_id === entry.id)
              .map((attachment) => (
                <Thumbnail key={attachment.id} attachment={attachment} />
              ))}
          </div>
        )}
      </div>
    </li>
  );
}

export function ActivityTimeline({
  itemKey,
  attachments = [],
}: {
  itemKey: string;
  attachments?: Attachment[];
}) {
  const [filter, setFilter] = useState<HistoryFilter>("important");
  // Tests combine several kinds, so only decisions can be filtered by the server.
  const serverKind = filter === "decision" ? "&kind=decision" : "";
  const query = useInfiniteQuery({
    queryKey: ["item", itemKey, "activity", serverKind],
    initialPageParam: 0,
    queryFn: ({ pageParam }): Promise<Detail["activity"]> =>
      request(
        `/items/${itemKey}/activity?limit=50&offset=${pageParam}${serverKind}`,
      ),
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 50 ? pages.length * 50 : undefined,
  });
  const entries = (query.data?.pages.flat() ?? []).filter((entry) =>
    matchesFilter(entry, filter),
  );
  // A page may hold nothing this filter shows: keep looking before saying "empty".
  const searching = !entries.length && query.hasNextPage && !query.isError;
  const { fetchNextPage, isFetchingNextPage } = query;
  useEffect(() => {
    if (searching && !isFetchingNextPage) void fetchNextPage();
  }, [searching, isFetchingNextPage, fetchNextPage]);
  const days: { day: string; entries: Entry[] }[] = [];
  for (const entry of entries) {
    const day = dayOf(entry.created_at);
    const last = days.at(-1);
    if (last?.day === day) last.entries.push(entry);
    else days.push({ day, entries: [entry] });
  }
  return (
    <div role="tabpanel" aria-label={t("history")} className="activity-history">
      <fieldset aria-label={t("historyFilter")} className="history-filters">
        {(
          [
            ["important", "historyImportant"],
            ["decision", "historyDecisions"],
            ["check", "historyTests"],
            ["all", "historyAll"],
          ] as const
        ).map(([value, label]) => (
          <button
            type="button"
            key={value}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {t(label)}
          </button>
        ))}
      </fieldset>
      {(query.isPending || searching) && (
        <p role="status">{t("historyLoading")}</p>
      )}
      {query.isError && (
        <p role="alert">
          {t("failed")}{" "}
          <button type="button" onClick={() => void query.refetch()}>
            {t("summaryRetry")}
          </button>
        </p>
      )}
      {!query.isPending && !query.isError && !searching && !entries.length && (
        <p className="history-empty">{t("historyEmpty")}</p>
      )}
      {days.map(({ day, entries: dayEntries }) => (
        <section key={day} className="history-day">
          <h4>{day}</h4>
          <ol className="history-timeline">
            {dayEntries.map((entry) => (
              <Row key={entry.id} entry={entry} attachments={attachments} />
            ))}
          </ol>
        </section>
      ))}
      {query.hasNextPage && (
        <button
          type="button"
          className="history-more"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t("historyMore")}
        </button>
      )}
    </div>
  );
}
