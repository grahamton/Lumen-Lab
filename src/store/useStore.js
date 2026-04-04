import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { CONTROLS } from '../config/uiConfig'

const SCHEMA_VERSION = 2

const DEFAULTS = {
  schemaVersion: SCHEMA_VERSION,
  image: null,
  transforms: {
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
  },
  symmetry: {
    enabled: false,
    type: 'radial',
    slices: 6,
    offset: 0,
  },
  warp: {
    type: 'none',
  },
  displacement: {
    amp: 0,
    freq: 10,
  },
  masking: {
    lumaThreshold: 0,
    centerRadius: 0,
    invertLuma: false,
    feather: 0.0,
  },
  tiling: {
    type: 'none',
    scale: 1.0,
    overlap: 0.0,
  },
  generator: {
    type: 'none',
    param1: 50,
    param2: 50,
    param3: 50,
    isAnimated: true,
  },
  color: {
    posterize: 32,
    r: 1.0, g: 1.0, b: 1.0,
    hue: 0.0, sat: 1.0, light: 1.0,
    // Add default values if not present in DEFAULTS but present in CONTROLS
  },
  effects: {
    edgeDetect: 0,
    invert: 0,
    solarize: 0,
    shift: 0,
    bloom: 0,
    chromaticAberration: 0,
    noise: 0,
  },
  canvas: {
    width: 1920,
    height: 1080,
    aspect: 'video',
    fit: 'contain',
    shape: 'rectangle',
  },
  snapshots: [],
  userPresets: [],
  animation: {
    isPlaying: false,
    mode: 'loop',
    bpm: 120,
    transitionTime: 2000,
    easing: 'easeInOut',
    activeStep: 0,
    strobeSafety: true,
  },
  flux: {
    enabled: false,
  },
  lfo: {
    active: false,
    oscillators: [
      // Default Heartbeat for Flux
      { type: 'sine', target: 'transforms.scale', freq: 0.5, amp: 0.05, offset: 0 },
      { type: 'sine', target: 'transforms.rotation', freq: 0.1, amp: 0.1, offset: 1 }
    ]
  },
  audio: {
    enabled: false,
    source: 'mic',
    fileUrl: null,
    fileName: null,
    sensitivity: 1.0,
    reactivity: {
      bass: 1.0,
      mid: 1.0,
      high: 1.0,
    },
    meters: { bass: 0, mid: 0, high: 0 },
  },
  midi: {
    isEnabled: false,
    inputs: [],
    lastMsg: null,
    mappings: {}
  },
  ui: {
    activeTab: 0,
    layout: 'sidebar',
    helpOpen: true,
    controlsOpen: true,
    exportRequest: null,
    gamepadConnected: false,
    globalPause: false,
    resumeOnStartup: true, // New Preference: Default to TRUE
    midiLearnActive: false,
    midiLearnId: null, // The parameter path waiting for MIDI input
    resetNotice: null,
    lowResPreview: false,
    perfCapFx: false,
    lockGeometry: false,
  },
  recording: { isActive: false, progress: 0 },
  history: [],
}

export const useStore = create(
  persist(
    (set, get) => ({
      ...DEFAULTS,

      // --- Setters ---
      setImage: (img) => set({ image: img }),

      setLfo: (key, value) => set((state) => ({
        lfo: { ...state.lfo, [key]: value }
      })),

      setMidi: (key, value) => {
        set((state) => {
          const newState = { midi: { ...state.midi, [key]: value } }

          // MIDI LEARN LOGIC
          // If we receive a message 'lastMsg', and learn mode is active, map it!
          if (key === 'lastMsg' && value && state.ui.midiLearnActive && state.ui.midiLearnId) {
            const { channel, note, type } = value
            // Create a unique ID for the control (e.g., "ch1-cc10" or "ch1-note60")
            // actually, better to map FROM control TO param.
            // But for lookup speed during performace, we want Map<MidiID, ParamPath>

            // Mapping Key: `${channel}-${type}-${note}`
            const mapKey = `${channel}-${type}-${note}`

            // Update Mappings
            newState.midi.mappings = {
              ...state.midi.mappings,
              [mapKey]: state.ui.midiLearnId
            }

            // Clear learn ID so we don't map same param twice immediately
            // User must click another param to map another
            newState.ui = { ...state.ui, midiLearnId: null }
          }

          // MIDI DRIVE LOGIC
          // If we receive a message, check if it's mapped to something
          if (key === 'lastMsg' && value) {
            const mapKey = `${value.channel}-${value.type}-${value.note}`
            const targetPath = state.midi.mappings[mapKey]

            if (targetPath) {
              // Update the target parameter
              // targetPath is like "generator.param1" or "effects.bloom"
              const [section, param] = targetPath.split('.')

              // Scale and update
              get().updateParamNormalized(section, param, value.value)
            }
          }

          return newState
        })
      },

      // Helper to update any param from a normalized 0-1 float
      updateParamNormalized: (section, param, normalValue) => {
        set((state) => {
          // Find config for this param
          // section might be "generator", "effects", etc.
          const configSection = CONTROLS[section]
          const configParam = configSection ? configSection[param] : null

          let val = normalValue

          if (configParam) {
            const { min, max } = configParam
            // Lerp
            val = min + (max - min) * normalValue

            // Optional: Step quantization if needed, but smooth is usually better for MIDI
            // if (configParam.step) {
            //   val = Math.round(val / configParam.step) * configParam.step
            // }
          } else {
            // Fallback / heuristic if not in CONTROLS
            // E.g. opacity is usually 0-1, rotation 0-360?
            // Without config, we assume 0-1 or 0-100?
            // Let's assume 0-1 if not found, or maybe 0-100 if it feels "large"?
            // Safest is to just pass raw 0-1 if no config, but most things need scaling.
            // We'll leave as 0-1
          }

          // Update the specific section
          // We need to handle nested state updates carefully
          return {
            [section]: {
              ...state[section],
              [param]: val
            }
          }
        })
      },

      setMidiMapping: (midiId, paramPath) => set((state) => ({
        midi: {
          ...state.midi,
          mappings: { ...state.midi.mappings, [midiId]: paramPath }
        }
      })),

      clearMidiMapping: (midiId) => set((state) => {
        const newMappings = { ...state.midi.mappings }
        delete newMappings[midiId]
        return { midi: { ...state.midi, mappings: newMappings } }
      }),

      setUi: (key, value) => set((state) => ({
        ui: { ...state.ui, [key]: value }
      })),

      stopAllMotion: () => set((state) => ({
        generator: { ...state.generator, isAnimated: false },
        animation: { ...state.animation, isPlaying: false },
        flux: { ...state.flux, enabled: false },
        audio: { ...state.audio, enabled: false },
        lfo: { ...state.lfo, active: false }
      })),

      toggleControls: (isOpen) => set((state) => ({ ui: { ...state.ui, controlsOpen: isOpen } })),
      toggleHelp: (val) => set((state) => ({
        ui: { ...state.ui, helpOpen: val !== undefined ? val : !state.ui.helpOpen }
      })),

      // --- Actions ---

      randomize: () => {
        get().pushHistory() // Auto-save
        set((state) => {
          const rng = (min, max) => Math.random() * (max - min) + min
          const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

          const symmetrySlices = pick([4, 6, 8, 12, 16])
          const tilingType = Math.random() > 0.3 ? pick(['p1', 'p2', 'p4m']) : 'none'
          const warpType = Math.random() > 0.4 ? pick(['polar', 'log-polar']) : 'none'

          return {
            transforms: {
              x: rng(-100, 100),
              y: rng(-100, 100),
              scale: rng(0.5, 1.5),
              rotation: rng(0, Math.PI * 2),
            },
            symmetry: {
              enabled: Math.random() > 0.3,
              type: state.symmetry.type,
              slices: symmetrySlices,
              offset: state.symmetry.offset
            },
            warp: { type: warpType },
            displacement: {
              amp: Math.random() > 0.5 ? rng(0, 150) : 0,
              freq: rng(5, 50),
            },
            tiling: {
              type: tilingType,
              scale: rng(0.5, 1.5),
              overlap: rng(0, 0.3),
            },
            masking: {
              lumaThreshold: Math.random() > 0.7 ? rng(0, 50) : 0,
              centerRadius: Math.random() > 0.7 ? rng(0, 40) : 0,
              invertLuma: Math.random() > 0.5,
              feather: rng(0, 0.4),
            },
            color: {
              ...state.color,
              posterize: Math.random() > 0.6 ? Math.floor(rng(4, 16)) : 256,
            },
            effects: {
              edgeDetect: Math.random() > 0.7 ? rng(20, 100) : 0,
              invert: Math.random() > 0.8 ? rng(20, 100) : 0,
              solarize: Math.random() > 0.8 ? rng(20, 100) : 0,
              shift: Math.random() > 0.8 ? rng(5, 50) : 0,
              bloom: Math.random() > 0.7 ? rng(0, 0.5) : 0,
              chromaticAberration: Math.random() > 0.7 ? rng(0, 0.5) : 0,
              noise: Math.random() > 0.8 ? rng(0, 0.2) : 0,
            },
            generator: {
              ...state.generator,
              param1: rng(10, 90),
              param2: rng(10, 90),
            },
          }
        })
      },

      addSnapshot: () => set((state) => {
        const snap = {
          transforms: { ...state.transforms },
          symmetry: { ...state.symmetry },
          warp: { ...state.warp },
          displacement: { ...state.displacement },
          tiling: { ...state.tiling },
          masking: { ...state.masking },
          color: { ...state.color },
          effects: { ...state.effects },
          generator: { ...state.generator },
          id: Date.now()
        }
        return { snapshots: [...state.snapshots, snap] }
      }),

      deleteSnapshot: (index) => set((state) => ({
        snapshots: state.snapshots.filter((_, i) => i !== index)
      })),

      loadSnapshot: (snap) => set((state) => {
        const lock = state.ui?.lockGeometry
        return {
          transforms: lock ? state.transforms : { ...snap.transforms },
          symmetry: lock ? state.symmetry : { ...snap.symmetry },
          warp: lock ? state.warp : { ...snap.warp },
          displacement: { ...snap.displacement },
          tiling: lock ? state.tiling : { ...snap.tiling },
          masking: { ...snap.masking },
          color: { ...snap.color },
          effects: { ...snap.effects },
          generator: { ...snap.generator },
        }
      }),

      saveUserPreset: (name) => set((state) => {
        const newPreset = {
          name,
          id: Date.now(),
          state: {
            transforms: { ...state.transforms },
            symmetry: { ...state.symmetry },
            warp: { ...state.warp },
            displacement: { ...state.displacement },
            tiling: { ...state.tiling },
            masking: { ...state.masking },
            color: { ...state.color },
            effects: { ...state.effects },
            generator: { ...state.generator },
          }
        }
        return { userPresets: [...(state.userPresets || []), newPreset] }
      }),

      deleteUserPreset: (id) => set((state) => ({
        userPresets: state.userPresets.filter((p) => p.id !== id)
      })),

      setAnimation: (key, value) => set((state) => ({
        animation: { ...state.animation, [key]: value }
      })),

      setTransform: (key, value) => set((state) => ({
        transforms: { ...state.transforms, [key]: value }
      })),

      setSymmetry: (key, value) => set((state) => ({
        symmetry: { ...state.symmetry, [key]: value }
      })),

      setWarp: (key, value) => set((state) => ({
        warp: { ...state.warp, [key]: value }
      })),

      setDisplacement: (key, value) => set((state) => ({
        displacement: { ...state.displacement, [key]: value }
      })),

      setMasking: (key, value) => set((state) => ({
        masking: { ...state.masking, [key]: value }
      })),

      setRecording: (key, value) => set((state) => ({
        recording: { ...state.recording, [key]: value }
      })),

      setTiling: (key, value) => set((state) => ({
        tiling: { ...state.tiling, [key]: value }
      })),

      setColor: (key, value) => {
        set((state) => ({
          color: { ...state.color, [key]: value }
        }))
      },

      setEffect: (key, value) => set((state) => ({
        effects: { ...state.effects, [key]: value }
      })),

      setGenerator: (key, value) => {
        set((state) => ({ generator: { ...state.generator, [key]: value } }))
      },

      setCanvas: (key, value) => set((state) => ({
        canvas: { ...state.canvas, [key]: value }
      })),

      setFlux: (key, value) => set((state) => ({
        flux: { ...state.flux, [key]: value }
      })),

      setAudio: (key, value) => set((state) => {
        return { audio: { ...state.audio, [key]: value } }
      }),

      pushHistory: () => set((state) => {
        const newHistory = [
          {
            transforms: { ...state.transforms },
            symmetry: { ...state.symmetry },
            warp: { ...state.warp },
            displacement: { ...state.displacement },
            tiling: { ...state.tiling },
            masking: { ...state.masking },
            color: { ...state.color },
            effects: { ...state.effects },
            generator: { ...state.generator },
            animation: { ...state.animation }
          },
          ...state.history
        ].slice(0, 20)
        return { history: newHistory }
      }),

      undo: () => set((state) => {
        if (state.history.length === 0) return {}
        const [previous, ...rest] = state.history
        return {
          ...previous,
          history: rest
        }
      }),

      triggerExport: (req) => set((state) => ({
        ui: { ...state.ui, exportRequest: req }
      })),

      // --- RESET ACTIONS ---

      // Soft Reset: Closes params but keeps global settings and timeline
      // Soft Reset: Closes params but keeps global settings and timeline
      resetParams: () => {
        const { pushHistory } = get()
        pushHistory()
        set((state) => ({
          transforms: { ...DEFAULTS.transforms },
          symmetry: { ...DEFAULTS.symmetry },
          warp: { ...DEFAULTS.warp },
          displacement: { ...DEFAULTS.displacement },
          masking: { ...DEFAULTS.masking },
          tiling: { ...DEFAULTS.tiling },
          // Preserve the current generator type, but reset its parameters
          generator: { ...DEFAULTS.generator, type: state.generator.type },
          color: { ...DEFAULTS.color },
          effects: { ...DEFAULTS.effects },
          // Keep global modulation/audio state when doing a soft reset
          flux: { ...state.flux },
          lfo: { ...state.lfo },
          audio: { ...state.audio },
          animation: { ...state.animation, isPlaying: false } // Stop playing but keep timeline
        }))
      },

      resetForUpload: () => set({
        generator: { ...DEFAULTS.generator, type: 'none' }, // FORCE NONE
        tiling: { ...DEFAULTS.tiling },
        warp: { ...DEFAULTS.warp },
        displacement: { ...DEFAULTS.displacement },
        symmetry: { ...DEFAULTS.symmetry },
        effects: { ...DEFAULTS.effects },
        transforms: { ...DEFAULTS.transforms },
      }),

      // Factory Reset: Wipes EVERYTHING including user presets
      resetAll: () => {
        localStorage.clear() // Clear persistent storage
        set({ ...DEFAULTS }) // Reset in-memory state
      },

    }),
    {
      name: 'lumen-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        schemaVersion: state.schemaVersion,
        transforms: state.transforms,
        symmetry: state.symmetry,
        warp: state.warp,
        displacement: state.displacement,
        masking: state.masking,
        tiling: state.tiling,
        generator: state.generator,
        color: state.color,
        effects: state.effects,
        canvas: state.canvas,
        snapshots: state.snapshots,
        userPresets: state.userPresets,
        audio: state.audio,
        flux: state.flux,
        animation: state.animation,
        ui: state.ui,
        midi: state.midi, // Persist MIDI mappings
      }),
      merge: (persistedState, currentState) => {
        const incomingVersion = persistedState?.schemaVersion
        if (incomingVersion !== SCHEMA_VERSION) {
          localStorage.removeItem('lumen-storage')
          return {
            ...currentState,
            schemaVersion: SCHEMA_VERSION,
            ui: { ...currentState.ui, resetNotice: 'State reset after update' }
          }
        }

        return {
          ...currentState,
          ...persistedState,
          schemaVersion: SCHEMA_VERSION,
          // Deep merge config objects to ensure new keys appear if schema changes
          effects: { ...currentState.effects, ...(persistedState?.effects || {}) },
          audio: { ...currentState.audio, ...(persistedState?.audio || {}) },
          flux: { ...currentState.flux, ...(persistedState?.flux || {}) },
          ui: { ...currentState.ui, ...(persistedState?.ui || {}) },
          midi: { ...currentState.midi, ...(persistedState?.midi || {}) },
          animation: { ...currentState.animation, ...(persistedState?.animation || {}) },
          symmetry: { ...currentState.symmetry, ...(persistedState?.symmetry || {}) },
          generator: { ...currentState.generator, ...(persistedState?.generator || {}) },
          color: { ...currentState.color, ...(persistedState?.color || {}) },
        }
      },
    }
  )
)
