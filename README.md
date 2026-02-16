# Company File Naming Tool

File renaming app for storing and reusing company-specific naming standards.
You can run it either as a desktop app (Tkinter) or as a web app (browser + local Python server).

## What it does

- Stores naming schemes per company in `company_schemes.json`
- Lets you pick a company from a dropdown
- Shows project detail fields required by that company
- Generates a rename preview for every file in a chosen folder
- Applies the rename in one batch action
- Lets you add, edit, and delete company schemes in-app

## Run desktop version

```bash
python3 app.py
```

No third-party Python packages are required (uses the Python standard library + Tkinter).

If you are on Linux and Tkinter is missing, install it with:

```bash
sudo apt-get install python3-tk
```

## Run web version

```bash
python3 web_app.py --host 127.0.0.1 --port 8000
```

Then open:

```text
http://127.0.0.1:8000
```

Notes for web mode:

- The folder path you enter is resolved on the machine running `web_app.py`.
- No third-party Python packages are required.
- Schemes are shared with desktop mode through `company_schemes.json`.

## Naming pattern tokens

Each company scheme has a `pattern` string. You can use:

- `{seq}` - running sequence number (`sequence_start`, `sequence_padding`)
- `{company}` - selected company name
- `{original_name}` - original filename stem
- `{original_filename}` - original filename including extension
- `{ext}` - original extension without the dot
- `{ext_with_dot}` - original extension with the dot
- Any custom project fields from `fields` (for example `{project_code}`)

### Example patterns

- `{client}_{project_code}_{deliverable}_{date}_{seq}`
- `{project_code}-{phase}-{drawing_type}-{seq}-{ext}`
- `{company}-{project_code}-{original_name}-{seq}`

## Configure schemes

Schemes are saved in `company_schemes.json` with this structure:

```json
{
  "Company Name": {
    "pattern": "{project_code}_{phase}_{seq}",
    "fields": ["project_code", "phase"],
    "sequence_start": 1,
    "sequence_padding": 3
  }
}
```

You can edit this file directly or use the **Manage Company Schemes** tab in the app.

## Notes

- The app renames all files in the selected folder (not subfolders).
- Filename-invalid characters are replaced automatically.
- Preview is shown before rename, and rename uses temporary names internally to avoid collisions.
- The web app provides the same core workflow: company dropdown, project details, preview, and apply rename.
