import { useQuery } from "@tanstack/react-query";
import { Archive, FolderKanban, Inbox, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { agentName, type BoardItem } from "@/features/board/types";
import type { Project } from "@/lib/api";
import { request } from "@/lib/api";
import { t } from "@/lib/i18n";

const SILENT_MINUTES = 30;
export function Sidebar({
  mobile,
  setMobile,
  active,
  archived,
  waiting,
  showArchive,
}: {
  mobile: boolean;
  setMobile: (v: boolean) => void;
  active: Project[];
  archived: Project[];
  waiting: number;
  showArchive: (v: boolean) => void;
}) {
  const agents = useQuery<{ item: BoardItem; project: Project }[]>({
    queryKey: ["board", "agents", active.map((p) => p.key).join(",")],
    queryFn: async () =>
      (
        await Promise.all(
          active.map(async (project) =>
            (
              (await request(
                `/projects/${project.key}/items?status=in_progress`,
              )) as BoardItem[]
            )
              .filter((item) => item.assignee)
              .map((item) => ({ item, project })),
          ),
        )
      ).flat(),
  });
  return (
    <>
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <div className="brand">
          <Link
            className="brand-link"
            to="/"
            onClick={() => showArchive(false)}
          >
            <span className="brand-icon">
              <FolderKanban size={18} />
            </span>
            {t("brand")}
          </Link>
          <button
            type="button"
            className="icon mobile-close"
            aria-label={t("close")}
            onClick={() => setMobile(false)}
          >
            ×
          </button>
        </div>
        <Link
          className={waiting ? "waiting-nav" : "waiting-nav is-empty"}
          to="/waiting"
          onClick={() => setMobile(false)}
        >
          <Inbox size={18} />
          <span>{t("waiting")}</span>
          {waiting > 0 && <b>{waiting}</b>}
        </Link>
        {active.some((p) => p.starred) && (
          <div className="nav-group">
            <div className="nav-label">{t("starred")}</div>
            {active
              .filter((p) => p.starred)
              .map((p) => (
                <Link
                  className="nav-project"
                  key={p.id}
                  to={`/projects/${p.key}`}
                  onClick={() => setMobile(false)}
                >
                  <span className="small-icon">{p.name[0]}</span>
                  {p.name}
                </Link>
              ))}
          </div>
        )}
        <div className="nav-group">
          <button
            type="button"
            className="nav-label nav-button"
            onClick={() => showArchive(false)}
          >
            {t("projects")}
          </button>
          {active
            .filter((p) => !p.starred)
            .map((p) => (
              <Link
                className="nav-project"
                key={p.id}
                to={`/projects/${p.key}`}
                onClick={() => setMobile(false)}
              >
                <span className="small-icon">{p.name[0]}</span>
                {p.name}
              </Link>
            ))}
        </div>
        {!!agents.data?.length && (
          <div className="nav-group">
            <div className="nav-label">{t("agents")}</div>
            {agents.data.map(({ item, project }) => {
              const minutes = Math.floor(
                (Date.now() - new Date(item.last_activity).getTime()) / 60000,
              );
              return (
                <Link
                  className="nav-project agent-row"
                  key={item.id}
                  to={`/projects/${project.key}`}
                >
                  <span>{agentName(item.assignee ?? "")}</span>
                  {minutes >= SILENT_MINUTES && (
                    <small>
                      {minutes} {t("silent")}
                    </small>
                  )}
                </Link>
              );
            })}
          </div>
        )}
        <div className="nav-bottom">
          <button type="button" onClick={() => showArchive(true)}>
            <Archive size={18} />
            {t("archive")} <span>{archived.length}</span>
          </button>
          <Link to="/settings" onClick={() => setMobile(false)}>
            <Settings size={18} />
            {t("settings")}
          </Link>
        </div>
      </aside>
      {mobile && (
        <button
          type="button"
          className="mobile-scrim"
          aria-label={t("close")}
          onClick={() => setMobile(false)}
        />
      )}
    </>
  );
}
