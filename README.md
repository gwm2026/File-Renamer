# SchemeRename

Desktop app to batch-rename files using per-company naming schemes (templates). Works with any file type: audio deliverables, trailer cues, invoices (PDFs), contracts, and more. Pick a company, fill project details, select files, preview new names, and apply renames with optional undo.

**Tech:** Electron + React + TypeScript + Vite + Tailwind. Persistence via `electron-store`. macOS.

---

## Quick start (first time)

1. **Open a terminal** in this project folder (e.g. `File-Renamer`).

2. **Install dependencies** (required once):
   ```bash
   npm install
   ```

3. **Launch the app**:
   ```bash
   npm run electron:dev
   ```
   (This compiles the Electron main/preload code, starts the Vite dev server, and opens the app window.)

**If it doesn’t work:**

- **“Cannot find module” or blank window**  
  Compile main and preload once, then start again:
  ```bash
  npm run build:main
  npm run electron:dev
  ```
- **“npm: command not found”**  
  Install Node.js (which includes npm) from [nodejs.org](https://nodejs.org) or via Homebrew: `brew install node`.
- **Port 5173 in use**  
  Stop any other app using port 5173, or change the port in `vite.config.ts` and in the `wait-on` URL in `package.json` (e.g. 5174).

---

## Setup (reference)

Install dependencies before running or building:

```bash
npm install
```

## Development

1. Build main and preload processes (required once before first run):

   ```bash
   npx tsc -p tsconfig.main.json
   npx tsc -p tsconfig.preload.json
   ```

2. Start Vite dev server and Electron:

   ```bash
   npm run electron:dev
   ```

   Or run Vite and Electron separately: `npm run dev` in one terminal, then `npx electron .` in another (after building main + preload).

## Build

```bash
npm run build
```

This compiles main and preload into `dist-main/` and `dist-preload/`, and builds the renderer into `dist/`.

## Package as a normal app (macOS)

Build a standalone app you can keep in Applications or anywhere:

```bash
npm run package
```

When it finishes you'll have:

- **`release/mac/SchemeRename.app`** — double-click to run like any Mac app.
- **`release/SchemeRename-1.0.0-mac.zip`** — zip of the app you can share.

Copy **SchemeRename.app** to `/Applications` (or leave it in `release/`) and run it from there. Your data (companies, templates) is stored in your user app data folder and will be used by the packaged app too.

### Additional packaging scripts

| Script | Description |
|--------|-------------|
| `npm run package` | Default: builds `.app` directory + `.zip` (x64, works from any OS) |
| `npm run package:mac-zip` | Builds `.zip` for both Intel and Apple Silicon |
| `npm run package:mac-dir` | Builds unpacked `.app` only (fastest, good for testing) |
| `npm run package:mac-dmg` | Builds `.dmg` installer for both Intel and Apple Silicon (**macOS only**) |

> **Note:** DMG creation requires macOS (it uses the native `hdiutil` tool). All other targets work from macOS, Linux, or Windows. The app is not code-signed; on first launch macOS may show a Gatekeeper warning — right-click the app and choose Open to bypass it.

## Tests

```bash
npm test
```

Runs Vitest for shared logic: template rendering, sanitization, filename parsing, stem extraction.

## Presets

- **Parasol Music:** `{artist} - {title} ({codes})_{version}_{type}_{stem}` (e.g. stem deliverables).
- **West One Music Group:** `{projectCode}_{composer}_{trackTitle}_{key}_{bpm}BPM_{version}` (trailer-style).

You can add companies, edit patterns and tokens, and use “Test parse” in the template editor to parse existing filenames.
