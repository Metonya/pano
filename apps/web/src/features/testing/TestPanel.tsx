import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CircleAlert, Ellipsis, Pencil, Plus, X } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Detail } from "@/features/board/types";
import { checkResult } from "@/features/history/checkResult";
import { isLegacyCheck } from "@/features/history/entry";
import { actorHeaders, authHeaders, ensureUser, request } from "@/lib/api";
import { t } from "@/lib/i18n";
import "./testing.css";

function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

/** A question that replaces a modal: the safe answer takes the focus. */
export function InlineConfirm({
  message,
  cancelId,
  disabled,
  buttonClassName,
  onCancel,
  onConfirm,
}: {
  message: string;
  cancelId?: string;
  disabled?: boolean;
  buttonClassName?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancel.current?.focus();
  }, []);
  return (
    <fieldset className="inline-confirm" aria-label={message}>
      <span>{message}</span>
      <div className="inline-confirm-actions">
        <button
          ref={cancel}
          id={cancelId}
          type="button"
          className={buttonClassName}
          disabled={disabled}
          onClick={onCancel}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          className={`${buttonClassName ?? ""} inline-confirm-danger`}
          disabled={disabled}
          onClick={onConfirm}
        >
          {t("deleteConfirm")}
        </button>
      </div>
    </fieldset>
  );
}

type Attachment = { id: number; file: File; url: string };

export function TestPanel({
  itemKey,
  detail,
  onDone,
  onDirty,
  composing,
  setComposing,
  children,
}: {
  itemKey: string;
  detail: Detail;
  onDone: () => void;
  onDirty: (dirty: boolean) => void;
  composing: boolean;
  setComposing: (composing: boolean) => void;
  /** The rest of the sheet; the actions stay pinned below it while scrolling. */
  children: ReactNode;
}) {
  const qc = useQueryClient();
  const id = useId();
  const noteField = useRef<HTMLTextAreaElement>(null);
  const stepsField = useRef<HTMLTextAreaElement>(null);
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [scenarioForm, setScenarioForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [scenarioNotes, setScenarioNotes] = useState<Record<string, string>>(
    {},
  );
  const [summaryField, setSummaryField] = useState<
    "what_changed_md" | "how_to_test_md" | null
  >(null);
  const [summary, setSummary] = useState("");
  const [note, setNote] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const liveAttachments = useRef<Attachment[]>([]);
  const nextAttachment = useRef(0);
  // A retry after a failed send must not upload the same file twice.
  const uploaded = useRef(new Map<number, string>());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // The detail response only carries the latest few records.
  const checkRecords = useQuery<Detail["activity"]>({
    queryKey: ["item", itemKey, "activity", "ai-checks"],
    queryFn: () => request(`/items/${itemKey}/activity?kind=check&limit=50`),
    enabled: detail.status === "test",
  });
  const failedScenarios = detail.scenarios.flatMap((scenario, index) =>
    scenario.result === "failed"
      ? [
          {
            scenario,
            number: index + 1,
            note: (scenarioNotes[scenario.id] ?? "").trim(),
          },
        ]
      : [],
  );
  const hasScenarioNote = failedScenarios.some((f) => f.note);
  const canSend = !!note.trim() || hasScenarioNote;
  const editedScenario = detail.scenarios.find((s) => s.id === editing);
  useEffect(() => {
    onDirty(
      !!(
        note ||
        hasScenarioNote ||
        attachments.length ||
        (editing
          ? steps !== editedScenario?.steps_md ||
            expected !== editedScenario?.expected_md
          : steps || expected) ||
        (summaryField && summary !== detail[summaryField])
      ),
    );
  }, [
    note,
    hasScenarioNote,
    attachments,
    editing,
    editedScenario,
    steps,
    expected,
    summary,
    summaryField,
    detail,
    onDirty,
  ]);
  useEffect(() => () => onDirty(false), [onDirty]);
  useEffect(() => {
    if (composing) noteField.current?.focus();
  }, [composing]);
  useEffect(() => {
    liveAttachments.current = attachments;
  }, [attachments]);
  useEffect(
    () => () => {
      for (const a of liveAttachments.current) URL.revokeObjectURL(a.url);
    },
    [],
  );
  useEffect(() => {
    if (!scenarioForm) return;
    // Runs after the menu that opened the form has finished handing focus back.
    const timer = setTimeout(() => stepsField.current?.focus());
    return () => clearTimeout(timer);
  }, [scenarioForm]);
  const closeScenarioForm = useCallback(() => {
    setSteps("");
    setExpected("");
    setEditing(null);
    setScenarioForm(false);
  }, []);
  // The scenario can disappear while being edited (for example an agent removes it).
  useEffect(() => {
    if (editing && !editedScenario) closeScenarioForm();
  }, [editing, editedScenario, closeScenarioForm]);
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
  function addFiles(files: File[]) {
    if (!files.length) return;
    const isValid = (file: File) =>
      ["image/png", "image/jpeg"].includes(file.type) &&
      file.size <= 10 * 1024 * 1024;
    const invalid = files.filter((file) => !isValid(file));
    setError(
      invalid.length
        ? `${invalid.map((file) => file.name).join(", ")}: ${t("attachmentInvalid")}`
        : "",
    );
    const added = files.filter(isValid).map((file) => ({
      id: nextAttachment.current++,
      file,
      url: URL.createObjectURL(file),
    }));
    setAttachments((current) => [...current, ...added]);
  }
  function removeAttachment(attachment: Attachment) {
    URL.revokeObjectURL(attachment.url);
    uploaded.current.delete(attachment.id);
    setAttachments((current) => current.filter((a) => a !== attachment));
  }
  function clearAttachments() {
    for (const a of attachments) URL.revokeObjectURL(a.url);
    uploaded.current.clear();
    setAttachments([]);
  }
  function scenarioLabel(number: number, steps_md: string) {
    return `${t("scenarioLabel")} ${number} (${steps_md.replace(/\s+/g, " ").trim()})`;
  }
  function compiledNote() {
    const lines = failedScenarios.map((f) => {
      const label = scenarioLabel(f.number, f.scenario.steps_md);
      return f.note ? `${label}: ${f.note}` : label;
    });
    return [note.trim(), lines.join("\n")].filter(Boolean).join("\n\n");
  }
  async function uploadAttachment(attachment: Attachment) {
    const known = uploaded.current.get(attachment.id);
    if (known) return known;
    const form = new FormData();
    form.append("file", attachment.file);
    const response = await fetch(`/api/v1/items/${itemKey}/attachments`, {
      method: "POST",
      headers: { ...authHeaders(), ...(await actorHeaders()) },
      body: form,
    });
    if (!response.ok) throw new Error("upload");
    const { id: attachmentId } = (await response.json()) as { id: string };
    uploaded.current.set(attachment.id, attachmentId);
    return attachmentId;
  }
  async function sendBack() {
    if (!canSend) return;
    await save(async () => {
      const attachmentIds: string[] = [];
      for (const attachment of attachments)
        attachmentIds.push(await uploadAttachment(attachment));
      await change(`/items/${itemKey}/send-back`, {
        note: compiledNote(),
        ...(attachmentIds.length ? { attachmentIds } : {}),
      });
      setNote("");
      setScenarioNotes({});
      clearAttachments();
      setComposing(false);
      onDone();
    });
  }
  const failed = failedScenarios.length > 0;
  const pending = detail.scenarios.some((s) => s.result === "pending");
  const checks = (checkRecords.data ?? []).filter(
    (a) => a.message.trim() && !isLegacyCheck(a),
  );
  const scenarioFormView = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save(async () => {
          const author = (await ensureUser()) ?? "me";
          await change(
            `/items/${itemKey}/scenarios${editing ? `/${editing}` : ""}`,
            {
              steps_md: steps,
              expected_md: expected,
              ...(editing ? {} : { author }),
            },
            editing ? "PATCH" : "POST",
          );
          closeScenarioForm();
        });
      }}
    >
      <label>
        {t("scenarioSteps")}
        <textarea
          ref={stepsField}
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
      {!editing && (
        <p className="test-help" id={`${id}-scenario-help`}>
          {t("scenarioFieldsRequired")}
        </p>
      )}
      <div className="test-form-actions">
        <button type="button" disabled={busy} onClick={closeScenarioForm}>
          {t("cancel")}
        </button>
        <button
          className="test-primary"
          type="submit"
          aria-describedby={editing ? undefined : `${id}-scenario-help`}
          disabled={busy || !steps.trim() || !expected.trim()}
        >
          {t(editing ? "save" : "add")}
        </button>
      </div>
    </form>
  );
  if (detail.status !== "test") return <>{children}</>;
  return (
    <>
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
              {editing === s.id ? (
                <div className="test-scenario-form">{scenarioFormView}</div>
              ) : (
                <>
                  <div className="test-scenario-content">
                    <div id={`${id}-steps-${s.id}`}>
                      <Markdown>{s.steps_md}</Markdown>
                    </div>
                    <div className="test-expected">
                      <span className="sr-only">{t("scenarioExpected")}:</span>
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
                        onClick={() =>
                          void save(() =>
                            change(
                              `/items/${itemKey}/scenarios/${s.id}`,
                              {
                                result:
                                  s.result === result ? "pending" : result,
                              },
                              "PATCH",
                            ),
                          )
                        }
                      >
                        {result === "passed" ? (
                          <Check size={14} aria-hidden="true" />
                        ) : (
                          <X size={14} aria-hidden="true" />
                        )}
                        {t(
                          result === "passed"
                            ? "scenarioPassed"
                            : "scenarioFailed",
                        )}
                      </button>
                    ))}
                  </fieldset>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        id={`${id}-menu-${s.id}`}
                        className="test-icon"
                        type="button"
                        aria-label={t("actions")}
                        aria-describedby={`${id}-steps-${s.id}`}
                        disabled={busy}
                      >
                        <Ellipsis size={16} aria-hidden="true" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="menu-content"
                      align="end"
                      onCloseAutoFocus={(e) => {
                        // The menu holds the focus until now, so the inline
                        // question can only take it at this point.
                        if (deleting !== s.id) return;
                        e.preventDefault();
                        document
                          .getElementById(`${id}-cancel-${s.id}`)
                          ?.focus();
                      }}
                    >
                      {/* One form at a time, so typed text is never overwritten. */}
                      <DropdownMenuItem
                        disabled={scenarioForm}
                        onSelect={() => {
                          setDeleting(null);
                          setScenarioForm(true);
                          setEditing(s.id);
                          setSteps(s.steps_md);
                          setExpected(s.expected_md);
                        }}
                      >
                        {t("edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setDeleting(s.id)}
                      >
                        {t("deleteMenu")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {s.result === "failed" && (
                    <label className="test-scenario-note">
                      {t("scenarioNote")}
                      <textarea
                        rows={2}
                        placeholder={t("scenarioNotePlaceholder")}
                        value={scenarioNotes[s.id] ?? ""}
                        onChange={(e) =>
                          setScenarioNotes((current) => ({
                            ...current,
                            [s.id]: e.target.value,
                          }))
                        }
                      />
                    </label>
                  )}
                  {deleting === s.id && (
                    <InlineConfirm
                      message={t("scenarioDeleteConfirm")}
                      cancelId={`${id}-cancel-${s.id}`}
                      disabled={busy}
                      onCancel={() => {
                        setDeleting(null);
                        document.getElementById(`${id}-menu-${s.id}`)?.focus();
                      }}
                      onConfirm={() =>
                        void save(async () => {
                          await change(
                            `/items/${itemKey}/scenarios/${s.id}`,
                            {},
                            "DELETE",
                          );
                          setDeleting(null);
                        })
                      }
                    />
                  )}
                </>
              )}
            </div>
          ))}
          {scenarioForm && !editing ? (
            scenarioFormView
          ) : (
            <button
              className="test-link"
              type="button"
              disabled={scenarioForm}
              onClick={() => {
                setScenarioForm(true);
                setEditing(null);
              }}
            >
              <Plus size={16} aria-hidden="true" />
              {t("addScenario")}
            </button>
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
                      {result !== "unknown" &&
                        `${t(result === "passed" ? "scenarioPassed" : "scenarioFailed")}: `}
                      {a.message}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </section>
      {children}
      <footer className="test-actions">
        {composing ? (
          <form
            className="test-return-form"
            aria-label={t("sendBack")}
            onSubmit={(e) => {
              e.preventDefault();
              void sendBack();
            }}
            onPaste={(e) => addFiles(Array.from(e.clipboardData.files))}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(Array.from(e.dataTransfer.files));
            }}
          >
            {failed && (
              <div className="test-failed-summary">
                <p>{t("failedScenariosSummary")}</p>
                <ul>
                  {failedScenarios.map((f) => (
                    <li key={f.scenario.id}>
                      <span>
                        {scenarioLabel(f.number, f.scenario.steps_md)}
                      </span>
                      {f.note && <span className="test-help">{f.note}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <label>
              {t("returnNote")}
              <textarea
                ref={noteField}
                required={!hasScenarioNote}
                aria-required={!hasScenarioNote}
                rows={3}
                value={note}
                placeholder={t("returnNotePlaceholder")}
                onChange={(e) => setNote(e.target.value)}
                aria-describedby={`${id}-note-help`}
              />
            </label>
            <p className="test-help" id={`${id}-note-help`}>
              {t(hasScenarioNote ? "returnNoteOptional" : "returnNoteRequired")}
            </p>
            {!!attachments.length && (
              <ul className="test-attachments">
                {attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <img src={attachment.url} alt="" />
                    <span title={attachment.file.name}>
                      {attachment.file.name}
                    </span>
                    <button
                      type="button"
                      className="test-attachment-remove"
                      aria-label={`${t("attachmentRemove")}: ${attachment.file.name}`}
                      disabled={busy}
                      onClick={() => removeAttachment(attachment)}
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="test-attachment">
              <span>{t("attachmentDrop")}</span>
              <label className="test-file-button">
                {t("attachmentChoose")}
                <input
                  type="file"
                  className="sr-only"
                  accept="image/png,image/jpeg"
                  multiple
                  onChange={(e) => {
                    addFiles(Array.from(e.target.files ?? []));
                    // Lets the same file be chosen again after removing it.
                    e.target.value = "";
                  }}
                />
              </label>
              <small>{t("attachmentHelp")}</small>
            </div>
            <div className="test-form-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setComposing(false);
                  setNote("");
                  clearAttachments();
                }}
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                className="test-primary"
                disabled={!canSend || busy}
                aria-describedby={`${id}-note-help`}
              >
                {t("sendBack")}
              </button>
            </div>
          </form>
        ) : (
          <>
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
              {!failed && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setComposing(true)}
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
                  onClick={() => setComposing(true)}
                >
                  {t("sendBack")}
                </button>
              )}
            </div>
          </>
        )}
        {error && (
          <p className="test-failure" role="alert">
            {error}
          </p>
        )}
      </footer>
    </>
  );
}
