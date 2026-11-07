import { agentInfo } from "./agentInfo";
import "./agents.css";

/** The one avatar for people and agents. Decorative: the name sits beside it. */
export function AgentAvatar({ id }: { id: string }) {
  const { color, initial, logo, name } = agentInfo(id);
  return (
    <span
      className="assignee-avatar"
      aria-hidden="true"
      style={color ? { background: color } : undefined}
    >
      {logo ? (
        <svg
          role="img"
          aria-label={name}
          viewBox="0 0 24 24"
          width="10"
          height="10"
          fill="currentColor"
        >
          <path d={logo} />
        </svg>
      ) : (
        initial
      )}
    </span>
  );
}

/** An avatar with a tool or person name, as in assignee menus. */
export function AgentOption({ id }: { id: string }) {
  return (
    <span className="agent-option">
      <AgentAvatar id={id} />
      {agentInfo(id).name}
    </span>
  );
}
