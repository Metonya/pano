import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ManagedDialog } from "@/components/ManagedDialog";
import { DialogTitle } from "@/components/ui/dialog";
import { TestPanel } from "@/features/testing/TestPanel";
import { request } from "@/lib/api";
import { t } from "@/lib/i18n";
import { activityText } from "./format";
import { type BoardItem, type Detail, labels, type Status } from "./types";

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
    queryFn: () => request(`/items/${key}?history=true`),
    enabled: !!item,
  });
  const [tab, setTab] = useState<"detail" | "history">("detail");
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<string | null>(null);
  const [criterionText, setCriterionText] = useState("");
  const [criterion, setCriterion] = useState("");
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(false);
  const [testDirty, setTestDirty] = useState(false);
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
  return (
    <ManagedDialog
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
      <DialogTitle>
        #{item?.number} {item?.title}
      </DialogTitle>
      {d && (
        <div className="item-detail">
          <div className="detail-controls">
            <label>
              {t("status")}{" "}
              <select
                value={d.status}
                onChange={(e) =>
                  void change(`/items/${key}/move`, { status: e.target.value })
                }
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {labels[s]}
                  </option>
                ))}
                {d.status === "cancelled" && (
                  <option value="cancelled">{labels.cancelled}</option>
                )}
              </select>
            </label>
            <label>
              {t("priority")}{" "}
              <select
                value={d.priority}
                onChange={(e) =>
                  void change(
                    `/items/${key}`,
                    { priority: e.target.value },
                    "PATCH",
                  )
                }
              >
                <option value="high">{t("high")}</option>
                <option value="medium">{t("medium")}</option>
                <option value="low">{t("low")}</option>
              </select>
            </label>
            <label>
              {t("assignee")}{" "}
              <input
                defaultValue={d.assignee ?? ""}
                key={d.assignee ?? "empty"}
                onBlur={(e) => {
                  const value = e.target.value.trim() || null;
                  if (value !== d.assignee)
                    void change(`/items/${key}/assign`, { assignee: value });
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => setCancelling(!cancelling)}
              aria-label={t("actions")}
            >
              …
            </button>
          </div>
          {cancelling && (
            <div>
              <label>
                {t("cancelReason")}
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={!reason.trim()}
                onClick={async () => {
                  if (
                    await change(`/items/${key}/move`, {
                      status: "cancelled",
                      reason,
                    })
                  ) {
                    setReason("");
                    setCancelling(false);
                    close();
                  }
                }}
              >
                {t("cancelItem")}
              </button>
            </div>
          )}
          <div
            role="tablist"
            className="detail-tabs"
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
            <button
              type="button"
              role="tab"
              data-tab="detail"
              aria-selected={tab === "detail"}
              tabIndex={tab === "detail" ? 0 : -1}
              onClick={() => setTab("detail")}
            >
              {t("detail")}
            </button>
            <button
              type="button"
              role="tab"
              data-tab="history"
              aria-selected={tab === "history"}
              tabIndex={tab === "history" ? 0 : -1}
              onClick={() => setTab("history")}
            >
              {t("history")}
            </button>
          </div>
          {tab === "history" ? (
            <ul>
              {d.activity.map((a) => (
                <li key={a.id}>
                  {activityText(a)} ·{" "}
                  {new Date(a.created_at).toLocaleString("tr-TR")}
                </li>
              ))}
            </ul>
          ) : (
            <div role="tabpanel">
              {d.status === "test" && (
                <TestPanel
                  itemKey={key}
                  detail={d}
                  onDone={close}
                  onDirty={setTestDirty}
                />
              )}
              <h3>{t("criteria")}</h3>
              {d.criteria.map((c) => (
                <div className="criterion" key={c.id}>
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
                        aria-label={t("editCriterion")}
                        value={criterionText}
                        onChange={(e) => setCriterionText(e.target.value)}
                      />
                      <button
                        type="button"
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
                        onClick={() => setEditingCriterion(null)}
                      >
                        {t("cancel")}
                      </button>
                    </>
                  ) : (
                    <>
                      <span>{c.text}</span>
                      <button
                        type="button"
                        aria-label={`${t("editCriterion")}: ${c.text}`}
                        disabled={pending.includes(c.id)}
                        onClick={() => {
                          setCriterionText(c.text);
                          setEditingCriterion(c.id);
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label={`${t("deleteCriterion")}: ${c.text}`}
                        disabled={pending.includes(c.id)}
                        onClick={() => void mutateCriterion(c.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              ))}
              <form
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
                  aria-label={t("newCriterion")}
                  value={criterion}
                  onChange={(e) => setCriterion(e.target.value)}
                />
                <button type="submit" disabled={!criterion.trim()}>
                  {t("add")}
                </button>
              </form>
              <h3>{t("description")}</h3>
              {editing ? (
                <>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        await change(
                          `/items/${key}`,
                          { body_md: body },
                          "PATCH",
                        )
                      )
                        setEditing(false);
                    }}
                  >
                    {t("save")}
                  </button>
                </>
              ) : (
                <>
                  <div className="markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {d.body_md}
                    </ReactMarkdown>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBody(d.body_md);
                      setEditing(true);
                    }}
                  >
                    {t("edit")}
                  </button>
                </>
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="error">
              {t("failed")}
            </p>
          )}
        </div>
      )}
    </ManagedDialog>
  );
}
