import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project, ProjectAction } from "@/lib/api";
import { t } from "@/lib/i18n";
export function ProjectMenu({
  p,
  act,
  onDelete,
}: {
  p: Project;
  act: ProjectAction;
  onDelete: (p: Project) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="icon"
          aria-label={`${t("actions")} ${p.name}`}
        >
          <MoreHorizontal size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="menu-content">
        <DropdownMenuItem onSelect={() => act(p, "star", !p.starred)}>
          {t(p.starred ? "unstar" : "star")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => act(p, "archive", !p.archived_at)}>
          {t(p.archived_at ? "restore" : "archiveAction")}
        </DropdownMenuItem>
        {p.archived_at && (
          <DropdownMenuItem
            onSelect={() => {
              onDelete(p);
            }}
          >
            {t("delete")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
