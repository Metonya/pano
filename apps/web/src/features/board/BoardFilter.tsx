import { t } from "@/lib/i18n";
import { agentName, type BoardItem } from "./types";
export type Filters = {
  search: string;
  assignee: string;
  priority: string;
  cancelled: boolean;
};
export function BoardFilter({
  items,
  filters,
  setFilters,
}: {
  items: BoardItem[];
  filters: Filters;
  setFilters: (filters: Filters) => void;
}) {
  return (
    <details className="board-filter">
      <summary>{t("filter")}</summary>
      <div>
        <label>
          {t("assignee")}
          <select
            value={filters.assignee}
            onChange={(e) =>
              setFilters({ ...filters, assignee: e.target.value })
            }
          >
            <option value="">{t("all")}</option>
            {[
              ...new Set(
                items.map((i) => i.assignee).filter((x): x is string => !!x),
              ),
            ].map((a) => (
              <option key={a} value={a}>
                {agentName(a)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("priority")}
          <select
            value={filters.priority}
            onChange={(e) =>
              setFilters({ ...filters, priority: e.target.value })
            }
          >
            <option value="">{t("all")}</option>
            <option value="high">{t("high")}</option>
            <option value="medium">{t("medium")}</option>
            <option value="low">{t("low")}</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={filters.cancelled}
            onChange={(e) =>
              setFilters({ ...filters, cancelled: e.target.checked })
            }
          />{" "}
          {t("showCancelled")}
        </label>
      </div>
    </details>
  );
}
