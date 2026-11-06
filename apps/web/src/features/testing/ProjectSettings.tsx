import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ManagedDialog } from "@/components/ManagedDialog";
import { Switch } from "@/components/Switch";
import { DialogClose, DialogTitle } from "@/components/ui/dialog";
import { type Project, request } from "@/lib/api";
import { t } from "@/lib/i18n";

export function ProjectSettings({
  project,
  testCount,
  close,
}: {
  project: Project;
  testCount: number;
  close: () => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [test, setTest] = useState(Boolean(project.test_column));
  const [ai, setAi] = useState(Boolean(project.ai_can_close));
  const [dod, setDod] = useState(project.dod_md);
  const [destination, setDestination] = useState("");
  const [error, setError] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const archiveButton = useRef<HTMLButtonElement>(null);
  const keepButton = useRef<HTMLButtonElement>(null);
  const opened = useRef(false);
  useEffect(() => {
    if (confirmArchive) keepButton.current?.focus();
    // Skip the first render: the window itself takes focus on open.
    else if (opened.current) archiveButton.current?.focus();
    opened.current = true;
  }, [confirmArchive]);
  const movesTestItems = !test && !!project.test_column && testCount > 0;
  const canSave =
    !!name.trim() && (test || ai) && (!movesTestItems || !!destination);
  return (
    <ManagedDialog
      open
      className="project-settings"
      focusContent
      onOpenChange={(open) => {
        if (!open) close();
      }}
      dirty={
        name !== project.name ||
        description !== project.description ||
        test !== Boolean(project.test_column) ||
        ai !== Boolean(project.ai_can_close) ||
        dod !== project.dod_md
      }
    >
      <DialogTitle>{t("projectSettings")}</DialogTitle>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSave || confirmArchive) return;
          void request(
            `/projects/${project.key}`,
            {
              name: name.trim(),
              description: description.trim(),
              test_column: test,
              ai_can_close: ai,
              dod_md: dod,
              ...(movesTestItems
                ? { test_items_destination: destination }
                : {}),
            },
            "PATCH",
          )
            .then(async () => {
              await Promise.all([
                qc.invalidateQueries({ queryKey: ["projects"] }),
                qc.invalidateQueries({ queryKey: ["board"] }),
              ]);
              close();
            })
            .catch(() => setError(true));
        }}
      >
        <div className="project-settings-body">
          <div className="project-settings-fields">
            <div className="project-settings-field">
              <label htmlFor="project-name">{t("name")}</label>
              <input
                id="project-name"
                value={name}
                aria-invalid={!name.trim()}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="project-settings-field">
              <label htmlFor="project-key">{t("projectKeyLabel")}</label>
              <input
                id="project-key"
                value={project.key}
                readOnly
                aria-describedby="project-key-help"
              />
              <small id="project-key-help">{t("projectKeyHelp")}</small>
            </div>
          </div>
          <div className="project-settings-field">
            <label htmlFor="project-description">{t("description")}</label>
            <textarea
              id="project-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="project-settings-box">
            <div className="project-settings-row">
              <div>
                <span id="project-test" className="project-settings-label">
                  {t("testColumn")}
                </span>
                <small id="project-test-help">{t("testColumnHelp")}</small>
              </div>
              <Switch
                checked={test}
                onChange={setTest}
                labelledBy="project-test"
                describedBy="project-test-help"
              />
            </div>
            {movesTestItems && (
              <div className="project-settings-row">
                <label htmlFor="project-destination">
                  {t("testDestination")}
                </label>
                <select
                  id="project-destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                >
                  <option value="">—</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            )}
            <div className="project-settings-row">
              <div>
                <span id="project-ai" className="project-settings-label">
                  {t("aiCanClose")}
                </span>
                <small id="project-ai-help">{t("aiCanCloseHelp")}</small>
              </div>
              <Switch
                checked={ai}
                onChange={setAi}
                labelledBy="project-ai"
                describedBy="project-ai-help"
              />
            </div>
          </div>
          {!test && !ai && (
            <p className="project-settings-warning" role="alert">
              {t("invalidSettings")}
            </p>
          )}
          <div className="project-settings-field">
            <label htmlFor="project-dod">{t("definitionOfDone")}</label>
            <textarea
              id="project-dod"
              rows={4}
              value={dod}
              onChange={(e) => setDod(e.target.value)}
            />
          </div>
          {error && (
            <p className="project-settings-warning" role="alert">
              {t("failed")}
            </p>
          )}
        </div>
        {confirmArchive ? (
          <fieldset
            className="project-settings-archive"
            aria-label={t("archiveQuestion")}
          >
            <p>
              <strong>{t("archiveQuestion")}</strong> {t("archiveHelp")}
            </p>
            <div className="dialog-actions">
              <button
                type="button"
                ref={keepButton}
                onClick={() => setConfirmArchive(false)}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                className="danger"
                onClick={() =>
                  void request(`/projects/${project.key}/archive`, {
                    archived: true,
                  })
                    .then(async () => {
                      await qc.invalidateQueries({ queryKey: ["projects"] });
                      close();
                      navigate("/");
                    })
                    .catch(() => setError(true))
                }
              >
                {t("archiveAction")}
              </button>
            </div>
          </fieldset>
        ) : (
          <div className="dialog-actions project-settings-footer">
            <button
              type="button"
              ref={archiveButton}
              className="danger"
              onClick={() => setConfirmArchive(true)}
            >
              {t("archiveProject")}
            </button>
            <DialogClose asChild>
              <button type="button">{t("cancel")}</button>
            </DialogClose>
            <button className="primary" type="submit" disabled={!canSave}>
              {t("save")}
            </button>
          </div>
        )}
      </form>
    </ManagedDialog>
  );
}
