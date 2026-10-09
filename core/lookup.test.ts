import { describe, expect, it, vi } from 'vitest'
import {
  defaultProviders,
  lookupDefinition,
  shortenDefinition,
  wikipediaProvider,
  type DefinitionProvider,
  type FetchLike,
} from './lookup'

/** Replays canned responses keyed by a substring of the URL. */
function replay(routes: Record<string, unknown | number>): FetchLike & ReturnType<typeof vi.fn> {
  return vi.fn(async (url: string) => {
    const key = Object.keys(routes).find((k) => url.includes(k))
    if (!key) throw new Error(`unexpected request: ${url}`)
    const body = routes[key]
    return typeof body === 'number'
      ? { ok: false, status: body, json: async () => ({}) }
      : { ok: true, status: 200, json: async () => body }
  }) as never
}

// Recorded (trimmed) Wikipedia responses.
const searchTemporal = { query: { search: [{ title: 'Temporal (disambiguation)' }, { title: 'Temporal Technologies' }] } }
const disambiguation = { type: 'disambiguation', title: 'Temporal (disambiguation)', extract: 'Temporal may refer to:' }
const temporalPage = {
  type: 'standard',
  title: 'Temporal Technologies',
  extract:
    'Temporal is an open-source durable execution platform. It lets developers write workflows as ordinary code. Execution state survives crashes. Further details follow here to push this past the length limit of a definition so it gets shortened.',
  content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Temporal_Technologies' } },
}
const noSearchHits = { query: { search: [] } }

describe('wikipediaProvider', () => {
  const q = { term: 'Temporal.io', kind: 'skill' as const, section: 'technical' }

  it('searches when there is no page titled like the term, skipping disambiguation pages', async () => {
    const f = replay({
      'summary/Temporal.io': 404,
      'list=search': searchTemporal,
      'summary/Temporal_(disambiguation)': disambiguation,
      'summary/Temporal_Technologies': temporalPage,
    })
    const p = await wikipediaProvider(f).lookup(q)
    expect(p).toMatchObject({
      sourceUrl: 'https://en.wikipedia.org/wiki/Temporal_Technologies',
      sourceTitle: 'Temporal Technologies',
      provider: 'Wikipedia',
    })
    expect(p!.definition).toMatch(/^Temporal is an open-source durable execution platform\./)
    expect(p!.definition.length).toBeLessThanOrEqual(320)
  })

  it('prefers the page titled exactly like the term, without searching', async () => {
    const f = replay({
      'summary/Svelte': {
        type: 'standard',
        title: 'Svelte',
        extract: 'Svelte is a component-based front-end framework.',
        content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Svelte' } },
      },
    })
    const p = await wikipediaProvider(f).lookup({ term: 'Svelte', kind: 'skill', section: 'technical' })
    expect(p?.sourceTitle).toBe('Svelte')
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('rejects look-alike pages that never mention the term', async () => {
    const io = { type: 'standard', title: 'Io (moon)', extract: 'Io is the innermost of the Galilean moons of Jupiter.' }
    const f = replay({
      'summary/Temporal.io': 404,
      'list=search': { query: { search: [{ title: 'Io (moon)' }] } },
      'summary/Io_(moon)': io,
    })
    expect(await wikipediaProvider(f).lookup(q)).toBeNull()
  })

  it('sends only safelisted headers, so the browser makes no CORS preflight', async () => {
    const f = replay({ 'summary/Qwzxv': 404, 'list=search': noSearchHits })
    await wikipediaProvider(f).lookup({ term: 'Qwzxv', kind: 'skill' })
    // Browsers forbid setting User-Agent and extra headers force a CORS preflight, so only Accept is sent.
    for (const call of f.mock.calls) expect(call[1]?.headers).toEqual({ accept: 'application/json' })
  })

  it('biases the search toward the skill section', async () => {
    const f = replay({ 'summary/Zig': 404, 'list=search': noSearchHits })
    await wikipediaProvider(f).lookup({ term: 'Zig', kind: 'skill', section: 'technical' })
    const searchCall = f.mock.calls.map((c) => c[0]).find((u) => u.includes('list=search'))!
    expect(new URL(searchCall).searchParams.get('srsearch')).toBe('Zig software')
  })

  it('returns null when nothing is found', async () => {
    const f = replay({ 'summary/Qwzxv': 404, 'list=search': noSearchHits })
    expect(await wikipediaProvider(f).lookup({ term: 'Qwzxv', kind: 'skill' })).toBeNull()
  })

  it('throws when the search service fails', async () => {
    const f = replay({ 'summary/x': 404, 'list=search': 503 })
    await expect(wikipediaProvider(f).lookup({ term: 'x', kind: 'skill' })).rejects.toThrow('HTTP 503')
  })
})

describe('lookupDefinition', () => {
  const ok = (name: string): DefinitionProvider => ({
    name,
    lookup: async () => ({ definition: `from ${name}`, sourceUrl: 'https://x', sourceTitle: name, provider: name }),
  })
  const empty: DefinitionProvider = { name: 'empty', lookup: async () => null }
  const broken: DefinitionProvider = {
    name: 'broken',
    lookup: async () => {
      throw new Error('network down')
    },
  }
  const q = { term: 't', kind: 'skill' as const }

  it('returns the first proposal and does not call later providers', async () => {
    const later = vi.fn()
    const out = await lookupDefinition([ok('a'), { name: 'b', lookup: later }], q)
    expect(out.proposal?.provider).toBe('a')
    expect(later).not.toHaveBeenCalled()
  })

  it('falls through failing and empty providers', async () => {
    const out = await lookupDefinition([broken, empty, ok('c')], q)
    expect(out.proposal?.provider).toBe('c')
    expect(out.errors).toEqual([{ provider: 'broken', message: 'network down' }])
  })

  it('never throws: all providers failing gives no proposal and the errors', async () => {
    const out = await lookupDefinition([broken, broken], q)
    expect(out.proposal).toBeNull()
    expect(out.errors).toHaveLength(2)
  })
})

describe('defaultProviders', () => {
  it('uses Wikipedia only: it needs no key, so nothing secret is needed in a static site', () => {
    expect(defaultProviders(replay({})).map((p) => p.name)).toEqual(['Wikipedia'])
  })
})

describe('shortenDefinition', () => {
  it('keeps short text and cuts long text at a sentence boundary', () => {
    expect(shortenDefinition('Short one.')).toBe('Short one.')
    const long = 'First sentence here. ' + 'Filler words go on and on. '.repeat(30)
    const out = shortenDefinition(long, 60)
    expect(out.length).toBeLessThanOrEqual(60)
    expect(out.endsWith('.')).toBe(true)
  })

  it('truncates with an ellipsis when there is no sentence end', () => {
    expect(shortenDefinition('word '.repeat(100), 40).endsWith('…')).toBe(true)
  })
})
