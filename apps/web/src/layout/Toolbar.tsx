import { Menu, Plus } from "lucide-react";
import { useLocation } from "react-router-dom";
import type { Project } from "@/lib/api";
import { t } from "@/lib/i18n";
export function Toolbar({
  all,
  archive,
  setMobile,
  setCreate,
}: Readonly<{
  all: Project[];
  archive: boolean;
  setMobile: (v: boolean) => void;
  setCreate: (v: boolean) => void;
}>) {
  const location = useLocation();
  function title() {
    if (location.pathname === "/waiting") return t("waiting");
    if (location.pathname.startsWith("/projects/"))
      return (
        all.find((p) => location.pathname === `/projects/${p.key}`)?.name ??
        t("projects")
      );
    return archive ? t("archive") : t("projects");
  }
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
      <h1>{title()}</h1>
      <div id="page-toolbar-actions" />
      {/* /settings shows the settings window on top of the home page. */}
      {(location.pathname === "/" || location.pathname === "/settings") && (
        <button
          type="button"
          className="primary"
          aria-label={t("new")}
          onClick={() => {
            setCreate(true);
          }}
        >
          <Plus size={16} />
          <span>{t("new")}</span>
        </button>
      )}
    </div>
  );
}
