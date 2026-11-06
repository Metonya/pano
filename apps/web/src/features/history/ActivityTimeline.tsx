import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { activityText } from "@/features/board/format";
import { agentName, type Detail } from "@/features/board/types";
import { authHeaders, request } from "@/lib/api";
import { language, t } from "@/lib/i18n";
import { checkResult } from "./checkResult";
import { DiffView, parseSnapshot } from "./DiffView";
import { isImportant, isLegacyCheck, StatusFlow, statusFlow } from "./entry";
import "./history.css";

type Attachment = { id: string; activity_id: string | null; file_name: string };
type Entry = Detail["activity"][number];
type Filter = "important" | "decision" | "check" | "all";

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
  return entry.kind === "decision" ? "decision" : "plain";
}

const silentMessages = [
  "Item updated",
  "Item created",
  "Item seen",
  "Item approved",
  "Cancellation undone",
];

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
  const reason =
    typeof after.reason === "string" ? after.reason : entry.message;
  const quoted = entry.kind === "sent_back" || entry.kind === "reassigned";
  const showReason =
    reason &&
    !silentMessages.includes(reason) &&
    !quoted &&
    !["decision", "note", "check"].includes(entry.kind) &&
    !isLegacyCheck(entry);
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
        {showReason && (
          <p>
            {t("historyReason")}: {reason}
          </p>
        )}
        {quoted && <blockquote>{entry.message}</blockquote>}
        {(entry.kind === "note" || entry.kind === "decision") && (
          <p>{entry.message}</p>
        )}
        {(entry.kind === "edited" || entry.kind.startsWith("criterion_")) &&
          entry.kind !== "criterion_checked" && (
            <DiffView
              before={before}
              after={after}
              criterion={entry.kind.startsWith("criterion_")}
            />
          )}
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
  const [filter, setFilter] = useState<Filter>("important");
  const serverKind =
    filter === "decision" || filter === "check" ? `&kind=${filter}` : "";
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
  const entries = (query.data?.pages.flat() ?? []).filter(
    (entry) =>
      filter === "all" ||
      (filter === "important" ? isImportant(entry) : !isLegacyCheck(entry)),
  );
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
      {query.isPending && <p role="status">{t("historyLoading")}</p>}
      {query.isError && (
        <p role="alert">
          {t("failed")}{" "}
          <button type="button" onClick={() => void query.refetch()}>
            {t("summaryRetry")}
          </button>
        </p>
      )}
      {!query.isPending && !query.isError && !entries.length && (
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
