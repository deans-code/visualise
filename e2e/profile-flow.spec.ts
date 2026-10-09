import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sample = (name: string) => resolve('samples', `${name}.json`)
const asUpload = (name: string) => ({ name: `${name}.json`, mimeType: 'application/json', buffer: readFileSync(sample(name)) })

/**
 * The whole journey against the real server and browser: upload profiles, confirm a definition for a custom
 * term, find it in the dictionary, and see the two people related in the graph. Only the web lookup is stubbed,
 * so the test does not depend on Wikipedia being reachable.
 */
test('upload, review a custom term, find it in the dictionary, and explore the graph', async ({ page }) => {
  // priya-frontend has the custom skill "Svelte"; sam-ai has the custom value "Stewardship".
  await page.route('**/api/lookup', async (route) => {
    const { term } = route.request().postDataJSON() as { term: string }
    const proposal =
      term === 'Svelte'
        ? {
            definition: 'Svelte is a component-based front-end framework that compiles to small, fast JavaScript.',
            sourceUrl: 'https://en.wikipedia.org/wiki/Svelte',
            sourceTitle: 'Svelte',
            provider: 'Wikipedia',
          }
        : null
    await route.fulfill({ json: { proposal, errors: [] } })
  })

  await page.goto('/')

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

  // The same data is available as a matrix and as a table.
  await page.getByRole('button', { name: 'Matrix' }).click()
  await expect(page.getByRole('table', { name: 'People by term' })).toBeVisible()
  await page.getByRole('button', { name: 'Network' }).click()
  await page.getByText('Show connections as a table').click()
  await expect(page.getByRole('table').filter({ hasText: 'Similarity' })).toContainText('priya-frontend')
})

test('built-in terms need no review, and invalid files are reported without blocking the rest', async ({ page }) => {
  await page.goto('/')
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
