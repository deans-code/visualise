# Proposal

## Why

The visualiser is the companion to the profile tool (github.com/deans-code/profile) but looks and behaves like a different product: a narrow 72rem column, its own palette, and no explanation of what its views, filters or terms mean. People who arrive from the profile tool find it unfamiliar, waste screen space on wide monitors, and have to guess how to read a network, a matrix or a "relatedness" score.

## What Changes

- Adopt the profile tool's visual language: its neutral surface/text/border tokens, 10px radius, filled-accent buttons with a `secondary` outline variant, tinted "help" panels, top-accented cards, `kbd` styling, and per-section accent colours (technical teal, engineering amber, interpersonal purple, AI rose, values blue) with light and dark variants.
- Use the available screen width: replace the `72rem` main column with a fluid container (`min(100% - 2rem, 120rem)`) and make the Explore view, filters, tables and cards grow into the space instead of leaving gutters.
- Add right-click explanations, matching the profile tool's behaviour (right-click, context-menu key, Shift+F10, `?`, touch long-press): an explanation panel for terms, people, edges, view names, filter controls and matrix cells/legend items.
- Add usage guidance: a short "How to use this page" help panel at the top of People, Explore (per view) and Dictionary, plus concise inline descriptions beside key controls (upload, adjacency, filters, selection, term review), and a first-line explanation of what each view shows and how to read it.
- Keep existing behaviour, data, API and colour-blind-safe encodings (shape plus colour). **No backend or API changes.**

## Capabilities

### New Capabilities
- `profile-tool-styling`: the shared look and layout of the app (tokens, components, section accents, theming, full-width layout) so it matches the profile tool.
- `concept-explanations`: on-demand explanation of terms and visualisation concepts via right-click, keyboard and long-press.
- `usage-guidance`: per-page help panels and short descriptions at key controls that tell a first-time user what to do and how to read the results.

### Modified Capabilities
<!-- None: there are no main specs yet; the earlier change's specs are not yet synced. -->

## Impact

- Frontend only: `src/styles.css`, `src/App.tsx`, all components under `src/components/`, new shared components (explanation panel, help panel) and a static explanations content module.
- Existing tests in `src/` (contrast, theme, People, Explore, Dictionary) must still pass; the e2e flow in `e2e/` may need selectors updated.
- README gains a short note on the explanations and help panels. No new dependencies.
