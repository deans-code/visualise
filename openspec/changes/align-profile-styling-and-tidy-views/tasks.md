# Tasks

## 1. Design tokens and base controls

- [ ] 1.1 Update neutral tokens, font stack and gap in `src/styles.css` (light and both dark blocks) to the profile tool's values; verify `npm test` passes, including `src/contrast.test.ts` updated for the new tokens.
- [ ] 1.2 Align button, input/textarea, hint, focus-outline and `kbd` metrics with the profile tool; verify by viewing Explore, Dictionary and People in light and dark next to the live profile tool.

## 2. Review new terms cards

- [ ] 2.1 Restructure `TermCard` in `src/components/ReviewTerms.tsx` into stacked `.field` blocks (definition, category, helper notes) and a `.card-actions` row, keeping labels, roles and button text; verify existing review tests still pass.
- [ ] 2.2 Add `.review-card`, `.field` and `.card-actions` CSS (accent top border, full-width textarea with min-height, compact buttons, Accept primary); verify visually for proposed, not-found and suggestion states and at 360px width, and add a test asserting the layout classes and disabled Accept.

## 3. People list

- [ ] 3.1 Restructure the list item in `src/components/People.tsx` into `.person-row` with `.person-actions` (also for the rename form); verify the Rename, Delete, Save and Cancel tests still pass.
- [ ] 3.2 Add the people-row CSS (equal-height cards, aligned buttons, wrapping only when needed); verify visually with short and long names in light and dark and at 360px.

## 4. Final check

- [ ] 4.1 Run `npm test` and the e2e suite, check the Explore network in both themes, and update README notes if they mention the styling; verify `openspec validate align-profile-styling-and-tidy-views` passes.
