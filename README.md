# Profile Visualiser

Upload JSON exports from the [profile tool](https://github.com/deans-code/profile), build a dictionary of the
values and skills they contain, and explore how the people behind them relate.

## Running

```bash
npm install
npm run dev     # web on http://localhost:5173, API on http://localhost:3001
```

Open http://localhost:5173, go to **People** and upload the files in `samples/` (six fictional profiles) to see
it working, then try the **Explore** tab.

Requires Node 22.13 or later (the API uses the built-in `node:sqlite`). Data is stored in `data/profiles.db`
(override with `DB_PATH`; use `:memory:` for a throwaway database). On first start the server downloads a small
language model (about 25 MB) in the background; the app works while it loads, and without it if it can't (see
[Dictionary and catalogue](#dictionary-and-catalogue)). Set `DISABLE_EMBEDDINGS=1` to skip it.

Other settings: `PORT` (API port, default 3001), `BRAVE_API_KEY` (optional search fallback, see below),
`CATALOGUE_FILE` (default `catalogue/catalogue.json`).

## Testing

```bash
npm test                          # unit and component tests (fast, no network, no browser)
npx playwright install chromium   # once, for the end-to-end test
npm run test:e2e                  # the whole journey in a real browser
npm run build                     # type-check and production build
```

The end-to-end test starts its own API and web server on ports 3101 and 5273 with an in-memory database, so it
never touches your dev data and does not need the language model or internet access. The same steps run on every
push and pull request (`.github/workflows/ci.yml`).

## Look, layout and help

The interface follows the profile tool's look: the same buttons, rounded cards, tinted help panels and per-section
accent colours (values blue, technical teal, engineering amber, interpersonal purple, AI rose), in light and dark.
It fills the browser width up to 120rem, so the network, filters and cards use a wide screen rather than a narrow
column, and stack on a phone.

- **Help panels.** Each page opens with a "How to use" panel (what to do, how to read it). Hide it with **Hide
  help**; it stays hidden for the browser session. Explore also describes the selected view and the key filters
  beside their controls.
- **Right-click to explain.** Right-click a term, person, connection, filter, view name, matrix cell or legend
  entry to read what it means; a term shows its definition. From the keyboard, focus the item and press `?` or
  `Shift`+`F10`; on touch, press and hold. `Esc` closes the panel. Anything without an explanation keeps the
  browser's normal menu.
- **Move people around.** In the network, drag a person to rearrange the picture; lines follow. A click that does
  not move still selects. Focus a person and use the arrow keys (`Shift` for bigger steps) to move without a
  mouse. **Reset layout** puts everyone back. Positions are not saved, and changing the filters starts the layout
  afresh.

## Profile format

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

## Uploading

Choose one or many `.json` files on the **People** panel. Files that fail validation are reported with a reason
and do not affect the rest of the batch.

- The export has no name, so each person is named after their file (`alex-smith.json` becomes "alex-smith").
  Use **Rename** to change it.
- Uploading a file whose name matches an existing person asks whether to **Replace existing** or **Keep both**.
- **Delete** removes a person and their links to terms. The dictionary keeps the terms.

## Dictionary and catalogue

The dictionary is seeded from the profile app's catalogue (values, skills, their categories and definitions).
`catalogue/catalogue.json` is a committed snapshot; refresh it after the profile app's lists change:

```bash
npm run import-catalogue                      # reads ../profile/src/data
npm run import-catalogue -- C:\Dev\profile\src\data
```

The server seeds from the snapshot at startup. Re-seeding is safe: it adds new terms and refreshes built-in ones,
and keeps custom terms, aliases and definitions you have confirmed.

- Terms match case-insensitively and through aliases. Similar spellings ("Postgres" for "PostgreSQL") are only
  suggested, never merged automatically.
- **Relatedness** between terms combines catalogue position (same category, same section) with how similar their
  definitions are. Definitions are embedded with a small local model (`Xenova/all-MiniLM-L6-v2`, downloaded on
  first start, roughly 25 MB). If it cannot load, relatedness falls back to catalogue position alone. No profile
  data leaves the machine.
- Custom terms get a suggested category from their nearest catalogue terms, which you confirm or change.

## Looking up unknown terms

Custom entries (anything not in the catalogue) go through a **Review new terms** step after upload. For each
one the app searches online, shows the proposed definition and its source link, and saves nothing until you
**Accept** it (you can edit the text first). **Reject** and **Skip** leave the term undefined; you can write a
definition later from the Dictionary page. If a search finds nothing, you can type a definition yourself.

- **Wikipedia** is always used. It needs no key.
- **Brave Search** is added as a fallback when `BRAVE_API_KEY` is set (get a key at
  [brave.com/search/api](https://brave.com/search/api/)):

  ```bash
  BRAVE_API_KEY=your-key npm run dev          # bash
  $env:BRAVE_API_KEY = "your-key"; npm run dev  # PowerShell
  ```

Only the term itself (plus a hint such as "software") is sent to these services, never profile contents or names.
Searches run server-side, one term at a time, and the key is never sent to the browser.

## Exploring relationships

The **Explore** tab shows how the people relate. People rarely pick the identical term, so connections use
*related* terms too: React and Vue are close because they share a catalogue category and have similar definitions.

**Connect people by** chooses what builds a connection: shared values, experience, what people want to learn, or
**Could help** (arrows from someone who has a skill to someone who wants it, marked *approximate* when the match is
a related skill rather than the same one).

- **Related terms count** sets how much related terms are worth, from exact matches only up to full strength.
- **Hide weaker connections** raises the bar for showing a connection. Raising it also sharpens the groups.
- **Skill areas** limit skills to the areas you care about (values are not skills, so this does not apply to them).
- **Focus on a term** restricts the picture to specific terms.

Views, all sharing the same filters:

| View | Use it to |
|---|---|
| Network | See who is close to whom. Groups are shown by colour **and** shape, and every person is labelled. Select a person or a connection for the exact shared terms, the related pairs and why, and definitions. |
| Matrix | Compare precisely. ● has it, ≈ has a related term. |
| People and terms | See what the team has in common (terms shared by two or more people; tick the box to include one-person terms). |
| By category | Compare people by catalogue category and section, so different picks from the same category still line up. |

Every connection is also available as a table (under the network). Try it with the six fictional profiles in `samples/`.

The theme follows your system setting; use the **Theme** menu to force light or dark.

## Privacy and your data

Profiles describe people, so the app is built to keep them local.

- **Stored on your machine.** People, their terms and the dictionary live in `data/profiles.db` (git-ignored).
  Delete a person on the People tab to remove their links; delete the file to remove everything.
- **What leaves the machine.** Only the text of an unknown custom term (plus a hint such as "software") is sent to
  Wikipedia, and to Brave Search if you set `BRAVE_API_KEY`. Profile contents, names and file names are never sent.
  The first start also downloads the language model from Hugging Face; after that the model runs locally.
- **No sign-in.** The server listens on `127.0.0.1` only and has no authentication. Do not expose it to a network
  without putting access control in front of it.
- **Names.** The profile export has no name field, so people are named after their files. Rename them if file
  names would identify someone you would rather not show.
