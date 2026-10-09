# Spec Delta

## Purpose

Shows how individuals relate to each other through their shared and complementary values and skills so patterns can be explored visually.

## ADDED Requirements

### Requirement: Network of individuals
The system SHALL render a graph with individuals as nodes and an edge between two people when they have overlap, with edge weight reflecting the amount of overlap.

#### Scenario: Shared skills
- **WHEN** two individuals share 4 skills and a third shares none with either
- **THEN** the first two are joined by a visibly stronger edge and the third appears unconnected

### Requirement: Complementary links
The system SHALL show a directed "could help" link from person A to person B when A has experience in a skill B lists as desired.

#### Scenario: Mentoring match
- **WHEN** A has experience in "Rust" and B desires "Rust"
- **THEN** a directed link A → B labelled with "Rust" is available

### Requirement: Filter by relationship basis
The user SHALL be able to choose which basis builds edges: values, experienced skills, desired skills, or complementary; and filter by skill domain and by individual terms.

#### Scenario: Values only
- **WHEN** the user selects "values" as basis
- **THEN** edges reflect only shared values

### Requirement: Explain relationships
Selecting a node or edge SHALL show the terms involved, with dictionary definitions on demand.

#### Scenario: Edge details
- **WHEN** the user selects an edge between two people
- **THEN** the shared terms are listed and each can display its definition

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
