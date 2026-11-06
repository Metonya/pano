import { Bot, Star } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ProjectSettings } from "@/features/testing/ProjectSettings";
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
  const [settings, setSettings] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <article
        className={large ? "project-card large" : "project-card compact"}
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
          <ProjectMenu
            p={p}
            open={menuOpen}
            onOpenChange={setMenuOpen}
            act={act}
            onDelete={onDelete}
            onSettings={() => setSettings(true)}
          />
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
