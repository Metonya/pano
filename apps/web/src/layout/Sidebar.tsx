import { useQuery } from "@tanstack/react-query";
import { Archive, FolderKanban, Inbox, Settings, Star } from "lucide-react";
import { useEffect, useReducer } from "react";
import { Link, useLocation } from "react-router-dom";
import { relativeTime } from "@/features/board/format";
import type { BoardItem } from "@/features/board/types";
import type { Project } from "@/lib/api";
import { request } from "@/lib/api";
import { t } from "@/lib/i18n";
import { latestPerAgent, silentMinutes } from "./agents";

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
  const { pathname } = useLocation();
  const system = useQuery<{ updateAvailable: boolean; latestVersion?: string }>(
    {
      queryKey: ["system"],
      refetchInterval: 60000,
      queryFn: () => request("/system"),
    },
  );
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
  // Elapsed time must advance even when no SSE event refreshes the query.
  const [, tick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, []);
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
          title={t("waitingHelp")}
          aria-current={pathname === "/waiting" ? "page" : undefined}
          onClick={() => setMobile(false)}
        >
          <Inbox size={18} />
          <span>{t("waiting")}</span>
          {waiting > 0 && <b>{waiting}</b>}
        </Link>
        <div className="nav-group">
          <button
            type="button"
            className="nav-label nav-button"
            onClick={() => showArchive(false)}
          >
            {t("projects")}
          </button>
          {/* `active` comes from sorted(), which puts starred projects first. */}
          {active.map((p) => {
            const to = `/projects/${p.key}`;
            return (
              <Link
                className="nav-project"
                key={p.id}
                to={to}
                aria-current={pathname === to ? "page" : undefined}
                onClick={() => setMobile(false)}
              >
                <span className="small-icon">{p.name[0]}</span>
                <span className="nav-project-name">{p.name}</span>
                {!!p.starred && (
                  <span
                    className="nav-star"
                    role="img"
                    aria-label={t("starred")}
                  >
                    <Star size={12} fill="currentColor" aria-hidden="true" />
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        {!!agents.data?.length && (
          <div className="nav-group">
            <div className="nav-label">{t("agents")}</div>
            {latestPerAgent(agents.data).map(({ name, item, project }) => {
              const silent = silentMinutes(item.last_activity);
              return (
                <Link
                  className={`nav-project agent-row ${silent === null ? "" : "is-silent"}`}
                  key={name}
                  to={`/projects/${project.key}`}
                >
                  <i className="agent-dot" aria-hidden="true" />
                  <span>{name}</span>
                  <small>
                    {silent === null
                      ? `#${item.number} · ${relativeTime(item.last_activity)}`
                      : `${silent} ${t("silent")}`}
                  </small>
                </Link>
              );
            })}
          </div>
        )}
        <div className="nav-bottom">
          {system.data?.updateAvailable && (
            <Link to="/settings">
              {t("newVersion")}: {system.data.latestVersion}
            </Link>
          )}
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
