# Lumen Lab UI Simplification — Design Spec

**Date:** 2026-04-04  
**Status:** Approved by user, ready for implementation planning

---

## Problem Statement

Lumen Lab is technically excellent but suffers from feature bloat. The current UI has 4 icon-based tabs (Source, Geometry, Effects, Global), each dense with nested controls, resulting in a 929-line `Controls.jsx`. VJs and textile artists spend more time navigating the UI than performing. The goal is to keep the technical power while dramatically reducing cognitive load.

---

## Approved Direction: "Kill the Tabs + Focused Context"

A single scrollable sidebar replaces the 4-tab system. A persistent top strip anchors the 3 most-reached controls. Below it, 5 named collapsible sections contain all remaining controls. The last-interacted section auto-expands on open — the UI remembers where you were. No tabs, no icons, no hunting.

---

## Layout

### Sidebar Structure (top → bottom)

```
┌─────────────────────────┐
│  LUMEN LAB       ↺  ↻   │  ← topbar: title + undo/redo
├─────────────────────────┤
│  GENERATOR              │  ← 2×3 grid: 5 generators + IMAGE slot
│  [VORONOI] [PLASMA] ... │
│  [WAVE]    [NOISE] [IMG]│
│  ○ SCALE  ○ SPEED  ○ HUE│  ← 3 always-visible knobs
├─────────────────────────┤
│  ● GEOMETRY         ▼   │  ← last-touched, auto-expanded
│    Symmetry Slices      │
│    Rotation             │
│    Warp                 │
│    Tiling toggle        │
├─────────────────────────┤
│  ○ COLOR            ▼   │  ← collapsed
│  ○ EFFECTS          ▼   │  ← collapsed
│  ○ MOTION           ▼   │  ← collapsed
│  ○ PRESETS          ▼   │  ← collapsed
├─────────────────────────┤
│  ⏸ FREEZE    ● REC  V0.7│  ← bottombar: always visible
└─────────────────────────┘
```

### Persistent Top Strip (always visible, never collapses)

| Control | What it maps to | Store field |
|---------|-----------------|-------------|
| GENERATOR | 5 generator buttons + 1 IMAGE/UPLOAD slot | `generator.type` / `image` |
| SCALE | Zoom/scale | `transforms.scale` |
| SPEED | Time multiplier | `transforms.speed` |
| HUE | Base hue shift | `color.hue` |

### Generator Grid

The top strip contains a 2×3 grid: **5 named generator buttons** (Voronoi, Plasma, Mandelbrot, Wave, Noise) **+ 1 IMAGE slot**. 

- Clicking a generator button activates it and sets `generator.type`
- Clicking IMAGE opens the system file picker (`accept="image/*,video/*"`), calls `store.resetForUpload()`, and loads the file as a `THREE.Texture` / `THREE.VideoTexture`
- When an image/video is active, the IMAGE slot shows the filename (truncated) and is highlighted cyan, exactly like an active generator
- Switching back to any generator deactivates the image and resumes procedural output

---

## Sections (Collapsed by Default, Last-Touched Auto-Expands)

### GEOMETRY
- Symmetry Slices (1–16)
- Rotation
- Warp amount
- Warp mode: None / Polar / Log-Polar (3-way selector)
- Tiling on/off toggle
- Displacement X/Y

### COLOR
- Saturation
- Brightness
- Contrast
- Palette Cycle speed (0 = off)
- Invert toggle

### EFFECTS
- Bloom intensity
- Chromatic Aberration
- Noise grain
- Audio Reactive toggle (on/off)
- Audio sensitivity (visible only when audio reactive is on)
- **Circle Crop toggle** (on/off — applies circular alpha mask to canvas output)

### MOTION
- Animate toggle (global play/pause)
- BPM / tempo
- Flux toggle + intensity (auto-drifts all params slowly)

### KEYBOARD SHORTCUTS
- `Ctrl+Z` — undo (up to 20 steps)
- `Ctrl+Shift+Z` — redo
- No undo/redo UI exposed; keyboard only

### PRESETS
- 2×N grid of named presets (built-in + user)
- Active preset highlighted in cyan
- SAVE SNAPSHOT button
- EXPORT button (PNG/video)

---

## Focused Context Behavior

When the user interacts with any slider or toggle, its parent section auto-expands and gains the active dot indicator (cyan). Other sections do NOT auto-collapse — once open, they stay open until the user manually closes them. The "last touched" section is persisted in `ui.lastActiveSection` so it reopens on next launch.

This is a *highlight on interaction* pattern, not a strict accordion. Respects user choice to keep multiple sections open.

---

## What Gets Removed

These features are **deleted from the codebase entirely**, not hidden:

| Feature | Current location |
|---------|-----------------|
| LFO matrix (6 LFOs with assign/rate/depth) | Global tab → Animation section |
| Masking controls (threshold, feather, invert) | Source tab → Masking section |
| Individual RGB sliders (R, G, B separate) | Effects tab → Color section |
| Tiling overlap slider | Geometry tab → Tiling section |
| Undo history UI (step list, revert button) | Global tab |
| Sequencer (timeline steps, mode, transition time) | Global tab |

**Rationale:** LFO matrix and Sequencer are powerful but add too much complexity for a general audience — Flux covers the "auto-animate" need. Masking is replaced by Circle Crop toggle. Individual RGB + tiling overlap are accessible via Hue/Saturation. Undo gets keyboard shortcuts instead of a UI panel. Warp type selector is kept (Polar/Log-Polar are visually distinct and worth exposing).

## Accessibility

**Strobe safety** is on by default. The app caps minimum animation transition time at 500ms (≤2 flashes/sec, safely under the WCAG 2.1 3Hz limit). This is a hardcoded default — no UI toggle. Advanced users can disable via a hidden config/settings path if added later. Applies to all animated parameter changes.

---

## Architecture Changes

### Components

`Controls.jsx` (929 lines) is **split into 5 section components** + a shell:

```
src/components/controls/
  ControlsShell.jsx        ← sidebar shell: topbar, top-strip, scroll, bottombar
  SectionGeometry.jsx      ← Geometry section content
  SectionColor.jsx         ← Color section content
  SectionEffects.jsx       ← Effects section content
  SectionMotion.jsx        ← Motion section content
  SectionPresets.jsx       ← Presets section content
  CollapsibleSection.jsx   ← shared expand/collapse wrapper with dot indicator
  TopStrip.jsx             ← Generator picker + 3 knobs
```

Old `Controls.jsx` is deleted after migration.

### Store Changes

- Remove `lfo` state section entirely
- Remove `masking` state section entirely
- Remove `history` state section — replace with proper undo/redo stack; keep `undo()` and add `redo()`
- Remove from `color`: `r`, `g`, `b` individual fields (keep `hue`, `saturation`, `brightness`, `contrast`)
- Remove from `tiling`: `overlap` field
- Keep `warp.type` (used by Polar/Log-Polar selector)
- Add to `ui`: `lastActiveSection: 'geometry'`
- Bump `SCHEMA_VERSION` to force reset of stale persisted state

### Config Changes (`uiConfig.js`)
Remove entries for: LFO params, masking params, RGB individual, tiling overlap.

### Shader Changes (`visualizer.frag`)
Remove uniforms that were exclusively driven by removed features:
- `uMaskThreshold`, `uMaskFeather`, `uMaskInvert`
- `uLfo1...uLfo6` (all 6 LFO uniforms)
- `uProjectionShape` (replaced by `uShape` boolean for circle crop)

Keep: `uWarpType` (used by Polar/Log-Polar selector in Geometry section)

---

## Styling

Follows existing Tailwind dark palette: `bg-neutral-800/900`, `text-cyan-400`, `border-neutral-700`. Section headers use the existing monospace label style. Active-section dot is `bg-cyan-400`. No new colors introduced.

---

## What Is NOT Changed

- Canvas, Three.js pipeline, EffectComposer — untouched
- MIDI learn system — preserved and works on any visible control
- Keyboard shortcuts — Tab (toggle sidebar), S (snapshot), R (record), F (fullscreen), **Ctrl+Z (undo), Ctrl+Shift+Z (redo)** — last two are new
- Preset system data format — presets still load correctly
- Electron main process — untouched
- All shader visual math — only removed uniforms change
- Strobe safety cap (500ms minimum transition) — on by default, no UI toggle

---

## Success Criteria

1. `Controls.jsx` is deleted and replaced by 7 focused files averaging ~100 lines each
2. All 4 UI tabs are gone — no tab icons in the topbar
3. The persistent top strip (generator + 3 knobs) is always visible regardless of scroll position
4. Clicking a generator button instantly switches generator
5. All remaining controls are reachable within 2 clicks from the default state
6. Removed features leave no dead code in store, config, CanvasGL, or shaders
7. All existing tests pass; no regressions in MIDI, audio, or animation behavior
