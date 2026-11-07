import type { CSSProperties } from "react";
import { agentInfo } from "./agentInfo";
import "./agents.css";
import { LOGO_VIEW_BOX } from "./logos";

/** The one avatar for people and agents. Decorative: the name sits beside it. */
export function AgentAvatar({ id }: Readonly<{ id: string }>) {
  const { color, darkColor, initial, logo } = agentInfo(id);
  const style = {
    ...(color && { "--avatar-bg": color }),
    ...(darkColor && { "--avatar-bg-dark": darkColor }),
  } as CSSProperties;
  return (
    <span className="assignee-avatar" aria-hidden="true" style={style}>
      {logo ? (
        <svg aria-hidden="true" viewBox={LOGO_VIEW_BOX} fill="currentColor">
          <path d={logo} />
        </svg>
      ) : (
        initial
      )}
    </span>
  );
}

/** An avatar with a tool or person name, as in assignee menus. */
export function AgentOption({ id }: Readonly<{ id: string }>) {
  return (
    <span className="agent-option">
      <AgentAvatar id={id} />
      {agentInfo(id).name}
    </span>
  );
}
