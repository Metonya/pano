import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { t } from "@/lib/i18n";
import { agentName, type BoardItem } from "./types";
export function BoardCard({
  item,
  open,
}: {
  item: BoardItem;
  open: (item: BoardItem) => void;
}) {
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
      className={`board-card ${item.status === "in_progress" ? "working" : ""}`}
    >
      <CardContents item={item} />
    </button>
  );
}

export function BoardCardOverlay({ item }: { item: BoardItem }) {
  return (
    <div
      className={`board-card ${item.status === "in_progress" ? "working" : ""}`}
    >
      <CardContents item={item} />
    </div>
  );
}
function CardContents({ item }: { item: BoardItem }) {
  return (
    <>
      <div className="board-card-meta">
        <span>#{item.number}</span>
        {item.priority === "high" && (
          <span className="priority-high">{t("high")}</span>
        )}
        {item.priority === "low" && <span>{t("low")}</span>}
        {item.status === "done" && !item.seen_at && (
          <span className="unseen" aria-label={t("unseen")} role="img" />
        )}
      </div>
      <div className="card-open">{item.title}</div>
      {(item.assignee || item.criteria_total > 0) && (
        <div className="board-card-foot">
          {item.assignee && (
            <span className="assignee">{agentName(item.assignee)}</span>
          )}
          {item.criteria_total > 0 && (
            <span className="criteria-progress">
              <span className="track">
                <span
                  style={{
                    width: `${(100 * item.criteria_done) / item.criteria_total}%`,
                  }}
                />
              </span>
              {item.criteria_done}/{item.criteria_total}
            </span>
          )}
        </div>
      )}
    </>
  );
}
