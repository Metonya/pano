import { language } from "./i18n";
import { currentUser, setCurrentUser } from "./identity";
export type Item = {
  id: string;
  number: number;
  title: string;
  updated_at: string;
  assignee: string | null;
};
export type WaitingItem = Item & {
  priority: "high" | "medium" | "low";
  scenario_count: number;
  sent_by: string | null;
  sent_at: string;
};
export type Project = {
  id: string;
  key: string;
  name: string;
  description: string;
  starred: number;
  archived_at: string | null;
  updated_at: string;
  counts: Record<string, number>;
  waiting: WaitingItem[];
  agents: number;
  test_column: number;
  ai_can_close: number;
  dod_md: string;
  created_at: string;
};
export const queryKey = ["projects"];
const tokenKey = "pano:token";
export const getToken = () => localStorage.getItem(tokenKey) ?? "";
export function setToken(token: string) {
  localStorage.setItem(tokenKey, token);
}
export function authHeaders(token = getToken()): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
export function unauthorized(token: string) {
  if (token === getToken())
    window.dispatchEvent(new Event("pano:unauthorized"));
}
let loadingUser: Promise<void> | null = null;
/** Never rejects: without an answer writes go out unnamed and fail on their own. */
export async function ensureUser() {
  if (currentUser()) return currentUser();
  loadingUser ??= fetch("/api/v1/system", {
    headers: authHeaders(),
    signal: AbortSignal.timeout(3000),
  })
    .then((response) => (response.ok ? response.json() : null))
    .then((system) => {
      if (system?.userName) setCurrentUser(system.userName);
    })
    .catch(() => {})
    .finally(() => {
      loadingUser = null;
    });
  await loadingUser;
  return currentUser();
}
/** Percent-encoded because a header cannot carry names like Şükrü as they are. */
export async function actorHeaders(): Promise<Record<string, string>> {
  const user = await ensureUser();
  return user ? { "X-Pano-Actor": encodeURIComponent(user) } : {};
}
export async function request(path: string, body?: object, method = "POST") {
  const token = getToken();
  const actor = body ? await actorHeaders() : {};
  const response = await fetch(
    `/api/v1${path}`,
    body
      ? {
          method,
          headers: {
            ...authHeaders(token),
            "Content-Type": "application/json",
            ...actor,
          },
          body: JSON.stringify(body),
        }
      : { headers: authHeaders(token) },
  );
  if (response.status === 401) unauthorized(token);
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}
export const date = (value: string) =>
  new Intl.DateTimeFormat(language(), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
export const sorted = (items: Project[]) =>
  [...items].sort(
    (a, b) =>
      Number(b.starred) - Number(a.starred) ||
      b.updated_at.localeCompare(a.updated_at) ||
      a.key.localeCompare(b.key),
  );
export type ProjectAction = (
  project: Project,
  action: "star" | "archive",
  value: boolean,
) => void;
