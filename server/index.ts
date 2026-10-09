import { mkdirSync } from 'node:fs'
import { buildApp } from './app'
import { openDb } from './db'

const dbPath = process.env.DB_PATH ?? 'data/profiles.db'
if (dbPath !== ':memory:') mkdirSync('data', { recursive: true })

const app = buildApp(openDb(dbPath))
const port = Number(process.env.PORT ?? 3001)

app.listen({ port, host: '127.0.0.1' }).then(() => {
  console.log(`API listening on http://127.0.0.1:${port}`)
})
