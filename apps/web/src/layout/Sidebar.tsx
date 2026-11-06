import { Archive, FolderKanban, Inbox, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import type { Project } from "@/lib/api";
import { t } from "@/lib/i18n";
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
  return (
    <>
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <div className="brand">
          <span className="brand-icon">
            <FolderKanban size={18} />
          </span>
          Pano{" "}
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
