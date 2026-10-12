import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sample = (name: string) => resolve('samples', `${name}.json`)
const asUpload = (name: string) => ({ name: `${name}.json`, mimeType: 'application/json', buffer: readFileSync(sample(name)) })

/** Wikipedia answers cross-origin requests, so a stubbed answer must say the same. */
const CORS = { 'access-control-allow-origin': '*' }

/**
 * Stand-ins for the only outside services the app can reach, so the tests need no internet. Wikipedia is
 * answered (Svelte has a page; nothing else does) and the language model hosts are refused, which is also what a
 * visitor who is offline would see. Records every same-origin request so a test can check none went to an API.
 */
async function stubOutsideWorld(page: Page, baseURL: string) {
  const sameOrigin: string[] = []
  const outside: string[] = []
  const origin = new URL(baseURL).origin
  page.on('request', (r) => {
    const url = new URL(r.url())
    if (url.origin === origin) sameOrigin.push(url.pathname)
    else if (url.protocol.startsWith('http')) outside.push(r.url())
  })
  await page.route('https://en.wikipedia.org/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/page/summary/Svelte')) {
      await route.fulfill({
        headers: CORS,
        json: {
          type: 'standard',
          title: 'Svelte',
          extract: 'Svelte is a component-based front-end framework that compiles to small, fast JavaScript.',
          content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Svelte' } },
        },
      })
    } else if (url.includes('list=search')) {
      await route.fulfill({ headers: CORS, json: { query: { search: [] } } })
    } else {
      await route.fulfill({ headers: CORS, status: 404, json: {} })
    }
  })
  await page.route(/huggingface\.co|jsdelivr\.net/, (route) => route.abort())
  return { sameOrigin, outside }
}

/**
 * The whole journey in a real browser against the production build, served as static files: upload profiles,
 * confirm a definition for a custom term, find it in the dictionary, and see the two people related in the graph.
 */
test('upload, review a custom term, find it in the dictionary, and explore the graph', async ({ page, baseURL }) => {
  // priya-frontend has the custom skill "Svelte"; sam-ai has the custom value "Stewardship".
  const seen = await stubOutsideWorld(page, baseURL!)

  await page.goto('./')

  // --- Upload ---------------------------------------------------------------------------------------------
  await page.getByLabel(/upload profile/i).setInputFiles([sample('priya-frontend'), sample('sam-ai')])
  await expect(page.getByRole('status').filter({ hasText: 'Imported 2 profile' })).toBeVisible()
  const people = page.getByRole('list', { name: 'Individuals' })
  await expect(people).toContainText('priya-frontend')
  await expect(people).toContainText('sam-ai')

  // --- Review: only the custom terms need a decision; built-in ones are recognised already ----------------
  await expect(page.getByRole('heading', { name: 'Review new terms' })).toBeVisible()
  const review = page.getByRole('list', { name: 'Terms to review' })
  await expect(review.getByRole('article')).toHaveCount(2)

  const svelte = review.getByRole('article', { name: 'Svelte' })
  await expect(svelte.getByRole('link', { name: /Wikipedia: Svelte/ })).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Svelte')
  await expect(svelte.getByLabel('Definition for Svelte')).toHaveValue(/component-based front-end framework/)
  // The language model host is unreachable here, so the category suggestion is skipped, not left hanging.
  await expect(svelte.getByText(/no category suggestion is available/i)).toBeVisible()
  await svelte.getByRole('button', { name: 'Accept' }).click()
  await expect(review).toContainText('Svelte: accepted')

  // Nothing was found for Stewardship, so Accept needs a definition; this time the user rejects it.
  const stewardship = review.getByRole('article', { name: 'Stewardship' })
  await expect(stewardship.getByText(/No definition found online/)).toBeVisible()
  await expect(stewardship.getByRole('button', { name: 'Accept' })).toBeDisabled()
  await stewardship.getByRole('button', { name: 'Reject' }).click()
  await expect(review).toContainText('Stewardship: rejected')

  // --- Dictionary: the confirmed definition is saved, the rejected term is not -----------------------------
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Dictionary' }).click()
  await page.getByLabel('Search terms').fill('svelte')
  const terms = page.getByRole('list', { name: 'Terms' })
  await expect(terms.getByRole('listitem')).toHaveCount(1)
  await expect(terms).toContainText('component-based front-end framework')
  await expect(terms).toContainText('custom')
  await expect(terms.getByRole('link', { name: 'Source' })).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Svelte')

  await page.getByLabel('Search terms').fill('')
  await page.getByLabel('Undefined only').check()
  await expect(terms).toContainText('Stewardship')
  await expect(terms).not.toContainText('Svelte')
  // A built-in term is already defined from the catalogue.
  await page.getByLabel('Undefined only').uncheck()
  await page.getByLabel('Search terms').fill('typescript')
  await expect(terms).toContainText('JavaScript with static types')

  // --- Explore: the two people are related, and the panel says why -----------------------------------------
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Explore' }).click()
  const network = page.getByTestId('network')
  await expect(network).toBeVisible()
  await expect(network.locator('g.node', { hasText: 'priya-frontend' })).toBeVisible()
  await expect(network.locator('g.node', { hasText: 'sam-ai' })).toBeVisible()

  await page.getByLabel(/hide weaker/i).fill('0') // show every connection regardless of strength
  const connection = network.getByRole('button', { name: /priya-frontend and sam-ai: \d+% similar/ })
  await connection.focus()
  await page.keyboard.press('Enter')

  const details = page.getByRole('complementary', { name: 'Details' })
  await expect(details.getByRole('heading', { name: 'priya-frontend and sam-ai' })).toBeVisible()
  const shared = details.getByLabel('Shared terms')
  await expect(shared).toContainText('TypeScript')
  await expect(shared).toContainText('React')

  // Definitions are on demand.
  await shared.getByText('TypeScript', { exact: true }).click()
  await expect(shared.getByText(/JavaScript with static types/)).toBeVisible()

  // Right-click explains: a term gets its definition, and the browser's own menu is replaced.
  await network.locator('g.node', { hasText: 'sam-ai' }).click({ button: 'right' })
  await expect(page.getByRole('dialog', { name: 'sam-ai' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // People can be dragged: the node moves, and releasing it does not select it.
  const priya = network.locator('g.node', { hasText: 'priya-frontend' })
  await priya.click() // select Priya so a stray selection would show
  const start = await priya.locator('.node-shape').boundingBox()
  await page.mouse.move(start!.x + start!.width / 2, start!.y + start!.height / 2)
  await page.mouse.down()
  await page.mouse.move(start!.x + start!.width / 2 + 60, start!.y + start!.height / 2 + 30, { steps: 5 })
  await page.mouse.up()
  const end = await priya.locator('.node-shape').boundingBox()
  expect(Math.abs(end!.x - start!.x)).toBeGreaterThan(20)
  await expect(details.getByRole('heading', { name: 'priya-frontend' })).toBeVisible()
  await page.getByRole('button', { name: 'Reset layout' }).click()
  const reset = await priya.locator('.node-shape').boundingBox()
  expect(Math.abs(reset!.x - start!.x)).toBeLessThan(2)

  // The same data is available as a matrix and as a table.
  await page.getByRole('button', { name: 'Matrix' }).click()
  await expect(page.getByRole('table', { name: 'People by term' })).toBeVisible()
  await page.getByRole('button', { name: 'Network' }).click()
  await page.getByText('Show connections as a table', { exact: true }).click()
  await expect(page.getByRole('table').filter({ hasText: 'Similarity' })).toContainText('priya-frontend')

  // --- Nothing went to an application API, and nothing about the people left the browser -----------------
  expect(seen.sameOrigin.filter((p) => p.includes('/api/'))).toEqual([])
  const sentToWikipedia = seen.outside.filter((u) => u.includes('wikipedia.org'))
  expect(sentToWikipedia.length).toBeGreaterThan(0)
  for (const url of seen.outside) {
    expect(url).not.toMatch(/priya|sam-ai|Individuals/i)
  }
})

test('built-in terms need no review, and invalid files are reported without blocking the rest', async ({ page }) => {
  await page.goto('./')
  await page.getByLabel(/upload profile/i).setInputFiles([
    asUpload('tom-techlead'), // only built-in terms
    { name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{"values": []}') },
  ])

  await expect(page.getByRole('status').filter({ hasText: 'Imported 1 profile' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Import errors' })).toContainText('broken.json')
  await expect(page.getByRole('list', { name: 'Import errors' })).toContainText('skills must be an object')
  await expect(page.getByRole('heading', { name: 'Review new terms' })).toHaveCount(0)
  await expect(page.getByRole('list', { name: 'Individuals' })).toContainText('tom-techlead')
})

test('the help panel explains each page and remembers being collapsed', async ({ page }) => {
  await page.goto('./')
  const help = page.getByRole('complementary', { name: /how to use: how to use people/i })
  await expect(help).toContainText('Each .json file is one person')
  await expect(help).toContainText('right-click')
  await help.getByRole('button', { name: 'Hide help' }).click()
  await expect(help.getByRole('button', { name: 'Show help' })).toBeVisible()

  const nav = page.getByRole('navigation', { name: 'Sections' })
  await nav.getByRole('button', { name: 'Explore' }).click()
  await nav.getByRole('button', { name: 'People' }).click()
  await expect(page.getByRole('complementary', { name: /how to use people/i }).getByRole('button', { name: 'Show help' })).toBeVisible()

  await nav.getByRole('button', { name: 'Dictionary' }).click()
  await expect(page.getByRole('complementary', { name: /how to use the dictionary/i })).toContainText('Undefined only')
})

test.describe('layout', () => {
  test('uses a wide screen, and never scrolls sideways on a narrow one', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./')
    await page.getByLabel(/upload profile/i).setInputFiles([sample('tom-techlead'), sample('lena-sre')])
    await expect(page.getByRole('list', { name: 'Individuals' })).toContainText('lena-sre')
    await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Explore' }).click()
    const canvas = page.locator('.viz-canvas').first()
    await expect(canvas).toBeVisible()
    expect((await canvas.boundingBox())!.width).toBeGreaterThan(1100) // was capped near 700 by the old column
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    await page.setViewportSize({ width: 360, height: 740 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    for (const tab of ['People', 'Dictionary', 'Explore']) {
      await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: tab }).click()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), tab).toBe(true)
    }
  })
})

test('data survives a reload, and Clear all data removes it', async ({ page, baseURL }) => {
  await stubOutsideWorld(page, baseURL!)
  await page.goto('./')
  await page.getByLabel(/upload profile/i).setInputFiles([sample('tom-techlead')])
  await expect(page.getByRole('list', { name: 'Individuals' })).toContainText('tom-techlead')

  await page.evaluate(() => window.dispatchEvent(new Event('pagehide'))) // what closing the tab does: save now
  await page.reload()
  await expect(page.getByRole('list', { name: 'Individuals' })).toContainText('tom-techlead')

  page.once('dialog', (d) => d.dismiss())
  await page.getByRole('button', { name: 'Clear all data' }).click()
  await expect(page.getByRole('list', { name: 'Individuals' })).toContainText('tom-techlead')

  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Clear all data' }).click()
  await expect(page.getByText(/no profiles uploaded yet/i)).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
  await page.reload()
  await expect(page.getByText(/no profiles uploaded yet/i)).toBeVisible()
})

test('a first-time visitor can load the sample profiles and explore them', async ({ page, baseURL }) => {
  await stubOutsideWorld(page, baseURL!)
  await page.goto('./')
  await page.getByRole('button', { name: 'Load sample profiles' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Imported 6 profile' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Individuals' }).getByRole('listitem')).toHaveCount(6)

  await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Explore' }).click()
  const network = page.getByTestId('network')
  await expect(network.locator('g.node')).toHaveCount(6)
  await page.getByLabel(/hide weaker/i).fill('0')
  expect(await network.locator('[data-edge]').count()).toBeGreaterThan(0)
})

test('the getting-started strip moves on, and a group can be highlighted from the legend', async ({ page, baseURL }) => {
  await stubOutsideWorld(page, baseURL!)
  await page.goto('./')
  const steps = page.getByRole('list', { name: 'Steps' }).getByRole('listitem')
  await expect(steps.first()).toHaveAttribute('data-state', 'current')

  await page.getByRole('button', { name: 'Load sample profiles' }).click()
  await expect(page.getByRole('list', { name: 'Individuals' }).getByRole('listitem')).toHaveCount(6)
  await expect(steps.first()).toHaveAttribute('data-state', 'done')

  await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Explore' }).click()
  await expect(page.getByRole('complementary', { name: /how to use: about groups/i })).toContainText('connected more strongly')
  const entry = page.getByRole('list', { name: 'Groups' }).getByRole('button').first()
  await entry.click()
  await expect(entry).toHaveAttribute('aria-pressed', 'true')
  expect(await page.locator('[data-person][data-dimmed="true"]').count()).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Clear highlight' }).click()
  await expect(page.locator('[data-person][data-dimmed="true"]')).toHaveCount(0)
})

test('people with only built-in terms are related at once, and the language model is never requested', async ({ page, baseURL }) => {
  const seen = await stubOutsideWorld(page, baseURL!)
  await page.goto('./')
  await page.getByLabel(/upload profile/i).setInputFiles([sample('aisha-data'), sample('tom-techlead')]) // no custom terms
  await expect(page.getByRole('status').filter({ hasText: 'Imported 2 profile' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Review new terms' })).toHaveCount(0)

  await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Explore' }).click()
  const network = page.getByTestId('network')
  await expect(network.locator('g.node')).toHaveCount(2)
  await page.getByLabel(/hide weaker/i).fill('0')
  await page.getByLabel(/related terms count/i).fill('1') // full strength: relatedness from the shipped vectors
  expect(await network.locator('[data-edge]').count()).toBeGreaterThan(0)

  // The shipped vectors were fetched with the site; the model host and runtime never were.
  expect(seen.outside.filter((u) => /huggingface|jsdelivr/.test(u))).toEqual([])
  expect(seen.sameOrigin.some((p) => p.endsWith('/catalogue/embeddings.bin'))).toBe(true)
})
