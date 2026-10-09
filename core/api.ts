import type { Api, Individual, TermEdit, TermQuery, UploadResult } from '../shared/api'
import type { Catalogue } from '../shared/catalogue'
import type { BuiltinEmbeddings } from './builtin-embeddings'
import type { Db } from './db'
import { seedCatalogue } from './dictionary'
import { ensureEmbeddings, type Embedder } from './embeddings'
import { buildGraph } from './graph'
import { checkUpload, listIndividuals, removeIndividual, renameIndividual, uploadProfiles } from './individuals'
import { defaultProviders, type DefinitionProvider } from './lookup'
import { addTermAlias, listTerms, lookup, placement, removeTerm, updateTerm } from './terms'

/** Everything the data layer needs to answer the interface's requests. */
export interface Engine {
  /** Replaceable: another tab's newer save can swap it for a fresh copy. */
  db: Db
  /** Where proposed definitions come from. Defaults to Wikipedia. */
  providers?: DefinitionProvider[]
  /** The embedding model, once it has loaded; null while it is unavailable. */
  embedder?: () => Embedder | null
  /** The built-in catalogue, used to restore the dictionary when everything is cleared. */
  catalogue?: Catalogue | null
  /** Vectors for the built-in terms, shipped with the catalogue. Without them relatedness uses catalogue position. */
  builtinEmbeddings?: BuiltinEmbeddings
  /** Called after every change, so it can be saved. */
  changed?: () => void
}

/** The data layer behind the interface, answering in-process: no server, no network (except definition lookups). */
export function createApi(engine: Engine): Api {
  const providers = engine.providers ?? defaultProviders()
  const changed = () => engine.changed?.()
  const mutating = async <T>(run: () => T | Promise<T>): Promise<T> => {
    const out = await run()
    changed()
    return out
  }

  /** Embed custom terms that have a definition but no vector yet, in the background; this is what loads the model. */
  const embedCustomTerms = () => {
    const embedder = engine.embedder?.()
    if (!embedder) return
    const missing = engine.db
      .prepare('SELECT 1 AS x FROM term WHERE embedding IS NULL AND builtin = 0 AND definition IS NOT NULL LIMIT 1')
      .get()
    if (!missing) return
    const db = engine.db
    ensureEmbeddings(db, embedder, { customOnly: true })
      .then((n) => n > 0 && db === engine.db && changed())
      .catch(() => {
        /* the model is unavailable: those terms keep catalogue-position relatedness */
      })
  }

  return {
    async listIndividuals() {
      return listIndividuals(engine.db) as Individual[]
    },
    upload: (files, resolutions) =>
      mutating((): UploadResult => {
        const checked = checkUpload({ files, resolutions })
        return uploadProfiles(engine.db, checked.files, checked.resolutions)
      }),
    rename: (id, name) => mutating(() => renameIndividual(engine.db, id, name)),
    remove: (id) => mutating(() => removeIndividual(engine.db, id)),
    async graph() {
      embedCustomTerms()
      return buildGraph(engine.db, engine.builtinEmbeddings)
    },
    lookup: (term, kind, section) => lookup(providers, { term, kind, section }),
    async placement(name, kind, definition) {
      try {
        return await placement(engine.db, engine.embedder?.() ?? null, { name, kind, definition }, engine.builtinEmbeddings)
      } catch {
        // Unavailable (no model) or nothing to compare with: the caller just skips the suggestion.
        return null
      }
    },
    addAlias: (termId, alias) => mutating(() => addTermAlias(engine.db, termId, alias)),
    async listTerms(query: TermQuery = {}) {
      return listTerms(engine.db, query)
    },
    updateTerm: (id, edit: TermEdit) =>
      mutating(() => {
        const out = updateTerm(engine.db, id, edit)
        embedCustomTerms()
        return out
      }),
    removeTerm: (id) => mutating(() => removeTerm(engine.db, id)),
    clearAll: () =>
      mutating(() => {
        const { db } = engine
        db.exec('BEGIN')
        try {
          db.exec('DELETE FROM individual')
          db.exec('DELETE FROM term_alias')
          db.exec('DELETE FROM term WHERE builtin = 0')
          db.exec('COMMIT')
        } catch (e) {
          db.exec('ROLLBACK')
          throw e
        }
        // Built-in terms the user edited go back to the catalogue's wording.
        if (engine.catalogue) seedCatalogue(db, engine.catalogue)
      }),
  }
}
