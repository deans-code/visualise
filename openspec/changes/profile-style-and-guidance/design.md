# Design

## Context

The frontend is React + Vite with one global `src/styles.css` (tokens, `main { max-width: 72rem }`, inline styles in `App.tsx`). Existing tokens (`--page`, `--surface-1`, `--seq-*`, `--group-*`) are validated by `contrast.test.ts` and drive the visualisations. The profile tool uses `--bg/--surface/--text/--muted/--border/--radius`, `data-section` accent scopes, an `.app` container of `min(100% - 2rem, 120rem)`, and `TermButton` + `DefinitionPanel` for right-click / `?` / Shift+F10 / long-press definitions. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Visually match the profile tool using the same token names and component classes where practical.
- Fluid full-width layout; no fixed narrow column.
- One reusable explanation mechanism across all pages; one reusable help panel.
- Keep the data-viz encodings and AA contrast intact.

**Non-Goals:**
- No backend, API or data-model changes.
- No new UI libraries or routing, and no runtime dependency on the profile tool's code.
- No redesign of the visualisation algorithms or layout engine.
- No localisation.

## Decisions

1. **Token alias layer, not a rewrite.** Add the profile tool's tokens (`--bg`, `--surface`, `--text`, `--muted`, `--radius`, section accents) and map existing names onto them (`--page: var(--bg)`, etc.). Visualisation ramps (`--seq-*`, `--group-*`) stay, re-checked by `contrast.test.ts`. Alternative: rename everywhere, rejected as high churn with no user benefit.
2. **Section accents via `data-section` attributes**, copied from the profile tool, so section-coloured elements just set the attribute. The in-app theme toggle (`data-theme`) must win over `prefers-color-scheme`, so dark variants are declared for both selectors as today.
3. **Container.** Replace `main`'s max-width with `width: min(100% - 2rem, 120rem)`. Explore's `.viz` grid becomes `minmax(0, 1fr) clamp(18rem, 24vw, 28rem)`; the SVG canvas is sized from its container width (`ResizeObserver`) rather than a fixed width. Alternative: keep the SVG fixed and centre it, rejected because it does not use the width.
4. **Explanations.** Port the profile tool's interaction model into a `useExplain()` context plus an `Explainable` hook (`onContextMenu`, `onKeyDown`, pointer long-press, trailing-click suppression, `aria-haspopup="dialog"`). For SVG nodes, edges and cells the hook attaches to the existing focusable/hit elements. One panel instance at app level, positioned near the anchor and clamped to the viewport, closed by Escape, outside click or its close button, returning focus.
5. **Content.** Static explanations live in `src/explanations.ts`, keyed by concept id (view, filter, status, legend, edge, node, cell), with functions that interpolate live numbers (shared/related counts). Term definitions come from dictionary data the API already returns; no new endpoint.
6. **Help panels.** A `HelpPanel` component (`<aside aria-label>` around `<details open>`) keeps its state in `sessionStorage` per page key, inside try/catch. Control descriptions are plain `.hint` text, not tooltips.
7. **Testing.** Extend component tests (right-click opens the panel, `?` and Shift+F10, long-press with fake timers, help collapse persistence), keep `contrast.test.ts` over the new tokens, update the Playwright flow, and add checks at 1920px (canvas fills width) and 360px (no horizontal scroll).

## Risks / Trade-offs

- [Right-click suppression annoys users on non-explainable items] → only intercept on elements that have an explanation; everything else keeps the native menu.
- [Section accents clash with the colour-blind-safe group palette] → section colour is used for chrome and group headings; chart groups keep `--group-*` and shape; the contrast test covers both.
- [A wider SVG makes the force layout sparse or slow] → layout is computed in abstract units and scaled; cap canvas height; re-check the large-graph performance case from the earlier change.
- [Global CSS regressions] → change tokens first, run all tests and e2e, then restyle component by component.
- [Panel positioning off-screen on small viewports] → clamp to the viewport as the profile tool does.

## Open Questions

- Whether to add a one-time guided tour overlay. Assumed out of scope; help panels only.
