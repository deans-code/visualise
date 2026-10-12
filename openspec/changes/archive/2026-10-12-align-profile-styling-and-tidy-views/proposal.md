# Proposal

## Why

The visualiser still differs from the live profile tool (https://deans-code.github.io/profile/) in the details people notice: neutral colours, font sizes, button and input sizing and borders. Two views also look unfinished: the "Review new terms" cards (label text, textarea and category input sit on one cramped, misaligned line, with the Accept/Reject/Skip row jammed underneath) and the People list (Rename/Delete buttons wrap awkwardly beside the name, so cards in the same row have different heights).

## What Changes

- Align the design tokens with the profile tool: page `#f7f8fa`/`#12161d`, surface `#fff`/`#1b212b`, text, muted, border `#c9d0db`/`#3a4455`, 10px radius, `system-ui` font stack, `--gap` 0.625rem.
- Align component metrics with the profile tool: buttons `0.5rem 1rem` padding and 1px accent border; inputs and textareas `0.5rem 0.75rem` padding and a 1px `--border` border; compact (`0.25rem 0.75rem`, 0.875rem) buttons inside cards; hint text 0.9rem; solid 3px accent focus outline.
- Restyle the Review new terms cards: each term becomes a card with an accent top border, a heading line with a small section tag, a full-width stacked form (definition textarea, category input, helper text below the field) and a button row beneath with Accept as the primary action.
- Restyle the People list: name and term count at the start, Rename and Delete grouped at the end of one row that does not wrap below the name at normal widths; equal-height cards; the inline rename form uses the same layout.
- Update the contrast checks and any component tests for changed tokens and markup.

## Capabilities

### New Capabilities

### Modified Capabilities
- `profile-tool-styling`: add a requirement for shared control metrics with the profile tool, and requirements for the review-terms cards and the people list.

## Impact

- `src/styles.css` (tokens and component rules), `src/components/ReviewTerms.tsx`, `src/components/People.tsx` (markup/classes only; no behaviour change).
- `src/contrast.test.ts` and component tests that query these views.
- No data, API or dependency changes.
