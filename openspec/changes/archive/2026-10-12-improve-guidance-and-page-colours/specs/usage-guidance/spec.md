## ADDED Requirements

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
