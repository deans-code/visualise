// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Api, Individual, UploadResult } from '../api'
import { People } from './People'

afterEach(cleanup)

function fakeApi(over: Partial<Api> = {}): Api {
  return {
    listIndividuals: vi.fn().mockResolvedValue([] as Individual[]),
    upload: vi.fn().mockResolvedValue({ imported: [], errors: [], conflicts: [] } as UploadResult),
    rename: vi.fn().mockResolvedValue({}),
    remove: vi.fn().mockResolvedValue(undefined),
    ...over,
  }
}

const file = (name: string, body = '{}') => new File([body], name, { type: 'application/json' })

describe('People', () => {
  it('uploads multiple files and shows the per-file errors', async () => {
    const api = fakeApi({
      upload: vi.fn().mockResolvedValue({
        imported: [
          { id: 1, name: 'a' },
          { id: 2, name: 'b' },
        ],
        errors: [{ file: 'c.json', reason: 'skills must be an object' }],
        conflicts: [],
      }),
    })
    render(<People api={api} />)
    await userEvent.upload(screen.getByLabelText(/upload profile/i), [file('a.json'), file('b.json'), file('c.json')])

    expect(await screen.findByText(/imported 2 profile/i)).toBeInTheDocument()
    expect(screen.getByText(/skills must be an object/)).toBeInTheDocument()
    expect(api.upload).toHaveBeenCalledTimes(1)
    expect((api.upload as ReturnType<typeof vi.fn>).mock.calls[0][0]).toHaveLength(3)
  })

  it('re-submits conflicting files with the chosen resolution', async () => {
    const upload = vi
      .fn()
      .mockResolvedValueOnce({
        imported: [],
        errors: [],
        conflicts: [{ file: 'alex.json', name: 'alex', existingId: 1 }],
      })
      .mockResolvedValueOnce({ imported: [{ id: 1, name: 'alex' }], errors: [], conflicts: [] })
    render(<People api={fakeApi({ upload })} />)
    await userEvent.upload(screen.getByLabelText(/upload profile/i), file('alex.json'))

    await userEvent.click(await screen.findByRole('button', { name: /replace existing/i }))
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(2))
    expect(upload.mock.calls[1][1]).toEqual({ 'alex.json': 'replace' })
  })

  it('renames an individual', async () => {
    const api = fakeApi({ listIndividuals: vi.fn().mockResolvedValue([{ id: 7, name: 'alex-smith', termCount: 3 }]) })
    render(<People api={api} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Rename' }))
    const box = screen.getByLabelText('Display name')
    await userEvent.clear(box)
    await userEvent.type(box, 'Alex S.')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(api.rename).toHaveBeenCalledWith(7, 'Alex S.'))
  })

  it('deletes after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const api = fakeApi({ listIndividuals: vi.fn().mockResolvedValue([{ id: 7, name: 'alex', termCount: 3 }]) })
    render(<People api={api} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith(7))
  })
})
