# Tasks

## 1. Project scaffold

- [x] 1.1 Create Vite + React + TypeScript app and a Fastify server workspace with Vitest configured; verify `npm run dev` serves both and `npm test` runs an empty suite
- [x] 1.2 Add SQLite and the schema/migrations (individual, term, term_alias, individual_term); verify a test creates the DB and the tables exist

## 2. Profile ingestion

- [x] 2.1 Implement the profile JSON schema validator with unit tests for valid, missing-field, wrong-type and non-JSON input
- [x] 2.2 Implement multi-file upload UI and API storing individuals with default names from file names; verify a test uploading 3 files (one invalid) imports 2 and reports 1 error
- [x] 2.3 Add rename, delete, and duplicate-name Replace/Keep-both handling; verify with tests and README notes on the profile format and how to upload

## 3. Term dictionary

- [ ] 3.1 Implement term normalisation and alias/exact matching; verify unit tests for case, whitespace and alias cases
- [ ] 3.2 Implement fuzzy near-duplicate suggestions (never auto-merge); verify tests for "Postgres"/"PostgreSQL" suggestion and a non-match
- [ ] 3.3 Write the catalogue import script (reads `VALUE_CATEGORIES`, `CATALOGS` and definition maps from a configurable path, default `C:\Dev\profile\src\data`, writes `catalogue.json`) and seed the dictionary idempotently; verify every built-in term loads with category, section and definition, re-import preserves custom terms, and uploading a profile of built-in terms triggers no lookups
- [ ] 3.5 Implement hierarchy-based relatedness with reasons; verify tests that React/Vue outscores React/Kubernetes and that reasons name the shared category
- [ ] 3.6 Add definition-embedding similarity with a local model, cached per term, blended with hierarchy score and a hierarchy-only fallback; verify tests with a stubbed embedder and a fallback test
- [ ] 3.7 Suggest category placement for custom terms by nearest catalogue neighbours and persist the user-confirmed placement; verify a test that "Svelte" is suggested "Web and frontend"
- [ ] 3.4 Build the dictionary browse/search/edit/delete page; verify an edited definition appears in other views (component test)

## 4. Online definition lookup

- [ ] 4.1 Implement the pluggable search provider interface with Wikipedia and one search-API adapter, API key via env var; verify adapter tests against recorded responses and a failure-path test
- [ ] 4.2 Implement `POST /api/lookup` returning a proposal only (no persistence); verify a test asserts the DB is unchanged after a lookup
- [ ] 4.3 Build the "Review new terms" step (de-duplicated across batch; Accept/Edit/Reject/Skip, manual entry on failed lookup); verify component tests for each action and that import completes when terms are skipped
- [ ] 4.4 Persist confirmed definitions with source URL and status; verify rejected/skipped terms are saved as `undefined` without a definition, and document setup of the search key in the README

## 5. Relationship visualisation

- [ ] 5.1 Implement soft-overlap person similarity using term relatedness (with adjacency factor) and complementary links (experience→desired, exact or approximate) with unit tests on a fixture of 4 people, including React/Vue adjacency and exact-only mode
- [ ] 5.2 Render the network view with basis, domain, threshold and adjacency filters; verify component tests that a strong pair is connected, an adjacent-only pair is connected more weakly (and not at exact-only), and an unrelated person is isolated
- [ ] 5.6 Add the category-level comparison view (people vs catalogue categories and sections); verify a component test where two people with different Languages terms both show weight in Languages
- [ ] 5.3 Add node/edge details panel showing exact shared terms and related pairs with reasons and on-demand definitions; verify via component test
- [ ] 5.4 Add person × term matrix view sharing the same filters; verify switching views preserves filters
- [ ] 5.5 Add bipartite view, community colouring with non-colour cues, and light/dark themes; verify a legend test and manual contrast check

## 6. Integration

- [ ] 6.1 End-to-end test (Playwright): upload sample profiles with a custom term, confirm its definition, see it in the dictionary and graph; verify it passes in CI
- [ ] 6.2 Write the README covering run instructions, privacy notes and sample profile files; verify a fresh clone follows it successfully
