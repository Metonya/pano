import { Plus, Star } from "lucide-react";
import { createPortal } from "react-dom";
import type { Project } from "@/lib/api";
import { t } from "@/lib/i18n";
import { BoardFilter, type Filters } from "./BoardFilter";
import type { BoardItem } from "./types";
export function BoardToolbar({
  project,
  items,
  filters,
  setFilters,
  onStar,
  onCreate,
}: {
  project: Project;
  items: BoardItem[];
  filters: Filters;
  setFilters: (filters: Filters) => void;
  onStar: () => void;
  onCreate: () => void;
}) {
  const target = document.getElementById("page-toolbar-actions");
  if (!target) return null;
  return createPortal(
    <div className="board-actions">
      <button
        type="button"
        className={`icon star ${project.starred ? "selected" : ""}`}
        aria-label={project.starred ? t("unstar") : t("star")}
        onClick={onStar}
      >
        <Star size={18} fill={project.starred ? "currentColor" : "none"} />
      </button>
      <BoardFilter items={items} filters={filters} setFilters={setFilters} />
      <input
        className="board-search"
        aria-label={t("search")}
        placeholder={t("search")}
        value={filters.search}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
      />
      <button
        type="button"
        className="primary"
        aria-label={t("newItem")}
        onClick={onCreate}
      >
        <Plus size={16} />
        <span>{t("newItem")}</span>
      </button>
    </div>,
    target,
  );
}
