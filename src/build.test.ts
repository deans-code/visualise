import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from 'vite'
import { afterAll, describe, expect, it } from 'vitest'

const dirs: string[] = []
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })))

/** A real production build into a temp folder, with the given base path. */
async function buildWith(base: string) {
  const outDir = mkdtempSync(join(tmpdir(), 'visualiser-build-'))
  dirs.push(outDir)
  await build({ base, logLevel: 'silent', build: { outDir, emptyOutDir: true } })
  const assets = readdirSync(join(outDir, 'assets'))
  const main = assets.find((f) => /^index-.*\.js$/.test(f))!
  return {
    outDir,
    assets,
    html: readFileSync(join(outDir, 'index.html'), 'utf-8'),
    js: readFileSync(join(outDir, 'assets', main), 'utf-8'),
    css: readFileSync(join(outDir, 'assets', assets.find((f) => f.endsWith('.css'))!), 'utf-8'),
  }
}

describe('the static build', () => {
  it('serves everything from the project-site base path, and ships what the app fetches', async () => {
    const out = await buildWith('/visualise/')
    expect(out.html).toContain('src="/visualise/assets/index-')
    expect(out.html).toContain('href="/visualise/assets/index-')
    // The WebAssembly database, the worker and the base the app builds its catalogue URLs from are all under it.
    expect(out.js).toMatch(/"\/visualise\/assets\/sql-wasm-[\w-]+\.wasm"/)
    expect(out.js).toMatch(/\/visualise\/assets\/embedder\.worker-[\w-]+\.js/)
    expect(out.js).toContain('"/visualise/"')
    expect(readdirSync(join(out.outDir, 'catalogue')).sort()).toEqual(['catalogue.json', 'embeddings.bin', 'embeddings.json'])
    expect(out.assets.some((f) => f.endsWith('.wasm') && f.startsWith('sql-wasm'))).toBe(true)
    // The unused 27 MB copy of the model runtime is left out; only the small SQLite WebAssembly ships.
    expect(out.assets.filter((f) => f.endsWith('.wasm'))).toHaveLength(1)
    const total = out.assets.reduce((n, f) => n + statSync(join(out.outDir, 'assets', f)).size, 0)
    expect(total).toBeLessThan(4 * 1024 * 1024)
  }, 120_000)

  it('serves from the root when built for a domain root (VITE_BASE=/)', async () => {
    const out = await buildWith('/')
    expect(out.html).toContain('src="/assets/index-')
    expect(out.js).toMatch(/"\/assets\/sql-wasm-[\w-]+\.wasm"/)
    expect(out.js).not.toMatch(/["'`]\/visualise\//) // (file paths in dev-mode React messages are not URLs)
  }, 120_000)

  it('makes no request to an application API', async () => {
    const out = await buildWith('/visualise/')
    expect(out.js).not.toMatch(/["'`]\/api\//)
  }, 120_000)

  it('defaults to the repository name as its base path', () => {
    const config = readFileSync('vite.config.ts', 'utf-8')
    expect(config).toMatch(/process\.env\.VITE_BASE \?\? '\/visualise\/'/)
  })
})
