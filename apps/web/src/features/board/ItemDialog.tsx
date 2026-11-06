import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  CircleAlert,
  Ellipsis,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ManagedDialog } from "@/components/ManagedDialog";
import { DialogClose, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActivityTimeline } from "@/features/history/ActivityTimeline";
import { isImportant, StatusFlow, statusFlow } from "@/features/history/entry";
import { TestPanel } from "@/features/testing/TestPanel";
import { date, request } from "@/lib/api";
import { t } from "@/lib/i18n";
import { activityText } from "./format";
import {
  agentName,
  type BoardItem,
  type Detail,
  initial,
  isAiActor,
  isAwaitingHuman,
  labels,
  type Status,
} from "./types";
import "./detail.css";

const LONG_BODY = 700;
const knownActors = ["mert", "claude:po", "codex"];

function Property({
  label,
  shown,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  shown: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: ReactNode; text: string }[];
  disabled?: boolean;
}) {
  const text = options.find((o) => o.value === value)?.text ?? value;
  return (
    <div className="sheet-property">
      <span aria-hidden="true">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <button
            type="button"
            className="sheet-property-button"
            aria-label={`${label}: ${text}`}
          >
            {shown}
            {!disabled && <ChevronDown size={12} aria-hidden="true" />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="menu-content"
          align="start"
          // Keep focus inside the sheet instead of jumping back to the trigger's scroll spot.
          aria-label={label}
        >
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const statusLabel = (status: Status) => (
  <span className="status-inline">
    <span className={`status-chip status-${status}`}>
      <span className="status-dot" aria-hidden="true" />
    </span>
    {labels[status]}
  </span>
);

const assigneeLabel = (assignee: string | null) =>
  assignee ? (
    <span className="assignee sheet-assignee">
      <span className="assignee-avatar" aria-hidden="true">
        {initial(assignee)}
      </span>
      {agentName(assignee)}
    </span>
  ) : (
    <span className="sheet-unassigned">{t("unassigned")}</span>
  );

export function ItemDialog({
  projectKey,
  item,
  close,
  statuses,
}: {
  projectKey: string;
  item: BoardItem | null;
  close: () => void;
  statuses: Status[];
}) {
  const qc = useQueryClient();
  const key = item ? `${projectKey}-${item.number}` : "";
  const detail = useQuery<Detail>({
    queryKey: ["item", key],
    queryFn: () => request(`/items/${key}`),
    enabled: !!item,
  });
  const [tab, setTab] = useState<"detail" | "history">("detail");
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<string | null>(null);
  const [criterionText, setCriterionText] = useState("");
  const [criterion, setCriterion] = useState("");
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState(false);
  const [error, setError] = useState(false);
  const [testDirty, setTestDirty] = useState(false);
  const [composing, setComposing] = useState(false);
  const pendingCriteria = useRef(new Set<string>());
  const [pending, setPending] = useState<string[]>([]);
  async function checkCriterion(id: string, done: boolean) {
    if (pendingCriteria.current.has(id)) return;
    const detailKey = ["item", key];
    const boardKey = ["board", projectKey];
    const cancellations = Promise.all([
      qc.cancelQueries({ queryKey: detailKey }),
      qc.cancelQueries({ queryKey: boardKey }),
    ]);
    const previous = qc
      .getQueryData<Detail>(detailKey)
      ?.criteria.find((c) => c.id === id)?.done;
    if (previous === undefined) return;
    pendingCriteria.current.add(id);
    setPending([...pendingCriteria.current]);
    const delta = Number(done) - Number(!!previous);
    qc.setQueryData<Detail>(
      detailKey,
      (old) =>
        old && {
          ...old,
          criteria: old.criteria.map((c) =>
            c.id === id ? { ...c, done: Number(done) } : c,
          ),
        },
    );
    qc.setQueryData<BoardItem[]>(boardKey, (old) =>
      old?.map((i) =>
        i.id === item?.id
          ? { ...i, criteria_done: i.criteria_done + delta }
          : i,
      ),
    );
    try {
      await cancellations;
      await request(`/items/${key}/criteria/${id}`, { done }, "PATCH");
      setError(false);
    } catch {
      qc.setQueryData<Detail>(
        detailKey,
        (old) =>
          old && {
            ...old,
            criteria: old.criteria.map((c) =>
              c.id === id ? { ...c, done: previous } : c,
            ),
          },
      );
      qc.setQueryData<BoardItem[]>(boardKey, (old) =>
        old?.map((i) =>
          i.id === item?.id
            ? { ...i, criteria_done: i.criteria_done - delta }
            : i,
        ),
      );
      setError(true);
    } finally {
      pendingCriteria.current.delete(id);
      setPending([...pendingCriteria.current]);
      if (!pendingCriteria.current.size) {
        void qc.invalidateQueries({ queryKey: detailKey });
        void qc.invalidateQueries({ queryKey: boardKey });
      }
    }
  }
  async function mutateCriterion(id: string, text?: string) {
    if (pendingCriteria.current.has(id)) return;
    const detailKey = ["item", key];
    const boardKey = ["board", projectKey];
    await Promise.all([
      qc.cancelQueries({ queryKey: detailKey }),
      qc.cancelQueries({ queryKey: boardKey }),
    ]);
    const previous = qc.getQueryData<Detail>(detailKey);
    const oldBoard = qc.getQueryData<BoardItem[]>(boardKey);
    const entry = previous?.criteria.find((c) => c.id === id);
    if (!entry) return;
    pendingCriteria.current.add(id);
    setPending([...pendingCriteria.current]);
    qc.setQueryData<Detail>(
      detailKey,
      (old) =>
        old && {
          ...old,
          criteria:
            text === undefined
              ? old.criteria.filter((c) => c.id !== id)
              : old.criteria.map((c) => (c.id === id ? { ...c, text } : c)),
        },
    );
    if (text === undefined)
      qc.setQueryData<BoardItem[]>(boardKey, (old) =>
        old?.map((i) =>
          i.id === item?.id
            ? {
                ...i,
                criteria_total: i.criteria_total - 1,
                criteria_done: i.criteria_done - Number(!!entry.done),
              }
            : i,
        ),
      );
    try {
      await request(
        `/items/${key}/criteria/${id}`,
        text === undefined ? {} : { text },
        text === undefined ? "DELETE" : "PATCH",
      );
      setEditingCriterion(null);
      setError(false);
    } catch {
      qc.setQueryData(detailKey, previous);
      qc.setQueryData(boardKey, oldBoard);
      setError(true);
    } finally {
      pendingCriteria.current.delete(id);
      setPending([...pendingCriteria.current]);
      void qc.invalidateQueries({ queryKey: detailKey });
      void qc.invalidateQueries({ queryKey: boardKey });
    }
  }
  async function change(path: string, data: object, method = "POST") {
    try {
      await request(path, data, method);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["board"] }),
        qc.invalidateQueries({ queryKey: ["item", key] }),
      ]);
      setError(false);
      return true;
    } catch {
      setError(true);
      return false;
    }
  }
  const d = detail.data;
  const actors = [
    ...new Set([
      ...knownActors,
      ...(qc.getQueryData<BoardItem[]>(["board", projectKey]) ?? []).map(
        (i) => i.assignee,
      ),
      d?.assignee,
    ]),
  ].filter((a): a is string => !!a);
  const requester = d?.activity.find(
    (a) => a.kind === "moved" && statusFlow(a)?.to === "test",
  )?.actor;
  const recent = d?.activity.filter(isImportant).slice(0, 3) ?? [];
  const criteriaDone = d?.criteria.filter((c) => c.done).length ?? 0;
  const description = d && (
    <section className="sheet-section">
      <div className="sheet-section-heading">
        <h3>{t("description")}</h3>
        {!editing && (
          <button
            type="button"
            className="sheet-link"
            onClick={() => {
              setBody(d.body_md);
              setEditing(true);
            }}
          >
            {t("edit")}
          </button>
        )}
      </div>
      {editing ? (
        <>
          <textarea
            className="sheet-textarea"
            aria-label={t("description")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="sheet-form-actions">
            <button
              type="button"
              className="sheet-button"
              onClick={() => setEditing(false)}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              className="primary"
              onClick={async () => {
                if (await change(`/items/${key}`, { body_md: body }, "PATCH")) {
                  setEditing(false);
                }
              }}
            >
              {t("save")}
            </button>
          </div>
        </>
      ) : d.body_md.trim() ? (
        <>
          <div
            className={`markdown ${d.body_md.length > LONG_BODY && !expanded ? "is-clamped" : ""}`}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {d.body_md}
            </ReactMarkdown>
          </div>
          {d.body_md.length > LONG_BODY && (
            <button
              type="button"
              className="sheet-link"
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {t(expanded ? "showLess" : "showMore")}
            </button>
          )}
        </>
      ) : (
        <p className="sheet-muted">{t("noDescription")}</p>
      )}
    </section>
  );
  return (
    <ManagedDialog
      className="item-sheet"
      open={!!item}
      onOpenChange={(v) => {
        if (!v) close();
      }}
      dirty={
        testDirty ||
        (editing && body !== d?.body_md) ||
        !!criterion ||
        !!reason ||
        (editingCriterion !== null &&
          criterionText !==
            d?.criteria.find((c) => c.id === editingCriterion)?.text)
      }
    >
      {d && isAwaitingHuman(d) && (
        <div className="sheet-band">
          <CircleAlert size={18} aria-hidden="true" />
          {requester && isAiActor(requester)
            ? `${agentName(requester)} ${t("testRequested")}`
            : t("testRequestedGeneric")}
        </div>
      )}
      <header className="sheet-head">
        <div className="sheet-head-row">
          <span className="sheet-key">#{item?.number}</span>
          {d?.priority === "high" && (
            <span className="priority-high">{t("high")}</span>
          )}
          <span className="sheet-spacer" />
          <div
            role="tablist"
            aria-label={t("detail")}
            className="sheet-tabs"
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const next = tab === "detail" ? "history" : "detail";
                setTab(next);
                (
                  e.currentTarget.querySelector(
                    `[data-tab="${next}"]`,
                  ) as HTMLElement
                )?.focus();
              }
            }}
          >
            {(["detail", "history"] as const).map((value) => (
              <button
                type="button"
                role="tab"
                key={value}
                data-tab={value}
                aria-selected={tab === value}
                tabIndex={tab === value ? 0 : -1}
                onClick={() => setTab(value)}
              >
                {t(value)}
              </button>
            ))}
          </div>
          {d?.status === "cancelled" ? (
            <button
              type="button"
              className="sheet-button"
              disabled={cancelBusy}
              onClick={async () => {
                setCancelBusy(true);
                await change(`/items/${key}/restore`, {});
                setCancelBusy(false);
              }}
            >
              {t("historyRestore")}
            </button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="sheet-icon"
                  aria-label={t("actions")}
                >
                  <Ellipsis size={18} aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="menu-content" align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setCancelling(true)}
                >
                  {t("cancelItemMenu")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <DialogClose asChild>
            <button
              type="button"
              className="sheet-close"
              aria-label={t("close")}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </DialogClose>
        </div>
        <DialogTitle className="sheet-title">{item?.title}</DialogTitle>
        {d && (
          <div className="sheet-properties">
            <Property
              label={t("status")}
              disabled={d.status === "cancelled"}
              shown={statusLabel(d.status)}
              value={d.status}
              options={[
                ...statuses,
                ...(d.status === "cancelled" ? (["cancelled"] as const) : []),
              ].map((s) => ({
                value: s,
                label: statusLabel(s),
                text: labels[s],
              }))}
              onChange={(status) => {
                if (status === d.status) return;
                // Leaving Test towards work needs a note: use the send-back flow.
                if (d.status === "test" && status === "in_progress") {
                  setTab("detail");
                  setComposing(true);
                } else void change(`/items/${key}/move`, { status });
              }}
            />
            <Property
              label={t("priority")}
              shown={t(d.priority)}
              value={d.priority}
              options={(["high", "medium", "low"] as const).map((p) => ({
                value: p,
                label: t(p),
                text: t(p),
              }))}
              onChange={(priority) =>
                void change(`/items/${key}`, { priority }, "PATCH")
              }
            />
            <Property
              label={t("assignee")}
              shown={assigneeLabel(d.assignee)}
              value={d.assignee ?? ""}
              options={[
                { value: "", label: t("unassigned"), text: t("unassigned") },
                ...actors.map((a) => ({
                  value: a,
                  label: agentName(a),
                  text: agentName(a),
                })),
              ]}
              onChange={(value) => {
                if (value !== (d.assignee ?? ""))
                  void change(`/items/${key}/assign`, {
                    assignee: value || null,
                  });
              }}
            />
            <div className="sheet-property">
              <span>{t("criteria")}</span>
              <strong>
                {criteriaDone} / {d.criteria.length}
              </strong>
            </div>
            <div className="sheet-property">
              <span>{t("lastUpdated")}</span>
              <b>{date(d.updated_at)}</b>
            </div>
          </div>
        )}
      </header>
      {d && (
        <div className="sheet-body">
          {tab === "history" && (
            <ActivityTimeline
              key={key}
              itemKey={key}
              attachments={
                (
                  d as Detail & {
                    attachments?: {
                      id: string;
                      activity_id: string | null;
                      file_name: string;
                    }[];
                  }
                ).attachments
              }
            />
          )}
          {/* Stays mounted so a half-written send-back note survives a tab switch. */}
          <div
            role="tabpanel"
            aria-label={t("detail")}
            hidden={tab !== "detail"}
            className="sheet-detail"
          >
            <TestPanel
              itemKey={key}
              detail={d}
              onDone={close}
              onDirty={setTestDirty}
              composing={composing}
              setComposing={setComposing}
            >
              {description}
              <section className="sheet-section">
                <h3>{t("criteria")}</h3>
                <div className="criteria-list">
                  {d.criteria.map((c) => (
                    <div
                      className={`criterion ${c.done ? "is-done" : ""}`}
                      key={c.id}
                    >
                      <input
                        type="checkbox"
                        aria-label={c.text}
                        checked={!!c.done}
                        disabled={pending.includes(c.id)}
                        onChange={(e) =>
                          void checkCriterion(c.id, e.target.checked)
                        }
                      />
                      {editingCriterion === c.id ? (
                        <>
                          <input
                            className="sheet-input"
                            aria-label={t("editCriterion")}
                            value={criterionText}
                            onChange={(e) => setCriterionText(e.target.value)}
                          />
                          <button
                            type="button"
                            className="primary"
                            disabled={
                              !criterionText.trim() || pending.includes(c.id)
                            }
                            onClick={() =>
                              void mutateCriterion(c.id, criterionText.trim())
                            }
                          >
                            {t("save")}
                          </button>
                          <button
                            type="button"
                            className="sheet-button"
                            onClick={() => setEditingCriterion(null)}
                          >
                            {t("cancel")}
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="criterion-text">{c.text}</span>
                          <span className="criterion-tools">
                            <button
                              type="button"
                              className="sheet-icon"
                              aria-label={`${t("editCriterion")}: ${c.text}`}
                              disabled={pending.includes(c.id)}
                              onClick={() => {
                                setCriterionText(c.text);
                                setEditingCriterion(c.id);
                              }}
                            >
                              <Pencil size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="sheet-icon"
                              aria-label={`${t("deleteCriterion")}: ${c.text}`}
                              disabled={pending.includes(c.id)}
                              onClick={() => void mutateCriterion(c.id)}
                            >
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <form
                  className="criterion-add"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (
                      criterion.trim() &&
                      (await change(`/items/${key}/criteria`, {
                        text: criterion.trim(),
                      }))
                    )
                      setCriterion("");
                  }}
                >
                  <input
                    className="sheet-input"
                    aria-label={t("newCriterion")}
                    placeholder={t("addCriterion")}
                    value={criterion}
                    onChange={(e) => setCriterion(e.target.value)}
                  />
                  {criterion.trim() && (
                    <button type="submit" className="primary">
                      {t("add")}
                    </button>
                  )}
                </form>
              </section>
              {!!recent.length && (
                <section className="sheet-section">
                  <h3>{t("recentRecords")}</h3>
                  <ul className="recent-records">
                    {recent.map((entry) => {
                      const flow = statusFlow(entry);
                      const actor = agentName(entry.actor);
                      const summary = activityText(entry);
                      return (
                        <li key={entry.id}>
                          <time dateTime={entry.created_at}>
                            {date(entry.created_at)}
                          </time>
                          <span>
                            <strong>{actor}</strong>
                            {summary.startsWith(actor)
                              ? summary.slice(actor.length)
                              : ` ${summary}`}
                            {flow && (
                              <>
                                {" "}
                                <StatusFlow from={flow.from} to={flow.to} />
                              </>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <button
                    type="button"
                    className="sheet-link"
                    onClick={() => setTab("history")}
                  >
                    {t("showAllHistory")}
                  </button>
                </section>
              )}
              {error && (
                <p role="alert" className="error">
                  {t("failed")}
                </p>
              )}
            </TestPanel>
          </div>
          <ManagedDialog
            open={cancelling}
            onOpenChange={setCancelling}
            dirty={!!reason}
          >
            <DialogTitle>{t("historyCancelTitle")}</DialogTitle>
            <p className="sheet-muted">{t("historyCancelExplanation")}</p>
            <label>
              {t("cancelReason")}
              <input
                required
                aria-required="true"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            {cancelError && <p role="alert">{t("failed")}</p>}
            <div className="dialog-actions">
              <button type="button" onClick={() => setCancelling(false)}>
                {t("cancel")}
              </button>
              <button
                type="button"
                className="danger"
                disabled={!reason.trim() || cancelBusy}
                onClick={async () => {
                  setCancelBusy(true);
                  if (
                    await change(`/items/${key}/move`, {
                      status: "cancelled",
                      reason: reason.trim(),
                    })
                  ) {
                    setReason("");
                    setCancelling(false);
                    setCancelError(false);
                  } else {
                    setCancelError(true);
                  }
                  setCancelBusy(false);
                }}
              >
                {t("cancelItem")}
              </button>
            </div>
          </ManagedDialog>
        </div>
      )}
    </ManagedDialog>
  );
}
