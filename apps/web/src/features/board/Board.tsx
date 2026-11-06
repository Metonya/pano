import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "@/components/States";
import { type Project, queryKey, request } from "@/lib/api";
import { t } from "@/lib/i18n";
import { BoardCardOverlay } from "./BoardCard";
import { BoardColumn } from "./BoardColumn";
import { BoardSummary } from "./BoardSummary";
import { BoardToolbar } from "./BoardToolbar";
import { CreateItemDialog } from "./CreateItemDialog";
import { ItemDialog } from "./ItemDialog";
import { boardKeyboardCoordinates } from "./keyboard";
import { type BoardItem, labels, type Status, sortItems } from "./types";

export function Board({ projects }: { projects: Project[] }) {
  const { key = "" } = useParams();
  const project = projects.find((p) => p.key === key);
  const qc = useQueryClient();
  const opener = useRef<HTMLElement | null>(null);
  const [dragged, setDragged] = useState<BoardItem | null>(null);
  const [selected, setSelected] = useState<BoardItem | null>(null);
  const [create, setCreate] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    assignee: "",
    priority: "",
    cancelled: false,
  });
  const [mobileStatus, setMobileStatus] = useState<Status>("backlog");
  const [error, setError] = useState(false);
  const boardKey = ["board", key];
  const query = useQuery<BoardItem[]>({
    queryKey: boardKey,
    queryFn: async () => {
      const [items, cancelledItems] = await Promise.all([
        request(`/projects/${key}/items`),
        request(`/projects/${key}/items?status=cancelled`),
      ]);
      return [...items, ...cancelledItems];
    },
    enabled: !!key,
  });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: boardKeyboardCoordinates,
    }),
  );
  const statuses: Status[] = project?.test_column
    ? ["backlog", "in_progress", "test", "done"]
    : ["backlog", "in_progress", "done"];
  const all = query.data ?? [];
  const shown = all.filter(
    (i) =>
      (filters.cancelled || i.status !== "cancelled") &&
      (!filters.assignee || i.assignee === filters.assignee) &&
      (!filters.priority || i.priority === filters.priority) &&
      i.title
        .toLocaleLowerCase("tr")
        .includes(filters.search.toLocaleLowerCase("tr")),
  );
  function open(item: BoardItem) {
    opener.current = document.activeElement as HTMLElement;
    setSelected(item);
    if (item.status === "done" && !item.seen_at)
      void request(`/items/${key}-${item.number}/seen`, {})
        .then(() => qc.invalidateQueries({ queryKey: boardKey }))
        .catch(() => setError(true));
  }
  async function move(e: DragEndEvent) {
    if (!e.over || !query.data) return;
    const item = all.find((i) => i.id === e.active.id);
    if (!item) return;
    const target = all.find((i) => i.id === e.over?.id);
    const status = (target?.status ?? e.over.id) as Status;
    if (!statuses.includes(status)) return;
    const group = sortItems(
      all.filter(
        (i) =>
          i.status === status &&
          i.id !== item.id &&
          i.priority === item.priority,
      ),
    );
    const index =
      target && target.priority === item.priority
        ? group.findIndex((i) => i.id === target.id)
        : group.length;
    const before = group[index - 1]?.position;
    const after = group[index]?.position;
    const position =
      before === undefined
        ? (after ?? 1) - 1
        : after === undefined
          ? before + 1
          : (before + after) / 2;
    const previous = query.data;
    await qc.cancelQueries({ queryKey: boardKey });
    qc.setQueryData(
      boardKey,
      previous.map((i) => (i.id === item.id ? { ...i, status, position } : i)),
    );
    try {
      await request(`/items/${key}-${item.number}/move`, { status, position });
      setError(false);
    } catch {
      qc.setQueryData(boardKey, previous);
      setError(true);
    } finally {
      void qc.invalidateQueries({ queryKey: boardKey });
    }
  }
  if (query.isPending) return <LoadingState />;
  if (query.isError || !project)
    return <ErrorState retry={() => void query.refetch()} />;
  return (
    <div className="board">
      <BoardToolbar
        project={project}
        items={all}
        filters={filters}
        setFilters={setFilters}
        onCreate={() => setCreate(true)}
        onStar={() => {
          void request(`/projects/${key}/star`, { starred: !project.starred })
            .then(() => qc.invalidateQueries({ queryKey }))
            .catch(() => setError(true));
        }}
      />
      <BoardSummary items={all} project={project} />
      {error && (
        <div role="alert" className="notice">
          {t("failed")}
        </div>
      )}
      {!all.length ? (
        <div className="state">
          <h2>{t("noItems")}</h2>
          <p>{t("noItemsHelp")}</p>
        </div>
      ) : (
        <>
          <div
            className="mobile-columns"
            role="tablist"
            aria-label={t("status")}
          >
            {statuses.map((s) => (
              <button
                type="button"
                role="tab"
                aria-selected={mobileStatus === s}
                key={s}
                onClick={() => setMobileStatus(s)}
              >
                <b>{shown.filter((i) => i.status === s).length}</b>
                {labels[s]}
              </button>
            ))}
          </div>
          <DndContext
            sensors={sensors}
            onDragStart={(e) =>
              setDragged(all.find((i) => i.id === e.active.id) ?? null)
            }
            onDragCancel={() => setDragged(null)}
            onDragEnd={(e) => {
              setDragged(null);
              void move(e);
            }}
          >
            <div className="board-columns">
              {statuses.map((s) => (
                <BoardColumn
                  key={s}
                  status={s}
                  mobileActive={mobileStatus === s}
                  items={sortItems(shown.filter((i) => i.status === s))}
                  open={open}
                />
              ))}
            </div>
            <DragOverlay dropAnimation={null}>
              {dragged && <BoardCardOverlay item={dragged} />}
            </DragOverlay>
          </DndContext>
          {filters.cancelled && shown.some((i) => i.status === "cancelled") && (
            <div>
              <h2>{labels.cancelled}</h2>
              {sortItems(shown.filter((i) => i.status === "cancelled")).map(
                (i) => (
                  <button type="button" key={i.id} onClick={() => open(i)}>
                    #{i.number} {i.title}
                  </button>
                ),
              )}
            </div>
          )}
        </>
      )}
      <CreateItemDialog
        projectKey={key}
        open={create}
        close={() => setCreate(false)}
      />
      <ItemDialog
        key={selected?.id ?? "closed"}
        projectKey={key}
        item={selected}
        close={() => {
          setSelected(null);
          setTimeout(() => opener.current?.focus(), 0);
        }}
        statuses={statuses}
      />
    </div>
  );
}
