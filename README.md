# SchemeRename

Desktop app to batch-rename audio files (WAV, AIF, MP3) using per-company naming schemes (templates). Pick a company, fill project details, select files, preview new names, and apply renames with optional undo.

**Tech:** Electron + React + TypeScript + Vite + Tailwind. Persistence via `electron-store`. macOS.

## Setup

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

## Package (macOS app)

```bash
npm run electron:build
```

Produces the app in `release/` (dmg/zip).

## Tests

```bash
npm test
```

Runs Vitest for shared logic: template rendering, sanitization, filename parsing, stem extraction.

## Presets

- **Parasol Music:** `{artist} - {title} ({codes})_{version}_{type}_{stem}` (e.g. stem deliverables).
- **West One Music Group:** `{projectCode}_{composer}_{trackTitle}_{key}_{bpm}BPM_{version}` (trailer-style).

You can add companies, edit patterns and tokens, and use “Test parse” in the template editor to parse existing filenames.
