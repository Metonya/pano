import { useId, useState } from "react";
import { t } from "@/lib/i18n";
import { lineDiff } from "./lineDiff";

export function parseSnapshot(value: string | null): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export function DiffView({
  before,
  after,
  criterion = false,
}: {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  criterion?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const fields = [
    ["title", t("title")],
    ["body_md", t("description")],
    ["text", t("criteria")],
    ["criteria", t("criteria")],
  ].filter(
    ([field]) =>
      (field !== "text" || criterion) &&
      before[field] !== after[field] &&
      (field in before || field in after),
  );
  if (!fields.length) return null;
  const value = (v: unknown): string =>
    typeof v === "string" ? v : v == null ? "" : JSON.stringify(v, null, 2);
  return (
    <div className="history-diff">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        {t(open ? "historyHideDiff" : "historyShowDiff")}
      </button>
      {open && (
        <div id={id}>
          {fields.map(([field, label]) => (
            <section key={field} aria-label={label}>
              <h4>{label}</h4>
              {lineDiff(value(before[field]), value(after[field])).map(
                (line, index) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: immutable diff lines retain their position while expanded.
                    key={`${index}-${line.kind}`}
                    className={`history-diff-line ${line.kind}`}
                  >
                    <span aria-hidden="true">
                      {line.kind === "added"
                        ? "+ "
                        : line.kind === "removed"
                          ? "− "
                          : "  "}
                    </span>
                    <span className="sr-only">
                      {line.kind === "added"
                        ? t("historyAdded")
                        : line.kind === "removed"
                          ? t("historyRemoved")
                          : ""}{" "}
                    </span>
                    {line.text}
                  </div>
                ),
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
