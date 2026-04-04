# Changelog

All notable changes to Lumen Lab are documented here.

## [1.1.0] — 2026-04-04

### Added
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
