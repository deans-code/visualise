# Profile Visualiser

## :movie_camera: Background

A tool to help understand how a team's profiles relate: who shares values, who has the same or similar skills, who wants to learn what, and who could help whom.

Users upload the JSON exported by the [profile tool](https://github.com/deans-code/profile), build a dictionary of the values and skills those profiles contain, and explore the relationships between the people as a network, a matrix, a people-and-terms graph and a category comparison.

The software runs entirely in the browser, as a static site hosted on GitHub Pages. There is no server and no account. Profiles are kept in the browser's own storage and are never sent anywhere. Only the text of an unknown custom term (plus a generic hint such as "software") is sent to Wikipedia, and only when the user is reviewing new terms (see [Privacy and your data](#privacy-and-your-data)).

Once deployed (see [Deployment](#ship-deployment)), the site is at <https://deans-code.github.io/visualise/>.

## :white_check_mark: Scope

- [x] Upload one or many profile JSON files, validated on import, with a reason given for any file that fails.
- [x] Name each person after their file, with rename, delete, and a replace or keep-both choice for duplicate names.
- [x] Seed a dictionary of values and skills (with categories and definitions) from the profile tool's catalogue.
- [x] Match terms case-insensitively and through aliases, suggesting (never automatically merging) similar spellings.
- [x] Measure how related two terms are, from catalogue position and the similarity of their definitions.
- [x] Look up definitions for custom terms on Wikipedia, and save nothing until the user accepts, edits or rejects the proposal.
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
- [x] Run entirely in the browser as a static site, keeping people and the dictionary in browser storage.
- [x] Relate built-in terms immediately, using vectors computed ahead of time, and load the language model only for custom terms.
- [x] Offer sample profiles to try, and a control to clear all data.
- [x] Provide GitHub Actions workflows that test every push and pull request, and deploy to GitHub Pages from `main`.
- [ ] Deploy to GitHub Pages and confirm the live site.

## :telescope: Future Gazing

- [ ] Remember where people were dragged to, across reloads.
- [ ] Refresh the catalogue snapshot automatically when the profile tool's lists change.
- [ ] Host the language model and its runtime on the site itself, so no third-party host is needed.

## :beetle: Known defects

- In light mode the third group colour (aqua) is 2.74:1 against the surface, below the 3:1 target for graphical marks. Every person is also labelled and given a distinct shape, and the connections are available as a table, so colour is never the only cue.
- Data lives in one browser. It is not shared between browsers or devices, and a browser can discard it under storage pressure or when site data is cleared. Keep your exported profile files; they are the source of truth and can be uploaded again.

## :crystal_ball: Use of AI

[Claude Code](https://claude.com/product/claude-code) was used to assist in the development of this software, with planning and changes managed using [OpenSpec](https://openspec.dev/).

## :rocket: Getting Started

### :computer: System Requirements

#### Software

![Node.js](https://img.shields.io/badge/Node.js-latest_LTS-blueviolet "Node.js")
![React](https://img.shields.io/badge/React-19-blueviolet "React")
![TypeScript](https://img.shields.io/badge/TypeScript-latest-blueviolet "TypeScript")
![Vite](https://img.shields.io/badge/Vite-latest-blueviolet "Vite")
![SQLite](https://img.shields.io/badge/SQLite-WebAssembly-blueviolet "SQLite")

> [!NOTE]
> Other operating systems and versions will work, where versions are specified treat as minimums. To use the site, any current browser with WebAssembly and IndexedDB will do; Node.js is only needed to develop and build it.

#### Hardware

No special hardware is required. When a custom term needs a category suggestion, the browser downloads a small language model (about 25 MB) once and caches it.

### :floppy_disk: System Configuration

No configuration is required. The application has no backend, accounts or secrets.

The application is served under the `/visualise/` base path, which is what GitHub Pages needs for a project site. To serve from the root instead (for example, on a custom domain or another static host), set `VITE_BASE` when building:

```bash
VITE_BASE=/ npm run build              # macOS, Linux, Git Bash
$env:VITE_BASE = '/'; npm run build    # PowerShell
```

### :wrench: Development Setup

Clone the repository.

Install the dependencies:

```bash
npm install
```

Start the development server and open <http://localhost:5173/visualise/>:

```bash
npm run dev
```

To check the production build locally, build and preview it, then open <http://localhost:4173/visualise/>:

```bash
npm run build
npm run preview
```

Go to **People** and choose **Load sample profiles** (or upload the files in `samples/`) to see it working, then try the **Explore** tab.

## :zap: Features

- Upload of one or many profile JSON files at once, with per-file errors that do not affect the rest of the batch, and a button to load six fictional sample profiles.
- A dictionary of values and skills with categories, definitions, search, an "undefined only" filter, and editing.
- Related-term matching, so React and Vue are close but not identical, with the strength of that relationship adjustable.
- Online lookup of custom terms from Wikipedia, with a review step before anything is saved.
- A network of people with groups shown by colour and shape, where selecting a person or a connection shows the exact shared terms, the related pairs and why.
- A matrix, a people-and-terms graph and a by-category comparison, all with the same filters.
- A "Could help" basis, with arrows from someone who has a skill to someone who wants it.
- People that can be dragged (or moved with the arrow keys) to untangle the picture.
- Right-click descriptions for terms, people, connections, filters, views, matrix cells and legends.
- A collapsible "How to use" panel on every page, a description of the selected view, and a hint beside each key control.
- A distinct colour for each profile section, with accessible contrast in light and dark themes.
- A wide, fluid layout that uses the full width of the screen up to 120rem and stacks on a phone.
- Data kept in the browser between visits, with a clear notice if it cannot be saved, and a **Clear all data** control.

## :paperclip: Usage

1. On **People**, choose one or more `.json` files exported from the profile tool, or choose **Load sample profiles**. Each file is one person, named after the file.
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
- Uploading a file whose name matches an existing person asks whether to **Replace existing** or **Keep both**. **Load sample profiles** works the same way.
- **Delete** removes a person and their links to terms. The dictionary keeps the terms.
- **Clear all data** removes every person and custom term from this browser, after you confirm, and returns the dictionary to the built-in catalogue.

### Dictionary and catalogue

The dictionary is seeded from the profile app's catalogue (values, skills, their categories and definitions). `public/catalogue/catalogue.json` is a committed snapshot served with the site, together with `embeddings.bin`, a vector for every term computed ahead of time. Refresh them after the profile app's lists change:

```bash
npm run import-catalogue                      # reads ../profile/src/data, then recomputes the embeddings
npm run import-catalogue -- C:\Dev\profile\src\data
npm run embed-catalogue                       # recompute the embeddings only
```

The first time the site opens in a browser, and whenever a new version ships a different catalogue, it adds the new terms and refreshes the built-in ones, keeping custom terms, aliases and definitions you have confirmed. A test fails if the catalogue and its embeddings do not match.

- Terms match case-insensitively and through aliases. Similar spellings ("Postgres" for "PostgreSQL") are only suggested, never merged automatically.
- **Relatedness** between terms combines catalogue position (same category, same section) with how similar their definitions are. Built-in terms use the vectors shipped with the site, so relatedness works at once with nothing to download. Custom terms are embedded with a small language model (`Xenova/all-MiniLM-L6-v2`, about 25 MB), loaded in a background worker only when a custom term needs it and cached by the browser. If it cannot be loaded, relatedness falls back to catalogue position alone and the review step says that no category suggestion is available.
- Custom terms get a suggested category from their nearest catalogue terms, which you confirm or change.

### Looking up unknown terms

Custom entries (anything not in the catalogue) go through a **Review new terms** step after upload. For each one the app searches Wikipedia, shows the proposed definition and its source link, and saves nothing until you **Accept** it (you can edit the text first). **Reject** and **Skip** leave the term undefined; you can write a definition later from the Dictionary page. If the search finds nothing, or fails, you can type a definition yourself.

The lookup is made directly from your browser to Wikipedia, which needs no key. Terms are looked up one at a time.

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

Every connection is also available as a table (under the network). Try it with the six fictional profiles.

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

Profiles describe people, so the app is built to keep them on your device.

- **Stored in your browser.** People, their terms and the dictionary are kept in the browser's IndexedDB for this site. Delete a person on the People tab to remove their links, or use **Clear all data** to remove everything. Clearing the site's data in the browser does the same. Nothing is stored anywhere else.
- **What leaves your device.** Profile contents, names and file names never do. Three outside services are used, and only when needed:
  - **Wikipedia** receives the text of a custom term (plus a hint such as "software") when you review it.
  - **Hugging Face** (huggingface.co) serves the language model files, and **jsDelivr** (cdn.jsdelivr.net) serves its runtime, the first time a custom term needs a category suggestion. They are cached by your browser afterwards. Neither is sent anything about your profiles.
  - **GitHub Pages** serves the site itself, as it does for any visitor.
- **No sign-in.** There are no accounts and no server of ours.
- **If storage is unavailable.** In a private window, or if the browser blocks storage, the app still works but says that your data will not be saved. If a save fails, it says so and tries again on your next change.
- **Names.** The profile export has no name field, so people are named after their files. Rename them if file names would identify someone you would rather not show.

## :ship: Deployment

The site is a static build (`dist/`) hosted on GitHub Pages. `.github/workflows/deploy.yml` runs on every push to `main` (and can be run manually from the Actions tab). It installs dependencies, runs the tests, builds and deploys; a failing test stops the deployment, so the live site is always a build that passed. The slower end-to-end test runs separately in `.github/workflows/ci.yml` on every push and pull request.

### One-time setup

1. Push the repository to GitHub.
2. In the repository, go to **Settings > Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`, or run the workflow manually. When it finishes the site is live at `https://<owner>.github.io/<repo>/`, which for this repository should be <https://deans-code.github.io/visualise/>.

> [!WARNING]
> The `base` path in `vite.config.ts` defaults to `/visualise/` and must match the repository name. If the repository is renamed, update it (or set `VITE_BASE` in the workflow's build step), otherwise the site loads without its scripts and styles.

### Other static hosts

The build output is host-agnostic. For Cloudflare Pages, Netlify or similar, use `npm run build` as the build command, `dist` as the output directory, and set `VITE_BASE=/` so assets resolve from the root.

## :hammer_and_wrench: Architecture

- **React, TypeScript and Vite**, with no backend. The same code runs in the browser and, for tests, in Node.
- **SQLite in WebAssembly** (`sql.js`) holds people, terms and aliases. `core/db.ts` wraps it in the small interface the rest of the code uses, and `core/persistence.ts` saves the whole database to IndexedDB after changes (debounced, and when the page is hidden), tells the app when saving fails, and notices when another tab saved a newer copy.
- **The data layer** (`core/`) is the dictionary, uploads, graph, placement and lookup logic. `core/api.ts` implements the interface the pages use (`shared/api.ts`) directly in the browser, so the components never build requests.
- **Shared code** (`shared/`) holds profile validation, term normalisation, relatedness and the graph calculations.
- **Catalogue as data** (`public/catalogue/`), a committed snapshot of the profile tool's lists with a precomputed vector per term, fetched through the base path and used to seed the dictionary.
- **Language model in a worker** (`src/embedder.worker.ts`, `core/embedder-client.ts`), started only when a custom term needs an embedding, with a fallback to catalogue-position relatedness.
- **Explanations as data** (`src/explanations.ts`), with one provider and panel (`src/explain.tsx`) shared by every explainable element, which handles right-click, keyboard and long-press.
- **Section colours** are CSS custom properties set per `data-section`, with tests that check their contrast in both themes.
- **Network layout** is computed with a force simulation (`src/graph/layout.ts`), so the same data always gives the same picture. Dragged positions are layered over it and cleared when the filters change.

Planning artifacts for each change are in `openspec/`.

## :question: Tests

```bash
npm test                          # unit and component tests, including a real production build (no network, no browser)
npx playwright install chromium   # once, for the end-to-end test
npm run test:e2e                  # the whole journey in a real browser
npm run build                     # type-check and production build
```

The end-to-end test builds the site, serves it with `vite preview` on port 5273 under the same base path as GitHub Pages, and drives it in a real browser. Wikipedia is stubbed and the language model hosts are refused, so it needs no internet access, and it checks that no request goes to an application API and that nothing about the people is sent out. The same steps run on every push and pull request (`.github/workflows/ci.yml`).

## :wave: Contributing

This tool was built to aid the management of a software engineering team and is a personal project at this stage.

## :gift: License

This software is licensed under the [MIT](LICENSE) license.

## :book: Further reading

- [React](https://react.dev/)
- [Vite](https://vite.dev/)
- [Vitest](https://vitest.dev/)
- [sql.js](https://sql.js.org/)
- [Transformers.js](https://huggingface.co/docs/transformers.js)
- [Playwright](https://playwright.dev/)
- [GitHub Pages](https://docs.github.com/en/pages)
- [OpenSpec](https://openspec.dev/)
