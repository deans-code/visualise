# Design

## Context

Styling lives in one file, `src/styles.css`, using `--page`, `--surface-1`, `--text-*`, `--border`/`--baseline` tokens with warm greys; the profile tool uses `--bg`, `--surface`, `--text`, `--muted`, `--border` with cool greys. Components are largely unstyled markup (`label` containing text and a `textarea` inline, `li` with inline buttons), which causes the problems in the screenshots. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Same values as the profile tool for palette, radius, font, button and input metrics.
- Fix the review-terms and people layouts with small markup/class changes and CSS.

**Non-Goals:**
- Renaming the token set to match the profile tool's names; changing the network visualisation colours (group and sequential palettes stay); behaviour changes.

## Decisions

- **Keep our token names, change values.** Avoids touching the whole stylesheet and tests; only neutral tokens (`--page`, `--surface-1`, `--text-primary`, `--text-secondary`, `--baseline`, `--border`) change. Alternative: rename to the profile's names, rejected as churn with no user benefit.
- **Opaque border colour.** Replace the `rgba` border with the profile's `#c9d0db`/`#3a4455`, and align `--baseline` to it so inputs and cards share one border colour.
- **Classed layout, not selector hacks.** Add `.review-card`, `.field` (label above control, grid), `.field-note`, `.card-actions`, `.person-row`, `.person-actions`. Replace the `ul[aria-label]` > `li` card rules for the people list with the row layout; accessible names and roles stay untouched so existing tests keep working.
- **Compact buttons in cards** (`0.25rem 0.75rem`, 0.875rem), as the profile tool's stepper buttons.
- **Equal-height cards** via grid `align-items: stretch` with `.person-row` as a flex row (`justify-content: space-between; align-items: center`).
- **Textareas** `width: 100%`, `resize: vertical`, `min-height: 6rem`, so the whole proposal is visible.

## Risks / Trade-offs

- [Colour change breaks AA contrast] → `contrast.test.ts` runs over the tokens; update and fix values before finishing.
- [Tests query by label text] → labels keep their text; only wrapper elements change.
- [Network SVG relies on `--border`/`--baseline`] → check the Explore view in both themes after the token change.
