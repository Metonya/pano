import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AgentAvatar, AgentOption } from "@/features/agents/AgentAvatar";
import { agentInfo } from "@/features/agents/agentInfo";
import { t } from "@/lib/i18n";
import { agentName } from "./types";
import "./detail.css";

export function Property({
  label,
  shown,
  value,
  onChange,
  options,
  disabled,
  spoken,
  field,
}: Readonly<{
  label: string;
  shown: ReactNode;
  /** What the button says when the options alone do not tell it all. */
  spoken?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: ReactNode; text: string }[];
  disabled?: boolean;
  /** Drawn as a form field with a visible label, for use inside a form. */
  field?: boolean;
}>) {
  const text = spoken ?? options.find((o) => o.value === value)?.text ?? value;
  return (
    <div className={`sheet-property ${field ? "is-field" : ""}`}>
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

export type Priority = "high" | "medium" | "low";

export function PriorityProperty({
  value,
  onChange,
  field,
}: Readonly<{
  value: Priority;
  onChange: (priority: Priority) => void;
  field?: boolean;
}>) {
  return (
    <Property
      label={t("priority")}
      shown={t(value)}
      value={value}
      field={field}
      options={(["high", "medium", "low"] as const).map((p) => ({
        value: p,
        label: t(p),
        text: t(p),
      }))}
      onChange={(priority) => onChange(priority as Priority)}
    />
  );
}

function assigneeLabel(assignee: string | null) {
  if (!assignee)
    return <span className="sheet-unassigned">{t("unassigned")}</span>;
  const { name, role } = agentInfo(assignee);
  return (
    <>
      <span className="assignee sheet-assignee" title={assignee}>
        <AgentAvatar id={assignee} />
        {name}
      </span>
      {role && <small className="sheet-assignee-role">{role}</small>}
    </>
  );
}

export function AssigneeProperty({
  assignee,
  value,
  actors,
  onChange,
  field,
}: Readonly<{
  assignee: string | null;
  /** The menu line for this assignee; an empty string means unassigned. */
  value: string;
  actors: string[];
  onChange: (value: string) => void;
  field?: boolean;
}>) {
  return (
    <Property
      label={t("assignee")}
      shown={assigneeLabel(assignee)}
      spoken={assignee ? agentName(assignee) : undefined}
      value={value}
      field={field}
      options={[
        { value: "", label: t("unassigned"), text: t("unassigned") },
        ...actors.map((a) => ({
          value: a,
          label: <AgentOption id={a} />,
          text: agentInfo(a).name,
        })),
      ]}
      onChange={onChange}
    />
  );
}
