import { describe, expect, it } from 'vitest'
import { buildApp } from './app'
import { openDb } from './db'

describe('api', () => {
  it('responds to health check', async () => {
    const app = buildApp(openDb())
    const res = await app.inject({ method: 'GET', url: '/api/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
  })
})
