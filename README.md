# Profile Visualiser

Upload JSON exports from the [profile tool](https://github.com/deans-code/profile), build a dictionary of the
values and skills they contain, and explore how the people behind them relate.

## Running

```bash
npm install
npm run dev     # web on http://localhost:5173, API on http://localhost:3001
npm test        # unit and component tests
```

Requires Node 22.13+ (the API uses the built-in `node:sqlite`). Data is stored in `data/profiles.db`
(override with `DB_PATH`).

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
