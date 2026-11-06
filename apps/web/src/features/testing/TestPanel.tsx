import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Detail } from "@/features/board/types";
import { authHeaders, request } from "@/lib/api";
import { t } from "@/lib/i18n";
import "./testing.css";

export function TestPanel({
  itemKey,
  detail,
  onDone,
  onDirty,
}: {
  itemKey: string;
  detail: Detail;
  onDone: () => void;
  onDirty: (dirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [action, setAction] = useState<"send-back" | "reassign" | null>(null);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    onDirty(!!(note || steps || expected || file));
  }, [note, steps, expected, file, onDirty]);
  async function change(path: string, data: object, method = "POST") {
    await request(path, data, method);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["item", itemKey] }),
      qc.invalidateQueries({ queryKey: ["board"] }),
      qc.invalidateQueries({ queryKey: ["projects"] }),
    ]);
  }
  function selectFile(candidate: File | undefined) {
    if (!candidate) return;
    if (
      !["image/png", "image/jpeg"].includes(candidate.type) ||
      candidate.size > 10 * 1024 * 1024
    ) {
      setError(t("attachmentInvalid"));
      return;
    }
    setError("");
    setFile(candidate);
  }
  async function submitAction() {
    setBusy(true);
    setError("");
    try {
      let attachmentIds: string[] = [];
      if (action === "send-back" && file) {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch(`/api/v1/items/${itemKey}/attachments`, {
          method: "POST",
          headers: { ...authHeaders(), "X-Pano-Actor": "mert" },
          body: form,
        });
        if (!response.ok) throw new Error("upload");
        const uploaded = await response.json();
        attachmentIds = [uploaded.id];
      }
      await change(`/items/${itemKey}/${action}`, {
        note,
        ...(attachmentIds.length ? { attachmentIds } : {}),
      });
      onDone();
    } catch {
      setError(t("failed"));
    } finally {
      setBusy(false);
    }
  }
  const failed = detail.scenarios.some((s) => s.result === "failed");
  return (
    <section className="test-panel">
      <h3>{t("whatChanged")}</h3>
      <div className="markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {detail.what_changed_md}
        </ReactMarkdown>
      </div>
      <h3>{t("howToTest")}</h3>
      <div className="markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {detail.how_to_test_md}
        </ReactMarkdown>
      </div>
      <h3>{t("scenarios")}</h3>
      {detail.scenarios.map((s) => (
        <div className="test-scenario" key={s.id}>
          <div>
            {s.steps_md}
            <br />
            {s.expected_md}
          </div>
          <select
            aria-label={s.steps_md}
            value={s.result}
            onChange={(e) =>
              void change(
                `/items/${itemKey}/scenarios/${s.id}`,
                { result: e.target.value },
                "PATCH",
              ).catch(() => setError(t("failed")))
            }
          >
            <option value="pending">{t("scenarioPending")}</option>
            <option value="passed">{t("scenarioPassed")}</option>
            <option value="failed">{t("scenarioFailed")}</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setEditing(s.id);
              setSteps(s.steps_md);
              setExpected(s.expected_md);
            }}
          >
            {t("edit")}
          </button>
          <button
            type="button"
            onClick={() =>
              void change(
                `/items/${itemKey}/scenarios/${s.id}`,
                {},
                "DELETE",
              ).catch(() => setError(t("failed")))
            }
          >
            {t("deleteCriterion")}
          </button>
        </div>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void change(
            `/items/${itemKey}/scenarios${editing ? `/${editing}` : ""}`,
            {
              steps_md: steps,
              expected_md: expected,
              ...(editing ? {} : { author: "mert" }),
            },
            editing ? "PATCH" : "POST",
          )
            .then(() => {
              setSteps("");
              setExpected("");
              setEditing(null);
            })
            .catch(() => setError(t("failed")));
        }}
      >
        <label>
          {t("scenarioSteps")}
          <input value={steps} onChange={(e) => setSteps(e.target.value)} />
        </label>
        <label>
          {t("scenarioExpected")}
          <input
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
          />
        </label>
        <button type="submit" disabled={!steps.trim() || !expected.trim()}>
          {t(editing ? "save" : "add")}
        </button>
      </form>
      <h3>{t("aiChecks")}</h3>
      <ul>
        {detail.activity
          .filter((a) => a.kind === "check")
          .map((a) => (
            <li key={a.id}>{a.message}</li>
          ))}
      </ul>
      {failed ? (
        <p>{t("failedScenariosBlock")}</p>
      ) : (
        detail.scenarios.some((s) => s.result === "pending") && (
          <p>{t("pendingScenariosWarning")}</p>
        )
      )}
      <div className="test-actions">
        <button
          type="button"
          disabled={failed || busy}
          onClick={() => {
            setBusy(true);
            void change(`/items/${itemKey}/approve`, {})
              .then(onDone)
              .catch(() => setError(t("failed")))
              .finally(() => setBusy(false));
          }}
        >
          {t("approve")}
        </button>
        <button type="button" onClick={() => setAction("send-back")}>
          {t("sendBack")}
        </button>
        <button type="button" onClick={() => setAction("reassign")}>
          {t("reassign")}
        </button>
      </div>
      {action && (
        <fieldset
          aria-label={t(action === "send-back" ? "sendBack" : "reassign")}
          onPaste={(e) => selectFile(Array.from(e.clipboardData.files)[0])}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            selectFile(e.dataTransfer.files[0]);
          }}
        >
          <label>
            {t("returnNote")}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          {action === "send-back" && (
            <>
              <label>
                {t("attachmentHelp")}
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => selectFile(e.target.files?.[0])}
                />
              </label>
              {file && (
                <p>
                  {file.name}{" "}
                  <button type="button" onClick={() => setFile(null)}>
                    {t("deleteCriterion")}
                  </button>
                </p>
              )}
            </>
          )}
          <button
            type="button"
            disabled={!note.trim() || busy}
            onClick={() => void submitAction()}
          >
            {t(action === "send-back" ? "sendBack" : "reassign")}
          </button>
        </fieldset>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
