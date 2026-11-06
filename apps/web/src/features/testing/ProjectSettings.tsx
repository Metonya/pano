import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ManagedDialog } from "@/components/ManagedDialog";
import { DialogTitle } from "@/components/ui/dialog";
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
  const [test, setTest] = useState(Boolean(project.test_column));
  const [ai, setAi] = useState(Boolean(project.ai_can_close));
  const [dod, setDod] = useState(project.dod_md);
  const [destination, setDestination] = useState("");
  const [error, setError] = useState(false);
  return (
    <ManagedDialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      dirty={
        test !== Boolean(project.test_column) ||
        ai !== Boolean(project.ai_can_close) ||
        dod !== project.dod_md
      }
    >
      <DialogTitle>{t("projectSettings")}</DialogTitle>
      <form
        className="test-panel"
        onSubmit={(e) => {
          e.preventDefault();
          void request(
            `/projects/${project.key}`,
            {
              test_column: test,
              ai_can_close: ai,
              dod_md: dod,
              ...(!test && project.test_column && testCount
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
        <label>
          <input
            type="checkbox"
            checked={test}
            onChange={(e) => setTest(e.target.checked)}
          />{" "}
          {t("testColumn")}
        </label>
        <label>
          <input
            type="checkbox"
            checked={ai}
            onChange={(e) => setAi(e.target.checked)}
          />{" "}
          {t("aiCanClose")}
        </label>
        {!test && !ai && <p>{t("invalidSettings")}</p>}
        {!test && !!project.test_column && testCount > 0 && (
          <label>
            {t("testDestination")}
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              <option value="">—</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </label>
        )}
        <label>
          {t("definitionOfDone")}
          <textarea value={dod} onChange={(e) => setDod(e.target.value)} />
        </label>
        <button
          type="submit"
          disabled={
            (!test && !ai) ||
            (!test && !!project.test_column && testCount > 0 && !destination)
          }
        >
          {t("save")}
        </button>
        <button
          type="button"
          onClick={() =>
            void request(`/projects/${project.key}/archive`, { archived: true })
              .then(async () => {
                await qc.invalidateQueries({ queryKey: ["projects"] });
                close();
              })
              .catch(() => setError(true))
          }
        >
          {t("archiveAction")}
        </button>
        {error && <p role="alert">{t("failed")}</p>}
      </form>
    </ManagedDialog>
  );
}
