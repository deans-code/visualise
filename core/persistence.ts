/** What is kept between visits: the whole database as bytes, and a counter that grows with every save. */
export interface StoredRecord {
  bytes: Uint8Array
  version: number
}

/** Somewhere to keep one record. In the app it is IndexedDB; tests use memory. */
export interface BlobStore {
  read(): Promise<StoredRecord | undefined>
  write(record: StoredRecord): Promise<void>
}

export type SaveState =
  | { kind: 'saved' }
  /** Nothing can be stored here, so this session's data is lost when the tab closes. */
  | { kind: 'memory-only'; reason: string }
  /** A save failed; the change is still in this session. */
  | { kind: 'save-failed'; reason: string }

const DB_NAME = 'profile-visualiser'
const STORE = 'database'
const KEY = 'current'

const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error ?? new Error('IndexedDB request failed'))
  })

/** A BlobStore in IndexedDB. Rejects when IndexedDB is missing, blocked or full. */
export function indexedDbStore(name = DB_NAME): BlobStore {
  let opened: Promise<IDBDatabase> | null = null
  const open = () =>
    (opened ??= new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB is not available in this browser'))
      let req: IDBOpenDBRequest
      try {
        req = indexedDB.open(name, 1)
      } catch (e) {
        return reject(e)
      }
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error ?? new Error('Could not open browser storage'))
      req.onblocked = () => reject(new Error('Browser storage is blocked by another tab'))
    }))
  return {
    async read() {
      const db = await open()
      return (await request(db.transaction(STORE).objectStore(STORE).get(KEY))) as StoredRecord | undefined
    },
    async write(record) {
      const db = await open()
      await request(db.transaction(STORE, 'readwrite').objectStore(STORE).put(record, KEY))
    },
  }
}

export interface PersistenceOptions {
  /** How long to wait after the last change before saving, so a burst of changes is one save. */
  delay?: number
  onState?: (state: SaveState) => void
}

/**
 * Saves the database to a BlobStore after changes (debounced, and immediately when the page is hidden), tells the
 * app when saving works, and notices when another tab has saved a newer copy. With no store, or a store that
 * fails, the app keeps running from memory and says so.
 */
export class Persistence {
  version = 0
  private timer: ReturnType<typeof setTimeout> | undefined
  private dirty = false
  private saving: Promise<void> = Promise.resolve()
  private asked = false

  constructor(
    private readonly store: BlobStore | null,
    private readonly getBytes: () => Uint8Array,
    private readonly options: PersistenceOptions = {},
  ) {}

  private report(state: SaveState) {
    this.options.onState?.(state)
  }

  /** Read what was saved last time, if anything. A storage failure is reported and treated as "nothing saved". */
  async load(): Promise<Uint8Array | null> {
    if (!this.store) {
      this.report({ kind: 'memory-only', reason: 'Browser storage is not available.' })
      return null
    }
    try {
      const record = await this.store.read()
      this.version = record?.version ?? 0
      this.report({ kind: 'saved' })
      return record?.bytes ?? null
    } catch (e) {
      this.report({ kind: 'memory-only', reason: (e as Error).message })
      return null
    }
  }

  /** Note that the data changed and save it shortly. */
  schedule() {
    if (!this.store) return
    this.dirty = true
    clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.flush(), this.options.delay ?? 300)
  }

  /** Save now if anything changed. Safe to call at any time, including from `pagehide`. */
  flush(): Promise<void> {
    clearTimeout(this.timer)
    if (!this.store || !this.dirty) return this.saving
    this.dirty = false
    const store = this.store
    this.saving = this.saving.then(async () => {
      try {
        const next = this.version + 1
        await store.write({ bytes: this.getBytes(), version: next })
        this.version = next
        this.report({ kind: 'saved' })
        void this.askForPersistence()
      } catch (e) {
        // The change is still in memory; keep it marked unsaved so the next change tries again.
        this.dirty = true
        this.report({ kind: 'save-failed', reason: (e as Error).message })
      }
    })
    return this.saving
  }

  /** Ask the browser not to evict this data under storage pressure. Only asked once, after the first save. */
  private async askForPersistence() {
    if (this.asked) return
    this.asked = true
    try {
      await navigator.storage?.persist?.()
    } catch {
      /* a refusal changes nothing */
    }
  }

  /** The saved copy, if another tab has saved a newer version than the one this tab last read or wrote. */
  async newerCopy(): Promise<StoredRecord | null> {
    if (!this.store) return null
    try {
      const record = await this.store.read()
      return record && record.version > this.version ? record : null
    } catch {
      return null
    }
  }

  /** Adopt a copy returned by `newerCopy`. */
  adopt(record: StoredRecord) {
    this.version = record.version
    this.dirty = false
  }

  /** Forget a pending save, for example after the data was replaced by a newer copy. */
  stop() {
    clearTimeout(this.timer)
  }
}
