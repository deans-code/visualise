# Spec Delta

## Purpose

Shows how individuals relate to each other through their shared and complementary values and skills so patterns can be explored visually.

## ADDED Requirements

### Requirement: Network of individuals
The system SHALL render a graph with individuals as nodes and an edge between two people when their terms overlap exactly or are related, with edge weight reflecting exact overlap plus related-term similarity.

#### Scenario: Shared skills
- **WHEN** two individuals share 4 skills and a third shares none with either and has no related terms
- **THEN** the first two are joined by a visibly stronger edge and the third appears unconnected

#### Scenario: Adjacent but not identical
- **WHEN** one person chose "React" and another chose "Vue" and they share no exact terms
- **THEN** they are joined by an edge, weaker than an exact-overlap edge

### Requirement: Adjacency control
The user SHALL be able to set how much related terms count, from exact matches only to full relatedness, and the network SHALL update accordingly.

#### Scenario: Exact only
- **WHEN** the user sets adjacency to exact only
- **THEN** the React/Vue-only edge disappears

### Requirement: Category-level view
The system SHALL offer a view that compares individuals by catalogue category and section, showing each person's spread and where people's profiles sit close together.

#### Scenario: Group comparison
- **WHEN** two people select different Languages terms
- **THEN** both show weight in the "Languages" category and are shown as close in that category

### Requirement: Complementary links
The system SHALL show a directed "could help" link from person A to person B when A has experience in a skill B lists as desired.

#### Scenario: Mentoring match
- **WHEN** A has experience in "Rust" and B desires "Rust"
- **THEN** a directed link A → B labelled with "Rust" is available

#### Scenario: Approximate match
- **WHEN** A has experience in "Vue" and B desires "React"
- **THEN** a directed link A → B is available and marked as approximate

### Requirement: Filter by relationship basis
The user SHALL be able to choose which basis builds edges: values, experienced skills, desired skills, or complementary; and filter by skill domain and by individual terms.

#### Scenario: Values only
- **WHEN** the user selects "values" as basis
- **THEN** edges reflect only shared values

### Requirement: Explain relationships
Selecting a node or edge SHALL show the terms involved, with dictionary definitions on demand.

#### Scenario: Edge details
- **WHEN** the user selects an edge between two people
- **THEN** exact shared terms and related pairs (e.g. "React ↔ Vue, same category: Web and frontend") are listed and each can display its definition

### Requirement: Alternative views
The system SHALL offer a person-by-term matrix and a person-to-term bipartite view alongside the network, using the same filters.

#### Scenario: Switch view
- **WHEN** the user switches from network to matrix
- **THEN** the same individuals and filters apply

### Requirement: Accessible output
Colour SHALL NOT be the only means of conveying meaning, and the visualisation SHALL support light and dark themes.

#### Scenario: Category legend
- **WHEN** categories are shown
- **THEN** they are distinguishable by label or shape as well as colour
