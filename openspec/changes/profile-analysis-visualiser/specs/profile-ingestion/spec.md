# Spec Delta

## Purpose

Lets users load profile tool JSON exports into the app as individuals, rejecting malformed input and keeping the data needed for analysis.

## ADDED Requirements

### Requirement: Accept multiple profile files
The system SHALL accept one or more profile JSON files in a single upload and create one individual per file.

#### Scenario: Batch upload
- **WHEN** the user selects three valid profile files
- **THEN** three individuals are created and listed

### Requirement: Validate profile schema
The system MUST validate each file against the profile tool's export shape and reject files that do not conform, without affecting other files in the batch.

#### Scenario: Invalid file in batch
- **WHEN** a batch contains two valid files and one with `skills` missing or not an object
- **THEN** the two valid files are imported and the invalid file is reported with the reason

#### Scenario: Not JSON
- **WHEN** a file is not parseable JSON
- **THEN** the file is rejected with a parse error message

### Requirement: Name individuals
The system SHALL label each individual using a user-editable display name, defaulting to the file name without extension, because the export contains no name.

#### Scenario: Default and rename
- **WHEN** `alex-smith.json` is uploaded and later renamed to "Alex S."
- **THEN** the individual is shown as "alex-smith" initially and "Alex S." afterwards in all views

### Requirement: Handle re-uploads
The system SHALL detect when an uploaded individual has the same display name as an existing one and let the user replace it or keep both.

#### Scenario: Replace
- **WHEN** the user uploads a file whose name matches an existing individual and chooses Replace
- **THEN** the individual's values and skills are overwritten and no duplicate is created

### Requirement: Remove individuals
The system SHALL let the user delete an individual and all their profile data.

#### Scenario: Delete
- **WHEN** the user deletes an individual
- **THEN** that person no longer appears in any list or visualisation, while dictionary terms remain
