import type { Database } from "bun:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
export function migrate(db: Database) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, name TEXT NOT NULL)",
  );
  const dir = join(import.meta.dir, "../migrations");
  const files = readdirSync(dir)
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));
  for (const file of files) {
    const version = Number.parseInt(file, 10);
    db.transaction(() => {
      if (
        db
          .query("SELECT version FROM schema_version WHERE version = ?")
          .get(version)
      )
        return;
      db.exec(readFileSync(join(dir, file), "utf8"));
      db.query("INSERT INTO schema_version VALUES (?, ?)").run(version, file);
    }).immediate();
  }
}
