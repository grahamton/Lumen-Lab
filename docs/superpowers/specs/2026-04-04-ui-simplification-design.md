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
│  GENERATOR              │  ← 2×3 grid of generator buttons
│  [VORONOI] [PLASMA] ... │
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
| GENERATOR | 6-button picker | `generator.type` |
| SCALE | Zoom/scale | `transforms.scale` |
| SPEED | Time multiplier | `transforms.speed` |
| HUE | Base hue shift | `color.hue` |

The 3 knobs are implemented as `input[range]` sliders styled visually as rotary knobs (conic-gradient). Fully interactive and MIDI-learnable.

---

## Sections (Collapsed by Default, Last-Touched Auto-Expands)

### GEOMETRY
- Symmetry Slices (1–16)
- Rotation
- Warp amount
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

### MOTION
- Animate toggle (global play/pause)
- BPM / tempo
- Flux toggle + intensity (auto-drift)

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
| Warp type selector (Sinusoidal / Radial / Twist / etc.) | Geometry tab → Warp section |
| Individual RGB sliders (R, G, B separate) | Effects tab → Color section |
| Tiling overlap slider | Geometry tab → Tiling section |
| Undo history UI (step list, revert button) | Global tab |
| Projection shape (Flat / Sphere / Cylinder) | Global tab → Output section |
| Sequencer (timeline steps, mode, transition time) | Global tab |

**Rationale:** LFOs and the Sequencer are powerful but rarely used and add significant mental overhead. Masking and projection shape are niche. Individual RGB + tiling overlap are accessible through Hue + Saturation instead. Undo is still in-store but not exposed in the UI (keyboard shortcut only).

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
- Remove `history` state section entirely (keep `resetAll`, remove step tracking)
- Remove from `warp`: `type` field (keep `amount`)
- Remove from `color`: `r`, `g`, `b` individual fields (keep `hue`, `saturation`, `brightness`, `contrast`)
- Remove from `tiling`: `overlap` field
- Add to `ui`: `lastActiveSection: 'geometry'`
- Bump `SCHEMA_VERSION` to force reset of stale persisted state

### Config Changes (`uiConfig.js`)
Remove entries for: LFO params, masking params, warp type, RGB individual, tiling overlap, projection shape.

### Shader Changes (`visualizer.frag`)
Remove uniforms that were exclusively driven by removed features:
- `uMaskThreshold`, `uMaskFeather`, `uMaskInvert`
- `uLfo1...uLfo6` (all 6 LFO uniforms)
- `uWarpType` (integer select)
- `uProjectionShape`

---

## Styling

Follows existing Tailwind dark palette: `bg-neutral-800/900`, `text-cyan-400`, `border-neutral-700`. Section headers use the existing monospace label style. Active-section dot is `bg-cyan-400`. No new colors introduced.

---

## What Is NOT Changed

- Canvas, Three.js pipeline, EffectComposer — untouched
- MIDI learn system — preserved and still works on any visible control
- Keyboard shortcuts — unchanged (Tab hides sidebar, S snapshot, R record, F fullscreen)
- Preset system data format — presets still work; just the UI that displays them changes
- Electron main process — untouched
- All shader visual math — only removed uniforms change

---

## Success Criteria

1. `Controls.jsx` is deleted and replaced by 7 focused files averaging ~100 lines each
2. All 4 UI tabs are gone — no tab icons in the topbar
3. The persistent top strip (generator + 3 knobs) is always visible regardless of scroll position
4. Clicking a generator button instantly switches generator
5. All remaining controls are reachable within 2 clicks from the default state
6. Removed features leave no dead code in store, config, CanvasGL, or shaders
7. All existing tests pass; no regressions in MIDI, audio, or animation behavior
