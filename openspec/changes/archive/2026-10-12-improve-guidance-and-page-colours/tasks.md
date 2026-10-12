# Tasks

## 1. Page and view accents

- [x] 1.1 Add `data-page` and `data-view` accent rules in `src/styles.css` (light and dark, reusing the profile palette) and set them on the tabs, page sections and Explore view buttons/description in `App.tsx` and `Explore.tsx`; verify visually in both themes and that tabs are outlined when inactive and filled when selected.
- [x] 1.2 Extend `src/contrast.test.ts` over the page and view accents (accent on surface, accent-text on accent, text on tint, light and dark, OS and manual dark declarations identical); verify `npm test` passes.

## 2. Getting started strip

- [x] 2.1 Add a `GettingStarted` component (steps, done/current/unavailable state, next-step button, collapsible via the help-panel mechanism) and render it in `App.tsx`; verify with component tests for no profiles, profiles uploaded, undefined terms remaining, and collapse persistence.
- [x] 2.2 Supply it with people count and undefined-term count from the API and refresh it when data changes (`version`); verify by uploading sample profiles in the browser and seeing steps advance.

## 3. Filter guidance

- [x] 3.1 Add visible one-line descriptions to every filter in `FilterBar.tsx` (copy in `explanations.ts`) and a collapsible "Try this" panel in `Explore.tsx` with at least three suggestions; verify with tests asserting the descriptions and suggestions render for each view.

## 4. Group guidance and highlight

- [x] 4.1 Add the "About groups" text beside the legend in `NetworkView.tsx`, including the no-groups message; verify with tests for with-groups and no-groups states.
- [x] 4.2 Make legend entries toggle buttons that highlight a group (dim others, `aria-pressed`, "Highlighting Group N" note, Clear highlight, reset when grouping changes) while keeping right-click, `?` and long-press explanations; verify with interaction tests including keyboard activation and the filter-change reset.

## 5. Final check

- [x] 5.1 Run `npm test` and the e2e suite (adding a flow step for Getting started and legend highlight), review People, Explore and Dictionary at 1400px and 360px in both themes, and update the README's usage notes; verify `openspec validate improve-guidance-and-page-colours` passes.
