# Design

## Context

Greenfield repo. The source profile tool is React 19 + TypeScript + Vite, fully client-side, exporting JSON of shape `{ values: string[], skills: { technical|engineering|interpersonal|ai: { experience: string[], desired: string[] } } }`. It has no identity field. Custom entries are free text. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Ingest many profiles, build a reusable dictionary, confirm-before-persist online definitions, explore relationships visually.
- Match the profile tool's stack so the team can maintain both.

**Non-Goals:**
- Authentication / multi-tenant access control (single trusted team instance initially).
- Editing profiles (the profile tool owns that).
- LLM-based inference of relationships beyond the confirmed dictionary.

## Decisions

**1. Stack: React + TS + Vite frontend, small Node (Fastify) backend, SQLite storage.**
Web search needs an API key and has CORS limits, so it must be server-side; a backend also gives durable shared dictionary storage. Alternative: fully client-side with IndexedDB: simplest and private, but cannot call search APIs safely and the dictionary isn't shared. SQLite keeps ops trivial (one file).

**2. Data model.** `individual(id, name)`, `term(id, canonical, kind[value|skill], domain, definition, source_url, status[confirmed|undefined], created_at)`, `term_alias(term_id, alias)`, `individual_term(individual_id, term_id, role[value|experience|desired])`. Relationships are computed from `individual_term`, never stored, so dictionary merges stay consistent.

**3. Term resolution pipeline** per upload: normalise (trim, case-fold, strip punctuation) → exact/alias match → fuzzy candidates (token-set/Levenshtein, threshold tuned in tests) offered as suggestions → remaining unknowns go to lookup. Built-in profile-tool catalogue terms can be pre-seeded from the profile repo's `src/data`, so only custom terms need lookup. Never auto-merge fuzzy matches.

**4. Online definition lookup.** Backend endpoint `POST /api/lookup {term, kind, domain}` calls a pluggable search provider (Wikipedia summary API as a free first try, then a search API such as Brave or Tavily), extracts a short snippet and URL, and returns it as a *proposal*. Nothing is written until `POST /api/terms` is called from the confirmation UI. Optionally an LLM can condense snippets into a one-sentence definition, shown with the source link; still requires confirmation. Alternative: LLM-only definitions, rejected because of hallucination risk with niche technologies.

**5. Review UX.** After upload, a single "Review new terms" step lists unknowns (de-duplicated), each with proposed definition, source, and Accept / Edit / Reject / Skip. Import completes regardless; skipped terms stay `undefined` and can be resolved later from the dictionary page.

**6. Visualisation ideas (primary + alternatives).**
- *Primary: force-directed network* (Cytoscape.js or d3-force). People are nodes, edge weight is Jaccard similarity (or shared count) over the selected basis; communities detected with Louvain drive node colour plus label/shape. Directed "could help" edges (experience → desired) are arrows.
- *Person × term matrix / heatmap* for precise comparison and gap analysis (columns grouped by domain).
- *Bipartite view* (people ↔ terms) so shared terms show as hubs; terms with the most people highlight team strengths, terms nobody has highlight gaps.
- *Possible later:* chord diagram for mentoring flows; 2D similarity map (UMAP/MDS) on term vectors; TF-IDF-style weighting so rare shared terms count more than ubiquitous ones.
Start with network + matrix; bipartite third.

**7. Similarity computed client-side** from the API's individual/term data; with tens to low hundreds of people this is cheap and keeps filters instant.

## Risks / Trade-offs

- [Profile data is personal and employment-related] → self-hosted by default, only the term text goes to the search provider, delete-individual support, documented in README.
- [Search returns wrong or low-quality definitions] → mandatory confirmation, source link shown, manual entry fallback.
- [No identity in export; same person may upload twice] → editable names, duplicate-name prompt (Replace / Keep both).
- [Fuzzy matching creates false merges] → suggestions only, user decides, aliases are reversible.
- [Search API cost/keys] → provider is pluggable, Wikipedia fallback, lookup only runs for unknowns.
- [Hairball graph with many people] → similarity threshold slider, filters, matrix view.

## Open Questions

- Which search provider/API key will the default deployment use? The design supports swapping.
- Should the profile tool later add a name/id field to its export? Not required here.
