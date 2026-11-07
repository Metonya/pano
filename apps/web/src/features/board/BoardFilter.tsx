import { ListFilter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AgentOption } from "@/features/agents/AgentAvatar";
import { assigneeKeys, UNASSIGNED_FILTER } from "@/features/agents/agentInfo";
import { t } from "@/lib/i18n";
import type { BoardItem } from "./types";

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
}: Readonly<{
  items: BoardItem[];
  filters: Filters;
  setFilters: (filters: Filters) => void;
}>) {
  const active =
    Number(!!filters.assignee) +
    Number(!!filters.priority) +
    Number(filters.cancelled);
  const assignees = assigneeKeys(items.map((i) => i.assignee));
  // Selecting keeps the menu open so several filters can be set in one go.
  const stayOpen = (event: Event) => event.preventDefault();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`toolbar-icon ${active ? "is-active" : ""}`}
          aria-label={active ? `${t("filter")}: ${active}` : t("filter")}
        >
          <ListFilter size={18} aria-hidden="true" />
          {!!active && <span className="toolbar-badge">{active}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="menu-content" align="end">
        <DropdownMenuLabel className="menu-label">
          {t("assignee")}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={filters.assignee}
          onValueChange={(assignee) => setFilters({ ...filters, assignee })}
        >
          <DropdownMenuRadioItem value="" onSelect={stayOpen}>
            {t("all")}
          </DropdownMenuRadioItem>
          {items.some((i) => !i.assignee) && (
            <DropdownMenuRadioItem
              value={UNASSIGNED_FILTER}
              onSelect={stayOpen}
            >
              {t("unassigned")}
            </DropdownMenuRadioItem>
          )}
          {assignees.map((a) => (
            <DropdownMenuRadioItem key={a} value={a} onSelect={stayOpen}>
              <AgentOption id={a} />
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="menu-label">
          {t("priority")}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={filters.priority}
          onValueChange={(priority) => setFilters({ ...filters, priority })}
        >
          {(["", "high", "medium", "low"] as const).map((p) => (
            <DropdownMenuRadioItem key={p} value={p} onSelect={stayOpen}>
              {t(p || "all")}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={filters.cancelled}
          onSelect={stayOpen}
          onCheckedChange={(cancelled) =>
            setFilters({ ...filters, cancelled: !!cancelled })
          }
        >
          {t("showCancelled")}
        </DropdownMenuCheckboxItem>
        {!!active && (
          <DropdownMenuItem
            onSelect={() =>
              setFilters({
                ...filters,
                assignee: "",
                priority: "",
                cancelled: false,
              })
            }
          >
            {t("filterClear")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
