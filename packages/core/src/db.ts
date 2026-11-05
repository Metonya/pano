import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
export function openDatabase(path?: string) {
  const directory = process.env.PANO_DATA_DIR || join(homedir(), ".pano");
  if (!path) mkdirSync(directory, { recursive: true });
  const db = new Database(path ?? join(directory, "pano.db"), { create: true });
  db.exec(
    "PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;",
  );
  return db;
}
