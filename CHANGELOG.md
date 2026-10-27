# Changelog

All notable changes to Lumen Lab are documented here.

## [Unreleased]

## [1.3.0] — 2026-10-26

### Changed
- Renderer moved to three.js r186 `WebGPURenderer`, with automatic fallback to WebGL2 where WebGPU is unavailable (`?renderer=webgl` forces the fallback)
- Visualizer shader ported from GLSL to TSL, so one source compiles to WGSL (WebGPU) and GLSL (WebGL2)
- Bloom, chromatic aberration, and grain now run on three's native `RenderPipeline` (replaces pmndrs `postprocessing`, which is WebGL-only)
- Independent surfaces now carry their own scene's bloom / chromatic / grain values instead of the live ones
- Projection surfaces copy their source on each rendered frame (GPU canvases are only readable in the frame they were drawn)
- Electron 39 → 45 (WebGPU on Linux), electron-builder 26.18
- Installer no longer bundles `node_modules`; Vite already bundles everything the app needs

### Fixed
- Packaged app opened to a blank window (circular vendor chunk imports)
- Preload script failed in the sandboxed renderer, hiding the projector window and display picker
- Video files blocked by the Content Security Policy
- EXPORT PNG never produced a file; it now renders the full pipeline (effects included) at 4K on the long edge
- Image and video input rendered black after the first texture upload
- Microphone stayed open (and the OS indicator stayed on) after disabling audio
- Projection window overwrote saved snapshots and MIDI mappings on close
- Saving re-serialized the whole state (including inline media) on every change
- Recording captured no frames from the WebGPU canvas; it now records a mirror fed by the render loop
- Landing page: download links, version, favicon, and PWA icons

### Security
- Navigation away from the app and new windows are blocked; external links open in the browser
- Only microphone, MIDI, and fullscreen permissions are granted
- No default menu in packaged builds (stray Ctrl+R / Ctrl+W / devtools mid-show)
- Removed `unsafe-eval` from the CSP

### Added
- Recovery from GPU device loss: canvases remount automatically, switching to WebGL2 after a WebGPU loss
- `--force-webgl` launch flag (or `LUMEN_RENDERER=webgl`) to skip WebGPU on problem machines
- App icon set
- CI (lint, test, build) and a tag-driven release workflow for Windows, macOS, and Linux

## [1.2.0] — 2026-07-22

### Added
- Projection mapping with four-corner output warp, calibration handles, test patterns, and blackout
- Multi-surface output with per-surface warp, masks, opacity, blend modes, and visibility
- Independent surface sources using built-in generators, media, presets, snapshots, or scenes
- Dedicated projection window with synchronized app state and audio meters
- Mixed-stage warning when visible surfaces are split between `LIVE OUTPUT` and independent sources
- Output-panel regression tests covering mixed-state, no-live, missing-source, and hide/show surface behavior
- Flat single-panel sidebar replacing 4-tab 929-line Controls.jsx
- Kaleidoscope toggle with default-on symmetry
- Drift mode (slow sine/cosine animation on scale + rotation)
- Undo/redo system (Ctrl+Z / Ctrl+Shift+Z) with 20-step history
- H key to hide/show panel with smooth CSS slide transition
- RESET button in Presets section
- Circle crop canvas shape option
- Warp mode selector (Off / Polar / Log-Polar) in Geometry section
- Color works on all generators via additive saturation injection

### Changed
- Projection source messaging now explicitly distinguishes live, independent, and missing surface states
- Output-panel recovery actions are normalized around `MAKE ALL LIVE` and `RESET MISSING TO LIVE`
- Hidden-surface state copy is now deterministic and consistent in the selected-surface panel
- BPM control renamed to SPEED (generator animation rate)
- FLUX renamed to DRIFT
- Generator speed (param3) exposed as top-strip knob

### Removed
- LFO matrix (4-oscillator system)
- Masking controls (luma threshold, center radius, feather)
- Individual RGB channel controls (replaced by HSL)
- Tiling overlap parameter
- Undo/redo history UI panel (kept keyboard shortcuts only)
- Tab key shortcut (conflicted with Chrome focus management; replaced with H)

### Performance
- Fine-grained Zustand selectors across all sidebar components (`useShallow`)
- `React.memo` on `ControlGroup` and `KnobSlider`
- Hoisted per-frame map allocations in `CanvasGL` to module-level constants
- Debounced `localStorage` persist writes to 500ms with flush on page unload
- Removed redundant store subscriptions in `CanvasGL` outer component

---

## [1.0.0] — 2025-12-15

### Added
- Real-time GLSL visual synthesizer (Electron + React + Three.js)
- 5 built-in generators: Fibonacci, Voronoi, Grid, Liquid, Plasma
- Image and video file input as live texture source
- Radial, Mirror-X, Mirror-Y symmetry modes
- Displacement, tiling (p1/p2/p4m), warp effects
- Bloom, chromatic aberration, noise, edge detection, color shift post-processing
- Hue / saturation / brightness / posterize color controls
- Audio reactivity (microphone + audio file) with bass/mid/high bands
- MIDI learn system (CC + note mapping, per-parameter)
- Xbox / PlayStation gamepad support
- 10 built-in presets + user preset manager + named snapshots
- Snapshot animator (loop / ping-pong / once) with easing functions
- WebM video recording, 4K PNG export
- Schema versioning with automatic state migration on updates
- Low-res preview mode and FX performance cap toggles
- Windows NSIS installer via electron-builder
