# Proposal

## Why

First-time users still have to work out the tool for themselves. The Explore filter bar (connect-by choice, skill areas, related-terms slider, threshold, focus) has little in-page explanation of what each control does or what to try; the group legend ("Group 1 (…)", "Group 2 (…)") never says why groups exist, how they were formed, or how to look at them; and the page tabs and view buttons all share one blue, whereas the profile tool (https://deans-code.github.io/profile/) gives each section its own accent colour so you can tell where you are at a glance.

## What Changes

- **Getting started:** a short, always-visible "Getting started" strip (1 Upload, 2 Review, 3 Explore) that shows which steps are done and offers a button to the next one, and which can be collapsed like the other help panels.
- **Filter guidance:** a visible one-line description under every Explore filter (connect people by, skill areas, related terms count, hide weaker connections, focus on a term) and a collapsible "Try this" panel with 3 worked suggestions (for example "Switch to Could help to see who could mentor whom").
- **Group guidance:** a "About groups" panel by the network legend saying why groups exist (people more strongly connected to each other than to the rest, found automatically, they change with the filters), how to read colour and shape, and how to view them: click a legend entry to highlight that group's members and dim the rest, click it again to clear, or open the connections table, which has a Group column.
- **Page and view colours:** each page tab (People, Explore, Dictionary) and each Explore view button (Network, Matrix, People and terms, By category) gets its own accent from the profile tool's palette, applied to its tab, heading, help panel, buttons and card top borders, in light and dark.

## Capabilities

### New Capabilities

### Modified Capabilities
- `usage-guidance`: add Getting started strip, filter descriptions and suggestions, and group guidance requirements.
- `network-interaction`: add highlighting a group from its legend entry.
- `profile-tool-styling`: add per-page and per-view accent colours.

## Impact

- `src/App.tsx`, `src/components/{Explore,FilterBar,NetworkView,People,Dictionary,HelpPanel}.tsx`, `src/explanations.ts`, `src/styles.css`, plus a new small `GettingStarted` component.
- `src/contrast.test.ts` and component tests for the new text, strip, legend highlight and accents.
- No data, API or dependency changes. Section accents keep meaning "profile section" inside filters and the dictionary; page accents only colour the page chrome.
