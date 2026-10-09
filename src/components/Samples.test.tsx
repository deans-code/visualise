// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApi } from '../../core/api'
import { openDb } from '../../core/db'
import { seedCatalogue } from '../../core/dictionary'
import type { Catalogue } from '../../shared/catalogue'
import { SAMPLE_FILES } from '../samples'
import { makeApi } from '../test-utils'
import { People } from './People'

afterEach(cleanup)

describe('sample profiles', () => {
  it('bundles the six fictional profiles, by file name', () => {
    expect(SAMPLE_FILES.map((f) => f.name)).toEqual([
      'aisha-data.json',
      'lena-sre.json',
      'marcus-backend.json',
      'priya-frontend.json',
      'sam-ai.json',
      'tom-techlead.json',
    ])
    for (const f of SAMPLE_FILES) expect(() => JSON.parse(f.text)).not.toThrow()
  })

  it('are all valid profiles that import cleanly into a real dictionary', async () => {
    const db = openDb()
    seedCatalogue(db, JSON.parse(readFileSync('public/catalogue/catalogue.json', 'utf-8')) as Catalogue)
    const api = createApi({ db })

    const first = await api.upload(SAMPLE_FILES)
    expect(first.errors).toEqual([])
    expect(first.imported).toHaveLength(6)
    expect((await api.listIndividuals()).map((p) => p.name)).toContain('priya-frontend')

    // Loading them again is treated exactly like uploading the same files again.
    const second = await api.upload(SAMPLE_FILES)
    expect(second.imported).toEqual([])
    expect(second.conflicts).toHaveLength(6)
    const kept = await api.upload(SAMPLE_FILES, Object.fromEntries(SAMPLE_FILES.map((f) => [f.name, 'keep' as const])))
    expect(kept.imported).toHaveLength(6)
    expect(await api.listIndividuals()).toHaveLength(12)
  })
})

describe('Load sample profiles', () => {
  it('uploads the six samples through the normal path, and says so', async () => {
    const upload = vi.fn().mockResolvedValue({ imported: SAMPLE_FILES.map((f, i) => ({ id: i, name: f.name })), errors: [], conflicts: [], unresolved: [] })
    render(<People api={makeApi({ upload })} />)
    expect(screen.getByText(/adds 6 fictional people/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Load sample profiles' }))
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1))
    expect(upload.mock.calls[0][0].map((f: { name: string }) => f.name)).toHaveLength(6)
    expect(await screen.findByText(/imported 6 profile/i)).toBeInTheDocument()
  })

  it('offers replace or keep-both when the samples are already there', async () => {
    const upload = vi.fn().mockResolvedValue({
      imported: [],
      errors: [],
      conflicts: SAMPLE_FILES.map((f) => ({ file: f.name, name: f.name.replace('.json', ''), existingId: 1 })),
      unresolved: [],
    })
    render(<People api={makeApi({ upload })} />)
    await userEvent.click(screen.getByRole('button', { name: 'Load sample profiles' }))
    expect(await screen.findByRole('button', { name: 'Replace existing' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Keep both' })).toBeInTheDocument()
  })
})
