import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  CircleHelp,
  Contrast,
  Settings as SettingsIcon,
} from "lucide-react";
import { useContext, useState } from "react";
import { LanguageContext } from "@/app/Providers";
import { request } from "@/lib/api";
import { type Language, language, t } from "@/lib/i18n";
import "./settings.css";

type System = {
  version: string;
  buildDate: string;
  dataDir: string;
  dbSize: number;
  latestVersion?: string;
  updateAvailable: boolean;
};
export function Settings() {
  const [tab, setTab] = useState(0);
  const setLanguage = useContext(LanguageContext);
  const [theme, setTheme] = useState(
    localStorage.getItem("pano-theme") || "auto",
  );
  const qc = useQueryClient();
  const system = useQuery<System>({
    queryKey: ["system"],
    queryFn: () => request("/system"),
  });
  const settings = useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: () => request("/settings"),
  });
  function save(value: object) {
    void request("/settings", value, "PATCH").then(() =>
      qc.invalidateQueries({ queryKey: ["settings"] }),
    );
  }
  const tabs = [
    t("general"),
    t("appearance"),
    t("agentConnection"),
    t("about"),
  ];
  const icons = [SettingsIcon, Contrast, Bot, CircleHelp];
  return (
    <section className="app-settings">
      <div className="settings-title">{tabs[tab]}</div>
      <div role="tablist" aria-label={t("settings")} className="settings-tabs">
        {tabs.map((name, i) => {
          const Icon = icons[i];
          return (
            <button
              type="button"
              role="tab"
              aria-selected={tab === i}
              key={name}
              onClick={() => setTab(i)}
            >
              <Icon size={22} />
              {name}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="settings-body">
        {tab === 0 && (
          <div className="settings-grid">
            <label htmlFor="app-language">{t("language")}:</label>
            <select
              id="app-language"
              value={language()}
              onChange={(e) => {
                const value = e.target.value as Language;
                save({ language: value });
                setLanguage(value);
              }}
            >
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
            <span>{t("updates")}:</span>
            <label>
              <input
                type="checkbox"
                checked={settings.data?.updateCheck !== "false"}
                onChange={(e) => save({ updateCheck: e.target.checked })}
              />{" "}
              {t("updates")}
            </label>
            <span>{t("version")}:</span>
            <div>
              Pano v{system.data?.version}
              {system.data?.updateAvailable && (
                <p>
                  <b>
                    {t("newVersion")}: {system.data.latestVersion}
                  </b>{" "}
                  ?{" "}
                  <a href="https://github.com/Metonya/pano/releases">
                    {t("releaseNotes")}
                  </a>
                  <br />
                  {t("updateCommand")}: <code>pano update</code> /{" "}
                  <code>docker pull ghcr.io/metonya/pano:latest</code>
                </p>
              )}
            </div>
          </div>
        )}
        {tab === 1 && (
          <fieldset>
            <legend>{t("theme")}:</legend>
            <div className="settings-themes">
              {(["light", "dark", "auto"] as const).map((value) => (
                <label key={value}>
                  <span
                    className={`theme-preview ${value} ${theme === value ? "selected" : ""}`}
                  />
                  <span>
                    <input
                      type="radio"
                      name="theme"
                      checked={theme === value}
                      onChange={() => {
                        setTheme(value);
                        localStorage.setItem("pano-theme", value);
                        if (value === "auto")
                          delete document.documentElement.dataset.theme;
                        else document.documentElement.dataset.theme = value;
                        save({ theme: value });
                      }}
                    />
                    {t(value)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {tab === 2 && (
          <div className="settings-grid">
            <label htmlFor="mcp-url">MCP:</label>
            <div>
              <input id="mcp-url" readOnly value={`${location.origin}/mcp`} />
              <button
                type="button"
                onClick={() =>
                  void navigator.clipboard.writeText(`${location.origin}/mcp`)
                }
              >
                {t("copy")}
              </button>
            </div>
            <span>Claude Code:</span>
            <code>
              claude mcp add --transport http pano {location.origin}/mcp
            </code>
          </div>
        )}
        {tab === 3 && (
          <div className="settings-grid">
            <span>{t("version")}:</span>
            <span>v{system.data?.version}</span>
            <span>Build:</span>
            <span>
              {system.data?.buildDate
                ? new Intl.DateTimeFormat(language(), {
                    dateStyle: "medium",
                  }).format(new Date(system.data.buildDate))
                : "?"}
            </span>
            <span>{t("dataDir")}:</span>
            <span>{system.data?.dataDir}</span>
            <span>{t("database")}:</span>
            <span>{system.data?.dbSize} B</span>
            <span>{t("license")}:</span>
            <span>MIT</span>
            <span>{t("sourceCode")}:</span>
            <a href="https://github.com/Metonya/pano">
              github.com/Metonya/pano
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
