/// <reference path="./sql.d.ts" />
import type { Database } from "bun:sqlite";
import initial from "../migrations/001_init.sql" with { type: "text" };
import indexes from "../migrations/002_purge_and_indexes.sql" with {
  type: "text",
};
import testing from "../migrations/003_testing.sql" with { type: "text" };

const migrations = [
  { version: 1, name: "001_init.sql", sql: initial },
  { version: 2, name: "002_purge_and_indexes.sql", sql: indexes },
  { version: 3, name: "003_testing.sql", sql: testing },
];
export function migrate(db: Database) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, name TEXT NOT NULL)",
  );
  for (const { version, name, sql } of migrations) {
    db.transaction(() => {
      if (
        db
          .query("SELECT version FROM schema_version WHERE version = ?")
          .get(version)
      )
        return;
      db.exec(sql);
      db.query("INSERT INTO schema_version VALUES (?, ?)").run(version, name);
    }).immediate();
  }
}
