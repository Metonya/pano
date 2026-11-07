import { Star } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { relativeTime } from "@/features/board/format";
import { ProjectSettings } from "@/features/testing/ProjectSettings";
import { date, type Project, type ProjectAction } from "@/lib/api";
import { t } from "@/lib/i18n";
import { ProjectMenu } from "./ProjectMenu";

function UpdatedTime({ value }: Readonly<{ value: string }>) {
  return (
    <time dateTime={value} title={date(value)}>
      {relativeTime(value)}
    </time>
  );
}

export function ProjectCard({
  p,
  archive,
  act,
  onDelete,
}: Readonly<{
  p: Project;
  archive: boolean;
  act: ProjectAction;
  onDelete: (p: Project) => void;
}>) {
  const large = !!p.starred && !archive;
  const [settings, setSettings] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // The label may be cut on a narrow card, the time around it never is.
  const [updatedBefore, updatedAfter] = t("updatedAgo").split("{time}");
  return (
    <>
      <article
        className={`project-card ${large ? "large" : "compact"}${menuOpen ? " menu-open" : ""}`}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuOpen(true);
        }}
      >
        <div className="card-head">
          <span className="project-icon">
            {p.name.slice(0, 1).toLocaleUpperCase("tr")}
          </span>
          <div className="project-title">
            <h3>
              <Link
                className="project-stretched-link"
                to={`/projects/${p.key}`}
              >
                {p.name}
              </Link>
            </h3>
            {large ? (
              <span>{p.key}</span>
            ) : (
              <span className="card-info">
                <span className="card-info-count">
                  {p.counts.backlog + p.counts.in_progress + p.counts.test}{" "}
                  {t("open")}
                </span>
                <span aria-hidden="true">·</span>
                <UpdatedTime value={p.updated_at} />
              </span>
            )}
          </div>
          <div className="card-actions">
            <button
              type="button"
              className={`icon star ${p.starred ? "selected" : ""}`}
              aria-label={`${t(p.starred ? "unstar" : "star")} ${p.name}`}
              onClick={() => act(p, "star", !p.starred)}
            >
              <Star size={20} fill={p.starred ? "currentColor" : "none"} />
            </button>
            <ProjectMenu
              p={p}
              open={menuOpen}
              onOpenChange={setMenuOpen}
              act={act}
              onDelete={onDelete}
              onSettings={() => setSettings(true)}
            />
          </div>
        </div>
        {large && (
          <>
            {p.description.trim() && (
              <p className="description">{p.description}</p>
            )}
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
              <span className="foot-updated">
                <span>{updatedBefore}</span>
                <UpdatedTime value={p.updated_at} />
                <span>{updatedAfter}</span>
              </span>
              <span className={`foot-agents${p.agents ? " is-active" : ""}`}>
                <span className="foot-dot" aria-hidden="true" />
                {t("activeAgents").replace("{count}", String(p.agents))}
              </span>
            </div>
          </>
        )}
      </article>
      {/* Outside the article: its context menu handler would catch portal events. */}
      {settings && (
        <ProjectSettings
          project={p}
          testCount={p.counts.test ?? 0}
          close={() => setSettings(false)}
        />
      )}
    </>
  );
}
