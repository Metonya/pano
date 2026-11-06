import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import { t } from "@/lib/i18n";
import { BoardCard } from "./BoardCard";
import { type BoardItem, labels, type Status } from "./types";
export function BoardColumn({
  status,
  items,
  open,
  mobileActive,
}: {
  status: Status;
  items: BoardItem[];
  open: (item: BoardItem) => void;
  mobileActive: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: status });
  const [limit, setLimit] = useState(30);
  return (
    <section
      className={`board-column ${mobileActive ? "mobile-active" : ""}`}
      ref={setNodeRef}
    >
      <h2>
        {labels[status]} <span>{items.length}</span>
      </h2>
      <div
        className="board-column-scroll"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight - el.scrollTop - el.clientHeight < 120)
            setLimit((n) => n + 30);
        }}
      >
        <SortableContext
          items={items.slice(0, limit).map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.slice(0, limit).map((item) => (
            <BoardCard key={item.id} item={item} open={open} />
          ))}
        </SortableContext>
        {items.length > limit && (
          <button type="button" onClick={() => setLimit((n) => n + 30)}>
            {t("more")}
          </button>
        )}
      </div>
    </section>
  );
}
