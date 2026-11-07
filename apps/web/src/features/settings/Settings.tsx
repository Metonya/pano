import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Check,
  CircleHelp,
  Contrast,
  Settings as SettingsIcon,
} from "lucide-react";
import { useContext, useId, useState } from "react";
import { LanguageContext } from "@/app/Providers";
import { ManagedDialog } from "@/components/ManagedDialog";
import { Switch } from "@/components/Switch";
import { DialogTitle } from "@/components/ui/dialog";
import { queryKey, request } from "@/lib/api";
import { type Language, language, languages, t } from "@/lib/i18n";
import { setCurrentUser } from "@/lib/identity";
import "./settings.css";

type System = {
  version: string;
  buildDate: string;
  dataDir: string;
  dbSize: number;
  latestVersion?: string;
  updateAvailable: boolean;
  authRequired: boolean;
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
  const tabsId = useId();
  const [tab, setTab] = useState(0);
  const [languageError, setLanguageError] = useState(false);
  const setLanguage = useContext(LanguageContext);
  const [theme, setTheme] = useState(
    localStorage.getItem("pano-theme") || "auto",
  );
  const qc = useQueryClient();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [nameError, setNameError] = useState<
    "userNameInvalid" | "failed" | null
  >(null);
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
  function saveName() {
    const userName = nameDraft?.trim();
    if (!userName || userName === settings.data?.userName) {
      setNameDraft(null);
      setNameError(null);
      return;
    }
    if (userName.includes(":")) {
      setNameError("userNameInvalid");
      return;
    }
    void request("/settings", { userName }, "PATCH")
      .then((saved: { userName: string }) => {
        setCurrentUser(saved.userName);
        setNameDraft(null);
        setNameError(null);
        // The waiting lists depend on the name, so everything is read again.
        for (const key of [["settings"], ["system"], queryKey, ["board"]])
          void qc.invalidateQueries({ queryKey: key });
      })
      .catch(() => setNameError("failed"));
  }
  const tabs = [
    t("general"),
    t("appearance"),
    t("agentConnection"),
    t("about"),
  ];
  const icons = [SettingsIcon, Contrast, Bot, CircleHelp];
  const updatesOn = settings.data?.updateCheck !== "false";
  const mcpUrl = `${location.origin}/mcp`;
  return (
    <section className="app-settings">
      <DialogTitle className="settings-title">{tabs[tab]}</DialogTitle>
      <div
        role="tablist"
        aria-label={t("settings")}
        className="settings-tabs"
        onKeyDown={(event) => {
          const direction =
            event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
          if (!direction) return;
          event.preventDefault();
          const next = (tab + direction + tabs.length) % tabs.length;
          setTab(next);
          event.currentTarget
            .querySelectorAll<HTMLButtonElement>('[role="tab"]')
            [next]?.focus();
        }}
      >
        {tabs.map((name, i) => {
          const Icon = icons[i];
          return (
            <button
              type="button"
              role="tab"
              id={`${tabsId}-tab-${i}`}
              aria-controls={`${tabsId}-panel-${i}`}
              aria-selected={tab === i}
              tabIndex={tab === i ? 0 : -1}
              key={name}
              onClick={() => setTab(i)}
            >
              <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
              {name}
            </button>
          );
        })}
      </div>
      {tabs.map(
        (name, i) =>
          i !== tab && (
            <div
              key={name}
              role="tabpanel"
              id={`${tabsId}-panel-${i}`}
              aria-labelledby={`${tabsId}-tab-${i}`}
              hidden
            />
          ),
      )}
      <div
        role="tabpanel"
        id={`${tabsId}-panel-${tab}`}
        aria-labelledby={`${tabsId}-tab-${tab}`}
        className="settings-body"
      >
        {tab === 0 && (
          <div className="settings-grid">
            <label htmlFor="app-user-name">{t("userName")}:</label>
            <div className="settings-control">
              <input
                id="app-user-name"
                className="settings-name"
                maxLength={64}
                value={nameDraft ?? settings.data?.userName ?? ""}
                aria-invalid={!!nameError}
                onChange={(e) => {
                  setNameError(null);
                  setNameDraft(e.target.value);
                }}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                }}
              />
              <small>{t("userNameHelp")}</small>
              {nameError && <small role="alert">{t(nameError)}</small>}
            </div>
            <label htmlFor="app-language">{t("language")}:</label>
            <div className="settings-control">
              <select
                id="app-language"
                value={language()}
                onChange={(e) => {
                  const value = e.target.value as Language;
                  setLanguageError(false);
                  void setLanguage(value)
                    .then(() => save({ language: value }))
                    .catch(() => setLanguageError(true));
                }}
              >
                {languages.map((code) => (
                  <option key={code} value={code}>
                    {t(`languageName_${code}`)}
                  </option>
                ))}
              </select>
              <small>{t("languageHelp")}</small>
              {languageError && <small role="alert">{t("failed")}</small>}
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
                {system.data
                  ? t(
                      system.data.authRequired
                        ? "tokenNeeded"
                        : "tokenNotNeeded",
                    )
                  : t("unknownValue")}
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
                : t("unknownValue")}
            </span>
            <span>{t("dataDir")}</span>
            <code>{system.data?.dataDir}</code>
            <span>{t("database")}</span>
            <span>
              {system.data ? fileSize(system.data.dbSize) : t("unknownValue")}
            </span>
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
