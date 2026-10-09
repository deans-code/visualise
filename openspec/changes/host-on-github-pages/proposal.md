# Proposal

## Why

The visualiser needs a Fastify server, a SQLite file and a server-side language model, so it can only run on a developer's machine. GitHub Pages serves static files only. Hosting it there would let anyone open the tool from a link, like the profile tool it accompanies, and would keep profile data in the user's own browser rather than on a server.

## What Changes

- Run the whole application in the browser as a static site: the SQLite-backed dictionary, upload handling, graph calculation and term placement move out of the Fastify routes and run client-side behind the same `Api` interface the UI already uses.
- Store people, terms and aliases in the browser (SQLite compiled to WebAssembly, saved to IndexedDB) so they survive reloads, and add a **Clear all data** control now there is no database file to delete.
- Seed the dictionary from the catalogue as a static file, with the catalogue's term embeddings precomputed at build time, so relatedness works immediately without downloading a language model.
- Load the sentence-embedding model in the browser, in a worker and only when needed (custom terms), falling back to catalogue-position relatedness if it cannot load.
- Look up definitions for custom terms directly from the browser using Wikipedia, which needs no key. **BREAKING:** the Brave Search fallback and `BRAVE_API_KEY` are removed, because a key cannot be kept secret in a static site.
- Serve under a configurable base path (default `/visualise/`) so assets resolve on a GitHub Pages project site.
- Add a **Load sample profiles** button, since a hosted site has no `samples/` folder to upload from.
- Add `.github/workflows/deploy.yml`: on push to `main` (and manually) install, test, build and deploy `dist/` to GitHub Pages, in the same shape as the profile tool's workflow.
- **BREAKING:** remove the Fastify server, the `node:sqlite` dependency and the two-process dev setup; `npm run dev` starts only Vite.
- Update the README, CI and end-to-end test for the single static app.

## Capabilities

### New Capabilities
- `static-hosting`: the application runs from static files under a base path with no server, and is built, tested and deployed to GitHub Pages by a workflow.
- `browser-data-store`: people, terms and aliases are kept in the browser, persist across reloads, can be cleared, degrade safely when storage is unavailable, and never leave the device.
- `browser-term-services`: relatedness and definition lookup work in the browser, using precomputed catalogue embeddings, a lazily loaded model for custom terms, and Wikipedia for definitions.

### Modified Capabilities
<!-- None can be listed yet: the term-dictionary, profile-ingestion and relationship-visualisation specs from profile-analysis-visualiser are not synced into openspec/specs/. See design.md, "Conflicts with unsynced specs". -->

## Impact

- Code: `server/` logic (db, dictionary, individuals, graph, placement, lookup, embeddings) moves to code that runs in the browser; the Fastify app, routes and `server/index.ts` are removed; `src/api.ts` becomes an in-browser implementation of the same interface; `vite.config.ts` gains a base path, a worker and WebAssembly handling.
- Dependencies: add a WebAssembly SQLite (`sql.js`); keep `@huggingface/transformers` (now browser-side); remove `fastify` and `concurrently`.
- Tooling: `scripts/import-catalogue.ts` also writes the precomputed embeddings; Playwright starts only the web server; a new deploy workflow; CI keeps its checks.
- Data: existing `data/profiles.db` files are not migrated; hosted users start with an empty browser store.
- Docs: README (hosting, privacy, configuration table, requirements), and the privacy section changes from "stored on your machine" to "stored in your browser".
- Repository settings (outside the code): Pages **Source** must be set to **GitHub Actions** once.
