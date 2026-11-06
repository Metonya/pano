import { Bot, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { date, type Project, type ProjectAction } from "@/lib/api";
import { t } from "@/lib/i18n";
import { ProjectMenu } from "./ProjectMenu";
export function ProjectCard({
  p,
  archive,
  act,
  onDelete,
}: {
  p: Project;
  archive: boolean;
  act: ProjectAction;
  onDelete: (p: Project) => void;
}) {
  const large = !!p.starred && !archive;
  return (
    <article
      key={p.id}
      className={large ? "project-card large" : "project-card compact"}
      onContextMenu={(e) => {
        e.preventDefault();
        (
          e.currentTarget.querySelector(
            '[aria-haspopup="menu"]',
          ) as HTMLButtonElement | null
        )?.click();
      }}
    >
      <div className="card-head">
        <span className="project-icon">
          {p.name.slice(0, 1).toLocaleUpperCase("tr")}
        </span>
        <div className="project-title">
          <h3>
            <Link className="project-stretched-link" to={`/projects/${p.key}`}>
              {p.name}
            </Link>
          </h3>
          <span>
            {large
              ? p.key
              : `${p.counts.backlog + p.counts.in_progress + p.counts.test} ${t("open")} · ${date(p.updated_at)}`}
          </span>
        </div>
        <button
          type="button"
          className={`icon star ${p.starred ? "selected" : ""}`}
          aria-label={`${t(p.starred ? "unstar" : "star")} ${p.name}`}
          onClick={() => act(p, "star", !p.starred)}
        >
          <Star size={20} fill={p.starred ? "currentColor" : "none"} />
        </button>
        <ProjectMenu p={p} act={act} onDelete={onDelete} />
      </div>
      {large && (
        <>
          <p className="description">{p.description || t("noDescription")}</p>
          {p.waiting.length > 0 && (
            <Link className="wait-pill" to="/waiting">
              {p.waiting.length} {t("waitingTests")}
            </Link>
          )}
          <div className="counts">
            {[
              ["backlog", "Backlog"],
              ["in_progress", "In Progress"],
              ["test", "Test"],
              ["done", "Done"],
            ].map(([k, label]) => (
              <div key={k}>
                <strong>{p.counts[k]}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="card-foot">
            <span>
              {t("updated")}: {date(p.updated_at)}
            </span>
            <span>
              <Bot size={14} />{" "}
              {p.agents ? `${p.agents} ${t("agent")}` : t("noAgent")}
            </span>
          </div>
        </>
      )}
    </article>
  );
}
