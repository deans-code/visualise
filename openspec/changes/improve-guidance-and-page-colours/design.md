# Design

## Context

Help text lives in `src/explanations.ts` (`VIEW_GUIDE`, explanations) and `HelpPanel` (collapsible, session-remembered). The group legend is in `NetworkView.tsx` (`Legend`) fed by `detectGroups` (Louvain) in `src/graph/communities.ts`. Accents are CSS variables set by `[data-section=...]`; the app currently uses one default blue for tabs and views. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- More in-page guidance, written as plain text in reading order.
- Distinct accents per page and view, reusing the profile tool's palette.

**Non-Goals:**
- A modal tour or overlay walkthrough; changing how groups are detected; recolouring the network's group palette (it stays colour-blind validated).

## Decisions

- **Getting started strip as a derived-state component.** `GettingStarted` takes `people` count, undefined custom-term count and the current tab from `App` (data it can already list through the API) and renders steps with `aria-current="step"`; no new storage except the collapsed flag via the existing `HelpPanel` mechanism. Alternative: a first-run tour, rejected as intrusive and hard to make accessible.
- **Guidance copy in `explanations.ts`.** Filter descriptions, "Try this" suggestions and group text are constants next to `VIEW_GUIDE`, so wording is testable and reusable by the right-click explanations.
- **Legend entries become toggle buttons.** Wrapping each legend entry's content in a `<button aria-pressed>` keeps keyboard and screen reader support; explain handlers stay on the `li`. Highlight state is local to `NetworkView` and cleared in an effect when `grouping` changes. Dimming uses opacity plus the pressed state and a text note ("Highlighting Group 2"), so it is not colour alone.
- **Accents via `data-page` and `data-view`.** Reuse the profile palette tokens by assigning, from the existing accent sets, People = values blue, Explore = technical teal, Dictionary = engineering amber; views Network = blue, Matrix = teal, People and terms = amber, By category = purple. Each wrapper element sets `--accent`, `--accent-text`, `--tint` so buttons, headings, help panels and card borders pick it up with no per-component rules. Alternative: add six new colours, rejected because they would be outside the contrast-tested palette.
- **Tabs and view switchers get the profile look** (outlined inactive, filled selected) from the existing `aria-pressed` button rules; each button sets its own `data-page`/`data-view`.

## Risks / Trade-offs

- [Page accent reads as profile-section meaning, e.g. teal = technical] → Section accents only appear on section-specific items (filter labels, dictionary rows) with text labels; page accents colour chrome only. Documented in the spec scenario "Colour is not the only cue".
- [Contrast of reused accents on `--surface-1`] → extend `contrast.test.ts` over the page/view accent selectors in both themes.
- [More text makes pages long] → Getting started, Try this and group guidance are collapsible and remember their state.
- [Assumption] The page-to-colour mapping above is a proposal; swapping colours later is a one-line CSS change.
