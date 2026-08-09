# Backpack Lights Designer

Offline web SPA for designing Vector **3-LED backpack light packs**. Preview uses the same animation math as the robot (`GetCurrentLEDcolor`). Export a robot-ready zip for `/data/data/customBackpackLights/`.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build
```

No server, no robot connection required for design/preview.

## Layout

- **Modes** — all 32 CladEvents (Critical / Behavior / Utility), search, copy/paste between modes
- **Mock-up** — Front / Middle / Back LEDs driven by `samplePattern` at ~60 fps + transport + waveforms
- **Editor** — colors (hex/RGB 0–255 UI → float 0–1 model), periods, presets, raw JSON, favorites
- **Footer** — validation, sentinels, export readiness

## Robot upload

1. **Export → Robot zip** (not the `.bpld.json` project file).
2. Place pack contents at **`/data/data/customBackpackLights/`** on the robot.
3. Both sentinels required: `off.json` and `cubeSpinner/purple/spinner_purple_celebration.json`.
4. Restart robot processes so the custom path is re-read.

## Project vs robot export

| Artifact | Purpose |
|---|---|
| `*.bpld.json` | Designer project (metadata + patterns) — Save project |
| `*.zip` | Robot pack tree only — Export robot zip |

Favorites live in `localStorage` key `bpld.favorites.v1`.

## Keyboard shortcuts

| Key | Action |
|---|---|
| Space | Play / pause preview |
| ← / → | Scrub timeline (±16 ms; Shift = ±100 ms) |
| Ctrl/Cmd+Z | Undo pattern edit |
| Ctrl/Cmd+Y (or Shift+Z) | Redo |
| Ctrl/Cmd+S | Download project (`.bpld.json`) |

## Stack

Vite + React + TypeScript SPA (no Tauri/Electron in v1). Domain (`src/domain/`) is pure TS: schema, player, triggers, presets. Pack I/O in `src/io/packFs.ts`. Preview uses `samplePattern` / `getCurrentLedColor` (robot math). Export colors are **RGBA floats 0–1**, seven JSON keys only.
