import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { activityText } from "@/features/board/format";
import {
  agentName,
  type Detail,
  labels,
  type Status,
} from "@/features/board/types";
import { authHeaders, date, request } from "@/lib/api";
import { t } from "@/lib/i18n";
import { checkResult } from "./checkResult";
import { DiffView, parseSnapshot } from "./DiffView";
import "./history.css";

type Attachment = { id: string; activity_id: string | null; file_name: string };
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

export function ActivityTimeline({
  itemKey,
  attachments = [],
}: {
  itemKey: string;
  attachments?: Attachment[];
}) {
  const [filter, setFilter] = useState<"all" | "decision" | "check">("all");
  const query = useInfiniteQuery({
    queryKey: ["item", itemKey, "activity", filter],
    initialPageParam: 0,
    queryFn: ({ pageParam }): Promise<Detail["activity"]> =>
      request(
        `/items/${itemKey}/activity?limit=50&offset=${pageParam}${filter === "all" ? "" : `&kind=${filter}`}`,
      ),
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 50 ? pages.length * 50 : undefined,
  });
  const entries = query.data?.pages.flat() ?? [];
  return (
    <div role="tabpanel" aria-label={t("history")} className="activity-history">
      <fieldset aria-label={t("historyFilter")} className="history-filters">
        {(
          [
            ["all", "historyAll"],
            ["decision", "historyDecisions"],
            ["check", "historyTests"],
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
        <p>{t("historyEmpty")}</p>
      )}
      <ol className="history-timeline">
        {entries.map((entry) => {
          const before = parseSnapshot(entry.before_json),
            after = parseSnapshot(entry.after_json);
          const actor = agentName(entry.actor);
          const summary = activityText(entry);
          const result = checkResult(entry.message, after);
          const previousStatus =
            typeof before.status === "string" && before.status in labels
              ? labels[before.status as Status]
              : null;
          const reason =
            typeof after.reason === "string" ? after.reason : entry.message;
          const showReason =
            reason &&
            ![
              "Item updated",
              "Item created",
              "Item seen",
              "Cancellation undone",
            ].includes(reason) &&
            !["decision", "note", "check", "sent_back", "reassigned"].includes(
              entry.kind,
            );
          return (
            <li key={entry.id}>
              <span className="history-track" aria-hidden="true">
                <span />
              </span>
              <div className="history-entry">
                <div>
                  <strong title={entry.actor}>{actor}</strong>
                  {summary.startsWith(actor)
                    ? summary.slice(actor.length)
                    : ` ${summary}`}
                </div>
                <time dateTime={entry.created_at}>
                  {date(entry.created_at)}
                </time>
                {entry.kind === "check" && (
                  <span className={`history-check ${result}`}>
                    {result === "passed"
                      ? "✓ "
                      : result === "failed"
                        ? "✕ "
                        : "? "}
                    {t(
                      result === "passed"
                        ? "scenarioPassed"
                        : result === "failed"
                          ? "scenarioFailed"
                          : "historyUnknown",
                    )}
                    : {entry.message}
                  </span>
                )}
                {entry.kind === "cancelled" && previousStatus && (
                  <p>
                    {t("historyPreviousStatus")}: {previousStatus}
                  </p>
                )}
                {showReason && (
                  <p>
                    {t("historyReason")}: {reason}
                  </p>
                )}
                {(entry.kind === "note" || entry.kind === "decision") && (
                  <p>{entry.message}</p>
                )}
                {(entry.kind === "edited" ||
                  entry.kind.startsWith("criterion_")) && (
                  <DiffView
                    before={before}
                    after={after}
                    criterion={entry.kind.startsWith("criterion_")}
                  />
                )}
                <div className="history-attachments">
                  {attachments
                    .filter((a) => a.activity_id === entry.id)
                    .map((attachment) => (
                      <Thumbnail key={attachment.id} attachment={attachment} />
                    ))}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {query.hasNextPage && (
        <button
          type="button"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t("historyMore")}
        </button>
      )}
    </div>
  );
}
