import { FolderKanban } from "lucide-react";
import type { Project, ProjectAction } from "@/lib/api";
import { t } from "@/lib/i18n";
import { ProjectCard } from "./ProjectCard";
export function ProjectList({
  active,
  archived,
  archive,
  act,
  onDelete,
  onCreate,
}: {
  active: Project[];
  archived: Project[];
  archive: boolean;
  act: ProjectAction;
  onDelete: (p: Project) => void;
  onCreate: () => void;
}) {
  const projects = archive ? archived : active;
  const cards = (items: Project[]) =>
    items.map((p) => (
      <ProjectCard
        key={p.id}
        p={p}
        archive={archive}
        act={act}
        onDelete={onDelete}
      />
    ));
  return (
    <>
      <p className="summary">
        {active.length} {t("summaryActive")} · {archived.length}{" "}
        {t("summaryArchive")}
      </p>
      {!projects.length ? (
        <div className="state">
          <FolderKanban />
          <h2>{t(archive ? "emptyArchive" : "empty")}</h2>
          {!archive && (
            <>
              <p>{t("emptyHelp")}</p>
              <button type="button" className="primary" onClick={onCreate}>
                {t("new")}
              </button>
            </>
          )}
        </div>
      ) : archive ? (
        <section>
          <h2>{t("archive")}</h2>
          <div className="grid">{cards(projects)}</div>
        </section>
      ) : (
        <>
          {active.some((p) => p.starred) && (
            <section>
              <h2>{t("starred")}</h2>
              <div className="grid">
                {cards(active.filter((p) => p.starred))}
              </div>
            </section>
          )}
          {active.some((p) => !p.starred) && (
            <section>
              <h2>{t("others")}</h2>
              <div className="grid">
                {cards(active.filter((p) => !p.starred))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
