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
  open,
  onOpenChange,
  act,
  onDelete,
  onSettings,
}: {
  p: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  act: ProjectAction;
  onDelete: (p: Project) => void;
  onSettings: () => void;
}) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
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
        {!p.archived_at && (
          <DropdownMenuItem onSelect={onSettings}>
            {t("projectSettings")}
          </DropdownMenuItem>
        )}
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
