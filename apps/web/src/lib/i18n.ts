import en from "../i18n/en.json";
import tr from "../i18n/tr.json";
export type Language = "tr" | "en";
export function language(): Language {
  if (typeof localStorage === "undefined" || typeof navigator === "undefined")
    return "tr";
  const stored = localStorage.getItem("pano-language");
  if (stored === "tr" || stored === "en") return stored;
  return navigator.language.toLowerCase().startsWith("tr") ? "tr" : "en";
}
export const t = (key: keyof typeof tr) =>
  (language() === "tr" ? tr : (en as Record<string, string>))[key] ?? tr[key];
