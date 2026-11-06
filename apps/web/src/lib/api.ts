export type Item = {
  id: string;
  number: number;
  title: string;
  updated_at: string;
  assignee: string | null;
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
  waiting: Item[];
  agents: number;
  test_column: number;
  created_at: string;
};
export const queryKey = ["projects"];
export async function request(path: string, body?: object, method = "POST") {
  const response = await fetch(
    `/api/v1${path}`,
    body
      ? {
          method,
          headers: {
            "Content-Type": "application/json",
            "X-Pano-Actor": "mert",
          },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}
export const date = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
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
