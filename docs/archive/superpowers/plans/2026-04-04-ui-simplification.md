# Lumen Lab UI Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 4-tab 929-line `Controls.jsx` with a single scrollable sidebar of 7 focused components, removing dead features (LFO matrix, masking, sequencer, individual RGB, tiling overlap) while adding undo/redo keyboard shortcuts.

**Architecture:** Strip dead state from the Zustand store first, then remove corresponding dead uniforms from the shader and CanvasGL sync loop, then rebuild the UI bottom-up as focused files (CollapsibleSection, ControlGroup, TopStrip, 5 section components, ControlsShell). Wire ControlsShell into App.jsx and delete the old Controls.jsx last. Tests are fixed after the delete.

**Tech Stack:** React 18, Zustand, Tailwind CSS, Three.js/R3F, Vitest + jsdom

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/store/useStore.js` | Remove lfo/masking/sequencer state; add undo/redo stack; bump SCHEMA_VERSION |
| Modify | `src/components/CanvasGL.jsx` | Remove LFO animation block + masking/RGB uniform syncs; wire flux.amount |
| Modify | `src/shaders/visualizer.frag` | Remove masking uniform declarations + masking block + uColorRGB |
| Modify | `src/config/uiConfig.js` | Remove dead entries for lfo, masking, rgb, tiling overlap |
| Modify | `src/App.jsx` | Swap Controls import → ControlsShell; wire Ctrl+Z / Ctrl+Shift+Z |
| Create | `src/components/controls/ControlGroup.jsx` | Reusable slider+label+MIDI-learn (extracted from Controls.jsx) |
| Create | `src/components/controls/CollapsibleSection.jsx` | Expand/collapse wrapper with active-dot indicator |
| Create | `src/components/controls/TopStrip.jsx` | Generator grid (5 generators + IMAGE slot) + 3 rotary knobs |
| Create | `src/components/controls/SectionGeometry.jsx` | Geometry section: symmetry, rotation, warp mode, tiling, displacement |
| Create | `src/components/controls/SectionColor.jsx` | Color section: hue, sat, brightness, posterize, invert |
| Create | `src/components/controls/SectionEffects.jsx` | Effects section: bloom, CA, noise, audio reactivity, circle crop |
| Create | `src/components/controls/SectionMotion.jsx` | Motion section: animate, BPM, flux toggle + intensity |
| Create | `src/components/controls/SectionPresets.jsx` | Presets section: preset grid, save snapshot, export |
| Create | `src/components/controls/ControlsShell.jsx` | Sidebar shell: topbar + TopStrip + sections + bottombar |
| Delete | `src/components/Controls.jsx` | Replaced entirely by the above |
| Modify | `src/store/useStore.test.js` | Update: pushHistory → pushUndo; add undo/redo tests |
| Modify | `src/hooks/useAnimator.test.js` | Remove masking and r/g/b from base state fixture |

---

## Task 1: Store — Remove dead state, add redo, bump schema version

**Files:**
- Modify: `src/store/useStore.js`
- Modify: `src/store/useStore.test.js`

- [ ] **Step 1.1: Write failing tests**

In `src/store/useStore.test.js`, add inside the existing `describe('Zustand Store')` block:

```js
it('should not have lfo or masking state', () => {
  const state = useStore.getState()
  expect(state.lfo).toBeUndefined()
  expect(state.masking).toBeUndefined()
})

it('should have lastActiveSection in ui', () => {
  expect(useStore.getState().ui.lastActiveSection).toBe('geometry')
})

it('should undo and redo a transform change', () => {
  const store = useStore.getState()
  act(() => { store.setTransform('scale', 1) })
  act(() => { store.pushUndo() })
  act(() => { store.setTransform('scale', 2.5) })
  act(() => { store.undo() })
  expect(useStore.getState().transforms.scale).toBe(1)
  act(() => { store.redo() })
  expect(useStore.getState().transforms.scale).toBe(2.5)
})

it('should clear redoStack when pushUndo is called after undo', () => {
  const store = useStore.getState()
  act(() => { store.pushUndo() })
  act(() => { store.setTransform('scale', 2.5) })
  act(() => { store.undo() })
  act(() => { store.pushUndo() })
  expect(useStore.getState().redoStack.length).toBe(0)
})
```

- [ ] **Step 1.2: Run tests to verify they fail**

```
npx vitest run src/store/useStore.test.js
```

Expected: FAIL — `store.redo is not a function`, `state.lfo` is defined, `state.ui.lastActiveSection` is undefined.

- [ ] **Step 1.3: Update SCHEMA_VERSION**

In `src/store/useStore.js`, change:
```js
const SCHEMA_VERSION = 2
```
to:
```js
const SCHEMA_VERSION = 3
```

- [ ] **Step 1.4: Remove dead top-level keys from DEFAULTS**

In the `DEFAULTS` object (or wherever initial state is set), make these changes:

**Remove `masking` entirely:**
```js
// DELETE:
masking: { lumaThreshold: 0, centerRadius: 0, invertLuma: false, feather: 0 },
```

**Remove `lfo` entirely:**
```js
// DELETE:
lfo: { active: false, oscillators: [
  { type: 'sine', target: 'transforms.scale', freq: 0.5, amp: 0.05, offset: 0 },
  { type: 'sine', target: 'transforms.rotation', freq: 0.1, amp: 0.1, offset: 0 },
  ...
] },
```

**Remove `history` and replace with undo/redo stacks:**
```js
// DELETE:
history: [],
// ADD:
undoStack: [],
redoStack: [],
```

**Remove `r`, `g`, `b` from `color` (keep `posterize`, `hue`, `sat`, `light`):**
```js
// Before:
color: { posterize: 256, r: 1, g: 1, b: 1, hue: 0, sat: 1, light: 1 },
// After:
color: { posterize: 256, hue: 0, sat: 1, light: 1 },
```

**Remove `overlap` from `tiling` (keep `type`, `scale`):**
```js
// Before:
tiling: { type: 'none', scale: 1, overlap: 0 },
// After:
tiling: { type: 'none', scale: 1 },
```

**Add `amount` to `flux`:**
```js
// Before:
flux: { enabled: false },
// After:
flux: { enabled: false, amount: 0.3 },
```

**Remove sequencer-specific fields from `animation` (keep `isPlaying`, `bpm`, `strobeSafety`):**
```js
// Before:
animation: { isPlaying: false, mode: 'loop', bpm: 120, transitionTime: 1000, easing: 'linear', activeStep: -1, strobeSafety: true },
// After:
animation: { isPlaying: false, bpm: 120, strobeSafety: true },
```

**Add `lastActiveSection` to `ui`:**
```js
// In the ui object, add:
lastActiveSection: 'geometry',
```

- [ ] **Step 1.5: Replace pushHistory + undo with pushUndo + undo + redo; remove setMasking + setLfo**

Find and replace the `pushHistory` function:
```js
// DELETE pushHistory, REPLACE with:
pushUndo: () => set((state) => {
  const snapshot = {
    transforms: state.transforms, symmetry: state.symmetry, warp: state.warp,
    displacement: state.displacement, tiling: state.tiling, generator: state.generator,
    color: state.color, effects: state.effects, canvas: state.canvas, flux: state.flux,
  }
  return {
    undoStack: [snapshot, ...state.undoStack].slice(0, 20),
    redoStack: [],
  }
}),
```

Replace the `undo` function:
```js
undo: () => set((state) => {
  if (state.undoStack.length === 0) return {}
  const [previous, ...rest] = state.undoStack
  const current = {
    transforms: state.transforms, symmetry: state.symmetry, warp: state.warp,
    displacement: state.displacement, tiling: state.tiling, generator: state.generator,
    color: state.color, effects: state.effects, canvas: state.canvas, flux: state.flux,
  }
  return { ...previous, undoStack: rest, redoStack: [current, ...state.redoStack].slice(0, 20) }
}),
```

Add `redo` after `undo`:
```js
redo: () => set((state) => {
  if (state.redoStack.length === 0) return {}
  const [next, ...rest] = state.redoStack
  const current = {
    transforms: state.transforms, symmetry: state.symmetry, warp: state.warp,
    displacement: state.displacement, tiling: state.tiling, generator: state.generator,
    color: state.color, effects: state.effects, canvas: state.canvas, flux: state.flux,
  }
  return { ...next, redoStack: rest, undoStack: [current, ...state.undoStack].slice(0, 20) }
}),
```

Add `setFlux` if it only has a toggle currently:
```js
setFlux: (key, value) => set((state) => ({ flux: { ...state.flux, [key]: value } })),
```

Delete `setMasking` and `setLfo` functions entirely.

- [ ] **Step 1.6: Update `partialize`**

Remove `masking` and `history` from partialize; add nothing (undoStack/redoStack are ephemeral, not persisted):
```js
partialize: (state) => ({
  schemaVersion: state.schemaVersion,
  transforms: state.transforms, symmetry: state.symmetry, warp: state.warp,
  displacement: state.displacement, tiling: state.tiling, generator: state.generator,
  color: state.color, effects: state.effects, canvas: state.canvas,
  snapshots: state.snapshots, userPresets: state.userPresets,
  audio: state.audio, flux: state.flux, animation: state.animation,
  ui: state.ui, midi: state.midi,
}),
```

- [ ] **Step 1.7: Run tests**

```
npx vitest run src/store/useStore.test.js
```

Expected: All new and existing tests PASS.

- [ ] **Step 1.8: Commit**

```
git add src/store/useStore.js src/store/useStore.test.js
git commit -m "feat(store): remove lfo/masking/sequencer, add undo/redo, bump SCHEMA_VERSION to 3"
```

---

## Task 2: CanvasGL — Remove LFO animation block + dead uniform syncs

**Files:**
- Modify: `src/components/CanvasGL.jsx`

- [ ] **Step 2.1: Remove the 4 masking uniform declarations**

In the uniforms object passed to `ShaderMaterial`, delete:
```js
// DELETE these 4 lines:
uMaskThreshold: { value: 0 },
uMaskRadius: { value: 0 },
uMaskInvert: { value: 0 },
uMaskFeather: { value: 0 },
```

- [ ] **Step 2.2: Remove uColorRGB uniform declaration**

In the same uniforms object, delete:
```js
// DELETE:
uColorRGB: { value: new THREE.Vector3(1, 1, 1) },
```

- [ ] **Step 2.3: Remove the LFO oscillator animation block in useFrame**

Find the block that starts with something like `if (lfo.active || fluxEnabled)` and iterates over `lfo.oscillators`. Delete the entire block (~lines 173-201). This is the code that computes `lfoMods` from oscillator waveforms and applies them to rotation/scale.

- [ ] **Step 2.4: Remove masking uniform syncs in useFrame**

Find and delete the lines in `useFrame` that write to the masking uniforms:
```js
// DELETE these 4 sync lines (exact values may differ):
uniformValues.uMaskThreshold.value = masking.lumaThreshold
uniformValues.uMaskRadius.value = masking.centerRadius
uniformValues.uMaskInvert.value = masking.invertLuma ? 1 : 0
uniformValues.uMaskFeather.value = masking.feather
```

- [ ] **Step 2.5: Remove uColorRGB sync in useFrame**

Find and delete:
```js
// DELETE:
uniformValues.uColorRGB.value.set(color.r, color.g, color.b)
```

- [ ] **Step 2.6: Wire flux.amount into the flux drift**

Find where `flux.enabled` is read. Update to also read `flux.amount` and use it as the drift amplitude:
```js
// Before (approximate):
const fluxEnabled = useStore.getState().flux?.enabled
// ... drift applied with hardcoded amplitude

// After:
const { enabled: fluxEnabled, amount: fluxAmount = 0.3 } = useStore.getState().flux ?? {}
// ... use fluxAmount instead of the hardcoded amplitude constant
```

- [ ] **Step 2.7: Verify canvas still renders**

```
npm run dev
```

Open http://localhost:5173. Confirm: Voronoi generator renders, no WebGL errors in console.

- [ ] **Step 2.8: Commit**

```
git add src/components/CanvasGL.jsx
git commit -m "feat(canvas): remove LFO block + masking/uColorRGB uniform syncs; wire flux.amount"
```

---

## Task 3: Shader — Remove masking block + dead uniforms

**Files:**
- Modify: `src/shaders/visualizer.frag`

- [ ] **Step 3.1: Remove the 4 masking uniform declarations**

Find and delete:
```glsl
// DELETE:
uniform float uMaskThreshold;
uniform float uMaskRadius;
uniform float uMaskInvert;
uniform float uMaskFeather;
```

- [ ] **Step 3.2: Remove uColorRGB uniform declaration**

Find and delete:
```glsl
// DELETE:
uniform vec3 uColorRGB;
```

- [ ] **Step 3.3: Remove the masking computation block**

Find the block that computes `float mask = 1.0` using `uMaskThreshold`, `uMaskRadius`, `uMaskInvert`, `uMaskFeather` (approximately lines 340–360). Delete the entire block.

Also find where `mask` is applied to the output color (e.g. `texColor.rgb *= mask` or `finalColor *= mask`) and delete that line.

- [ ] **Step 3.4: Remove uColorRGB usage**

Find where `uColorRGB` is used to multiply the output color channels (e.g. `finalColor.rgb *= uColorRGB`) and delete that line.

- [ ] **Step 3.5: Verify no shader compile errors**

```
npm run dev
```

Open http://localhost:5173. If canvas is black, open browser devtools → Console and look for GLSL compile errors. Fix any `undeclared identifier` errors from leftover references.

- [ ] **Step 3.6: Commit**

```
git add src/shaders/visualizer.frag
git commit -m "feat(shader): remove masking block and uColorRGB uniform"
```

---

## Task 4: uiConfig — Remove dead entries

**Files:**
- Modify: `src/config/uiConfig.js`

- [ ] **Step 4.1: Replace uiConfig.js contents**

Replace the entire file with:

```js
export const CONTROLS = {
  transforms: {
    scale:    { min: 0.1,  max: 5,    step: 0.01,  label: 'Scale' },
    rotation: { min: -180, max: 180,  step: 1,     label: 'Rotation' },
    x:        { min: -100, max: 100,  step: 1,     label: 'Position X' },
    y:        { min: -100, max: 100,  step: 1,     label: 'Position Y' },
  },
  generator: {
    param1: { min: 0, max: 100, step: 1, label: 'Complexity' },
    param2: { min: 0, max: 100, step: 1, label: 'Detail' },
    param3: { min: 0, max: 100, step: 1, label: 'Speed' },
  },
  displacement: {
    amp:  { min: 0, max: 200, step: 1,   label: 'Warp Amount' },
    freq: { min: 1, max: 50,  step: 0.5, label: 'Warp Frequency' },
  },
  effects: {
    bloom:               { min: 0, max: 3,   step: 0.1,  label: 'Bloom' },
    chromaticAberration: { min: 0, max: 1,   step: 0.01, label: 'Chromatic AB' },
    noise:               { min: 0, max: 1,   step: 0.01, label: 'Grain' },
  },
  color: {
    hue:       { min: -1.0, max: 1.0, step: 0.01, label: 'Hue' },
    sat:       { min: 0,    max: 3.0, step: 0.05, label: 'Saturation' },
    light:     { min: 0,    max: 2.0, step: 0.05, label: 'Brightness' },
    posterize: { min: 2,    max: 32,  step: 1,    label: 'Posterize' },
  },
  symmetry: {
    slices: { min: 2,   max: 32,  step: 1,    label: 'Slices' },
    offset: { min: -1,  max: 1,   step: 0.01, label: 'Center Offset' },
  },
  flux: {
    amount: { min: 0, max: 1, step: 0.01, label: 'Intensity' },
  },
  animation: {
    bpm: { min: 40, max: 240, step: 1, label: 'BPM' },
  },
  audio: {
    sensitivity: { min: 0, max: 3, step: 0.05, label: 'Sensitivity' },
  },
}
```

- [ ] **Step 4.2: Commit**

```
git add src/config/uiConfig.js
git commit -m "feat(config): remove dead entries; add flux.amount and audio.sensitivity"
```

---

## Task 5: New component — ControlGroup + CollapsibleSection

**Files:**
- Create: `src/components/controls/ControlGroup.jsx`
- Create: `src/components/controls/CollapsibleSection.jsx`

- [ ] **Step 5.1: Create ControlGroup.jsx**

```jsx
// src/components/controls/ControlGroup.jsx
import { useStore } from '../../store/useStore'
import { CONTROLS } from '../../config/uiConfig'

export function ControlGroup({ section, param, value, onChange }) {
  const { ui, setUi } = useStore()
  const cfg = CONTROLS[section]?.[param]
  if (!cfg) return null

  const learnId = `${section}.${param}`
  const isLearning = ui.midiLearnActive && ui.midiLearnId === learnId

  function handleContainerClick() {
    if (ui.midiLearnActive) setUi('midiLearnId', learnId)
  }

  return (
    <div className="mb-3" onClick={handleContainerClick}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[9px] tracking-widest ${isLearning ? 'text-cyan-400' : 'text-neutral-500'}`}>
          {cfg.label.toUpperCase()}
        </span>
        <span className="text-[9px] text-cyan-400 tabular-nums min-w-[32px] text-right">
          {typeof value === 'number' ? value.toFixed(2) : value}
        </span>
      </div>
      <input
        type="range"
        min={cfg.min}
        max={cfg.max}
        step={cfg.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-[3px] bg-neutral-700 rounded-full appearance-none cursor-pointer accent-cyan-400"
      />
    </div>
  )
}
```

- [ ] **Step 5.2: Create CollapsibleSection.jsx**

```jsx
// src/components/controls/CollapsibleSection.jsx
export function CollapsibleSection({ id, title, isOpen, isActive, onToggle, children }) {
  return (
    <div className="border-b border-neutral-800">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-neutral-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${isActive ? 'bg-cyan-400' : 'bg-neutral-700'}`} />
          <span className={`text-[9px] tracking-widest font-semibold transition-colors ${isActive ? 'text-neutral-200' : 'text-neutral-500'}`}>
            {title}
          </span>
        </div>
        <span className={`text-[9px] text-neutral-600 inline-block transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 pt-1 bg-neutral-900/30">
          {children}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5.3: Commit**

```
git add src/components/controls/ControlGroup.jsx src/components/controls/CollapsibleSection.jsx
git commit -m "feat(controls): add shared ControlGroup and CollapsibleSection primitives"
```

---

## Task 6: New component — TopStrip

**Files:**
- Create: `src/components/controls/TopStrip.jsx`

- [ ] **Step 6.1: Create TopStrip.jsx**

```jsx
// src/components/controls/TopStrip.jsx
import { useRef } from 'react'
import { useStore } from '../../store/useStore'
import { CONTROLS } from '../../config/uiConfig'

const GENERATORS = ['fibonacci', 'voronoi', 'grid', 'liquid', 'plasma', 'fractal']
const GEN_LABELS = {
  fibonacci: 'FIBONACCI', voronoi: 'VORONOI', grid: 'GRID',
  liquid: 'LIQUID', plasma: 'PLASMA', fractal: 'FRACTAL',
}

function KnobSlider({ label, section, param, value, onChange }) {
  const cfg = CONTROLS[section]?.[param]
  if (!cfg) return null
  const pct = Math.max(0, Math.min(1, (value - cfg.min) / (cfg.max - cfg.min)))
  const fillDeg = pct * 270

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-11 h-11">
        <div
          className="w-full h-full rounded-full border-2 border-neutral-700"
          style={{
            background: `conic-gradient(#22d3ee 0deg ${fillDeg}deg, #262626 ${fillDeg}deg 270deg)`,
            transform: 'rotate(-135deg)',
          }}
        />
        <div className="absolute inset-1.5 rounded-full bg-neutral-900" />
        <input
          type="range"
          min={cfg.min}
          max={cfg.max}
          step={cfg.step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
      </div>
      <span className="text-[8px] text-neutral-500 tracking-widest">{label}</span>
      <span className="text-[8px] text-cyan-400 tabular-nums">
        {typeof value === 'number' ? value.toFixed(2) : value}
      </span>
    </div>
  )
}

export function TopStrip() {
  const fileRef = useRef(null)
  const { generator, setGenerator, transforms, setTransform, color, setColor, image, setImage, resetForUpload } = useStore()

  const imageActive = generator.type === 'none' && image != null
  const rawName = image?.src?.split('/').pop() ?? ''
  const imageLabel = rawName.length > 8 ? rawName.slice(0, 8) + '…' : rawName || 'IMAGE'

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    if (file.type.startsWith('video/')) {
      const vid = document.createElement('video')
      vid.src = url
      vid.loop = true
      vid.muted = true
      vid.playsInline = true
      vid.addEventListener('loadeddata', () => { resetForUpload(); setImage(vid) }, { once: true })
      vid.load()
    } else {
      const img = new Image()
      img.src = url
      img.addEventListener('load', () => { resetForUpload(); setImage(img) }, { once: true })
    }
  }

  return (
    <div className="px-3 pt-3 pb-2 border-b border-neutral-800 bg-neutral-900/20 shrink-0">
      <p className="text-[8px] text-cyan-400 tracking-[3px] mb-2">GENERATOR</p>
      <div className="grid grid-cols-3 gap-1 mb-3">
        {GENERATORS.slice(0, 5).map((g) => (
          <button
            key={g}
            onClick={() => setGenerator('type', g)}
            className={`py-1.5 rounded text-[8px] tracking-wider border transition-colors ${
              generator.type === g
                ? 'bg-cyan-950 border-cyan-400 text-cyan-400'
                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
            }`}
          >
            {GEN_LABELS[g]}
          </button>
        ))}
        <button
          onClick={() => fileRef.current?.click()}
          className={`py-1.5 rounded text-[8px] tracking-wider border truncate transition-colors ${
            imageActive
              ? 'bg-cyan-950 border-cyan-400 text-cyan-400'
              : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
          }`}
        >
          {imageActive ? imageLabel.toUpperCase() : 'IMAGE'}
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <KnobSlider
          label="SCALE"
          section="transforms"
          param="scale"
          value={transforms.scale}
          onChange={(v) => setTransform('scale', v)}
        />
        <KnobSlider
          label="SPEED"
          section="generator"
          param="param3"
          value={generator.param3}
          onChange={(v) => setGenerator('param3', v)}
        />
        <KnobSlider
          label="HUE"
          section="color"
          param="hue"
          value={color.hue}
          onChange={(v) => setColor('hue', v)}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 6.2: Commit**

```
git add src/components/controls/TopStrip.jsx
git commit -m "feat(controls): add TopStrip with 5-generator grid + IMAGE slot + 3 knobs"
```

---

## Task 7: New component — SectionGeometry

**Files:**
- Create: `src/components/controls/SectionGeometry.jsx`

- [ ] **Step 7.1: Create SectionGeometry.jsx**

```jsx
// src/components/controls/SectionGeometry.jsx
import { useStore } from '../../store/useStore'
import { ControlGroup } from './ControlGroup'

const WARP_MODES = [
  { value: 'none',      label: 'OFF'   },
  { value: 'polar',     label: 'POLAR' },
  { value: 'log-polar', label: 'LOG'   },
]

function Toggle({ label, isOn, onToggle }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-[9px] tracking-widest text-neutral-500">{label}</span>
      <button
        onClick={onToggle}
        className={`w-7 h-3.5 rounded-full relative transition-colors ${isOn ? 'bg-cyan-950 border border-cyan-400' : 'bg-neutral-700'}`}
      >
        <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-transform ${isOn ? 'translate-x-3.5 bg-cyan-400' : 'translate-x-0.5 bg-neutral-500'}`} />
      </button>
    </div>
  )
}

export function SectionGeometry({ onInteract }) {
  const { symmetry, setSymmetry, transforms, setTransform, warp, setWarp, displacement, setDisplacement, tiling, setTiling } = useStore()

  function wrap(fn) {
    return (...args) => { onInteract?.(); fn(...args) }
  }

  return (
    <div>
      <ControlGroup section="symmetry" param="slices" value={symmetry.slices} onChange={wrap((v) => setSymmetry('slices', v))} />
      <ControlGroup section="transforms" param="rotation" value={transforms.rotation} onChange={wrap((v) => setTransform('rotation', v))} />
      <ControlGroup section="displacement" param="amp" value={displacement.amp} onChange={wrap((v) => setDisplacement('amp', v))} />

      <div className="mb-3">
        <p className="text-[9px] tracking-widest text-neutral-500 mb-1.5">WARP MODE</p>
        <div className="flex gap-1">
          {WARP_MODES.map(({ value, label }) => (
            <button
              key={value}
              onClick={wrap(() => setWarp('type', value))}
              className={`flex-1 py-1 rounded text-[8px] tracking-wider border transition-colors ${
                warp.type === value
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-400'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ControlGroup section="transforms" param="x" value={transforms.x} onChange={wrap((v) => setTransform('x', v))} />
      <ControlGroup section="transforms" param="y" value={transforms.y} onChange={wrap((v) => setTransform('y', v))} />

      <Toggle
        label="TILING"
        isOn={tiling.type !== 'none'}
        onToggle={wrap(() => setTiling('type', tiling.type === 'none' ? 'p4m' : 'none'))}
      />
    </div>
  )
}
```

- [ ] **Step 7.2: Commit**

```
git add src/components/controls/SectionGeometry.jsx
git commit -m "feat(controls): add SectionGeometry with warp mode selector"
```

---

## Task 8: New component — SectionColor

**Files:**
- Create: `src/components/controls/SectionColor.jsx`

- [ ] **Step 8.1: Create SectionColor.jsx**

```jsx
// src/components/controls/SectionColor.jsx
import { useStore } from '../../store/useStore'
import { ControlGroup } from './ControlGroup'

export function SectionColor({ onInteract }) {
  const { color, setColor, effects, setEffect } = useStore()

  function wrap(fn) {
    return (...args) => { onInteract?.(); fn(...args) }
  }

  return (
    <div>
      <ControlGroup section="color" param="hue"       value={color.hue}       onChange={wrap((v) => setColor('hue', v))} />
      <ControlGroup section="color" param="sat"       value={color.sat}       onChange={wrap((v) => setColor('sat', v))} />
      <ControlGroup section="color" param="light"     value={color.light}     onChange={wrap((v) => setColor('light', v))} />
      <ControlGroup section="color" param="posterize" value={color.posterize} onChange={wrap((v) => setColor('posterize', v))} />

      <div className="flex items-center justify-between mt-1">
        <span className="text-[9px] tracking-widest text-neutral-500">INVERT</span>
        <button
          onClick={wrap(() => setEffect('invert', effects.invert > 0 ? 0 : 100))}
          className={`w-7 h-3.5 rounded-full relative transition-colors ${effects.invert > 0 ? 'bg-cyan-950 border border-cyan-400' : 'bg-neutral-700'}`}
        >
          <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-transform ${effects.invert > 0 ? 'translate-x-3.5 bg-cyan-400' : 'translate-x-0.5 bg-neutral-500'}`} />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 8.2: Commit**

```
git add src/components/controls/SectionColor.jsx
git commit -m "feat(controls): add SectionColor component"
```

---

## Task 9: New component — SectionEffects

**Files:**
- Create: `src/components/controls/SectionEffects.jsx`

- [ ] **Step 9.1: Create SectionEffects.jsx**

```jsx
// src/components/controls/SectionEffects.jsx
import { useStore } from '../../store/useStore'
import { ControlGroup } from './ControlGroup'

function Toggle({ label, isOn, onToggle }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-[9px] tracking-widest text-neutral-500">{label}</span>
      <button
        onClick={onToggle}
        className={`w-7 h-3.5 rounded-full relative transition-colors ${isOn ? 'bg-cyan-950 border border-cyan-400' : 'bg-neutral-700'}`}
      >
        <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-transform ${isOn ? 'translate-x-3.5 bg-cyan-400' : 'translate-x-0.5 bg-neutral-500'}`} />
      </button>
    </div>
  )
}

export function SectionEffects({ onInteract }) {
  const { effects, setEffect, audio, setAudio, canvas, setCanvas } = useStore()

  function wrap(fn) {
    return (...args) => { onInteract?.(); fn(...args) }
  }

  const circleCrop = canvas.shape === 'circle'

  return (
    <div>
      <ControlGroup section="effects" param="bloom"               value={effects.bloom}               onChange={wrap((v) => setEffect('bloom', v))} />
      <ControlGroup section="effects" param="chromaticAberration" value={effects.chromaticAberration} onChange={wrap((v) => setEffect('chromaticAberration', v))} />
      <ControlGroup section="effects" param="noise"               value={effects.noise}               onChange={wrap((v) => setEffect('noise', v))} />

      <Toggle
        label="AUDIO REACTIVE"
        isOn={audio.enabled}
        onToggle={wrap(() => setAudio('enabled', !audio.enabled))}
      />

      {audio.enabled && (
        <ControlGroup
          section="audio"
          param="sensitivity"
          value={audio.sensitivity}
          onChange={wrap((v) => setAudio('sensitivity', v))}
        />
      )}

      <Toggle
        label="CIRCLE CROP"
        isOn={circleCrop}
        onToggle={wrap(() => setCanvas('shape', circleCrop ? 'rect' : 'circle'))}
      />
    </div>
  )
}
```

- [ ] **Step 9.2: Commit**

```
git add src/components/controls/SectionEffects.jsx
git commit -m "feat(controls): add SectionEffects with audio reactivity + circle crop"
```

---

## Task 10: New component — SectionMotion

**Files:**
- Create: `src/components/controls/SectionMotion.jsx`

- [ ] **Step 10.1: Create SectionMotion.jsx**

```jsx
// src/components/controls/SectionMotion.jsx
import { useStore } from '../../store/useStore'
import { ControlGroup } from './ControlGroup'

function Toggle({ label, isOn, onToggle }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-[9px] tracking-widest text-neutral-500">{label}</span>
      <button
        onClick={onToggle}
        className={`w-7 h-3.5 rounded-full relative transition-colors ${isOn ? 'bg-cyan-950 border border-cyan-400' : 'bg-neutral-700'}`}
      >
        <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-transform ${isOn ? 'translate-x-3.5 bg-cyan-400' : 'translate-x-0.5 bg-neutral-500'}`} />
      </button>
    </div>
  )
}

export function SectionMotion({ onInteract }) {
  const { ui, setUi, animation, setAnimation, flux, setFlux } = useStore()
  const isPlaying = !ui.globalPause

  function wrap(fn) {
    return (...args) => { onInteract?.(); fn(...args) }
  }

  return (
    <div>
      <Toggle
        label="ANIMATE"
        isOn={isPlaying}
        onToggle={wrap(() => setUi('globalPause', isPlaying))}
      />
      <ControlGroup
        section="animation"
        param="bpm"
        value={animation.bpm}
        onChange={wrap((v) => setAnimation('bpm', v))}
      />
      <Toggle
        label="FLUX"
        isOn={flux.enabled}
        onToggle={wrap(() => setFlux('enabled', !flux.enabled))}
      />
      {flux.enabled && (
        <ControlGroup
          section="flux"
          param="amount"
          value={flux.amount}
          onChange={wrap((v) => setFlux('amount', v))}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 10.2: Commit**

```
git add src/components/controls/SectionMotion.jsx
git commit -m "feat(controls): add SectionMotion with animate/BPM/flux controls"
```

---

## Task 11: New component — SectionPresets

**Files:**
- Create: `src/components/controls/SectionPresets.jsx`

- [ ] **Step 11.1: Create SectionPresets.jsx**

```jsx
// src/components/controls/SectionPresets.jsx
import { useStore } from '../../store/useStore'
import { PRESETS } from '../../presets'

export function SectionPresets({ onInteract }) {
  const { userPresets, loadPreset, addSnapshot, setUi } = useStore()

  const allPresets = [
    ...PRESETS.map((p) => ({ ...p, isBuiltIn: true })),
    ...userPresets.map((p) => ({ ...p, isBuiltIn: false })),
  ]

  return (
    <div>
      {allPresets.length > 0 && (
        <div className="grid grid-cols-2 gap-1 mb-3">
          {allPresets.map((preset, i) => (
            <button
              key={preset.name + i}
              onClick={() => { onInteract?.(); loadPreset(preset) }}
              className="bg-neutral-800 border border-neutral-700 hover:border-cyan-400 hover:text-cyan-400 rounded px-2 py-1.5 text-[8px] text-neutral-400 text-left tracking-wider truncate transition-colors"
            >
              {preset.name.toUpperCase()}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => { onInteract?.(); addSnapshot() }}
          className="flex-1 bg-neutral-800 border border-neutral-700 hover:border-cyan-400 hover:text-cyan-400 text-neutral-400 rounded py-1.5 text-[8px] tracking-wider transition-colors"
        >
          SAVE SNAPSHOT
        </button>
        <button
          onClick={() => { onInteract?.(); setUi('exportRequest', true) }}
          className="flex-1 bg-neutral-800 border border-neutral-700 hover:border-cyan-400 hover:text-cyan-400 text-neutral-400 rounded py-1.5 text-[8px] tracking-wider transition-colors"
        >
          EXPORT
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 11.2: Commit**

```
git add src/components/controls/SectionPresets.jsx
git commit -m "feat(controls): add SectionPresets with grid + snapshot + export"
```

---

## Task 12: New component — ControlsShell

**Files:**
- Create: `src/components/controls/ControlsShell.jsx`

- [ ] **Step 12.1: Create ControlsShell.jsx**

```jsx
// src/components/controls/ControlsShell.jsx
import { useState, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { TopStrip } from './TopStrip'
import { CollapsibleSection } from './CollapsibleSection'
import { SectionGeometry } from './SectionGeometry'
import { SectionColor } from './SectionColor'
import { SectionEffects } from './SectionEffects'
import { SectionMotion } from './SectionMotion'
import { SectionPresets } from './SectionPresets'

const SECTIONS = [
  { id: 'geometry', title: 'GEOMETRY', Component: SectionGeometry },
  { id: 'color',    title: 'COLOR',    Component: SectionColor    },
  { id: 'effects',  title: 'EFFECTS',  Component: SectionEffects  },
  { id: 'motion',   title: 'MOTION',   Component: SectionMotion   },
  { id: 'presets',  title: 'PRESETS',  Component: SectionPresets  },
]

export function ControlsShell() {
  const { ui, setUi, undo, redo, undoStack, redoStack, recording, setRecording } = useStore()

  const initialSection = ui.lastActiveSection ?? 'geometry'
  const [openSections, setOpenSections] = useState(() => ({ [initialSection]: true }))
  const [activeSection, setActiveSection] = useState(initialSection)

  function toggleSection(id) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleInteract = useCallback((sectionId) => {
    setActiveSection(sectionId)
    setOpenSections((prev) => ({ ...prev, [sectionId]: true }))
    setUi('lastActiveSection', sectionId)
  }, [setUi])

  return (
    <div className="w-64 flex flex-col h-full bg-neutral-900 border-l border-neutral-800 shrink-0">

      {/* Topbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-neutral-950 shrink-0">
        <span className="text-[10px] text-cyan-400 tracking-[3px] font-bold select-none">LUMEN LAB</span>
        <div className="flex gap-1.5">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            title="Undo (Ctrl+Z)"
            className="w-6 h-6 flex items-center justify-center border border-neutral-700 rounded text-[11px] text-neutral-500 hover:text-neutral-200 hover:border-neutral-500 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          >↺</button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            title="Redo (Ctrl+Shift+Z)"
            className="w-6 h-6 flex items-center justify-center border border-neutral-700 rounded text-[11px] text-neutral-500 hover:text-neutral-200 hover:border-neutral-500 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          >↻</button>
        </div>
      </div>

      {/* Generator + key knobs — always visible */}
      <TopStrip />

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        {SECTIONS.map(({ id, title, Component }) => (
          <CollapsibleSection
            key={id}
            id={id}
            title={title}
            isOpen={!!openSections[id]}
            isActive={activeSection === id}
            onToggle={toggleSection}
          >
            <Component onInteract={() => handleInteract(id)} />
          </CollapsibleSection>
        ))}
      </div>

      {/* Bottombar */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-800 bg-neutral-950 shrink-0">
        <button
          onClick={() => setUi('globalPause', !ui.globalPause)}
          className={`px-3 py-1 rounded border text-[9px] tracking-wider transition-colors ${
            ui.globalPause
              ? 'bg-cyan-950 border-cyan-400 text-cyan-400'
              : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
          }`}
        >
          {ui.globalPause ? '▶ PLAY' : '⏸ FREEZE'}
        </button>
        <button
          onClick={() => setRecording('isActive', !recording.isActive)}
          className={`px-3 py-1 rounded border text-[9px] tracking-wider transition-colors ${
            recording.isActive
              ? 'bg-red-950 border-red-500 text-red-400 animate-pulse'
              : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
          }`}
        >
          {recording.isActive ? '■ STOP' : '● REC'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 12.2: Commit**

```
git add src/components/controls/ControlsShell.jsx
git commit -m "feat(controls): add ControlsShell assembling all sections"
```

---

## Task 13: App.jsx — Wire keyboard shortcuts + swap Controls import

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 13.1: Update Controls import**

At the top of `src/App.jsx`, replace:
```js
// Before:
import { Controls } from './components/Controls'
// After:
import { ControlsShell } from './components/controls/ControlsShell'
```

- [ ] **Step 13.2: Add Ctrl+Z / Ctrl+Shift+Z handlers**

In the `useEffect` keydown handler, add these two blocks **before** the existing `if (e.target.tagName === 'INPUT') return` guard (undo/redo should work even when an input is focused):

```js
// Ctrl+Z → undo
if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
  e.preventDefault()
  store.undo()
  return
}
// Ctrl+Shift+Z → redo
if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.shiftKey) {
  e.preventDefault()
  store.redo()
  return
}
```

- [ ] **Step 13.3: Replace `<Controls />` with `<ControlsShell />`**

Find `<Controls` in the JSX and replace with `<ControlsShell`. The surrounding layout (wrapper divs, conditional visibility based on `ui.controlsOpen`) stays exactly the same — only the component name changes.

- [ ] **Step 13.4: Verify full UI in dev server**

```
npm run dev
```

Open http://localhost:5173. Verify:
- [ ] No tabs visible — sidebar shows generator grid + 3 knobs at top
- [ ] GEOMETRY section is expanded by default
- [ ] Clicking a section header collapses/expands it
- [ ] The active dot moves to whichever section you interact with
- [ ] Switching generators in the grid changes the visual output
- [ ] Ctrl+Z in the browser console doesn't throw errors

- [ ] **Step 13.5: Commit**

```
git add src/App.jsx
git commit -m "feat(app): swap Controls → ControlsShell, wire Ctrl+Z / Ctrl+Shift+Z undo/redo"
```

---

## Task 14: Delete Controls.jsx + fix broken tests

**Files:**
- Delete: `src/components/Controls.jsx`
- Modify: `src/store/useStore.test.js`
- Modify: `src/hooks/useAnimator.test.js`

- [ ] **Step 14.1: Delete old Controls.jsx**

```
Remove-Item src\components\Controls.jsx
```

- [ ] **Step 14.2: Run full test suite to find failures**

```
npx vitest run
```

Note every failure. Expected:
- `useAnimator.test.js` — `masking` in `base` state; `tiling.overlap`; `color.r/g/b`
- `useStore.test.js` — any remaining `pushHistory` references; `state.history`

- [ ] **Step 14.3: Fix useAnimator.test.js base fixture**

Find the `const base = { ... }` object at the top of `src/hooks/useAnimator.test.js` and update:

```js
// Remove masking key entirely
// Before:
masking: { lumaThreshold: 0, centerRadius: 0, invertLuma: false, feather: 0 },
// After: (delete the line)

// Update color — remove r, g, b
// Before:
color: { posterize: 256, r: 1, g: 1, b: 1, hue: 0, sat: 1, light: 1 },
// After:
color: { posterize: 256, hue: 0, sat: 1, light: 1 },

// Update tiling — remove overlap
// Before:
tiling: { type: 'none', scale: 1, overlap: 0 },
// After:
tiling: { type: 'none', scale: 1 },
```

- [ ] **Step 14.4: Fix useStore.test.js**

Replace any remaining `pushHistory` calls with `pushUndo`. Replace any `state.history` references with `state.undoStack`.

- [ ] **Step 14.5: Run full test suite — all must pass**

```
npx vitest run
```

Expected: All tests PASS. If any test still references `masking`, `lfo`, or `r/g/b` color fields, fix them now.

- [ ] **Step 14.6: Commit**

```
git add -A
git commit -m "feat: delete Controls.jsx; fix tests for store/animator after state cleanup"
```

---

## Task 15: Final smoke test

- [ ] **Step 15.1: Full build check**

```
npm run build
```

Expected: Build succeeds with no errors. Warnings about chunk size are acceptable.

- [ ] **Step 15.2: Manual verification checklist**

Open `npm run dev` and verify each success criterion from the spec:

- [ ] No tab icons anywhere in the sidebar
- [ ] Generator grid (5 generators + IMAGE slot) visible at top at all times
- [ ] Scale, Speed, Hue knobs visible at top at all times
- [ ] GEOMETRY section opens by default; dot is cyan
- [ ] Interacting with any Color slider causes COLOR dot to light up and section to expand
- [ ] FREEZE / REC buttons visible at bottom at all times
- [ ] Clicking IMAGE triggers file picker; loaded image name shows in the slot
- [ ] Switching to any generator while image is loaded clears image mode
- [ ] Circle Crop toggle in EFFECTS rounds the canvas output
- [ ] Warp mode selector cycles OFF → POLAR → LOG with distinct visual results
- [ ] Flux toggle + intensity slider auto-drifts the visuals
- [ ] Ctrl+Z undoes last change; Ctrl+Shift+Z redoes it
- [ ] Tab key still hides/shows the sidebar
- [ ] S key still saves a snapshot
- [ ] R key still toggles recording

- [ ] **Step 15.3: Commit**

```
git add -A
git commit -m "feat: UI simplification complete — tabless sidebar, 7 focused components"
```

---

## Self-Review Notes

**Spec coverage:**

| Requirement | Task |
|-------------|------|
| No tabs, single scrollable sidebar | Task 12 |
| Generator grid + IMAGE slot | Task 6 |
| Persistent Scale/Speed/Hue knobs | Task 6 |
| 5 collapsible sections | Tasks 7–11, 12 |
| Last-touched section persists | Task 12 (`handleInteract` → `setUi lastActiveSection`) |
| GEOMETRY controls | Task 7 |
| COLOR controls | Task 8 |
| EFFECTS + circle crop | Task 9 |
| MOTION + flux intensity | Task 10 |
| PRESETS | Task 11 |
| Remove LFO matrix | Tasks 1, 2 |
| Remove masking | Tasks 1, 2, 3 |
| Remove individual RGB | Tasks 1, 3, 4 |
| Remove tiling overlap | Tasks 1, 4 |
| Remove sequencer from store | Task 1 |
| Warp Polar/Log-Polar kept | Task 7 |
| Ctrl+Z / Ctrl+Shift+Z | Task 13 |
| Strobe safety on by default | Already in store (`strobeSafety: true`) — no change needed |
| SCHEMA_VERSION 3 | Task 1 |
| Controls.jsx deleted | Task 14 |
| All tests pass | Tasks 1, 14 |
