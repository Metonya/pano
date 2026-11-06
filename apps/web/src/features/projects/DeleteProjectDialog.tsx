import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ManagedDialog } from "@/components/ManagedDialog";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { type Project, queryKey, request } from "@/lib/api";
import { t } from "@/lib/i18n";
export function DeleteProjectDialog({
  deleting,
  setDeleting,
  setActionError,
}: {
  deleting: Project | null;
  setDeleting: (p: Project | null) => void;
  setActionError: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState("");
  return (
    <ManagedDialog
      permanentDelete
      describedBy="delete-description"
      open={!!deleting}
      onOpenChange={(open) => {
        if (!open) setDeleting(null);
        setConfirm("");
      }}
    >
      <DialogTitle>{t("deleteTitle")}</DialogTitle>
      <DialogDescription id="delete-description">
        {t("deleteHelp")} {deleting?.name}
      </DialogDescription>
      <label htmlFor="confirm">{t("name")}</label>
      <input
        id="confirm"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      <div className="dialog-actions">
        <button
          type="button"
          onClick={() => {
            setDeleting(null);
            setConfirm("");
          }}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          className="danger"
          disabled={confirm !== deleting?.name}
          onClick={async () => {
            if (!deleting) return;
            try {
              await request(`/projects/${deleting.key}/purge`, {
                confirmName: confirm,
              });
              setDeleting(null);
              setConfirm("");
              await qc.invalidateQueries({ queryKey });
            } catch {
              setActionError(true);
            }
          }}
        >
          {t("delete")}
        </button>
      </div>
    </ManagedDialog>
  );
}
