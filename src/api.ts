export interface Individual {
  id: number
  name: string
  termCount: number
}

export interface UploadResult {
  imported: { id: number; name: string }[]
  errors: { file: string; reason: string }[]
  conflicts: { file: string; name: string; existingId: number }[]
}

export type Resolution = 'replace' | 'keep'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return (res.status === 204 ? undefined : await res.json()) as T
}

const send = (method: string, url: string, body?: unknown) =>
  fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

export const api = {
  listIndividuals: () => fetch('/api/individuals').then((r) => json<Individual[]>(r)),
  upload: (files: { name: string; text: string }[], resolutions?: Record<string, Resolution>) =>
    send('POST', '/api/individuals/upload', { files, resolutions }).then((r) => json<UploadResult>(r)),
  rename: (id: number, name: string) => send('PATCH', `/api/individuals/${id}`, { name }).then((r) => json<unknown>(r)),
  remove: (id: number) => send('DELETE', `/api/individuals/${id}`).then((r) => json<void>(r)),
}

export type Api = typeof api
