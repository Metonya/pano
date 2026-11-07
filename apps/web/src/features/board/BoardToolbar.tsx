import { Plus, Search, Settings, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  onSettings,
}: {
  project: Project;
  items: BoardItem[];
  filters: Filters;
  setFilters: (filters: Filters) => void;
  onStar: () => void;
  onCreate: () => void;
  onSettings: () => void;
}) {
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const target = document.getElementById("page-toolbar-actions");
  const searchVisible = searching || !!filters.search;
  useEffect(() => {
    if (target && searchVisible) searchRef.current?.focus();
  }, [searchVisible, target]);
  if (!target) return null;
  const clearSearch = () => {
    setFilters({ ...filters, search: "" });
    setSearching(false);
  };
  return createPortal(
    <div className="board-actions" role="toolbar" aria-label={project.name}>
      <button
        type="button"
        className={`toolbar-icon board-star ${project.starred ? "is-starred" : ""}`}
        aria-label={project.starred ? t("unstar") : t("star")}
        aria-pressed={!!project.starred}
        onClick={onStar}
      >
        <Star
          size={18}
          fill={project.starred ? "currentColor" : "none"}
          aria-hidden="true"
        />
      </button>
      <span className="board-actions-spacer" />
      <BoardFilter items={items} filters={filters} setFilters={setFilters} />
      {searching || filters.search ? (
        <span className="board-search">
          <Search size={15} aria-hidden="true" />
          <input
            ref={searchRef}
            aria-label={t("search")}
            placeholder={t("search")}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onBlur={() => {
              if (!filters.search) setSearching(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") clearSearch();
            }}
          />
          {!!filters.search && (
            <button type="button" aria-label={t("close")} onClick={clearSearch}>
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </span>
      ) : (
        <button
          type="button"
          className="toolbar-icon"
          aria-label={t("search")}
          onClick={() => setSearching(true)}
        >
          <Search size={18} aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        className="toolbar-icon"
        aria-label={t("projectSettings")}
        onClick={onSettings}
      >
        <Settings size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="primary board-new"
        aria-label={t("newItem")}
        onClick={onCreate}
      >
        <Plus size={16} aria-hidden="true" />
        <span>{t("newItem")}</span>
      </button>
    </div>,
    target,
  );
}
