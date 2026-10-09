# Spec Delta

## Purpose

Keeps people, terms and aliases in the user's own browser, so the hosted site needs no server and profile data never leaves the device.

## ADDED Requirements

### Requirement: Data persists in the browser
The system SHALL store individuals, their terms, dictionary terms, aliases and confirmed definitions in browser storage, and SHALL restore them when the page is reloaded or reopened in the same browser.

#### Scenario: Reload
- **WHEN** the user uploads profiles, confirms a definition, and reloads the page
- **THEN** the people, the dictionary entry and the connections are still there

#### Scenario: Another browser
- **WHEN** the same site is opened in a different browser or profile
- **THEN** it starts empty, with only the built-in catalogue

### Requirement: Profile data never leaves the device
The system SHALL NOT send profile contents, person names or file names to any server. The only outbound requests SHALL be for static assets, the language model files, and definition lookups for custom term text.

#### Scenario: Upload and explore
- **WHEN** a user uploads profiles and explores them
- **THEN** no request carries any profile content, name or file name

### Requirement: Built-in dictionary is seeded from the catalogue
On first use, and whenever the catalogue version changes, the system SHALL seed or refresh built-in terms from the catalogue file served with the site, keeping custom terms, aliases and confirmed definitions.

#### Scenario: First visit
- **WHEN** the site is opened in a fresh browser
- **THEN** the dictionary lists every built-in value and skill with its category and definition

#### Scenario: New catalogue version
- **WHEN** a new version of the site ships an updated catalogue
- **THEN** new built-in terms appear, and the user's custom terms and confirmed definitions remain

### Requirement: Clear all data
The system SHALL provide a Clear all data control that, after the user confirms, removes every person and custom term from browser storage and returns the dictionary to the built-in catalogue.

#### Scenario: Clear
- **WHEN** the user confirms Clear all data
- **THEN** the people list is empty, custom terms are gone, and a reload shows the same empty state

#### Scenario: Cancel
- **WHEN** the user cancels the confirmation
- **THEN** nothing changes

### Requirement: Storage unavailable
When browser storage is unavailable or full, the system SHALL keep working for the session using memory only, and SHALL tell the user that data will not be saved and why.

#### Scenario: Private window
- **WHEN** persistent storage cannot be opened
- **THEN** the app works, and a notice says this session's data will be lost when the tab closes

#### Scenario: Save fails
- **WHEN** saving after a change fails
- **THEN** the change stays in the session and the user is told it was not saved

### Requirement: Sample profiles
The system SHALL offer a Load sample profiles action that imports the bundled fictional sample profiles, so a visitor can try the tool without their own files, and SHALL treat them exactly like uploaded files, including replace or keep-both for duplicate names.

#### Scenario: Try it
- **WHEN** a first-time visitor chooses Load sample profiles
- **THEN** six fictional people appear and Explore shows their relationships

### Requirement: Existing behaviour is unchanged
Uploading, naming, renaming, replacing, deleting, term matching, review and editing SHALL behave as before, apart from where the data is stored.

#### Scenario: Duplicate name
- **WHEN** the user uploads a file whose name matches an existing person
- **THEN** they are offered Replace existing or Keep both
