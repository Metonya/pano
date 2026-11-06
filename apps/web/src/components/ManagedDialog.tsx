import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { t } from "@/lib/i18n";

// Read-only dialogs use the defaults; forms supply their dirty state.
export function ManagedDialog({
  open,
  onOpenChange,
  dirty = false,
  permanentDelete = false,
  children,
  describedBy,
  className = "",
  hideClose,
  focusContent = false,
  onEscapeKeyDown,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dirty?: boolean;
  permanentDelete?: boolean;
  children: ReactNode;
  describedBy?: string;
  className?: string;
  // The PBI detail sheet draws its own close button in its header.
  hideClose?: boolean;
  // Settings windows open on the window itself; forms focus their first field.
  focusContent?: boolean;
  // Radix sees Esc on the document first; preventDefault keeps the dialog open.
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
}) {
  const [confirmClose, setConfirmClose] = useState(false);
  const continueButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) setConfirmClose(false);
  }, [open]);
  useEffect(() => {
    if (confirmClose) continueButton.current?.focus();
  }, [confirmClose]);
  const changeOpenRef = useRef(changeOpen);
  changeOpenRef.current = changeOpen;
  useEffect(() => {
    if (!open || permanentDelete) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('[data-slot="dialog-overlay"]'))
        changeOpenRef.current(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open, permanentDelete]);
  function changeOpen(next: boolean) {
    if (!next && dirty && !permanentDelete) {
      setConfirmClose(true);
    } else {
      setConfirmClose(false);
      onOpenChange(next);
    }
  }
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent
        showCloseButton={false}
        className={`dialog ${className}`}
        aria-describedby={describedBy}
        onEscapeKeyDown={onEscapeKeyDown}
        onOpenAutoFocus={
          focusContent
            ? (event) => {
                event.preventDefault();
                (event.currentTarget as HTMLElement).focus();
              }
            : undefined
        }
        // Outside clicks are handled from the overlay below; Radix can miss the
        // first one after a dialog has been reopened.
        onInteractOutside={(event) => event.preventDefault()}
      >
        {children}
        {/* After the content, so opening still focuses the first form field. */}
        {!(hideClose ?? className.includes("item-sheet")) && (
          <DialogClose asChild>
            <button
              type="button"
              className="dialog-close"
              aria-label={t("close")}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </DialogClose>
        )}
        {confirmClose && (
          <fieldset
            aria-label={t("discardQuestion")}
            className="discard-confirmation"
          >
            <p>{t("discardQuestion")}</p>
            <div className="dialog-actions">
              <button
                type="button"
                ref={continueButton}
                onClick={(event) => {
                  const form = event.currentTarget.closest('[role="dialog"]');
                  form?.querySelector<HTMLElement>("input, textarea")?.focus();
                  setConfirmClose(false);
                }}
              >
                {t("continueWriting")}
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  setConfirmClose(false);
                  onOpenChange(false);
                }}
              >
                {t("discardClose")}
              </button>
            </div>
          </fieldset>
        )}
      </DialogContent>
    </Dialog>
  );
}
