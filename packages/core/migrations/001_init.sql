-- Project settings and the next project-local item number.
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  starred INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  test_column INTEGER NOT NULL DEFAULT 1,
  ai_can_close INTEGER NOT NULL DEFAULT 1,
  dod_md TEXT NOT NULL DEFAULT '',
  next_number INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Items remain in the database when cancelled.
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'in_progress', 'test', 'done', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  assignee TEXT,
  position REAL NOT NULL,
  seen_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  done_at TEXT,
  UNIQUE (project_id, number)
);

-- Removed criteria and scenarios retain their history.
CREATE TABLE criteria (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  position REAL NOT NULL,
  removed_at TEXT
);

CREATE TABLE test_scenarios (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  steps_md TEXT NOT NULL,
  expected_md TEXT NOT NULL,
  result TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('pending', 'passed', 'failed')),
  author TEXT NOT NULL,
  position REAL NOT NULL,
  removed_at TEXT
);

-- Activity is retained until its project is explicitly purged.
CREATE TABLE activity (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  activity_id TEXT REFERENCES activity(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL
);

CREATE INDEX items_board_idx ON items(project_id, status, position);
CREATE INDEX activity_project_idx ON activity(project_id, created_at);
CREATE INDEX activity_item_idx ON activity(item_id, created_at);
CREATE INDEX criteria_item_idx ON criteria(item_id);
CREATE INDEX scenarios_item_idx ON test_scenarios(item_id);
