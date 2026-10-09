# term-dictionary Specification

## Purpose

Maintains a persistent dictionary of values and skills so uploads are understood consistently, and sources definitions for unknown custom terms with explicit user confirmation.

## Requirements

### Requirement: Import the profile catalogue
The system SHALL load the profile app's catalogue (values, skills by section, their categories, and built-in definitions) from a configurable local path, and seed the dictionary with every built-in term, its category and its definition.

#### Scenario: Seed from catalogue
- **WHEN** the catalogue path points at the profile app's `src/data`
- **THEN** every built-in value and skill exists in the dictionary with its category, section and definition

#### Scenario: Catalogue changes
- **WHEN** the profile app adds a term and the catalogue is re-imported
- **THEN** the new term is added and existing entries, aliases and confirmed custom definitions are preserved

### Requirement: Term relatedness
The system SHALL compute a relatedness score between 0 and 1 for any two terms, combining category-hierarchy proximity (same category, same section, different) and similarity of their definitions.

#### Scenario: Adjacent skills
- **WHEN** comparing "React" and "Vue" (same category) versus "React" and "Kubernetes" (different categories)
- **THEN** the React/Vue score is higher than the React/Kubernetes score

#### Scenario: Explain a score
- **WHEN** the user asks why two terms are related
- **THEN** the system states the contributing reasons (e.g. same category "Web and frontend", similar definitions)

### Requirement: Place custom terms
The system SHALL suggest a category and section for each custom term, based on its confirmed definition and nearest catalogue terms, and the user MUST confirm or change the placement before it is persisted.

#### Scenario: Custom term placement
- **WHEN** the custom skill "Svelte" is confirmed with a definition about a frontend framework
- **THEN** it is suggested for "Web and frontend" and relatedness to React and Vue is available once placed

### Requirement: Seed and grow dictionary
The system SHALL store every distinct value and skill with its category (and domain for skills), definition, source and aliases, and reuse it for later uploads.

#### Scenario: Known term on later upload
- **WHEN** an uploaded profile contains a term already in the dictionary
- **THEN** it is linked to the existing entry and no lookup or prompt occurs

### Requirement: Normalise term matching
The system SHALL match terms case-insensitively, ignoring surrounding whitespace and punctuation differences, and against recorded aliases.

#### Scenario: Case variant
- **WHEN** a profile contains "typescript" and the dictionary has "TypeScript"
- **THEN** it resolves to the existing "TypeScript" entry

### Requirement: Suggest near-duplicates
The system MUST NOT silently merge terms that are only similar; it SHALL suggest likely matches and let the user accept (recording an alias) or keep the term separate.

#### Scenario: Similar spelling
- **WHEN** a profile contains "Postgres" and the dictionary has "PostgreSQL"
- **THEN** the user is offered "Postgres is PostgreSQL" and may accept or decline

### Requirement: Look up unknown terms online
For a term not in the dictionary and not matched, the system SHALL search online and present a proposed definition with its source URL.

#### Scenario: Unknown technology
- **WHEN** a profile contains the custom skill "Temporal.io"
- **THEN** the user is shown a proposed definition and source link for it

#### Scenario: Lookup fails
- **WHEN** search is unavailable or returns nothing usable
- **THEN** the user may enter a definition manually or skip the term, and the import still completes

### Requirement: Confirm before persisting
The system MUST NOT persist an online-sourced definition until the uploader confirms it. The uploader SHALL be able to accept, edit, or reject it.

#### Scenario: Accept
- **WHEN** the user accepts a proposed definition
- **THEN** it is saved to the dictionary with source URL and confirmed status

#### Scenario: Reject
- **WHEN** the user rejects a proposed definition
- **THEN** nothing is saved for that definition and the term is kept as "undefined" on the individual

### Requirement: Review queue for multi-file uploads
The system SHALL collect all unknown terms across a batch into one review list, de-duplicated by term, so each is confirmed once.

#### Scenario: Shared unknown term
- **WHEN** three uploaded files each contain "Zig"
- **THEN** "Zig" appears once in the review list

### Requirement: Manage dictionary
The system SHALL let users browse, search, edit and delete dictionary entries.

#### Scenario: Edit definition
- **WHEN** the user edits an entry's definition
- **THEN** the new text is shown wherever the term is displayed
