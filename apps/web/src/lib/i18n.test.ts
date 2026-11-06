import { afterEach, expect, test } from "bun:test";
import {
  initializeLanguage,
  language,
  languages,
  selectLanguage,
  setLanguage,
  t,
} from "./i18n";

afterEach(async () => {
  await setLanguage("en", false);
});

test("browser locale matches its supported base language", () => {
  for (const [locale, expected] of [
    ["en-US", "en"],
    ["pt-BR", "pt"],
    ["zh-TW", "zh"],
    ["de-AT", "de"],
    ["ru", "en"],
  ] as const) {
    expect(selectLanguage(null, [locale])).toBe(expected);
  }
  expect(selectLanguage(null, ["ru-RU", "ja-JP", "de-AT"])).toBe("ja");
  expect(selectLanguage(null, [])).toBe("en");
  expect(selectLanguage("invalid", ["de-AT"])).toBe("de");
  expect(selectLanguage("tr", ["ja-JP"])).toBe("tr");
  expect(selectLanguage("en", ["tr-TR"])).toBe("en");
  for (const code of languages)
    expect(selectLanguage(code, ["en-US"])).toBe(code);
});

test("selected dictionaries load before synchronous t changes", async () => {
  await setLanguage("de", false);
  expect(language()).toBe("de");
  expect(t("settings")).toBe("Einstellungen");
  await setLanguage("ja", false);
  expect(t("settings")).toBe("設定");
});

test("a missing translation falls back to English", async () => {
  await setLanguage("de", false);
  const dictionary = (await import("../i18n/de.json")).default;
  const original = dictionary.settings;
  try {
    delete (dictionary as Partial<typeof dictionary>).settings;
    expect(t("settings")).toBe("Settings");
  } finally {
    dictionary.settings = original;
  }
});

test("initialization without browser preferences uses English", async () => {
  await initializeLanguage();
  expect(language()).toBe("en");
});

test("the latest language selection wins concurrent loads", async () => {
  await Promise.all([setLanguage("pl", false), setLanguage("sv", false)]);
  expect(language()).toBe("sv");
  expect(t("settings")).toBe("Inställningar");
});
