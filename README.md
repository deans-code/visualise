# Profile Visualiser

## :movie_camera: Background

A tool to help understand how a team's profiles relate: who shares values, who has the same or similar skills, who wants to learn what, and who could help whom.

Users upload the JSON exported by the [profile tool](https://github.com/deans-code/profile), build a dictionary of the values and skills those profiles contain, and explore the relationships between the people as a network, a matrix, a people-and-terms graph and a category comparison.

The software runs on the user's own machine. Profiles are stored in a local database and are never sent anywhere. Only the text of an unknown custom term (plus a generic hint such as "software") is sent to an online definition service, and only when the user is reviewing new terms (see [Privacy and your data](#privacy-and-your-data)).

## :white_check_mark: Scope

- [x] Upload one or many profile JSON files, validated on import, with a reason given for any file that fails.
- [x] Name each person after their file, with rename, delete, and a replace or keep-both choice for duplicate names.
- [x] Seed a dictionary of values and skills (with categories and definitions) from the profile tool's catalogue.
- [x] Match terms case-insensitively and through aliases, suggesting (never automatically merging) similar spellings.
- [x] Measure how related two terms are, from catalogue position and the similarity of their definitions.
- [x] Look up definitions for custom terms online, and save nothing until the user accepts, edits or rejects the proposal.
- [x] Suggest a category for a custom term from its nearest catalogue terms.
- [x] Show relationships as a network, a matrix, a people-and-terms graph and a by-category comparison, all sharing the same filters.
- [x] Connect people by shared values, experience, what they want to learn, or who could help whom.
- [x] Let related terms count towards a connection, with a control from exact matches only to full strength.
- [x] Present every connection as a table as well as a picture, and tell groups apart by shape as well as colour.
- [x] Use the profile tool's look, with a distinct accent colour per section, in light and dark themes.
- [x] Use a wide, fluid layout that fills the browser width and stacks on a phone.
- [x] Provide a description for every term and visualisation concept, opened by right-click (with keyboard and touch alternatives).
- [x] Provide a "How to use" panel on every page, a description of each view, and a hint beside each key control.
- [x] Let people be dragged around the network, or moved with the arrow keys, with a button to reset the layout.
- [x] Provide an end-to-end test and a GitHub Actions workflow that runs every test on each push and pull request.

## :telescope: Future Gazing

- [ ] Remember where people were dragged to, across reloads.
- [ ] Refresh the catalogue snapshot automatically when the profile tool's lists change.

## :beetle: Known defects

- In light mode the third group colour (aqua) is 2.74:1 against the surface, below the 3:1 target for graphical marks. Every person is also labelled and given a distinct shape, and the connections are available as a table, so colour is never the only cue.

## :crystal_ball: Use of AI

[Claude Code](https://claude.com/product/claude-code) was used to assist in the development of this software, with planning and changes managed using [OpenSpec](https://openspec.dev/).

## :rocket: Getting Started

### :computer: System Requirements

#### Software

![Node.js](https://img.shields.io/badge/Node.js-22.13+-blueviolet "Node.js")
![React](https://img.shields.io/badge/React-19-blueviolet "React")
![TypeScript](https://img.shields.io/badge/TypeScript-latest-blueviolet "TypeScript")
![Vite](https://img.shields.io/badge/Vite-latest-blueviolet "Vite")
![Fastify](https://img.shields.io/badge/Fastify-5-blueviolet "Fastify")
![SQLite](https://img.shields.io/badge/SQLite-node:sqlite-blueviolet "SQLite")

> [!NOTE]
> Other operating systems and versions will work, where versions are specified treat as minimums. Node.js 22.13 or later is required because the API uses the built-in `node:sqlite`.

#### Hardware

No special hardware is required. On first start the server downloads a small language model (about 25 MB), which runs on the CPU.

### :floppy_disk: System Configuration

No configuration is required. The settings below are all optional:

| Setting | Default | Purpose |
|---------|---------|---------|
| `PORT` | `3001` | Port the API listens on. |
| `DB_PATH` | `data/profiles.db` | Where the database is stored. Use `:memory:` for a throwaway database. |
| `CATALOGUE_FILE` | `catalogue/catalogue.json` | The catalogue snapshot the dictionary is seeded from. |
| `BRAVE_API_KEY` | none | Adds Brave Search as a fallback when looking up definitions. |
| `DISABLE_EMBEDDINGS` | unset | Set to `1` to skip downloading the language model. Relatedness then uses catalogue position alone. |

### :wrench: Development Setup

Clone the repository.

Install the dependencies:

```bash
npm install
```

Start the web app and the API, then open <http://localhost:5173>:

```bash
npm run dev     # web on http://localhost:5173, API on http://localhost:3001
```

Go to **People** and upload the files in `samples/` (six fictional profiles) to see it working, then try the **Explore** tab.

While the language model downloads in the background the app works as normal, and it keeps working without the model if it cannot be downloaded (see [Dictionary and catalogue](#dictionary-and-catalogue)).

## :zap: Features

- Upload of one or many profile JSON files at once, with per-file errors that do not affect the rest of the batch.
- A dictionary of values and skills with categories, definitions, search, an "undefined only" filter, and editing.
- Related-term matching, so React and Vue are close but not identical, with the strength of that relationship adjustable.
- Online lookup of custom terms from Wikipedia (and optionally Brave Search), with a review step before anything is saved.
- A network of people with groups shown by colour and shape, where selecting a person or a connection shows the exact shared terms, the related pairs and why.
- A matrix, a people-and-terms graph and a by-category comparison, all with the same filters.
- A "Could help" basis, with arrows from someone who has a skill to someone who wants it.
- People that can be dragged (or moved with the arrow keys) to untangle the picture.
- Right-click descriptions for terms, people, connections, filters, views, matrix cells and legends.
- A collapsible "How to use" panel on every page, a description of the selected view, and a hint beside each key control.
- A distinct colour for each profile section, with accessible contrast in light and dark themes.
- A wide, fluid layout that uses the full width of the screen up to 120rem and stacks on a phone.
- Local storage only, with no sign-in and a server that listens on `127.0.0.1`.

## :paperclip: Usage

1. On **People**, choose one or more `.json` files exported from the profile tool. Each file is one person, named after the file.
2. Review any new custom terms: **Accept** a proposed definition (editing it first if you like), or **Reject** or **Skip** it.
3. Open **Explore**, pick a view, and use the filters to decide what counts as a connection. Select a person or a connection to see what links them.
4. Use **Dictionary** to search terms, find those still undefined, and edit definitions and categories.

### Profile format

Each uploaded file is one person, in the profile tool's export shape:

```json
{
  "values": ["Integrity", "Trust"],
  "skills": {
    "technical": { "experience": ["React"], "desired": ["Rust"] },
    "engineering": { "experience": [], "desired": [] },
    "interpersonal": { "experience": [], "desired": [] },
    "ai": { "experience": [], "desired": [] }
  }
}
```

`values` and `skills` are required; an omitted skills section counts as empty. Custom entries are allowed.

### Uploading

Choose one or many `.json` files on the **People** panel. Files that fail validation are reported with a reason and do not affect the rest of the batch.

- The export has no name, so each person is named after their file (`alex-smith.json` becomes "alex-smith"). Use **Rename** to change it.
- Uploading a file whose name matches an existing person asks whether to **Replace existing** or **Keep both**.
- **Delete** removes a person and their links to terms. The dictionary keeps the terms.

### Dictionary and catalogue

The dictionary is seeded from the profile app's catalogue (values, skills, their categories and definitions). `catalogue/catalogue.json` is a committed snapshot; refresh it after the profile app's lists change:

```bash
npm run import-catalogue                      # reads ../profile/src/data
npm run import-catalogue -- C:\Dev\profile\src\data
```

The server seeds from the snapshot at startup. Re-seeding is safe: it adds new terms and refreshes built-in ones, and keeps custom terms, aliases and definitions you have confirmed.

- Terms match case-insensitively and through aliases. Similar spellings ("Postgres" for "PostgreSQL") are only suggested, never merged automatically.
- **Relatedness** between terms combines catalogue position (same category, same section) with how similar their definitions are. Definitions are embedded with a small local model (`Xenova/all-MiniLM-L6-v2`, downloaded on first start, roughly 25 MB). If it cannot load, relatedness falls back to catalogue position alone. No profile data leaves the machine.
- Custom terms get a suggested category from their nearest catalogue terms, which you confirm or change.

### Looking up unknown terms

Custom entries (anything not in the catalogue) go through a **Review new terms** step after upload. For each one the app searches online, shows the proposed definition and its source link, and saves nothing until you **Accept** it (you can edit the text first). **Reject** and **Skip** leave the term undefined; you can write a definition later from the Dictionary page. If a search finds nothing, you can type a definition yourself.

- **Wikipedia** is always used. It needs no key.
- **Brave Search** is added as a fallback when `BRAVE_API_KEY` is set (get a key at [brave.com/search/api](https://brave.com/search/api/)):

  ```bash
  BRAVE_API_KEY=your-key npm run dev              # bash
  $env:BRAVE_API_KEY = "your-key"; npm run dev    # PowerShell
  ```

Only the term itself (plus a hint such as "software") is sent to these services, never profile contents or names. Searches run server-side, one term at a time, and the key is never sent to the browser.

### Exploring relationships

The **Explore** tab shows how the people relate. People rarely pick the identical term, so connections use *related* terms too: React and Vue are close because they share a catalogue category and have similar definitions.

**Connect people by** chooses what builds a connection: shared values, experience, what people want to learn, or **Could help** (arrows from someone who has a skill to someone who wants it, marked *approximate* when the match is a related skill rather than the same one).

- **Related terms count** sets how much related terms are worth, from exact matches only up to full strength.
- **Hide weaker connections** raises the bar for showing a connection. Raising it also sharpens the groups.
- **Skill areas** limit skills to the areas you care about (values are not skills, so this does not apply to them).
- **Focus on a term** restricts the picture to specific terms.

Views, all sharing the same filters:

| View | Use it to |
|------|-----------|
| Network | See who is close to whom. Groups are shown by colour **and** shape, and every person is labelled. Select a person or a connection for the exact shared terms, the related pairs and why, and definitions. |
| Matrix | Compare precisely. ● has it, ≈ has a related term. |
| People and terms | See what the team has in common (terms shared by two or more people; tick the box to include one-person terms). |
| By category | Compare people by catalogue category and section, so different picks from the same category still line up. |

Every connection is also available as a table (under the network). Try it with the six fictional profiles in `samples/`.

The theme follows your system setting; use the **Theme** menu to force light or dark.

### Moving people around

In the network, drag a person to rearrange the picture; their lines follow. A click that does not move still selects. Focus a person and use the arrow keys (`Shift` for bigger steps) to move without a mouse. **Reset layout** puts everyone back. Positions are not saved, and changing the filters starts the layout afresh.

### Descriptions

Click an item to use it as normal. To see what it means:

| Input | Action |
|-------|--------|
| Mouse | Right-click the term, person, connection, filter, view name, matrix cell or legend entry |
| Keyboard | Focus it and press `?`, the context-menu key or `Shift`+`F10` |
| Touch | Press and hold it |

A term shows its definition. Press `Escape`, use **Close** or click elsewhere to dismiss the description. Anything without a description keeps the browser's normal menu.

### Help panels

Each page opens with a **How to use** panel that says what to do and how to read the page. Use **Hide help** to collapse it; it stays collapsed for the browser session. Explore also describes the selected view, and the key filters have a short hint beside them.

### Look and layout

The interface follows the profile tool's look: the same buttons, rounded cards, tinted help panels and per-section accent colours (values blue, technical teal, engineering amber, interpersonal purple, AI rose), in light and dark. It fills the browser width up to 120rem, so the network, filters and cards use a wide screen rather than a narrow column, and stack on a phone.

### Privacy and your data

Profiles describe people, so the app is built to keep them local.

- **Stored on your machine.** People, their terms and the dictionary live in `data/profiles.db` (git-ignored). Delete a person on the People tab to remove their links; delete the file to remove everything.
- **What leaves the machine.** Only the text of an unknown custom term (plus a hint such as "software") is sent to Wikipedia, and to Brave Search if you set `BRAVE_API_KEY`. Profile contents, names and file names are never sent. The first start also downloads the language model from Hugging Face; after that the model runs locally.
- **No sign-in.** The server listens on `127.0.0.1` only and has no authentication. Do not expose it to a network without putting access control in front of it.
- **Names.** The profile export has no name field, so people are named after their files. Rename them if file names would identify someone you would rather not show.

## :hammer_and_wrench: Architecture

- **React, TypeScript and Vite** for the web app, and **Fastify** with **SQLite** (`node:sqlite`) for the local API.
- **Shared code** (`shared/`) is used by both sides: profile validation, term normalisation, relatedness and the graph calculations.
- **Server** (`server/`) holds the database, the dictionary, embeddings, definition lookup, term placement and the routes for individuals, terms and the graph.
- **Catalogue as data** (`catalogue/catalogue.json`), a committed snapshot of the profile tool's lists that seeds the dictionary at startup.
- **Explanations as data** (`src/explanations.ts`), with one provider and panel (`src/explain.tsx`) shared by every explainable element, which handles right-click, keyboard and long-press.
- **Section colours** are CSS custom properties set per `data-section`, with tests that check their contrast in both themes.
- **Network layout** is computed with a force simulation (`src/graph/layout.ts`), so the same data always gives the same picture. Dragged positions are layered over it and cleared when the filters change.

Planning artifacts for each change are in `openspec/`.

## :question: Tests

```bash
npm test                          # unit and component tests (fast, no network, no browser)
npx playwright install chromium   # once, for the end-to-end test
npm run test:e2e                  # the whole journey in a real browser
npm run build                     # type-check and production build
```

The end-to-end test starts its own API and web server on ports 3101 and 5273 with an in-memory database, so it never touches your dev data and does not need the language model or internet access. The same steps run on every push and pull request (`.github/workflows/ci.yml`).

## :wave: Contributing

This tool was built to aid the management of a software engineering team and is a personal project at this stage.

## :gift: License

This software is licensed under the [MIT](LICENSE) license.

## :book: Further reading

- [React](https://react.dev/)
- [Vite](https://vite.dev/)
- [Vitest](https://vitest.dev/)
- [Fastify](https://fastify.dev/)
- [Playwright](https://playwright.dev/)
- [OpenSpec](https://openspec.dev/)
