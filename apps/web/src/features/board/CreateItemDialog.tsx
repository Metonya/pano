import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ManagedDialog } from "@/components/ManagedDialog";
import { DialogTitle } from "@/components/ui/dialog";
import { assigneeKeys } from "@/features/agents/agentInfo";
import { request } from "@/lib/api";
import { t } from "@/lib/i18n";
import {
  AssigneeProperty,
  type Priority,
  PriorityProperty,
} from "./ItemProperty";
import type { BoardItem } from "./types";

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
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assignee, setAssignee] = useState("");
  const [criteria, setCriteria] = useState("");
  const [error, setError] = useState(false);
  function reset() {
    setTitle("");
    setBody("");
    setPriority("medium");
    setAssignee("");
    setCriteria("");
    setError(false);
    close();
  }
  const actors = assigneeKeys(
    (qc.getQueryData<BoardItem[]>(["board", projectKey]) ?? []).map(
      (i) => i.assignee,
    ),
    { includeKnown: true, includeUser: true },
  );
  return (
    <ManagedDialog
      className="project-settings create-item"
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
      }}
      dirty={
        !!title || !!body || !!assignee || !!criteria || priority !== "medium"
      }
    >
      <DialogTitle>{t("newItem")}</DialogTitle>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await request(`/projects/${projectKey}/items`, {
              title: title.trim(),
              priority,
              ...(body.trim() ? { body_md: body.trimEnd() } : {}),
              ...(assignee ? { assignee } : {}),
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
        <div className="project-settings-body">
          <div className="project-settings-field">
            <label htmlFor="item-title">{t("title")}</label>
            <input
              id="item-title"
              required
              placeholder={t("itemTitlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="project-settings-field">
            <label htmlFor="item-body">{t("description")}</label>
            <textarea
              id="item-body"
              rows={3}
              placeholder={t("itemDescriptionPlaceholder")}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="project-settings-fields">
            <PriorityProperty field value={priority} onChange={setPriority} />
            <AssigneeProperty
              field
              assignee={assignee || null}
              value={assignee}
              actors={actors}
              onChange={setAssignee}
            />
          </div>
          <div className="project-settings-field">
            <div className="create-item-label">
              <label htmlFor="item-criteria">{t("criteria")}</label>
              <small id="item-criteria-help">{t("criteriaOnePerLine")}</small>
            </div>
            <textarea
              id="item-criteria"
              rows={3}
              aria-describedby="item-criteria-help"
              placeholder={t("itemCriteriaPlaceholder")}
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
            />
          </div>
        </div>
        <div className="dialog-actions project-settings-footer">
          {error && (
            <p role="alert" className="error">
              {t("failed")}
            </p>
          )}
          <button type="submit" className="primary" disabled={!title.trim()}>
            {t("create")}
          </button>
        </div>
      </form>
    </ManagedDialog>
  );
}
