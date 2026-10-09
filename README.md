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
