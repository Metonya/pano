-- Independent audit entries survive the project and its activity.
CREATE TABLE IF NOT EXISTS purge_log (
  project_key TEXT NOT NULL,
  project_name TEXT NOT NULL,
  actor TEXT NOT NULL,
  purged_at TEXT NOT NULL,
  item_count INTEGER NOT NULL
);

-- Existing version 1 databases receive the same lookup indexes.
CREATE INDEX IF NOT EXISTS items_board_idx ON items(project_id, status, position);
CREATE INDEX IF NOT EXISTS activity_project_idx ON activity(project_id, created_at);
CREATE INDEX IF NOT EXISTS activity_item_idx ON activity(item_id, created_at);
CREATE INDEX IF NOT EXISTS criteria_item_idx ON criteria(item_id);
CREATE INDEX IF NOT EXISTS scenarios_item_idx ON test_scenarios(item_id);

-- Existing version 1 databases lack CHECK constraints; enforce the same
-- allowed values on subsequent writes without rebuilding their tables.
CREATE TRIGGER IF NOT EXISTS items_validate_insert BEFORE INSERT ON items
WHEN NEW.status NOT IN ('backlog', 'in_progress', 'test', 'done', 'cancelled')
  OR NEW.priority NOT IN ('high', 'medium', 'low')
BEGIN SELECT RAISE(ABORT, 'Invalid item status or priority'); END;
CREATE TRIGGER IF NOT EXISTS items_validate_update BEFORE UPDATE OF status, priority ON items
WHEN NEW.status NOT IN ('backlog', 'in_progress', 'test', 'done', 'cancelled')
  OR NEW.priority NOT IN ('high', 'medium', 'low')
BEGIN SELECT RAISE(ABORT, 'Invalid item status or priority'); END;
CREATE TRIGGER IF NOT EXISTS scenarios_validate_insert BEFORE INSERT ON test_scenarios
WHEN NEW.result NOT IN ('pending', 'passed', 'failed')
BEGIN SELECT RAISE(ABORT, 'Invalid scenario result'); END;
CREATE TRIGGER IF NOT EXISTS scenarios_validate_update BEFORE UPDATE OF result ON test_scenarios
WHEN NEW.result NOT IN ('pending', 'passed', 'failed')
BEGIN SELECT RAISE(ABORT, 'Invalid scenario result'); END;
