import { DatabaseSync } from 'node:sqlite'

export type Db = DatabaseSync

const SCHEMA = `
CREATE TABLE IF NOT EXISTS individual (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS term (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical TEXT NOT NULL,
  norm TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('value', 'skill')),
  section TEXT,
  category TEXT,
  definition TEXT,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'undefined')),
  builtin INTEGER NOT NULL DEFAULT 0,
  embedding TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (kind, norm)
);

CREATE TABLE IF NOT EXISTS term_alias (
  term_id INTEGER NOT NULL REFERENCES term(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  norm TEXT NOT NULL,
  PRIMARY KEY (term_id, norm)
);

CREATE TABLE IF NOT EXISTS individual_term (
  individual_id INTEGER NOT NULL REFERENCES individual(id) ON DELETE CASCADE,
  term_id INTEGER NOT NULL REFERENCES term(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('value', 'experience', 'desired')),
  PRIMARY KEY (individual_id, term_id, role)
);

CREATE INDEX IF NOT EXISTS idx_alias_norm ON term_alias(norm);
CREATE INDEX IF NOT EXISTS idx_individual_term_term ON individual_term(term_id);
`

export function openDb(path = ':memory:'): Db {
  const db = new DatabaseSync(path)
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(SCHEMA)
  return db
}
