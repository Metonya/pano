import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AgentAvatar } from "@/features/agents/AgentAvatar";
import { agentInfo } from "@/features/agents/agentInfo";
import { t } from "@/lib/i18n";
import { type BoardItem, isAwaitingHuman } from "./types";
import { tokensLabel } from "./usage";

const cardClass = (item: BoardItem) =>
  `board-card ${item.status === "in_progress" ? "working" : ""} ${isAwaitingHuman(item) ? "awaiting" : ""}`;

export function BoardCard({
  item,
  open,
}: Readonly<{
  item: BoardItem;
  open: (item: BoardItem) => void;
}>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, data: { item } });
  return (
    <button
      type="button"
      ref={setNodeRef}
      style={{
        transform: isDragging ? undefined : CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
      }}
      {...attributes}
      {...listeners}
      onClick={(event) => {
        if (!isDragging) {
          event.currentTarget.focus();
          open(item);
        }
      }}
      className={cardClass(item)}
    >
      <CardContents item={item} />
    </button>
  );
}

export function BoardCardOverlay({ item }: Readonly<{ item: BoardItem }>) {
  return (
    <div className={`${cardClass(item)} is-overlay`}>
      <CardContents item={item} />
    </div>
  );
}

function CardContents({ item }: Readonly<{ item: BoardItem }>) {
  const tokens = item.usage?.total_tokens ?? 0;
  return (
    <>
      <div className="board-card-meta">
        <span className="board-card-number">#{item.number}</span>
        {item.priority === "high" && (
          <span className="priority-high">{t("high")}</span>
        )}
        {item.priority === "low" && <span>{t("low")}</span>}
        {isAwaitingHuman(item) && (
          <span className="awaiting-badge">{t("waiting")}</span>
        )}
        {item.status === "done" && !item.seen_at && (
          <span className="unseen" aria-label={t("unseen")} role="img" />
        )}
      </div>
      <div className="card-open">{item.title}</div>
      {(item.assignee || item.criteria_total > 0 || tokens > 0) && (
        <div className="board-card-foot">
          {item.assignee && (
            <span className="assignee" title={item.assignee}>
              <AgentAvatar id={item.assignee} />
              {agentInfo(item.assignee).name}
            </span>
          )}
          {item.criteria_total > 0 && (
            <span className="criteria-progress">
              <span className="track" aria-hidden="true">
                <span
                  style={{
                    width: `${(100 * item.criteria_done) / item.criteria_total}%`,
                  }}
                />
              </span>
              {item.criteria_done}/{item.criteria_total}
            </span>
          )}
          {tokens > 0 && (
            <span className="card-usage" title={t("usageReported")}>
              {tokensLabel(tokens)}
            </span>
          )}
        </div>
      )}
    </>
  );
}
