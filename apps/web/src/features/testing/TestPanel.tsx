import { useQueryClient } from "@tanstack/react-query";
import { Check, CircleAlert, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Detail } from "@/features/board/types";
import { checkResult } from "@/features/history/checkResult";
import { authHeaders, request } from "@/lib/api";
import { t } from "@/lib/i18n";
import "./testing.css";

function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

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
  const id = useId();
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [scenarioForm, setScenarioForm] = useState(false);
  const [summaryField, setSummaryField] = useState<
    "what_changed_md" | "how_to_test_md" | null
  >(null);
  const [summary, setSummary] = useState("");
  const [action, setAction] = useState<"send-back" | "reassign" | null>(null);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    onDirty(
      !!(
        note ||
        steps ||
        expected ||
        file ||
        (summaryField && summary !== detail[summaryField])
      ),
    );
  }, [note, steps, expected, file, summary, summaryField, detail, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  async function change(path: string, data: object, method = "POST") {
    await request(path, data, method);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["item", itemKey] }),
      qc.invalidateQueries({ queryKey: ["board"] }),
      qc.invalidateQueries({ queryKey: ["projects"] }),
    ]);
  }
  async function save(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await work();
    } catch {
      setError(t("failed"));
    } finally {
      setBusy(false);
    }
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
    if (!note.trim() || !action) return;
    await save(async () => {
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
        attachmentIds = [(await response.json()).id];
      }
      await change(`/items/${itemKey}/${action}`, {
        note,
        ...(attachmentIds.length ? { attachmentIds } : {}),
      });
      onDone();
    });
  }
  const failed = detail.scenarios.some((s) => s.result === "failed");
  const pending = detail.scenarios.some((s) => s.result === "pending");
  const checks = detail.activity.filter(
    (a) => a.kind === "check" && a.message.trim(),
  );
  if (detail.status !== "test") return null;
  return (
    <section className="test-panel" aria-label={t("scenarios")}>
      {(
        [
          ["what_changed_md", "whatChanged"],
          ["how_to_test_md", "howToTest"],
        ] as const
      ).map(([field, label]) =>
        detail[field].trim() || summaryField === field ? (
          <section className="test-section" key={field}>
            <div className="test-section-heading">
              <h3>{t(label)}</h3>
              {summaryField !== field && (
                <button
                  className="test-link"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setSummaryField(field);
                    setSummary(detail[field]);
                  }}
                >
                  <Pencil size={14} aria-hidden="true" />
                  {t("edit")}
                </button>
              )}
            </div>
            {summaryField === field ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void save(async () => {
                    await change(
                      `/items/${itemKey}`,
                      { [field]: summary },
                      "PATCH",
                    );
                    setSummaryField(null);
                  });
                }}
              >
                <label>
                  {t(label)}
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    rows={3}
                  />
                </label>
                <div className="test-form-actions">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setSummaryField(null)}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    className="test-primary"
                    disabled={busy}
                    type="submit"
                  >
                    {t("save")}
                  </button>
                </div>
              </form>
            ) : (
              <Markdown>{detail[field]}</Markdown>
            )}
          </section>
        ) : null,
      )}
      {(!detail.what_changed_md.trim() || !detail.how_to_test_md.trim()) &&
        !summaryField && (
          <div className="test-missing-summary">
            {(
              [
                ["what_changed_md", "whatChanged"],
                ["how_to_test_md", "howToTest"],
              ] as const
            )
              .filter(([field]) => !detail[field].trim())
              .map(([field, label]) => (
                <button
                  className="test-link"
                  type="button"
                  key={field}
                  onClick={() => {
                    setSummaryField(field);
                    setSummary("");
                  }}
                >
                  <Plus size={14} aria-hidden="true" />
                  {t(label)}
                </button>
              ))}
          </div>
        )}
      <section className="test-section">
        <h3>{t("scenarios")}</h3>
        {detail.scenarios.map((s, index) => (
          <div className="test-scenario" key={s.id}>
            <span className="test-scenario-number">{index + 1}</span>
            <div className="test-scenario-content">
              <Markdown>{s.steps_md}</Markdown>
              <div className="test-expected">
                <span>{t("scenarioExpected")}:</span>
                <Markdown>{s.expected_md}</Markdown>
              </div>
            </div>
            <fieldset
              className="test-result"
              aria-label={`${t("scenarios")} ${index + 1}: ${s.steps_md}`}
            >
              {(["passed", "failed"] as const).map((result) => (
                <button
                  type="button"
                  key={result}
                  className={`test-result-${result}`}
                  aria-pressed={s.result === result}
                  disabled={busy}
                  onClick={() => {
                    if (result === "failed") setAction("send-back");
                    void save(() =>
                      change(
                        `/items/${itemKey}/scenarios/${s.id}`,
                        { result: s.result === result ? "pending" : result },
                        "PATCH",
                      ),
                    );
                  }}
                >
                  {result === "passed" ? (
                    <Check size={14} aria-hidden="true" />
                  ) : (
                    <X size={14} aria-hidden="true" />
                  )}
                  {t(result === "passed" ? "scenarioPassed" : "scenarioFailed")}
                </button>
              ))}
            </fieldset>
            <div className="test-scenario-tools">
              <button
                className="test-icon"
                type="button"
                aria-label={`${t("edit")}: ${s.steps_md}`}
                disabled={busy}
                onClick={() => {
                  setScenarioForm(true);
                  setEditing(s.id);
                  setSteps(s.steps_md);
                  setExpected(s.expected_md);
                }}
              >
                <Pencil size={16} aria-hidden="true" />
              </button>
              <button
                className="test-icon"
                type="button"
                aria-label={`${t("deleteCriterion")}: ${s.steps_md}`}
                disabled={busy}
                onClick={() =>
                  void save(() =>
                    change(`/items/${itemKey}/scenarios/${s.id}`, {}, "DELETE"),
                  )
                }
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
        {!scenarioForm ? (
          <button
            className="test-link"
            type="button"
            onClick={() => {
              setScenarioForm(true);
              setEditing(null);
            }}
          >
            <Plus size={16} aria-hidden="true" />
            {t("addScenario")}
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save(async () => {
                await change(
                  `/items/${itemKey}/scenarios${editing ? `/${editing}` : ""}`,
                  {
                    steps_md: steps,
                    expected_md: expected,
                    ...(editing ? {} : { author: "mert" }),
                  },
                  editing ? "PATCH" : "POST",
                );
                setSteps("");
                setExpected("");
                setEditing(null);
                setScenarioForm(false);
              });
            }}
          >
            <label>
              {t("scenarioSteps")}
              <textarea
                required
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                rows={2}
              />
            </label>
            <label>
              {t("scenarioExpected")}
              <textarea
                required
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
                rows={2}
              />
            </label>
            <p className="test-help" id={`${id}-scenario-help`}>
              {t("scenarioFieldsRequired")}
            </p>
            <div className="test-form-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setSteps("");
                  setExpected("");
                  setEditing(null);
                  setScenarioForm(false);
                }}
              >
                {t("cancel")}
              </button>
              <button
                className="test-primary"
                type="submit"
                aria-describedby={`${id}-scenario-help`}
                disabled={busy || !steps.trim() || !expected.trim()}
              >
                {t(editing ? "save" : "add")}
              </button>
            </div>
          </form>
        )}
      </section>
      {!!checks.length && (
        <section className="test-section">
          <h3>{t("aiChecks")}</h3>
          <ul className="test-checks">
            {checks.map((a) => {
              let data = {};
              try {
                data = JSON.parse(a.after_json ?? "{}") ?? {};
              } catch {
                /* Legacy records may not contain JSON. */
              }
              const result = checkResult(a.message, data);
              return (
                <li key={a.id} className={`test-check-${result}`}>
                  {result === "passed" ? (
                    <Check size={14} aria-hidden="true" />
                  ) : result === "failed" ? (
                    <X size={14} aria-hidden="true" />
                  ) : (
                    <CircleAlert size={14} aria-hidden="true" />
                  )}
                  <span>
                    {t(
                      result === "passed"
                        ? "scenarioPassed"
                        : result === "failed"
                          ? "scenarioFailed"
                          : "historyUnknown",
                    )}
                    : {a.message}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {action && (
        <form
          className="test-return-form"
          aria-label={t(action === "send-back" ? "sendBack" : "reassign")}
          onSubmit={(e) => {
            e.preventDefault();
            void submitAction();
          }}
          onPaste={(e) => {
            if (action === "send-back")
              selectFile(Array.from(e.clipboardData.files)[0]);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (action === "send-back") selectFile(e.dataTransfer.files[0]);
          }}
        >
          <label>
            {t("returnNote")}
            <textarea
              required
              aria-required="true"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              aria-describedby={`${id}-note-help`}
            />
          </label>
          <p className="test-help" id={`${id}-note-help`}>
            {t("returnNoteRequired")}
          </p>
          {action === "send-back" && (
            <div className="test-attachment">
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
            </div>
          )}
          <div className="test-form-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setAction(null);
                setNote("");
                setFile(null);
              }}
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              className="test-primary"
              disabled={!note.trim() || busy}
              aria-describedby={`${id}-note-help`}
            >
              {t(action === "send-back" ? "sendBack" : "reassign")}
            </button>
          </div>
        </form>
      )}
      <footer className="test-actions">
        <div className="test-action-reasons" aria-live="polite">
          {failed && (
            <p id={`${id}-approve-reason`} className="test-failure">
              <CircleAlert size={16} aria-hidden="true" />
              {t("failedScenariosBlock")}
            </p>
          )}
          {pending && (
            <p className="test-help">{t("pendingScenariosWarning")}</p>
          )}
          {busy && <p className="test-help">{t("testingSaving")}</p>}
        </div>
        <div className="test-action-buttons">
          <button
            type="button"
            disabled={busy}
            onClick={() => setAction("reassign")}
          >
            {t("reassign")}
          </button>
          {!failed && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setAction("send-back")}
            >
              {t("sendBack")}
            </button>
          )}
          <button
            className={failed ? "" : "test-primary"}
            type="button"
            disabled={failed || busy}
            aria-describedby={failed ? `${id}-approve-reason` : undefined}
            onClick={() =>
              void save(async () => {
                await change(`/items/${itemKey}/approve`, {});
                onDone();
              })
            }
          >
            {t("approve")}
          </button>
          {failed && (
            <button
              className="test-primary"
              type="button"
              disabled={busy}
              onClick={() => setAction("send-back")}
            >
              {t("sendBack")}
            </button>
          )}
        </div>
      </footer>
      {error && (
        <p className="test-failure" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
