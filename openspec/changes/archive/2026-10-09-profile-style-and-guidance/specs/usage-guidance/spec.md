# Spec Delta

## Purpose

Tells first-time users what each page is for, what to do, and how to read what they see, at the places where they need it.

## ADDED Requirements

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
