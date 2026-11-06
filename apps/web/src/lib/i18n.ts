import strings from "../i18n/tr.json";
export const t = (key: keyof typeof strings) => strings[key];
