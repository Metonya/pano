import { useId, useState } from "react";
import { parseSnapshot, priorityLabel } from "@/features/board/format";
import { t } from "@/lib/i18n";
import { type DiffLine, lineDiff } from "./lineDiff";

export { parseSnapshot };

type Snapshot = Record<string, unknown>;
type Field = { name: string; label: string };

function DiffLines({
  lines,
  struck = false,
}: {
  lines: DiffLine[];
  struck?: boolean;
}) {
  return lines.map((line, index) => (
    <div
      // biome-ignore lint/suspicious/noArrayIndexKey: immutable diff lines retain their position.
      key={`${index}-${line.kind}`}
      className={`history-diff-line ${line.kind}`}
    >
      <span aria-hidden="true">
        {line.kind === "added" ? "+ " : line.kind === "removed" ? "− " : "  "}
      </span>
      <span className="sr-only">
        {line.kind === "added"
          ? t("historyAdded")
          : line.kind === "removed"
            ? t("historyRemoved")
            : ""}{" "}
      </span>
      {struck ? <del>{line.text}</del> : line.text}
    </div>
  ));
}

function FieldDiff({
  field,
  before,
  after,
  heading,
}: {
  field: Field;
  before: Snapshot;
  after: Snapshot;
  heading: boolean;
}) {
  const value = (v: unknown): string =>
    field.name === "priority"
      ? priorityLabel(v)
      : typeof v === "string"
        ? v
        : "";
  return (
    <section aria-label={field.label}>
      {heading && <h4>{field.label}</h4>}
      <DiffLines
        lines={lineDiff(value(before[field.name]), value(after[field.name]))}
      />
    </section>
  );
}

/** Short fields read as a change at a glance; long texts stay behind the toggle. */
export function DiffView({
  before,
  after,
}: {
  before: Snapshot;
  after: Snapshot;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const changed = ({ name }: Field) =>
    before[name] !== after[name] && (name in before || name in after);
  const short = [
    { name: "title", label: t("title") },
    { name: "priority", label: t("priority") },
    { name: "text", label: t("criteria") },
    { name: "steps_md", label: t("scenarioSteps") },
    { name: "expected_md", label: t("scenarioExpected") },
  ].filter(changed);
  const long = [
    { name: "body_md", label: t("description") },
    { name: "what_changed_md", label: t("whatChanged") },
    { name: "how_to_test_md", label: t("howToTest") },
  ].filter(changed);
  if (!short.length && !long.length) return null;
  return (
    <div className="history-diff">
      {short.map((field) => (
        <FieldDiff
          key={field.name}
          field={field}
          before={before}
          after={after}
          heading={short.length > 1}
        />
      ))}
      {!!long.length && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
        >
          {t(open ? "historyHideDiff" : "historyShowDiff")}
        </button>
      )}
      {open && !!long.length && (
        <div id={id}>
          {long.map((field) => (
            <FieldDiff
              key={field.name}
              field={field}
              before={before}
              after={after}
              heading
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** A deleted or added scenario/criterion: nothing to compare, only its text. */
export function ChildContent({
  kind,
  lines,
}: {
  kind: "added" | "removed";
  lines: string[];
}) {
  return (
    <div className="history-diff">
      <section>
        <DiffLines
          lines={lines.map((text) => ({ kind, text }))}
          struck={kind === "removed"}
        />
      </section>
    </div>
  );
}
