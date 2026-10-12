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

### Requirement: Shared control metrics with the profile tool
The system SHALL size and colour its page, surface, text, border, button, input and focus styling to match the profile tool: the same neutral palette in light and dark, the system UI font stack, 10px radius, buttons with a 1px accent border and filled (primary) or outlined (secondary) fill, text inputs and textareas with a 1px neutral border and the same padding, and a visible accent focus outline.

#### Scenario: Side-by-side comparison
- **WHEN** the same control (primary button, secondary button, text input) is compared in both tools in the same theme
- **THEN** font size, height, border width, radius and colours are visually the same

#### Scenario: Contrast still passes
- **WHEN** the automated contrast test runs over the updated tokens
- **THEN** every text/background pair still meets WCAG AA in both themes

### Requirement: Review-terms cards are laid out as forms
Each term awaiting review SHALL appear as a card with an accent top border. Within it the heading and section tag, the source line, a labelled definition field, a labelled category field and its helper text SHALL be stacked, with fields spanning the card width, and the Accept, Reject and Skip buttons SHALL sit together in one row beneath, Accept being the primary button.

#### Scenario: Definition proposed
- **WHEN** a lookup returns a proposed definition
- **THEN** the label is above a full-width textarea showing the whole proposal, and the category field and its "Suggested from similar terms" note are on their own line below it

#### Scenario: No definition found
- **WHEN** no definition is found
- **THEN** the empty textarea has the same size and layout, and Accept is visibly disabled until text is entered

#### Scenario: Narrow screen
- **WHEN** the viewport is 360px wide
- **THEN** the card stacks without horizontal scrolling and the buttons wrap onto a second line only if they do not fit

### Requirement: People list rows are tidy and consistent
Each person SHALL appear as a card showing their name and term count at the start, with Rename and Delete grouped together at the end of the same row, using compact buttons. Cards in a row SHALL have equal height, and the inline rename form SHALL use the same row layout.

#### Scenario: Cards of different name length
- **WHEN** people with short and long names are listed
- **THEN** the buttons are aligned in the same place in every card and a button never sits alone beneath the name unless the name itself wraps

#### Scenario: Renaming
- **WHEN** the user chooses Rename
- **THEN** the name input, Save and Cancel appear in place in the same row layout without changing the card height more than the input requires

### Requirement: Page and view accent colours
Each page (People, Explore, Dictionary) and each Explore view (Network, Matrix, People and terms, By category) SHALL have its own accent from the profile tool's palette, shown on its tab or view button (outlined when inactive, filled when selected, as in the profile tool), and on that page's heading, help panel, primary buttons and card top borders, in both light and dark themes. Section accents SHALL keep their meaning of profile section inside filters, the dictionary and category headings.

#### Scenario: Tabs
- **WHEN** the user looks at the page tabs
- **THEN** each tab has a different accent, and the selected tab is filled with its own accent

#### Scenario: Page chrome follows the tab
- **WHEN** the user switches from People to Explore
- **THEN** the heading, help panel and buttons change to Explore's accent

#### Scenario: Views
- **WHEN** the user switches between Network, Matrix, People and terms and By category
- **THEN** the selected view button and the view description panel use that view's accent

#### Scenario: Colour is not the only cue
- **WHEN** a page or view is indicated by colour
- **THEN** it is also indicated by its label and by the pressed state of its button

#### Scenario: Contrast
- **WHEN** the automated contrast test runs over the page and view accents
- **THEN** accent-on-surface, accent-text-on-accent and body-text-on-tint pairs meet WCAG AA in both themes
