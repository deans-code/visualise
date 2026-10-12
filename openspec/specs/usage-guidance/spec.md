# usage-guidance Specification

## Purpose

Tells first-time users what each page is for, what to do, and how to read what they see, at the places where they need it.

## Requirements

### Requirement: Page help panels
Each page (People, Explore, Dictionary) SHALL show a help panel near the top, in the profile tool's tinted style, stating the page's purpose, the main actions, and how to open explanations (mouse, keyboard, touch). The panel SHALL be collapsible and remember its state for the browser session.

#### Scenario: First visit
- **WHEN** a user opens the app for the first time
- **THEN** the People page shows its help panel expanded, explaining how to upload profile JSON exported from the profile tool

#### Scenario: Collapsed
- **WHEN** the user collapses a help panel, switches tabs and returns
- **THEN** it stays collapsed

### Requirement: View descriptions
Each Explore view (network, matrix, bipartite, categories) SHALL show a short description of what it plots, how to read size, colour, shape, edge thickness and position, and what clicking does.

#### Scenario: Network view
- **WHEN** the network view is shown
- **THEN** its description says nodes can be dragged to rearrange them and that Reset layout restores the original arrangement

#### Scenario: Switching views
- **WHEN** the user switches from network to matrix
- **THEN** the description changes to explain rows, columns and cell shading

### Requirement: Key-control descriptions
Key controls SHALL carry a one-line description visible without interaction: file upload (accepted format, one person per file, name taken from file name), the replace/keep-both conflict choice, term review, adjacency, section and category filters, selection, and the dictionary's search and status filter.

#### Scenario: Upload
- **WHEN** the user views the upload control
- **THEN** a description states that each `.json` file is one person's exported profile and the file name becomes their name

### Requirement: Empty and error states guide
Empty and error states SHALL say what to do next rather than only reporting the condition.

#### Scenario: No people yet
- **WHEN** Explore is opened with no uploaded profiles
- **THEN** it explains that profiles are uploaded on the People tab and offers a way to go there

### Requirement: Guidance is accessible
Guidance SHALL be real text in the page's reading order, labelled as a region, readable at 200% zoom, and not conveyed by tooltips alone.

#### Scenario: Keyboard only
- **WHEN** a user navigates by keyboard
- **THEN** the help toggle is reachable and operable, and descriptions are plain text available to screen readers

### Requirement: Getting started strip
The app SHALL show a collapsible "Getting started" strip on every page with three steps (Upload profiles, Review new terms, Explore), marking each step done, current or not yet available from the data in the browser, and offering a button that takes the user to the page for the next step. The collapsed state SHALL be remembered for the browser session.

#### Scenario: Nothing uploaded
- **WHEN** a user opens the app with no profiles
- **THEN** step 1 is current, steps 2 and 3 are shown as not yet available, and the button goes to People

#### Scenario: Profiles uploaded
- **WHEN** at least two people exist
- **THEN** step 1 is done, and the button offers Explore (or finishing review if undefined custom terms remain)

#### Scenario: Collapsed
- **WHEN** the user collapses the strip and switches pages
- **THEN** it stays collapsed

### Requirement: Filter descriptions and suggestions
Each Explore filter (connect people by, skill areas, related terms count, hide weaker connections, focus on a term) SHALL carry a one-line description visible without interaction, and Explore SHALL offer a collapsible "Try this" panel with at least three concrete suggestions that say which control to change and what to expect.

#### Scenario: Connect-by description
- **WHEN** the user views the filters
- **THEN** a visible description says that the choice decides what a connection means

#### Scenario: Suggestion
- **WHEN** the user reads the "Try this" panel
- **THEN** each suggestion names the control, the value to set and the effect, for example switching to Could help to see who could mentor whom

### Requirement: Group guidance
The network view SHALL explain, in text beside the group legend, why groups exist (people more strongly connected to each other than to the rest, found automatically from the current filters and so liable to change when filters change), how colour and shape identify a group, why some people are not in a group, and how to view groups: by clicking a legend entry or by opening the connections table.

#### Scenario: Reading the legend
- **WHEN** the network view shows groups
- **THEN** a visible explanation says what a group is, that it is recalculated when filters change, and that colour is paired with shape

#### Scenario: No groups
- **WHEN** no connections remain under the filters
- **THEN** the explanation says groups need at least one connection and suggests lowering the threshold or raising related terms
