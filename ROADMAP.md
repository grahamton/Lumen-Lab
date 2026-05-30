# Lumen Lab — Roadmap

Lumen Lab is expanding from a single Windows desktop app into a **family of products** across three platforms. This roadmap covers what's done, what's next, and the high-level plan for each track.

---

## ✅ Shipped (v1.1.0 — Desktop)

- Real-time GLSL visual synthesizer with 5 generators + image/video input
- Kaleidoscope, mirror symmetry, warp modes (polar, log-polar)
- Bloom, chromatic aberration, noise, edge detection, circle crop
- MIDI learn, gamepad support, audio reactivity (mic + file)
- Flat sidebar UI: single scrollable panel, no tabs
- Undo/redo (Ctrl+Z), preset manager, snapshot animator
- Drift mode, BPM-locked speed
- WebM recording, 4K PNG export
- Performance sweep: fine-grained Zustand selectors, debounced persist

---

## 🖥️ Desktop (Electron) — Next

- [ ] macOS build (Apple Silicon + Intel)
- [ ] Linux build (AppImage)
- [ ] Auto-update mechanism (Electron updater)
- [ ] OSC support for DAW/network control
- [ ] Custom GLSL shader input (power-user escape hatch)
- [ ] Community preset library (cloud browse + download)
- [ ] Onboarding tutorial on first launch

---

## 🌐 Web (PWA) — `lumenlab-web`

A self-hosted Progressive Web App version — same engine, browser-native.

- [x] Scaffold new repo: `lumenlab-web` (Vite + React + PWA plugin)
- [ ] Extract shared visual engine into `@lumenlab/core` package
- [ ] Web Audio API input (mic + file upload)
- [x] Service worker + offline support
- [ ] Touch-optimized controls (swipe, pinch)
- [ ] Deploy to `lumenlab.app` (self-hosted, no App Store)
- [ ] Share URL for snapshots (encode state in URL hash)

---

## 📱 Mobile (React Native) — `lumenlab-mobile`

Native mobile app for iOS and Android.

- [ ] Scaffold new repo: `lumenlab-mobile` (Expo + React Native)
- [ ] WebGL renderer via `expo-gl` or `react-native-wgpu`
- [ ] Port shader pipeline to mobile-compatible GLSL
- [ ] Touch gestures: pinch-to-scale, rotate, swipe generator
- [ ] Camera input as live texture source
- [ ] Haptic feedback on beat / audio peak
- [ ] App Store + Play Store submission
- [ ] Simplified preset-focused UI (consumer-grade)

---

## 🔧 Shared / Infrastructure

- [ ] `@lumenlab/core` — shared shader + state package (extracted from desktop)
- [ ] GitHub Actions CI: lint + test on all PRs
- [ ] Versioned preset format (cross-platform compatible)
- [ ] Developer docs + contribution guide
- [ ] Video tutorials (setup, generators, MIDI, sharing)
