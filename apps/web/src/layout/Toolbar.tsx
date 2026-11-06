import { Menu, Plus } from "lucide-react";
import { useLocation } from "react-router-dom";
import type { Project } from "@/lib/api";
import { t } from "@/lib/i18n";
export function Toolbar({
  all,
  archive,
  setMobile,
  setCreate,
}: {
  all: Project[];
  archive: boolean;
  setMobile: (v: boolean) => void;
  setCreate: (v: boolean) => void;
}) {
  const location = useLocation();
  return (
    <div className="toolbar">
      <button
        type="button"
        className="icon mobile-menu"
        aria-label={t("menu")}
        onClick={() => setMobile(true)}
      >
        <Menu size={20} />
      </button>
      <h1>
        {location.pathname === "/waiting"
          ? t("waiting")
          : location.pathname === "/settings"
            ? t("settings")
            : location.pathname.startsWith("/projects/")
              ? (all.find((p) => location.pathname === `/projects/${p.key}`)
                  ?.name ?? t("projects"))
              : archive
                ? t("archive")
                : t("projects")}
      </h1>
      <div id="page-toolbar-actions" />
      {location.pathname === "/" && (
        <>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setCreate(true);
            }}
          >
            <Plus size={16} />
            <span>{t("new")}</span>
          </button>
        </>
      )}
    </div>
  );
}
