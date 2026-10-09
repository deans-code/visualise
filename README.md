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
