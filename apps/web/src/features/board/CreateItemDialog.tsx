import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ManagedDialog } from "@/components/ManagedDialog";
import { DialogTitle } from "@/components/ui/dialog";
import { request } from "@/lib/api";
import { t } from "@/lib/i18n";
export function CreateItemDialog({
  projectKey,
  open,
  close,
}: Readonly<{
  projectKey: string;
  open: boolean;
  close: () => void;
}>) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [criteria, setCriteria] = useState("");
  const [error, setError] = useState(false);
  function reset() {
    setTitle("");
    setPriority("medium");
    setCriteria("");
    setError(false);
    close();
  }
  return (
    <ManagedDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
      }}
      dirty={!!title || !!criteria || priority !== "medium"}
    >
      <DialogTitle>{t("newItem")}</DialogTitle>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await request(`/projects/${projectKey}/items`, {
              title: title.trim(),
              priority,
              criteria: criteria
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            });
            await qc.invalidateQueries({ queryKey: ["board"] });
            reset();
          } catch {
            setError(true);
          }
        }}
      >
        <label htmlFor="item-title">{t("title")}</label>
        <input
          id="item-title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label htmlFor="item-priority">{t("priority")}</label>
        <select
          id="item-priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="high">{t("high")}</option>
          <option value="medium">{t("medium")}</option>
          <option value="low">{t("low")}</option>
        </select>
        <label htmlFor="item-criteria">{t("criteriaLines")}</label>
        <textarea
          id="item-criteria"
          value={criteria}
          onChange={(e) => setCriteria(e.target.value)}
        />
        {error && (
          <p role="alert" className="error">
            {t("failed")}
          </p>
        )}
        <div className="dialog-actions">
          <button type="submit" className="primary" disabled={!title.trim()}>
            {t("create")}
          </button>
        </div>
      </form>
    </ManagedDialog>
  );
}
