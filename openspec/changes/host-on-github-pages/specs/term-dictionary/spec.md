# Spec Delta

## MODIFIED Requirements

### Requirement: Import the profile catalogue
The system SHALL load the profile app's catalogue (values, skills by section, their categories, and built-in definitions) from a snapshot file served with the site, and seed the dictionary with every built-in term, its category and its definition. The snapshot SHALL be produced at build time by an import script that reads the profile app's data from a configurable local path.

#### Scenario: Seed from catalogue
- **WHEN** the site is opened in a browser with no stored data
- **THEN** every built-in value and skill exists in the dictionary with its category, section and definition

#### Scenario: Catalogue changes
- **WHEN** the profile app adds a term, the snapshot is re-imported and a new version of the site is opened
- **THEN** the new term is added and existing entries, aliases and confirmed custom definitions are preserved

#### Scenario: Refresh the snapshot
- **WHEN** the import script is run with the path to the profile app's `src/data`
- **THEN** the snapshot and its precomputed embeddings are regenerated for the next build

### Requirement: Seed and grow dictionary
The system SHALL store every distinct value and skill with its category (and domain for skills), definition, source and aliases in the browser's own storage, and reuse it for later uploads in that browser.

#### Scenario: Known term on later upload
- **WHEN** an uploaded profile contains a term already in the dictionary
- **THEN** it is linked to the existing entry and no lookup or prompt occurs

#### Scenario: Survives a reload
- **WHEN** the user confirms a custom term's definition and reloads the page
- **THEN** the term and its definition are still in the dictionary
