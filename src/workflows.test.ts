import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

type Step = { uses?: string; run?: string; id?: string; with?: Record<string, unknown> }
type Workflow = {
  on: { push?: { branches?: string[] }; workflow_dispatch?: unknown; pull_request?: unknown }
  permissions?: Record<string, string>
  concurrency?: { group: string; 'cancel-in-progress'?: boolean }
  jobs: Record<string, { environment?: { name: string; url: string }; steps: Step[] }>
}

const load = (name: string) => parse(readFileSync(`.github/workflows/${name}`, 'utf-8')) as Workflow

describe('deploy workflow', () => {
  const wf = load('deploy.yml')
  const steps = wf.jobs.deploy.steps
  const at = (pred: (s: Step) => boolean) => steps.findIndex(pred)

  it('runs on every push to main, and can be run by hand', () => {
    expect(wf.on.push?.branches).toEqual(['main'])
    expect(wf.on).toHaveProperty('workflow_dispatch')
    expect(wf.on.pull_request).toBeUndefined() // pull requests must never publish
  })

  it('asks for only the permissions the Pages actions need', () => {
    expect(wf.permissions).toEqual({ contents: 'read', pages: 'write', 'id-token': 'write' })
  })

  it('lets only the latest deployment finish', () => {
    expect(wf.concurrency).toEqual({ group: 'pages', 'cancel-in-progress': true })
  })

  it('installs, tests, builds, and only then publishes, so a failing test stops the deployment', () => {
    const install = at((s) => s.run === 'npm ci')
    const test = at((s) => s.run === 'npm test')
    const build = at((s) => s.run === 'npm run build')
    const configure = at((s) => s.uses?.startsWith('actions/configure-pages') ?? false)
    const upload = at((s) => s.uses?.startsWith('actions/upload-pages-artifact') ?? false)
    const deploy = at((s) => s.uses?.startsWith('actions/deploy-pages') ?? false)
    for (const i of [install, test, build, configure, upload, deploy]) expect(i).toBeGreaterThanOrEqual(0)
    expect([install, test, build, upload, deploy]).toEqual([...[install, test, build, upload, deploy]].sort((a, b) => a - b))
    expect(test).toBeLessThan(upload)
    // Nothing continues past a failed step.
    expect(steps.some((s) => 'continue-on-error' in s)).toBe(false)
  })

  it('publishes the build output to the github-pages environment and reports the site URL', () => {
    const upload = steps.find((s) => s.uses?.startsWith('actions/upload-pages-artifact'))!
    expect(upload.with?.path).toBe('dist')
    expect(wf.jobs.deploy.environment).toEqual({ name: 'github-pages', url: '${{ steps.deployment.outputs.page_url }}' })
    expect(steps.find((s) => s.uses?.startsWith('actions/deploy-pages'))?.id).toBe('deployment')
  })

  it('builds for the default base path, which is the repository name', () => {
    const build = steps.find((s) => s.run === 'npm run build')!
    expect(build).not.toHaveProperty('env') // no VITE_BASE override: the project-site default applies
  })
})

describe('ci workflow', () => {
  const wf = load('ci.yml')
  const runs = wf.jobs.test.steps.map((s) => s.run ?? '')

  it('still builds, runs the unit tests, and runs the end-to-end test', () => {
    expect(runs).toContain('npm run build')
    expect(runs).toContain('npm test')
    expect(runs).toContain('npm run test:e2e')
  })

  it('no longer needs a database-capable Node or the old embedding switch', () => {
    const text = readFileSync('.github/workflows/ci.yml', 'utf-8')
    expect(text).not.toMatch(/DISABLE_EMBEDDINGS/)
    expect(text).not.toMatch(/node:sqlite/)
  })
})
