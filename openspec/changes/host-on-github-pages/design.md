# Design

## Context

Today the browser talks to a Fastify server through `src/api.ts` (about a dozen calls, one `Api` type that every component and test already depends on). The server holds a `node:sqlite` database (39 prepared statements across `db`, `dictionary`, `individuals`, `graph`, `placement`, `terms`), seeds it from `catalogue/catalogue.json` (388 terms, 93 KB), runs a `@huggingface/transformers` model for relatedness and category placement, and calls Wikipedia and (optionally, with a key) Brave Search. The logic modules are already independent of Fastify except for their route-registration functions, and `shared/` is already isomorphic. The Wikipedia provider already takes an injected `fetch` and already sends `origin=*` for CORS. See proposal.md for motivation.

GitHub Pages serves static files at `https://<owner>.github.io/<repo>/`, so the base path is `/visualise/`. The profile tool's deployment (`deploy.yml`, `VITE_BASE`) is the pattern to follow.

## Goals / Non-Goals

**Goals:**
- One build, served as static files, with identical behaviour to today apart from where data lives.
- Reuse the existing SQL and logic (and its tests) rather than rewrite it.
- No model download for the common case (built-in terms only).
- A deployment workflow that cannot publish a failing build.

**Non-Goals:**
- No server-side or shared storage, accounts, or syncing between browsers or devices.
- No migration of existing `data/profiles.db` files (the exported profile JSON remains the source of truth and can be re-uploaded).
- No offline-first/service-worker support.
- No change to the visualisations, styling, explanations or guidance.
- No custom domain setup.

## Decisions

1. **Keep SQL, swap the engine: `sql.js` (SQLite in WebAssembly) behind the existing `Db` shape.** A small adapter exposes `exec`, `prepare(sql).run/get/all` (returning `lastInsertRowid`) and `isTransaction`, the subset the logic uses, so `dictionary`, `individuals`, `graph`, `placement` and `terms` move over almost unchanged and their tests keep running (now on `sql.js` in Node too, so there is one engine in tests and in production). Alternatives: re-implement on IndexedDB object stores (rejected: rewrites every query and test, and loses constraints and cascades); `wa-sqlite` with OPFS (rejected: more moving parts and weaker browser support); keep a server and host only the UI (rejected: Pages cannot run it, and it puts people's data on a server).
2. **Rename `server/` to `core/` and delete the HTTP layer.** Route registration becomes plain functions called by an in-browser `Api` (`core/api.ts`) that implements the existing `Api` type, so no component changes. Fastify, `server/index.ts`, `app.ts` and the route tests go; `node:fs` use (catalogue loading) is replaced by `fetch` of a static file. Alternative: keep both a server and a browser backend (rejected: two code paths that drift).
3. **Persist the whole database to IndexedDB.** After a write, the serialised database is saved under a single key, debounced (about 300 ms) and flushed on `visibilitychange`/`pagehide`. The store is small (profiles are tiny; built-in embeddings are not in it, see 5). The app calls `navigator.storage.persist()` after the first save so the browser is less likely to evict it. If IndexedDB cannot open or a save fails, the engine keeps running in memory and the UI shows a notice. Alternative: save per row (rejected: needs a mapping layer for no gain at this size).
4. **Multiple tabs: last write wins, with a cheap guard.** A version counter is stored with the data; when a tab becomes visible and the stored version is newer it reloads its database. This avoids silently overwriting another tab's work without adding locking. Alternative: Web Locks or `BroadcastChannel` merging (rejected as over-engineered for a single-user tool).
5. **Precompute built-in embeddings at import time.** `npm run import-catalogue` also runs the model once in Node and writes `embeddings.bin` (float32, 388 × 384, about 0.6 MB) in catalogue order beside the catalogue, with the model name and catalogue version recorded. At startup the engine loads it into memory keyed by term; the database stores only embeddings of custom terms. Relatedness for built-in terms therefore needs no model, and a first visit stays fast. Alternatives: compute in the browser on first visit (rejected: a 25 MB model download plus seconds of work before anything relates); store built-in vectors in the database (rejected: several MB of JSON that is saved and reloaded on every write).
6. **Load the model lazily, in a worker.** `embedder.worker.ts` imports `@huggingface/transformers` only when asked to embed a custom term, so it is never fetched otherwise. The model files and the ONNX runtime WebAssembly come from the library's default hosts (Hugging Face and jsDelivr) and are cached by the browser. On any failure the embedder resolves null and relatedness falls back to catalogue position, as it does today. Alternative: self-host the model and runtime in `dist/` (rejected for now: tens of MB in the repository and the Pages artifact; revisit if third-party hosts become a concern).
7. **Definition lookup straight from the browser, Wikipedia only.** The existing provider is used with `fetch`. The `user-agent` header is dropped (browsers forbid setting it, and extra headers would add a CORS preflight). The Brave provider, `BRAVE_API_KEY` and the server-side rate limiting are removed; the review step still looks up one term at a time. This reverses an earlier decision that web search had to be server-side: that was driven by a search API key and CORS, and Wikipedia needs neither. Alternative: a serverless proxy to keep Brave (rejected: needs hosting and a secret, defeating the point).
8. **Static assets and the base path.** `vite.config.ts` sets `base: process.env.VITE_BASE ?? '/visualise/'`. The catalogue, embeddings and `sql.js` WebAssembly file are fetched through `import.meta.env.BASE_URL` (the WebAssembly via a `?url` import), and the worker via `new Worker(new URL(...), { type: 'module' })`. The catalogue snapshot moves to `public/catalogue/` so it is copied to `dist/` untouched. The dev server also serves under the base path, so dev and production match.
9. **Sample profiles are bundled, not fetched.** `import.meta.glob('../samples/*.json', { query: '?raw', eager: true })` builds the **Load sample profiles** list and feeds the normal upload path (so replace or keep-both works). Alternative: copy samples into `public/` and fetch (rejected: needs an index file and error handling for something that is a few kilobytes).
10. **Deployment mirrors the profile tool.** `deploy.yml` runs on push to `main` and `workflow_dispatch`, with `permissions: contents: read, pages: write, id-token: write`, `concurrency: pages` with cancel-in-progress, then checkout, `setup-node` (LTS, npm cache), `npm ci`, `npm test`, `npm run build`, `configure-pages`, `upload-pages-artifact` (`dist`), and `deploy-pages` in the `github-pages` environment. `npm test` gates the deploy. The slower Playwright run stays in `ci.yml`. Alternative: run Playwright before deploying (rejected for now: browser install adds minutes to every deploy; CI already blocks bad merges).
11. **Testing.** Core logic keeps its existing tests on the new adapter, plus new tests for the adapter itself (`lastInsertRowid`, transactions, foreign-key cascades, `COLLATE NOCASE`), persistence (with `fake-indexeddb`: save, restore, debounce and flush, failure notice, newer-version reload, clear), the browser lookup with a stubbed `fetch`, embeddings loading, base-path output (the built `index.html` references the base) and the workflow file (permissions, test before deploy). Playwright serves `vite preview` at the base path and asserts no `/api` requests.

## Conflicts with unsynced specs

`openspec/changes/profile-analysis-visualiser` is complete but not archived, so its `term-dictionary`, `profile-ingestion` and `relationship-visualisation` specs are not yet in `openspec/specs/`, and this change cannot write MODIFIED deltas against them. Three requirements there conflict with this change: the catalogue is loaded "from a configurable local path" (now a static file, with the path used only by the build-time import script); the dictionary is "persistent" (now persistent in the browser, not a server database); and online lookup is described with server-side search (now browser-side Wikipedia). Task 1.1 archives that change first and then adds MODIFIED deltas for these requirements here, so the specs stay accurate after sync.

## Risks / Trade-offs

- [Data is tied to one browser and can be evicted] → request persistent storage, say so in the README and the notice, and keep the exported profile JSON as the source of truth.
- [Third-party hosts (Hugging Face, jsDelivr) are needed for custom-term suggestions] → loaded only when needed, failure falls back to hierarchy-only relatedness, and the privacy section names them.
- [Wikipedia rate limits or CORS changes break lookups] → one term at a time as today, clear failure message, manual definition entry stays available; verify once against the live API in a real browser.
- [Loss of Brave Search fallback] → accepted; manual entry covers misses.
- [The WebAssembly database and model make the first load heavier] → `sql.js` is loaded once (about 0.7 MB), the model only on demand, and built-in embeddings ship precomputed.
- [Embeddings computed in Node differ slightly from browser ones for custom terms] → same model and normalisation; only custom terms are computed in the browser, and relatedness scores are thresholded, not exact.
- [Large `sql.js` serialisation on every write] → debounce, and the database stays small (people and custom terms).
- [Repository rename breaks the base path] → documented in the README, as in the profile tool, with `VITE_BASE` as the override.
- [Deleting the server removes the way to run without a browser] → none was needed; the core tests run in Node.

## Migration Plan

1. Archive `profile-analysis-visualiser` and reconcile specs (task 1).
2. Land the browser engine behind the existing `Api`, with the server still present until the UI works against it.
3. Remove the server and its dependencies once the end-to-end test passes against the static build.
4. In the GitHub repository set **Settings > Pages > Source** to **GitHub Actions**, push to `main`, and confirm the site at `https://deans-code.github.io/visualise/`.
5. Rollback: revert the commit and redeploy; the previous site (or none) is restored. Users' browser data is unaffected by a redeploy.

## Open Questions

- Whether to self-host the model and runtime later, to remove the third-party hosts. Deferred; the lazy load and fallback make it safe to leave as is.
