# Spec Delta

## Purpose

Provides term relatedness and online definition lookup entirely from the browser, so the hosted site needs no server and no secrets.

## ADDED Requirements

### Requirement: Relatedness works immediately
Relatedness between built-in terms SHALL be available as soon as the dictionary is seeded, using embeddings computed ahead of time and shipped with the catalogue, without downloading a language model.

#### Scenario: First visit
- **WHEN** a first-time visitor uploads profiles that contain only built-in terms
- **THEN** related terms such as React and Vue connect people with no model download

### Requirement: Model loads only when needed
The sentence-embedding model SHALL be loaded in the background, off the main thread, only when something needs an embedding the catalogue does not supply (a custom term's placement or relatedness), and SHALL be cached by the browser for later visits.

#### Scenario: Custom term
- **WHEN** the user reviews a custom term
- **THEN** the model loads in the background, the page stays responsive, and a category is suggested once it is ready

#### Scenario: No custom terms
- **WHEN** a user never adds a custom term
- **THEN** the model is never requested

### Requirement: Fallback without the model
If the model cannot be loaded (offline, blocked or unsupported), the system SHALL continue using catalogue-position relatedness, SHALL say that custom-term suggestions are unavailable, and SHALL NOT block uploads or review.

#### Scenario: Offline
- **WHEN** the model cannot be fetched
- **THEN** exploration still works, the category suggestion is skipped, and the user can type a category

### Requirement: Definition lookup from the browser
The system SHALL look up proposed definitions for custom terms by calling Wikipedia directly from the browser, without an API key, and SHALL send only the term text with a generic hint such as "software". It SHALL NOT use any service that requires a secret key.

#### Scenario: Proposal
- **WHEN** the user reviews the custom term "Svelte"
- **THEN** a proposed definition with its source link is shown, and nothing is saved until the user accepts it

#### Scenario: Lookup fails
- **WHEN** the request fails or finds nothing usable
- **THEN** the user is told why and can type a definition themselves

### Requirement: Lookup privacy is stated
The interface and README SHALL state that custom term text (and nothing else from a profile) is sent to Wikipedia, and that the model files are fetched from a model host.

#### Scenario: Reading the privacy note
- **WHEN** a user reads the privacy section
- **THEN** it lists exactly what leaves the device and why
