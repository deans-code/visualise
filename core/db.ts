import initSqlJs, { type Database as SqlDatabase, type SqlJsStatic, type SqlValue } from 'sql.js'

/** One result row. Callers cast to the shape their query returns. */
export type Row = Record<string, unknown>

export interface RunResult {
  /** Rows inserted, updated or deleted by the statement. */
  changes: number
  lastInsertRowid: number
}

export interface Statement {
  run(...params: unknown[]): RunResult
  get(...params: unknown[]): Row | undefined
  all(...params: unknown[]): Row[]
}

/**
 * The slice of a SQLite database the application uses. It deliberately matches the shape of node:sqlite's
 * DatabaseSync (positional `?` parameters, `run`/`get`/`all`) so the dictionary, individuals and graph code did
 * not have to change when the engine moved from a Node server to WebAssembly in the browser.
 */
export interface Db {
  exec(sql: string): void
  prepare(sql: string): Statement
  /** True between BEGIN and COMMIT or ROLLBACK. */
  readonly isTransaction: boolean
  /** The whole database as bytes, for saving. */
  export(): Uint8Array
}

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

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alias_norm ON term_alias(norm);
CREATE INDEX IF NOT EXISTS idx_individual_term_term ON individual_term(term_id);
`

let sql: SqlJsStatic | null = null
let loading: Promise<SqlJsStatic> | null = null

export interface EngineOptions {
  /** Where the browser fetches the WebAssembly file from (a base-path-aware URL). */
  wasmUrl?: string
  /** The WebAssembly bytes themselves, for Node and tests where nothing is fetched. */
  wasmBinary?: ArrayBuffer | Uint8Array
}

/** Load the SQLite WebAssembly module. Call once, and await it, before the first `openDb`. */
export function initDatabaseEngine(options: EngineOptions = {}): Promise<SqlJsStatic> {
  if (sql) return Promise.resolve(sql)
  loading ??= initSqlJs({
    ...(options.wasmUrl ? { locateFile: () => options.wasmUrl! } : {}),
    ...(options.wasmBinary ? { wasmBinary: options.wasmBinary as ArrayBuffer } : {}),
  }).then((s) => (sql = s))
  return loading
}

const toParam = (v: unknown): SqlValue => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : (v as SqlValue))

class Adapter implements Db {
  isTransaction = false
  constructor(private readonly raw: SqlDatabase) {}

  exec(text: string) {
    const head = /^\s*(BEGIN|COMMIT|END|ROLLBACK)\b/i.exec(text)?.[1].toUpperCase()
    this.raw.exec(text)
    if (head === 'BEGIN') this.isTransaction = true
    else if (head) this.isTransaction = false
  }

  prepare(text: string): Statement {
    const raw = this.raw
    const withStatement = <T>(params: unknown[], use: (st: ReturnType<SqlDatabase['prepare']>) => T): T => {
      const st = raw.prepare(text)
      try {
        st.bind(params.map(toParam))
        return use(st)
      } finally {
        st.free()
      }
    }
    return {
      run: (...params) =>
        withStatement(params, (st) => {
          while (st.step()) {
            /* drain: a RETURNING or SELECT statement run for effect */
          }
          const changes = raw.getRowsModified()
          const id = raw.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0]
          return { changes, lastInsertRowid: Number(id ?? 0) }
        }),
      get: (...params) => withStatement(params, (st) => (st.step() ? (st.getAsObject() as Row) : undefined)),
      all: (...params) =>
        withStatement(params, (st) => {
          const rows: Row[] = []
          while (st.step()) rows.push(st.getAsObject() as Row)
          return rows
        }),
    }
  }

  export() {
    const bytes = this.raw.export()
    // sql.js reopens the connection to export, which silently turns foreign keys back off.
    this.raw.exec('PRAGMA foreign_keys = ON')
    return bytes
  }
}

/** Open a database, empty or from bytes saved by `export()`. `initDatabaseEngine` must have resolved. */
export function openDb(data?: Uint8Array): Db {
  if (!sql) throw new Error('initDatabaseEngine() must be awaited before opening a database')
  const raw = data ? new sql.Database(data) : new sql.Database()
  raw.exec('PRAGMA foreign_keys = ON')
  raw.exec(SCHEMA)
  return new Adapter(raw)
}
