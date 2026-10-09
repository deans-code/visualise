# Tasks

## 1. Tokens, theme and layout

- [x] 1.1 Add the profile tool's tokens, `--radius`, and `data-section` accent scopes (light, dark, and `data-theme` override) alongside existing tokens, aliasing old names; verify `npm test` passes, with `contrast.test.ts` extended to the section accents.
- [x] 1.2 Restyle buttons (filled accent plus `.secondary`), inputs, cards, `kbd`, focus rings and `.help` panels to the profile tool's look; verify theme tests pass and light and dark screenshots match the profile tool's treatment.
- [x] 1.3 Replace `main`'s 72rem column with the fluid `min(100% - 2rem, 120rem)` container and remove inline layout styles from `App.tsx`; verify at 1920px, 1024px and 360px that there is no horizontal page scroll (Playwright check).
- [x] 1.4 Make Explore use the width: responsive details-panel column, filters in a grid, network and bipartite SVG sized from their container, tables and cards as auto-fit grids; verify the network fills a 1920px viewport and the large-graph performance test still passes.
- [x] 1.5 Apply section accents to Dictionary groups, filter chips and category-view headings, each with a text or shape cue as well as colour; verify component tests and a light/dark screenshot check.

## 2. Right-click explanations

- [x] 2.1 Build the explanation context, panel and `Explainable` hook (right-click, ContextMenu key, Shift+F10, `?`, 500ms long-press with trailing-click suppression, Escape/outside close, focus return, `aria-haspopup`); verify with a unit test per gesture.
- [x] 2.2 Add `src/explanations.ts` covering views, filters (including adjacency), status labels, legend items, nodes, edges and matrix cells, with live-number interpolation; verify with a content test that every concept id renders non-empty text.
- [x] 2.3 Wire terms in Dictionary, People and the details panel to show definition, kind, section and category, with the no-definition fallback pointing to term review; verify component tests including the custom-term case.
- [x] 2.4 Wire network nodes and edges, matrix cells, bipartite and category items, legend, view switcher and filter controls; verify tests for edge explanation numbers and that non-explainable elements keep the native menu.

## 3. Usage guidance

- [x] 3.1 Build `HelpPanel` (collapsible, sessionStorage-backed in try/catch, region-labelled) and add panels for People, Explore and Dictionary that include the gesture hint; verify in a test that collapse persists across tab switches.
- [x] 3.2 Add per-view descriptions for network, matrix, bipartite and categories (how to read size, colour, shape, thickness, position, click behaviour); verify the description changes when switching views.
- [x] 3.3 Add one-line descriptions at upload, replace/keep-both conflicts, term review, adjacency, filters, selection and dictionary search/status; verify via component tests that each text is present next to its control.
- [x] 3.4 Rewrite empty and error states to say what to do next (for example, offer a way to the People tab when no profiles exist); verify with tests of the no-data Explore and failed-upload states.

## 4. Draggable network nodes

- [x] 4.1 Add pointer drag with capture on network nodes: edges and labels follow, positions are clamped to the canvas, and a click without movement still selects; verify with component tests for drag, click, and no selection after a drag.
- [x] 4.2 Add arrow-key moves (Shift for a larger step) for a focused node; verify with a keyboard test.
- [x] 4.3 Make touch drag and the explanation long-press coexist (movement cancels the long-press, no page scroll while dragging a node); verify with a fake-timer test.
- [x] 4.4 Add a "Reset layout" control and clear manual positions when filters or data change; verify with tests.

## 5. Documentation and end-to-end

- [x] 5.1 Update the Playwright flow for the new layout and add a right-click-opens-explanation step, a help-panel step and a drag-a-node step; verify `npm run test:e2e` passes.
- [x] 5.2 Add a README section on the shared look, right-click explanations (mouse, keyboard, touch) and help panels; verify the described behaviour matches the app.
- [x] 5.3 Run `npm run build`, `npm test` and `npm run test:e2e` and review light, dark, wide and narrow screenshots; verify all pass with no console errors.
