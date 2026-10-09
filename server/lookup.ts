export interface LookupQuery {
  term: string
  kind: 'value' | 'skill'
  /** Skill section (technical, engineering, interpersonal, ai), used to bias the search. */
  section?: string | null
}

export interface DefinitionProposal {
  definition: string
  sourceUrl: string
  sourceTitle: string
  provider: string
}

export interface DefinitionProvider {
  name: string
  /** Resolves null when nothing usable is found. Throws on network or service errors. */
  lookup(query: LookupQuery): Promise<DefinitionProposal | null>
}

export type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<{
  ok: boolean
  status: number
  json(): Promise<unknown>
}>

const MAX_LENGTH = 320

/** Keep the first sentences up to a readable length, and collapse whitespace and markup remnants. */
export function shortenDefinition(text: string, max = MAX_LENGTH): string {
  const clean = text
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\[\d+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (clean.length <= max) return clean
  const sentences = clean.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [clean]
  let out = ''
  for (const s of sentences) {
    if ((out + s).length > max) break
    out += s
  }
  if (out.trim()) return out.trim()
  return clean.slice(0, max - 1).replace(/\s+\S*$/, '') + '…'
}

/** Extra words that steer an ambiguous name toward the right meaning. */
function searchHint({ kind, section }: LookupQuery): string {
  if (kind === 'value') return 'personal value'
  switch (section) {
    case 'technical':
      return 'software'
    case 'engineering':
      return 'software engineering'
    case 'interpersonal':
      return 'workplace skill'
    case 'ai':
      return 'artificial intelligence'
    default:
      return ''
  }
}

async function getJson(fetchImpl: FetchLike, url: string, headers?: Record<string, string>): Promise<unknown> {
  const res = await fetchImpl(url, headers ? { headers } : undefined)
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`)
  return res.json()
}

interface WikiSummary {
  type?: string
  extract?: string
  title?: string
  content_urls?: { desktop?: { page?: string } }
}

/** The first word of a term, lower-cased ("Temporal.io" gives "temporal"). */
const leadWord = (term: string) => term.toLowerCase().split(/[^a-z0-9]+/).find((w) => w.length >= 3) ?? term.toLowerCase()

/** A page is only relevant if it actually mentions the term; this rejects look-alike titles such as "Io (moon)". */
function mentionsTerm(summary: WikiSummary, term: string): boolean {
  const word = leadWord(term)
  return `${summary.title ?? ''} ${summary.extract ?? ''}`.toLowerCase().includes(word)
}

/**
 * Wikipedia: use the page titled exactly like the term if there is one, otherwise search (biased by kind
 * and section) and take the first relevant, non-disambiguation page.
 */
export function wikipediaProvider(fetchImpl: FetchLike, base = 'https://en.wikipedia.org'): DefinitionProvider {
  // Wikimedia asks API clients to identify themselves and throttles anonymous default user agents.
  const headers = { 'user-agent': 'ProfileVisualiser/0.1 (local tool; definition lookup)', accept: 'application/json' }
  const summaryOf = async (title: string) =>
    (await getJson(
      fetchImpl,
      `${base}/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`,
      headers,
    )) as WikiSummary

  const toProposal = (summary: WikiSummary, title: string): DefinitionProposal => ({
    definition: shortenDefinition(summary.extract!),
    sourceUrl: summary.content_urls?.desktop?.page ?? `${base}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    sourceTitle: summary.title ?? title,
    provider: 'Wikipedia',
  })

  return {
    name: 'Wikipedia',
    async lookup(query) {
      try {
        const exact = await summaryOf(query.term)
        if (exact.type !== 'disambiguation' && exact.extract && mentionsTerm(exact, query.term)) {
          return toProposal(exact, query.term)
        }
      } catch {
        // No page with exactly this title; fall through to search.
      }

      const hint = searchHint(query)
      const search = new URL('/w/api.php', base)
      search.search = new URLSearchParams({
        action: 'query',
        list: 'search',
        srsearch: `${query.term} ${hint}`.trim(),
        srlimit: '4',
        format: 'json',
        origin: '*',
      }).toString()
      const found = (await getJson(fetchImpl, search.toString(), headers)) as { query?: { search?: { title: string }[] } }

      for (const { title } of found.query?.search ?? []) {
        const summary = await summaryOf(title)
        if (summary.type === 'disambiguation' || !summary.extract || !mentionsTerm(summary, query.term)) continue
        return toProposal(summary, title)
      }
      return null
    },
  }
}

/** Brave Search API: uses the top web result's description. Requires BRAVE_API_KEY. */
export function braveProvider(fetchImpl: FetchLike, apiKey: string): DefinitionProvider {
  return {
    name: 'Brave Search',
    async lookup(query) {
      const hint = searchHint(query)
      const url = new URL('https://api.search.brave.com/res/v1/web/search')
      url.searchParams.set('q', `what is ${query.term} ${hint}`.trim())
      url.searchParams.set('count', '3')
      const data = (await getJson(fetchImpl, url.toString(), {
        accept: 'application/json',
        'x-subscription-token': apiKey,
      })) as { web?: { results?: { title?: string; url?: string; description?: string }[] } }
      const hit = data.web?.results?.find((r) => r.url && r.description)
      if (!hit) return null
      return {
        definition: shortenDefinition(hit.description!),
        sourceUrl: hit.url!,
        sourceTitle: hit.title ?? hit.url!,
        provider: 'Brave Search',
      }
    },
  }
}

export interface LookupOutcome {
  proposal: DefinitionProposal | null
  /** Providers that failed (as opposed to finding nothing). */
  errors: { provider: string; message: string }[]
}

/** Try each provider in order and return the first proposal. Provider failures never throw. */
export async function lookupDefinition(providers: DefinitionProvider[], query: LookupQuery): Promise<LookupOutcome> {
  const errors: LookupOutcome['errors'] = []
  for (const p of providers) {
    try {
      const proposal = await p.lookup(query)
      if (proposal) return { proposal, errors }
    } catch (e) {
      errors.push({ provider: p.name, message: (e as Error).message })
    }
  }
  return { proposal: null, errors }
}

export function defaultProviders(
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
  env: Record<string, string | undefined> = process.env,
): DefinitionProvider[] {
  const providers = [wikipediaProvider(fetchImpl)]
  if (env.BRAVE_API_KEY) providers.push(braveProvider(fetchImpl, env.BRAVE_API_KEY))
  return providers
}
