import { useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { type Project, queryKey, request } from "@/lib/api";
import { t } from "@/lib/i18n";
export function CreateProjectDialog({
  create,
  setCreate,
  all,
}: {
  create: boolean;
  setCreate: (v: boolean) => void;
  all: Project[];
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [formError, setFormError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!name.trim()) return setFormError(t("required"));
    if (!/^[A-Z0-9]{2,10}$/.test(key)) return setFormError(t("invalidKey"));
    if (all.some((p) => p.key === key)) return setFormError(t("duplicate"));
    try {
      await request("/projects", { name: name.trim(), key });
      setCreate(false);
      setName("");
      setKey("");
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
    if (!open) setFormError("");
    setCreate(open);
  }
  return (
    <Dialog open={create} onOpenChange={changeOpen}>
      <DialogContent showCloseButton={false} className="dialog">
        <DialogTitle>{t("new")}</DialogTitle>
        <DialogDescription>{t("emptyHelp")}</DialogDescription>
        <form onSubmit={submit}>
          <label htmlFor="name">{t("name")}</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <label htmlFor="key">{t("key")}</label>
          <input
            id="key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            aria-invalid={!!formError}
            aria-describedby={formError ? "form-error" : undefined}
          />
          {formError && (
            <p id="form-error" className="error" role="alert">
              {formError}
            </p>
          )}
          <div className="dialog-actions">
            <button type="button" onClick={() => changeOpen(false)}>
              {t("cancel")}
            </button>
            <button className="primary" type="submit">
              {t("create")}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
