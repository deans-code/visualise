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

**3a. Catalogue import.** The profile app's catalogue is TypeScript (`VALUE_CATEGORIES`, `CATALOGS` per section, and per-section definition maps under `src/data/definitions/`). Rather than parse TS, a build-time script in this repo imports those modules from a configurable path (default `../profile/src/data`, e.g. `C:\Dev\profile`) using `tsx`, and writes a versioned `catalogue.json` snapshot (term, kind, section, category, definition) that the server seeds from. Re-import is idempotent and preserves confirmed custom terms and aliases. Alternative: fetch from GitHub at runtime, rejected as less reproducible.

**3b. Term relatedness.** Score(a,b) in [0,1] = weighted blend of (i) hierarchy proximity: same category 1.0, same section 0.5, otherwise 0 (values and skills are separate trees, with a small cross-link allowed later) and (ii) cosine similarity of definition embeddings, computed once per term with a local embedding model (transformers.js, default) and cached on the term row. Co-occurrence across uploads is a later, optional third signal. Scores are computed on demand and cached as a symmetric matrix; every score can return its reasons. Alternatives: category-only (too coarse, misses cross-category links like Docker/Kubernetes vs Helm), embeddings-only (noisy on short terms), hand-curated graph (maintenance burden). Custom terms are placed into a category by nearest-neighbour over catalogue embeddings, then confirmed by the user.

**4. Online definition lookup.** Backend endpoint `POST /api/lookup {term, kind, domain}` calls a pluggable search provider (Wikipedia summary API as a free first try, then a search API such as Brave or Tavily), extracts a short snippet and URL, and returns it as a *proposal*. Nothing is written until `POST /api/terms` is called from the confirmation UI. Optionally an LLM can condense snippets into a one-sentence definition, shown with the source link; still requires confirmation. Alternative: LLM-only definitions, rejected because of hallucination risk with niche technologies.

**5. Review UX.** After upload, a single "Review new terms" step lists unknowns (de-duplicated), each with proposed definition, source, and Accept / Edit / Reject / Skip. Import completes regardless; skipped terms stay `undefined` and can be resolved later from the dictionary page.

**6. Visualisation ideas (primary + alternatives).**
- *Primary: force-directed network* (Cytoscape.js or d3-force). People are nodes, edge weight is Jaccard similarity (or shared count) over the selected basis; communities detected with Louvain drive node colour plus label/shape. Directed "could help" edges (experience → desired) are arrows.
- *Person × term matrix / heatmap* for precise comparison and gap analysis (columns grouped by domain).
- *Bipartite view* (people ↔ terms) so shared terms show as hubs; terms with the most people highlight team strengths, terms nobody has highlight gaps.
- *Possible later:* chord diagram for mentoring flows; 2D similarity map (UMAP/MDS) on term vectors; TF-IDF-style weighting so rare shared terms count more than ubiquitous ones.
Start with network + matrix; bipartite third.

Edge weight between two people uses a soft set overlap: each term in A is matched to its best-related term in B (and vice versa), scores are averaged, and an adjacency slider scales down contributions below 1.0 (exact). A category-level view aggregates each person into a vector over the 4+9 sections/categories and compares those.

**7. Similarity computed client-side** from the API's individual/term data; with tens to low hundreds of people this is cheap and keeps filters instant.

## Risks / Trade-offs

- [Profile data is personal and employment-related] → self-hosted by default, only the term text goes to the search provider, delete-individual support, documented in README.
- [Search returns wrong or low-quality definitions] → mandatory confirmation, source link shown, manual entry fallback.
- [No identity in export; same person may upload twice] → editable names, duplicate-name prompt (Replace / Keep both).
- [Fuzzy matching creates false merges] → suggestions only, user decides, aliases are reversible.
- [Search API cost/keys] → provider is pluggable, Wikipedia fallback, lookup only runs for unknowns.
- [Embedding quality on short terms or jargon] → blend with category proximity, show reasons for each link, allow manual overrides later.
- [Embedding model download/size] → small model, loaded lazily on the server, relatedness falls back to hierarchy-only if unavailable.
- [Hairball graph with many people] → similarity threshold slider, filters, matrix view.

## Open Questions

- Catalogue is a versioned snapshot imported from the local profile repo; automatic sync can come later.
- Which search provider/API key will the default deployment use? The design supports swapping.
- Should the profile tool later add a name/id field to its export? Not required here.
