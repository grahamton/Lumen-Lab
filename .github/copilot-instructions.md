# Lumen Lab — Copilot Instructions

Lumen Lab is a real-time visual synthesizer desktop app (Electron + React + Three.js) for VJs, textile artists, and screen printers. It transforms mathematical generators and images into psychedelic visualizations with audio-reactivity, MIDI control, symmetry effects, and video recording.

---

## Commands

```bash
npm run dev             # Vite dev server on localhost:5173
npm run electron        # Launch Electron (loads localhost:5173 in dev)
npm run build           # Production build → dist/
npm run electron:build  # Build then launch Electron
npm run dist            # Package Windows NSIS installer → release/
npm run lint            # ESLint (React hooks + refresh plugins)
npm run test            # Vitest full suite
```

**Single test:**
```bash
npx vitest run src/store/useStore.test.js   # Run one file
npx vitest run useStore                     # Match by name pattern
npx vitest watch                            # Watch mode
```

Tests use **Vitest** with **jsdom** environment. Setup: `src/setupTests.js` (jest-dom matchers). Test files: `src/store/useStore.test.js`, `src/store/midi.test.js`, `src/hooks/useAnimator.test.js`.

---

## Architecture

### Data flow
```
User input (UI / MIDI / Gamepad / Audio)
  → Zustand store (src/store/useStore.js)
    → React components re-render
      → CanvasGL syncs uniforms → Three.js shaders
        → GPU renders frame
```

### Key files
| File | Role |
|------|------|
| `src/store/useStore.js` | Single Zustand store — all app state lives here |
| `src/components/CanvasGL.jsx` | Three.js canvas, ShaderMaterial, EffectComposer, `useFrame` loop |
| `src/components/Controls.jsx` | Full sidebar UI — sliders, tabs, MIDI learn, presets |
| `src/hooks/useAnimator.js` | Per-frame LFO, state interpolation, BPM animation loop |
| `src/hooks/useAudioAnalyzer.js` | Web Audio API → frequency bins → audio reactivity |
| `src/core/MidiManager.js` | Singleton WebMIDI wrapper — device scan, message routing |
| `src/config/uiConfig.js` | `CONTROLS` constant — min/max/step/label for every slider |
| `src/shaders/visualizer.{vert,frag}` | All visual logic in GLSL; uniforms come from CanvasGL |
| `src/presets.js` | Array of preset state objects (name + full state snapshot) |
| `electron/main.js` | Electron main: GPU flags, window creation, dev/prod URL loading |

### Electron communication
There is **no IPC**. The renderer has direct access to all needed Web APIs (Web Audio, WebMIDI, Canvas, File). State persists to `localStorage` via Zustand's `persist` middleware. If IPC is ever needed: `ipcRenderer.invoke` / `ipcMain.handle`.

### Post-processing pipeline
CanvasGL uses `@react-three/postprocessing` with Bloom, Noise, and ChromaticAberration effects layered on top of the ShaderMaterial output.

---

## Conventions

### Components
- **Named exports only**: `export function MyComponent() {}` — never default exports
- `.jsx` for components, `.js` for hooks/stores/config
- Sub-components used only within one file are defined inline (not exported separately)
- `CanvasGL` is lazy-loaded via `React.lazy` and wrapped in `ErrorBoundary` in `App.jsx`

### State management (Zustand)
All state lives in one flat store in `src/store/useStore.js`. Top-level sections: `transforms`, `symmetry`, `warp`, `displacement`, `masking`, `tiling`, `generator`, `color`, `effects`, `canvas`, `audio`, `midi`, `ui`, `animation`, `lfo`, `flux`, `recording`, `snapshots`, `userPresets`, `history`.

```js
// Reading state in components
const { transforms, setTransform } = useStore()

// Reading state outside React (frame loops, event handlers)
const state = useStore.getState()

// Updating nested state — always spread for immutability
set((state) => ({ transforms: { ...state.transforms, x: 5 } }))
```

Store uses `persist` middleware with key `'lumen-lab-storage'`. `SCHEMA_VERSION` constant guards against stale persisted state; `resetAll()` clears localStorage and reinitializes defaults.

### Shader uniforms
Uniforms are prefixed with `u` + camelCase (e.g., `uTime`, `uColorRGB`, `uSymSlices`). Declared in `CanvasGL.jsx`, updated each frame inside `useFrame`. To add a visual parameter: add uniform to CanvasGL → sync in `useFrame` → read in `visualizer.frag`.

### Adding a new control (full flow)
1. `src/config/uiConfig.js` — add entry to `CONTROLS` (min/max/step/label)
2. `src/store/useStore.js` — add field to `DEFAULTS` and a setter
3. `src/components/Controls.jsx` — add `<ControlGroup>` or `<Toggle>` in the relevant tab
4. `src/components/CanvasGL.jsx` — declare uniform, sync from store in `useFrame`
5. `src/shaders/visualizer.frag` — declare `uniform` and use it in shader logic

### Styling
Tailwind utility classes only — no CSS modules, no CSS-in-JS. Dark theme palette: `bg-neutral-800/900`, `text-cyan-400`, `border-neutral-700`. Use `tailwind-merge` when combining dynamic class strings. Custom scrollbar defined in `src/index.css` under `.custom-scrollbar`.

### MIDI learn pattern
```js
// Activate learn mode for a parameter
setUi('midiLearnActive', true)
setUi('midiLearnId', 'transforms.scale')
// When a MIDI CC/note arrives, store auto-maps:
// mappings['channel-type-note'] = 'transforms.scale'
// e.g. mappings['1-cc-10'] = 'transforms.scale'
```

### Keyboard shortcuts (App.jsx)
Always guard with `if (e.target.tagName === 'INPUT') return` before handling keys. Current shortcuts: `Tab` (toggle controls), `S` (snapshot), `R` (record toggle), `F` (fullscreen).
