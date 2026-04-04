# Lumen Lab ⚡

A real-time visual synthesizer for Windows — built on Electron, React, and Three.js. Feed it math, images, or video and it generates psychedelic, audio-reactive visuals you can perform with live.

Built for VJs, textile artists, and screen printers.

> **Coming soon:** Web (PWA) and Mobile (iOS/Android) versions. See [ROADMAP.md](./ROADMAP.md).

---

## ✨ What It Does

- **5 Generators** — Fibonacci, Voronoi, Grid, Liquid, Plasma. Or drop in any image or video file.
- **Geometry** — Kaleidoscope, Mirror X/Y, Warp (polar, log-polar), tiling modes
- **Effects** — Bloom, chromatic aberration, noise, edge detection, color grading (HSL + posterize), circle crop
- **Audio Reactivity** — Mic or audio file input, bass/mid/high bands drive the visuals
- **MIDI + Gamepad** — MIDI learn on any parameter, Xbox/PlayStation controller support
- **Drift Mode** — slow sinusoidal animation that mutates the canvas without touching controls
- **Presets** — 10+ built-ins, save your own, animated snapshot transitions (loop/ping-pong/once)
- **Undo/Redo** — Ctrl+Z / Ctrl+Shift+Z, 20-step history
- **Capture** — Record to `.webm`, export 4K PNG snapshots
- **Autosave** — state persists across sessions automatically

---

## ⌨️ Key Shortcuts

| Key | Action |
|-----|--------|
| `H` | Hide / show sidebar |
| `F` | Fullscreen |
| `R` | Record toggle |
| `S` | Snapshot (4K PNG) |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |

---

## 📥 Download

Windows installer on the [Releases page](https://github.com/GRAHAMTON/Lumenlab/releases).

> Windows SmartScreen may flag this as an unknown app — click **More Info → Run Anyway**.

---

## 🏗️ Dev Setup

```bash
npm install
npm run dev          # Vite dev server on localhost:5173
npm run electron     # Launch Electron (loads localhost:5173)
npm run dist         # Build + package Windows NSIS installer → release/
npm run test         # Vitest suite (18 tests)
```

**Key files:**

| File | Role |
|------|------|
| `src/store/useStore.js` | All app state (Zustand) |
| `src/components/CanvasGL.jsx` | Three.js canvas, shader uniforms, post-processing |
| `src/components/Controls.jsx` | Sidebar UI |
| `src/shaders/visualizer.frag` | All visual logic in GLSL |
| `src/config/uiConfig.js` | Slider min/max/step config |
| `src/presets.js` | Built-in preset definitions |
| `electron/main.js` | Electron main process |

See [ROADMAP.md](./ROADMAP.md) for upcoming Desktop, Web, and Mobile tracks.

---

## 📜 License

GNU GPLv3
