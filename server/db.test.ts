import { describe, expect, it } from 'vitest'
import { openDb } from './db'

describe('openDb', () => {
  it('creates the schema tables', () => {
    const db = openDb()
    const names = (
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as { name: string }[]
    ).map((r) => r.name)
    expect(names).toEqual(expect.arrayContaining(['individual', 'term', 'term_alias', 'individual_term']))
  })

  it('cascades deletes from an individual to its term links only', () => {
    const db = openDb()
    db.exec("INSERT INTO individual (name) VALUES ('a')")
    db.exec("INSERT INTO term (canonical, norm, kind) VALUES ('React', 'react', 'skill')")
    db.exec("INSERT INTO individual_term VALUES (1, 1, 'experience')")
    db.exec('DELETE FROM individual WHERE id = 1')
    expect(db.prepare('SELECT COUNT(*) AS n FROM individual_term').get()).toEqual({ n: 0 })
    expect(db.prepare('SELECT COUNT(*) AS n FROM term').get()).toEqual({ n: 1 })
  })
})
