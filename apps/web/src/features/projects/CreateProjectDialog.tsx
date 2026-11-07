import { useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { ManagedDialog } from "@/components/ManagedDialog";
import { DialogClose, DialogTitle } from "@/components/ui/dialog";
import { type Project, queryKey, request } from "@/lib/api";
import { t } from "@/lib/i18n";
export function CreateProjectDialog({
  create,
  setCreate,
  all,
}: Readonly<{
  create: boolean;
  setCreate: (v: boolean) => void;
  all: Project[];
}>) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [formError, setFormError] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [manualKey, setManualKey] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  useEffect(() => {
    if (!create || manualKey || !name.trim()) return;
    let current = true;
    const timer = setTimeout(async () => {
      try {
        const suggestion = await request(
          `/projects/suggest-key?name=${encodeURIComponent(name)}`,
        );
        if (current) setKey(suggestion.key);
      } catch {
        if (current) setFormError(t("failed"));
      } finally {
        if (current) setSuggesting(false);
      }
    }, 200);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [create, name, manualKey]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!name.trim()) return setFormError(t("required"));
    if (suggesting) return;
    if (!/^[A-Z0-9]{2,10}$/.test(key)) return setFormError(t("invalidKey"));
    if (all.some((p) => p.key === key)) return setFormError(t("duplicate"));
    try {
      await request("/projects", { name: name.trim(), key });
      changeOpen(false);
      await qc.invalidateQueries({ queryKey });
    } catch (error) {
      setFormError(
        error instanceof Error && error.message === "409"
          ? t("duplicate")
          : t("failed"),
      );
    }
  }
  function changeOpen(open: boolean) {
    if (!open) {
      setFormError("");
      setName("");
      setKey("");
      setShowKey(false);
      setManualKey(false);
      setSuggesting(false);
    }
    setCreate(open);
  }
  return (
    <ManagedDialog
      open={create}
      onOpenChange={changeOpen}
      dirty={!!name || (manualKey && !!key)}
    >
      <DialogTitle>{t("new")}</DialogTitle>
      <form onSubmit={submit}>
        <label htmlFor="name">{t("name")}</label>
        <input
          id="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!manualKey) {
              setKey("");
              setSuggesting(!!e.target.value.trim());
            }
          }}
        />
        {name.trim() && key && (
          <p className="key-hint">
            {t("keyHint").replaceAll("{key}", key)} ·{" "}
            <button type="button" onClick={() => setShowKey(true)}>
              {t("changeKey")}
            </button>
          </p>
        )}
        {showKey && (
          <>
            <label htmlFor="key">{t("key")}</label>
            <input
              id="key"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setManualKey(true);
                setSuggesting(false);
              }}
              aria-invalid={!!formError}
              aria-describedby={formError ? "form-error" : undefined}
            />
          </>
        )}
        {formError && (
          <p id="form-error" className="error" role="alert">
            {formError}
          </p>
        )}
        <div className="dialog-actions">
          <DialogClose asChild>
            <button type="button">{t("cancel")}</button>
          </DialogClose>
          <button className="primary" type="submit" disabled={suggesting}>
            {t("create")}
          </button>
        </div>
      </form>
    </ManagedDialog>
  );
}
