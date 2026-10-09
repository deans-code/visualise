import { describe, expect, it } from 'vitest'
import { openDb } from './db'

describe('openDb', () => {
  it('creates the schema tables', () => {
    const db = openDb()
    const names = (
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as { name: string }[]
    ).map((r) => r.name)
    expect(names).toEqual(expect.arrayContaining(['individual', 'term', 'term_alias', 'individual_term', 'meta']))
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

describe('statements', () => {
  it('reports changes and the last inserted row id', () => {
    const db = openDb()
    const a = db.prepare('INSERT INTO individual (name) VALUES (?)').run('a')
    const b = db.prepare('INSERT INTO individual (name) VALUES (?)').run('b')
    expect(a).toEqual({ changes: 1, lastInsertRowid: 1 })
    expect(b.lastInsertRowid).toBe(2)
    expect(db.prepare('UPDATE individual SET name = ? WHERE id = ?').run('z', 99).changes).toBe(0)
    expect(db.prepare('UPDATE individual SET name = upper(name)').run().changes).toBe(2)
    expect(db.prepare('DELETE FROM individual WHERE id = ?').run(1).changes).toBe(1)
  })

  it('binds positional and numbered parameters, nulls and undefined', () => {
    const db = openDb()
    db.prepare('INSERT INTO term (canonical, norm, kind, section) VALUES (?, ?, ?, ?)').run('React', 'react', 'skill', undefined)
    const row = db.prepare('SELECT canonical, section FROM term WHERE kind = ?1 AND (?2 IS NULL OR norm = ?2)').get('skill', null)
    expect(row).toEqual({ canonical: 'React', section: null })
    expect(db.prepare('SELECT 1 AS x FROM term WHERE norm = ?').get('nope')).toBeUndefined()
  })

  it('returns every row from all(), and matches COLLATE NOCASE and LIKE case-insensitively', () => {
    const db = openDb()
    for (const n of ['beta', 'Alpha', 'gamma']) db.prepare('INSERT INTO individual (name) VALUES (?)').run(n)
    expect(db.prepare('SELECT name FROM individual ORDER BY name COLLATE NOCASE').all().map((r) => r.name)).toEqual([
      'Alpha',
      'beta',
      'gamma',
    ])
    expect(db.prepare("SELECT name FROM individual WHERE name LIKE '%ALP%' COLLATE NOCASE").all()).toEqual([{ name: 'Alpha' }])
  })

  it('enforces CHECK and UNIQUE constraints', () => {
    const db = openDb()
    expect(() => db.prepare("INSERT INTO term (canonical, norm, kind) VALUES ('x', 'x', 'bogus')").run()).toThrow()
    db.prepare("INSERT INTO term (canonical, norm, kind) VALUES ('x', 'x', 'skill')").run()
    expect(() => db.prepare("INSERT INTO term (canonical, norm, kind) VALUES ('X', 'x', 'skill')").run()).toThrow()
  })
})

describe('transactions', () => {
  it('tracks the open transaction, commits and rolls back', () => {
    const db = openDb()
    expect(db.isTransaction).toBe(false)
    db.exec('BEGIN')
    expect(db.isTransaction).toBe(true)
    db.prepare('INSERT INTO individual (name) VALUES (?)').run('kept')
    db.exec('COMMIT')
    expect(db.isTransaction).toBe(false)

    db.exec('BEGIN')
    db.prepare('INSERT INTO individual (name) VALUES (?)').run('dropped')
    db.exec('ROLLBACK')
    expect(db.isTransaction).toBe(false)
    expect(db.prepare('SELECT name FROM individual').all()).toEqual([{ name: 'kept' }])
  })
})

describe('export and reopen', () => {
  it('round-trips the data through bytes', () => {
    const db = openDb()
    db.prepare('INSERT INTO individual (name) VALUES (?)').run('alex')
    const reopened = openDb(db.export())
    expect(reopened.prepare('SELECT name FROM individual').all()).toEqual([{ name: 'alex' }])
  })

  it('keeps foreign keys on after exporting, and after reopening', () => {
    const db = openDb()
    db.exec("INSERT INTO individual (name) VALUES ('a')")
    db.exec("INSERT INTO term (canonical, norm, kind) VALUES ('React', 'react', 'skill')")
    db.exec("INSERT INTO individual_term VALUES (1, 1, 'experience')")
    db.export() // sql.js reopens the connection inside export()
    db.exec('DELETE FROM individual WHERE id = 1')
    expect(db.prepare('SELECT COUNT(*) AS n FROM individual_term').get()).toEqual({ n: 0 })

    const reopened = openDb(db.export())
    reopened.exec("INSERT INTO individual (name) VALUES ('b')")
    reopened.exec("INSERT INTO individual_term VALUES (2, 1, 'experience')")
    reopened.exec('DELETE FROM individual WHERE id = 2')
    expect(reopened.prepare('SELECT COUNT(*) AS n FROM individual_term').get()).toEqual({ n: 0 })
    expect(() => reopened.exec("INSERT INTO individual_term VALUES (77, 1, 'experience')")).toThrow()
  })
})
