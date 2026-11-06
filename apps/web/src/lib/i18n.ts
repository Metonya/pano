import en from "../i18n/en.json";
export const languages = [
  "en",
  "tr",
  "az",
  "zh",
  "hi",
  "es",
  "de",
  "fr",
  "pt",
  "ja",
  "nl",
  "ko",
  "sv",
  "pl",
] as const;
export type Language = (typeof languages)[number];
export type TranslationKey = keyof typeof en;
type Dictionary = Record<TranslationKey, string>;

export const isLanguage = (value: unknown): value is Language =>
  typeof value === "string" && languages.includes(value as Language);

export function selectLanguage(
  stored: string | null,
  preferred: readonly string[],
): Language {
  if (isLanguage(stored)) return stored;
  for (const locale of preferred) {
    const base = locale.toLowerCase().split("-")[0];
    if (isLanguage(base)) return base;
  }
  return "en";
}

function browserLanguage(): Language {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem("pano-language");
  } catch {
    /* Storage can be blocked. */
  }
  return selectLanguage(
    stored,
    typeof navigator === "undefined"
      ? []
      : (navigator.languages ?? [navigator.language]),
  );
}

let current: Language = "en";
let dictionary: Dictionary = en;
let revision = 0;
const cache = new Map<Language, Dictionary>([["en", en]]);

export const language = (): Language => current;
export const t = (key: TranslationKey): string => dictionary[key] ?? en[key];

export async function setLanguage(
  value: Language,
  persist = true,
): Promise<void> {
  const request = ++revision;
  const next =
    cache.get(value) ??
    ((await import(`../i18n/${value}.json`)).default as Dictionary);
  cache.set(value, next);
  if (request !== revision) return;
  current = value;
  dictionary = next;
  if (persist) {
    try {
      localStorage.setItem("pano-language", value);
    } catch {
      /* Use the selection for this session. */
    }
  }
  if (typeof document !== "undefined") document.documentElement.lang = value;
}

export async function initializeLanguage(): Promise<void> {
  try {
    await setLanguage(browserLanguage(), false);
  } catch {
    await setLanguage("en", false);
  }
}
