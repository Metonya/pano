export type Row = Record<string, string | number | null>;
export type Values = Record<string, string | number | null>;
export type ItemRow = Row & {
  id: string;
  project_id: string;
  project_key: string;
  number: number;
  title: string;
  body_md: string;
  status: string;
  priority: string;
  assignee: string | null;
  position: number;
  seen_at: string | null;
  created_at: string;
  updated_at: string;
  done_at: string | null;
};
export type ChangeEvent = {
  projectId: string;
  itemId: string | null;
  kind: string;
  actor: string;
};
