# Spec Delta

## Purpose

Lets the visualiser be served as plain static files, including from a GitHub Pages project site, and be built, tested and published automatically.

## ADDED Requirements

### Requirement: No server needed
The application SHALL work when served as static files with no backend process, no database file and no server-side secrets, and SHALL make no requests to an application API.

#### Scenario: Static serving
- **WHEN** the built `dist/` folder is served by any static file host
- **THEN** every feature works: upload, dictionary, exploration and term review

#### Scenario: No API calls
- **WHEN** a user uploads profiles and explores them
- **THEN** the browser makes no request to a `/api` path

### Requirement: Configurable base path
The build SHALL serve all assets, the catalogue and the worker and WebAssembly files from a configurable base path, defaulting to `/visualise/` and overridable with `VITE_BASE`, so the site works at a project-site URL and at a root URL.

#### Scenario: Project site
- **WHEN** the site is built with the default base and served at `/visualise/`
- **THEN** scripts, styles, the catalogue and the WebAssembly file all load

#### Scenario: Root deployment
- **WHEN** the site is built with `VITE_BASE=/` and served from the root
- **THEN** every asset loads from the root

### Requirement: Deployment workflow
A GitHub Actions workflow SHALL run on every push to `main` and on demand. It SHALL install dependencies, run the tests, build, and deploy `dist/` to GitHub Pages using the official Pages actions with the minimum permissions they need, and SHALL NOT deploy when a test or the build fails.

#### Scenario: Passing run
- **WHEN** a commit is pushed to `main` and the tests and build pass
- **THEN** the new build is published and the deployment job reports the site URL

#### Scenario: Failing test
- **WHEN** a test fails on a push to `main`
- **THEN** nothing is deployed and the previous site stays live

#### Scenario: Concurrent pushes
- **WHEN** two pushes happen close together
- **THEN** only the latest deployment completes

### Requirement: Works without special browser features beyond the baseline
The application SHALL run in current evergreen browsers, and SHALL show a clear message, rather than a blank page, if WebAssembly or IndexedDB is unavailable.

#### Scenario: Unsupported browser
- **WHEN** the browser cannot run WebAssembly
- **THEN** the page explains that a current browser is required
