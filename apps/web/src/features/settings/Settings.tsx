import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Check,
  CircleHelp,
  Contrast,
  Settings as SettingsIcon,
} from "lucide-react";
import { useContext, useState } from "react";
import { LanguageContext } from "@/app/Providers";
import { ManagedDialog } from "@/components/ManagedDialog";
import { Switch } from "@/components/Switch";
import { DialogTitle } from "@/components/ui/dialog";
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

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Copyable({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="settings-copy">
      <input aria-label={label} readOnly value={value} />
      <button
        type="button"
        className="settings-button"
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {t(copied ? "copied" : "copy")}
      </button>
    </div>
  );
}

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ManagedDialog
      open={open}
      onOpenChange={onOpenChange}
      className="settings-dialog"
      focusContent
    >
      <Settings />
    </ManagedDialog>
  );
}

function Settings() {
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
  const updatesOn = settings.data?.updateCheck !== "false";
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  const mcpUrl = `${location.origin}/mcp`;
  return (
    <section className="app-settings">
      <DialogTitle className="settings-title">{tabs[tab]}</DialogTitle>
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
              <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
              {name}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" aria-label={tabs[tab]} className="settings-body">
        {tab === 0 && (
          <div className="settings-grid">
            <label htmlFor="app-language">{t("language")}:</label>
            <div className="settings-control">
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
              <small>{t("languageHelp")}</small>
            </div>
            <span id="app-updates">{t("updatesLabel")}:</span>
            <div className="settings-control">
              <div className="settings-switch-row">
                <Switch
                  checked={updatesOn}
                  labelledBy="app-updates app-updates-text"
                  onChange={(updateCheck) => save({ updateCheck })}
                />
                <span id="app-updates-text">{t("updates")}</span>
              </div>
              <small>{t("updatesHelp")}</small>
            </div>
            <hr />
            <span>{t("version")}:</span>
            <div className="settings-control">
              <span>
                <strong>Pano v{system.data?.version}</strong>
                {system.data?.buildDate && (
                  <span className="settings-muted">
                    {" · build "}
                    {new Intl.DateTimeFormat(language(), {
                      dateStyle: "medium",
                    }).format(new Date(system.data.buildDate))}
                  </span>
                )}
              </span>
              {system.data &&
                (system.data.updateAvailable ? (
                  <div className="settings-update">
                    <strong>
                      {t("newVersion")}: {system.data.latestVersion}
                    </strong>
                    <a href="https://github.com/Metonya/pano/releases">
                      {t("releaseNotes")}
                    </a>
                    <span>
                      {t("updateCommand")}: <code>pano update</code> ·{" "}
                      <code>docker pull ghcr.io/metonya/pano:latest</code>
                    </span>
                  </div>
                ) : (
                  <span className="settings-ok">
                    <Check size={14} strokeWidth={2.6} aria-hidden="true" />
                    {t("upToDate")}
                  </span>
                ))}
            </div>
          </div>
        )}
        {tab === 1 && (
          <fieldset className="settings-grid">
            <legend>{t("theme")}:</legend>
            <div className="settings-control settings-theme-column">
              <div className="settings-themes">
                {(["light", "dark", "auto"] as const).map((value) => (
                  <label key={value}>
                    <span
                      aria-hidden="true"
                      className={`theme-preview ${value} ${theme === value ? "selected" : ""}`}
                    >
                      <i />
                      <b />
                    </span>
                    <span className="theme-option">
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
              <small>{t("themeHelp")}</small>
            </div>
          </fieldset>
        )}
        {tab === 2 && (
          <>
            <p className="settings-intro">{t("agentConnectionIntro")}</p>
            <div className="settings-grid">
              <span>MCP:</span>
              <div className="settings-control">
                <Copyable value={mcpUrl} label="MCP" />
                <small>{t("mcpHelp")}</small>
              </div>
              <span>Claude Code:</span>
              <div className="settings-control">
                <Copyable
                  value={`claude mcp add --transport http pano ${mcpUrl}`}
                  label="Claude Code"
                />
                <small>{t("claudeCodeHelp")}</small>
              </div>
              <span>{t("tokenLabel")}:</span>
              <span className="settings-muted">
                {t(local ? "tokenNotNeeded" : "tokenNeeded")}
              </span>
            </div>
          </>
        )}
        {tab === 3 && (
          <div className="settings-grid settings-about">
            <span>{t("version")}</span>
            <span>v{system.data?.version}</span>
            <span>Build</span>
            <span>
              {system.data?.buildDate
                ? new Intl.DateTimeFormat(language(), {
                    dateStyle: "medium",
                  }).format(new Date(system.data.buildDate))
                : "—"}
            </span>
            <span>{t("dataDir")}</span>
            <code>{system.data?.dataDir}</code>
            <span>{t("database")}</span>
            <span>{system.data ? fileSize(system.data.dbSize) : "—"}</span>
            <span>{t("license")}</span>
            <span>MIT</span>
            <span>{t("sourceCode")}</span>
            <a href="https://github.com/Metonya/pano">
              github.com/Metonya/pano
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
