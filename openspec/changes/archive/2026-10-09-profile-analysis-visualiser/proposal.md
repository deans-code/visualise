# Proposal

## Why

The [profile tool](https://github.com/deans-code/profile) lets each person export their values and skills (experience and desired, across technical, engineering, interpersonal and AI domains) as JSON. Individually these files are useful; together they could reveal who shares values, who can mentor whom, and where a team has skill gaps. There is currently no way to combine them, and custom (free-text) entries make naive comparison unreliable because the same concept is spelled many ways and unfamiliar technologies carry no definition.

## What Changes

- New app that accepts one or many profile JSON exports, validates them against the profile tool's schema (`values`, `skills.{technical,engineering,interpersonal,ai}.{experience,desired}`), and treats each file as an individual.
- A persistent **term dictionary** of every value and skill seen, with category, definition, source and aliases. Known built-in terms are recognised on future uploads without re-processing.
- For terms not in the dictionary (custom entries), the app searches online for a definition, proposes it to the uploader, and **persists only after the uploader confirms, edits or rejects it**.
- A **relationship visualisation** showing individuals and what connects them (shared values, shared skills, "has experience in what another wants" mentoring links), with filtering and drill-down.
- Ideas for the visualisation and analysis are captured in design.md so the approach can be reviewed before building.

## Capabilities

### New Capabilities
- `profile-ingestion`: Upload, validation, normalisation and storage of profile JSON exports as individuals.
- `term-dictionary`: Persistent dictionary of values/skills, matching of known and near-duplicate terms, online definition lookup, and user confirmation before persisting.
- `relationship-visualisation`: Interactive views showing relationships between individuals derived from their profiles.

### Modified Capabilities

None (greenfield repository).

## Impact

- New code in this repository (currently empty apart from OpenSpec files): a React + TypeScript + Vite frontend and a small Node backend.
- New external dependency: a web search API (called server-side only) for definition lookup.
- Stores personal profile data; privacy implications covered in design.md.
- Depends on the profile tool's JSON shape, which has no name/identifier field.
