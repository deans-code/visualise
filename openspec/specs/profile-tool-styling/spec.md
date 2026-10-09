# profile-tool-styling Specification

## Purpose

Makes the visualiser look and feel like the profile tool it accompanies, and uses wide screens well, so people moving between the two meet a familiar interface.

## Requirements

### Requirement: Profile tool visual language
The system SHALL use the profile tool's visual language: its neutral page/surface/text/border colours, rounded (10px) controls and cards, filled accent buttons with an outlined secondary variant, tinted help panels, cards with an accent top border, and styled keyboard-key hints, in both light and dark themes.

#### Scenario: Familiar controls
- **WHEN** a user compares a primary button, a card and a help panel with those in the profile tool
- **THEN** they share the same shape, border treatment and tint style in the same theme

#### Scenario: Theme respected
- **WHEN** the operating system or the in-app toggle selects dark mode
- **THEN** every page uses the dark variants and text remains readable

### Requirement: Section accent colours
The system SHALL colour content by profile section using the profile tool's accents (values, technical, engineering, interpersonal, AI) wherever a section is named, such as dictionary groups, filter chips and category headings, with a distinct accent per section in each theme.

#### Scenario: Dictionary grouping
- **WHEN** the user opens the Dictionary
- **THEN** the technical, engineering, interpersonal, AI and values groups each show their own accent

#### Scenario: Colour is not the only cue
- **WHEN** a section or group is conveyed by colour
- **THEN** it is also conveyed by a label or shape

### Requirement: Contrast and accessibility preserved
All text and meaningful non-text elements SHALL meet WCAG AA contrast against their background in both themes, and visible focus indicators SHALL remain.

#### Scenario: Contrast check
- **WHEN** the automated contrast test runs over the theme tokens
- **THEN** every text/background pair passes AA

### Requirement: Fluid full-width layout
The system SHALL fill the available browser width up to 120rem with a 1rem side margin, and SHALL let the visualisation, tables, filters and cards expand to use it, without horizontal page scrolling at any width down to 20rem.

#### Scenario: Wide monitor
- **WHEN** the viewport is 1920px wide
- **THEN** the network canvas and details panel occupy the width rather than a 72rem column

#### Scenario: Narrow screen
- **WHEN** the viewport is 360px wide
- **THEN** content stacks and the page does not scroll horizontally
