# AGENTS.md

## Cursor Cloud specific instructions

### Overview

SchemeRename is a single Electron + React + TypeScript desktop app for batch-renaming files using per-company naming schemes. No external services, databases, or Docker required. Persistence is via `electron-store` (local JSON).

### Commands

Standard commands are in `package.json` scripts and `README.md`. Key ones:

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Unit tests | `npm test` |
| Full build | `npm run build` |
| Dev mode (Electron) | `npm run electron:dev` |
| Vite dev server only | `npm run dev` |

### Headless Linux / Cloud VM caveats

- **Xvfb required**: Electron needs a display server. Start Xvfb before launching the app:
  ```
  Xvfb :99 -screen 0 1280x720x24 -ac &
  export DISPLAY=:99
  ```
- The `electron:dev` script uses `concurrently` + `wait-on` to build main/preload, start Vite on port 5173, then launch Electron. If port 5173 is already in use, either kill the existing process or change the port in `vite.config.ts` and the `wait-on` URL in `package.json`.
- TypeScript strict mode with `noUnusedLocals` / `noUnusedParameters` is enabled in `tsconfig.json`. Running `npx tsc --noEmit` may emit warnings from pre-existing code; these do not block the build (the build uses separate tsconfig files for main/preload).
- No dedicated ESLint config exists; TypeScript compiler is the primary lint tool.
- The `electron:dev` command opens DevTools by default in dev mode.
