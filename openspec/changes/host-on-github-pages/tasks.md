# Tasks

## 1. Reconcile with the earlier change

- [ ] 1.1 Archive `profile-analysis-visualiser` with `/opsx:archive` (syncing its specs into `openspec/specs/`); verify `openspec/specs/` contains `term-dictionary`, `profile-ingestion` and `relationship-visualisation`, and `openspec validate --specs` passes.
- [ ] 1.2 Add MODIFIED deltas to this change for the requirements in `term-dictionary` and `profile-ingestion` that conflict (catalogue from a local path, persistent dictionary, server-side online lookup), using the exact existing requirement headers; verify `openspec validate host-on-github-pages` passes.

## 2. Browser database

- [ ] 2.1 Add `sql.js` and a `Db` adapter exposing `exec`, `prepare().run/get/all` (with `lastInsertRowid`) and `isTransaction`, loading the WebAssembly through a base-path-aware URL; verify with adapter tests for `lastInsertRowid`, transactions and rollback, foreign-key cascades, `CHECK` constraints and `COLLATE NOCASE`.
- [ ] 2.2 Rename `server/` to `core/`; replace `node:sqlite` and `node:fs` use with the adapter and `fetch`; turn route registrations into plain functions; delete the Fastify app and routes; verify the existing dictionary, individuals, graph, placement and lookup tests pass on the adapter.
- [ ] 2.3 Implement the existing `Api` type in `core/api.ts` over the engine (list, upload with resolutions, rename, remove, graph, lookup, placement, aliases, terms), and switch `src/api.ts` to it; verify with tests that every call returns the same shapes as before, and that `src/` components and tests are unchanged.
- [ ] 2.4 Persist to IndexedDB: debounced save, flush on `visibilitychange` and `pagehide`, restore on start, `navigator.storage.persist()` after the first save, reload when another tab saved a newer version; verify with `fake-indexeddb` tests for restore after reload, debounce and flush, and the newer-version reload.
- [ ] 2.5 Fall back to memory with a visible notice when storage cannot open or a save fails; verify with tests that the app keeps working and the notice appears for each case.
- [ ] 2.6 Add a **Clear all data** control with a confirmation (placed on the People page, with a hint) that returns the store to the built-in catalogue; verify with component tests for confirm, cancel and the empty state after a reload.

## 3. Catalogue and embeddings

- [ ] 3.1 Move the catalogue snapshot to `public/catalogue/`, fetch it through the base path, and seed on first use and on a catalogue version change (version kept in a `meta` table), preserving custom terms, aliases and confirmed definitions; verify with seeding tests including a version bump.
- [ ] 3.2 Extend `npm run import-catalogue` to also write `embeddings.bin` (float32, catalogue order, model and version recorded), commit the generated files, and load them into memory at startup in place of per-term database embeddings for built-in terms; verify with a test that loads the file, checks dimensions and term count against the catalogue, and fails on a version mismatch.
- [ ] 3.3 Confirm relatedness for built-in terms matches the previous server results (for example React and Vue connect, unrelated terms do not) using the precomputed vectors and no model; verify with graph tests that run without the model.

## 4. Model and definition lookup in the browser

- [ ] 4.1 Add `embedder.worker.ts` that loads the model only on first request and caches it, with a main-thread client that resolves null on any failure; verify with tests using a stub worker for success, failure and never-requested cases.
- [ ] 4.2 Use the embedder for custom-term placement and relatedness, store custom-term embeddings in the database, and fall back to hierarchy-only relatedness with a visible message when it is unavailable; verify with tests for both paths and that built-in-only use never starts the worker.
- [ ] 4.3 Look up definitions with the existing Wikipedia provider using `fetch` from the browser (no `user-agent` header); remove the Brave provider and `BRAVE_API_KEY`; verify with `fetch`-stubbed tests for a proposal, a miss and a network error, and that the term review flow still works.
- [ ] 4.4 Add a short privacy note to the People and review pages stating exactly what leaves the device (custom term text to Wikipedia; model files fetched from the model host); verify with a component test that the text is present.

## 5. Static build and hosting

- [ ] 5.1 Configure Vite with `base: process.env.VITE_BASE ?? '/visualise/'`, worker and WebAssembly handling, and remove the `/api` proxy; verify `npm run build` succeeds and a test reads `dist/index.html` to confirm assets use the base (and `/` when `VITE_BASE=/`).
- [ ] 5.2 Remove the server entry, `fastify`, `concurrently`, the `tsx watch` script and `node:sqlite` requirements; make `npm run dev` start only Vite at `http://localhost:5173/visualise/`; verify `npm run dev` serves the app and `npm test` still passes.
- [ ] 5.3 Add **Load sample profiles** (bundled via `import.meta.glob`) using the normal upload path; verify with a component test that six people appear, and that loading twice offers replace or keep-both.
- [ ] 5.4 Show a clear message instead of a blank page when WebAssembly or IndexedDB is unavailable; verify with a test that stubs each missing feature.
- [ ] 5.5 Add `.github/workflows/deploy.yml` (push to `main` and manual, Pages permissions, concurrency, install, test, build, configure-pages, upload-pages-artifact, deploy-pages); verify with a test that asserts the permissions, the trigger and that the test step precedes the deploy step, and run `npx actionlint` or review it against the profile tool's workflow.
- [ ] 5.6 Update `ci.yml` and `playwright.config.ts` for a single static app (build then `vite preview` at the base, no API server, no `DISABLE_EMBEDDINGS`); verify `npm run test:e2e` passes locally.

## 6. End-to-end, documentation and release

- [ ] 6.1 Update the Playwright flow: stub the Wikipedia request instead of `/api/lookup`, assert that no `/api` request is made, and add reload-persistence, Clear all data and Load sample profiles steps; verify `npm run test:e2e` passes.
- [ ] 6.2 Update the README (hosting and the one-time **Settings > Pages > Source: GitHub Actions** step, `VITE_BASE`, the base-path and rename warning, requirements without Node 22 sqlite, removed settings, browser-storage privacy section and a live-site link); verify the commands and statements match the app.
- [ ] 6.3 Verify the production build end to end: run `npm test`, `npm run build` and `npm run test:e2e`, then serve `dist/` under `/visualise/` and complete the full journey in a real browser (upload, review a custom term against live Wikipedia, explore, drag, reload, clear); verify no console errors and the dictionary relates built-in terms with no model request.
- [ ] 6.4 After the change is pushed to `main` with Pages set to GitHub Actions, confirm the deployment workflow succeeds and the live site loads and works at `https://deans-code.github.io/visualise/`; verify by opening the site and loading the sample profiles.
