# Lumen Lab — Copilot Instructions

Lumen Lab is a real-time visual synthesizer desktop app (Electron + React + Three.js WebGPU) for VJs, textile artists, and screen printers. It transforms mathematical generators and images into psychedelic visualizations with audio-reactivity, MIDI control, symmetry effects, and video recording.

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

Tests use **Vitest** with **jsdom** environment. Setup: `src/setupTests.js` (jest-dom matchers). Tests live next to the code they cover (`*.test.js[x]`).

---

## Architecture

### Data flow
```
User input (UI / MIDI / Gamepad / Audio)
  → Zustand store (src/store/useStore.js)
    → React components re-render
      → CanvasGL syncs TSL uniforms (useFrame)
        → RenderPipeline (scene pass + effects) → WebGPU / WebGL2
```

### Key files
| File | Role |
|------|------|
| `src/store/useStore.js` | Single Zustand store — all app state lives here |
| `src/components/CanvasGL.jsx` | WebGPURenderer canvas, uniform sync, export, projection compositor |
| `src/components/controls/` | Sidebar UI — `ControlsShell` plus one `Section*.jsx` per panel |
| `src/hooks/useAnimator.js` | Per-frame LFO, state interpolation, BPM animation loop |
| `src/hooks/useAudioAnalyzer.js` | Web Audio API → frequency bins → audio reactivity |
| `src/core/MidiManager.js` | Singleton WebMIDI wrapper — device scan, message routing |
| `src/config/uiConfig.js` | `CONTROLS` constant — min/max/step/label for every slider |
| `src/shaders/visualizerNode.js` | All visual logic in TSL (compiles to WGSL and GLSL) |
| `src/shaders/effectsPipeline.js` | Bloom / chromatic aberration / grain on `RenderPipeline` |
| `src/presets.js` | Array of preset state objects (name + full state snapshot) |
| `electron/main.js` | Electron main: GPU flags, windows, permissions, navigation guards |
| `electron/preload.cjs` | `window.electronAPI` bridge (CommonJS: sandboxed preloads can't use ESM) |

### Electron communication
IPC is limited to the projector window (`projection:*` channels) and `getPathForFile`, exposed through `electron/preload.cjs` as `window.electronAPI`. Everything else uses Web APIs directly. State persists to `localStorage` via Zustand's `persist` middleware; the projection window never writes.

### Rendering pipeline
`<Canvas gl={createRenderer} flat>` builds a `WebGPURenderer` (three falls back to WebGL2 on its own). The visualizer is a `MeshBasicNodeMaterial` whose `fragmentNode` is the TSL graph in `visualizerNode.js`. `effectsPipeline.js` wraps three's `RenderPipeline`: the scene pass plus optional bloom, RGB shift, and grain; `outputColorTransform` is off because the shader writes display-referred values. `VisualizerScene` renders through `useFrame(..., 1)` and then calls `publishCanvasFrame` so projection surfaces copy the canvas in the same task (GPU canvases are blank on later frames).

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
Uniforms are TSL `uniform()` nodes prefixed with `u` + camelCase (e.g., `uGenTime`, `uSymSlices`), created in `createVisualizerMaterial()` and updated through `.value` inside `CanvasGL`'s `useFrame`. Use float uniforms for flags (WGSL has no bool uniforms). Functions called more than once (e.g. `getContent` for edge detection) use `Fn(...).setLayout(...)` so they compile to a real shader function instead of being inlined per call.

### Adding a new control (full flow)
1. `src/config/uiConfig.js` — add entry to `CONTROLS` (min/max/step/label)
2. `src/store/useStore.js` — add field to `DEFAULTS` and a setter
3. `src/components/controls/Section*.jsx` — add a `<ControlGroup>` or toggle in the relevant section
4. `src/shaders/visualizerNode.js` — add the `uniform()` and use it in the TSL graph
5. `src/components/CanvasGL.jsx` — sync it from the store in `useFrame`

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
Always guard with `if (e.target.tagName === 'INPUT') return` before handling keys. Current shortcuts: `H` (toggle controls), `S` (state snapshot), `R` (record toggle), `F` (fullscreen), `B` (blackout), `P` / `Shift+P` (test pattern mode / type), `Ctrl+Z` / `Ctrl+Shift+Z` (undo / redo).
