import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { CONTROLS } from '../config/uiConfig'
import { presets } from '../presets'
import {
  getProjectionSurfaceSceneState,
  getProjectionSurfaceSourceMeta,
} from '../utils/projectionSources'

function debounce(fn, ms) {
  let timer
  let pending = null

  const debounced = (...args) => {
    pending = args
    clearTimeout(timer)
    timer = setTimeout(() => {
      fn(...pending)
      pending = null
    }, ms)
  }

  debounced.flush = () => {
    if (pending) {
      clearTimeout(timer)
      fn(...pending)
      pending = null
    }
  }

  return debounced
}

// Exposed so resetAll can flush any pending persist write before wiping localStorage
let flushPersist = () => {}

const SCHEMA_VERSION = 6
const PROJECT_DOCUMENT_VERSION = 1

function cloneProjectData(value) {
  if (value == null) return value
  return JSON.parse(JSON.stringify(value))
}

function createSceneStateSnapshot(state) {
  return {
    transforms: { ...state.transforms },
    symmetry: { ...state.symmetry },
    warp: { ...state.warp },
    displacement: { ...state.displacement },
    tiling: { ...state.tiling },
    color: { ...state.color },
    effects: { ...state.effects },
    generator: { ...state.generator },
    media: state.media ? { ...state.media } : null,
    activeMediaId: state.activeMediaId,
  }
}

function applySceneStateSnapshot(state, snap) {
  const lock = state.ui?.lockGeometry
  const nextState = {
    transforms: lock ? state.transforms : { ...snap.transforms },
    symmetry: lock ? state.symmetry : { ...snap.symmetry },
    warp: lock ? state.warp : { ...snap.warp },
    displacement: { ...snap.displacement },
    tiling: lock ? state.tiling : { ...snap.tiling },
    color: { ...snap.color },
    effects: { ...snap.effects },
    generator: { ...snap.generator },
  }

  if (Object.hasOwn(snap, 'media')) {
    nextState.media = snap.media ? { ...snap.media } : null
    nextState.activeMediaId = snap.activeMediaId ?? snap.media?.id ?? null
    nextState.image = null
  }

  return nextState
}

function createProjectProjectionState(projection) {
  return {
    enabled: Boolean(projection?.enabled),
    points: cloneProjectData(projection?.points) || null,
    showTestPattern: projection?.showTestPattern ?? DEFAULTS.projection.showTestPattern,
    guideOpacity: projection?.guideOpacity ?? DEFAULTS.projection.guideOpacity,
    nudgeStep: projection?.nudgeStep ?? DEFAULTS.projection.nudgeStep,
    blackout: Boolean(projection?.blackout),
    patternMode: projection?.patternMode || DEFAULTS.projection.patternMode,
    patternType: projection?.patternType || DEFAULTS.projection.patternType,
    profiles: cloneProjectData(projection?.profiles) || [],
    displayId: projection?.displayId ?? null,
    selectedSurfaceId: projection?.selectedSurfaceId ?? null,
    surfaces: cloneProjectData(projection?.surfaces) || [],
  }
}

function createProjectDocument(state) {
  return {
    type: 'lumenlab-project',
    version: PROJECT_DOCUMENT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    project: {
      liveState: createSceneStateSnapshot(state),
      canvas: cloneProjectData(state.canvas),
      mediaLibrary: cloneProjectData(state.mediaLibrary) || [],
      projection: createProjectProjectionState(state.projection),
      snapshots: cloneProjectData(state.snapshots) || [],
      scenes: cloneProjectData(state.scenes) || [],
      userPresets: cloneProjectData(state.userPresets) || [],
      audio: cloneProjectData(state.audio),
      flux: cloneProjectData(state.flux),
      animation: cloneProjectData(state.animation),
    },
  }
}

function getProjectPayload(doc) {
  if (doc?.type === 'lumenlab-project' && doc?.project) return doc.project
  if (doc?.liveState || doc?.projection || doc?.scenes || doc?.mediaLibrary) return doc
  return null
}

function createProjectionSurfaceSceneRecord(state, surfaceId, name = null) {
  const targetSurface = (state.projection.surfaces || []).find((surface) => surface.id === surfaceId)
  if (!targetSurface) return null

  const sceneState = getProjectionSurfaceSceneState(targetSurface, {
    liveState: createSceneStateSnapshot(state),
    mediaLibrary: state.mediaLibrary,
    scenes: state.scenes,
    userPresets: state.userPresets,
    builtinPresets: presets,
  })

  if (!sceneState) return null

  const sceneId = `scene-${Date.now()}-${Math.round(Math.random() * 1000)}`
  return {
    sceneId,
    targetSurface,
    nextScene: {
      id: sceneId,
      name: name || `${targetSurface.name} Scene`,
      state: sceneState,
    },
  }
}

function createLiveProjectionSurface(surface) {
  return {
    ...surface,
    sourceMode: 'live',
    sourceId: 'live',
  }
}

function resetProjectionSurfaceSources(surfaces = [], predicate = () => true) {
  return surfaces.map((surface) => (
    predicate(surface) ? createLiveProjectionSurface(surface) : surface
  ))
}

const DEFAULTS = {
  schemaVersion: SCHEMA_VERSION,
  image: null,
  media: null,
  mediaLibrary: [],
  activeMediaId: null,
  transforms: {
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
  },
  symmetry: {
    enabled: true,
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
  tiling: {
    type: 'none',
    scale: 1.0,
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
    hue: 0.0, sat: 1.0, light: 1.0,
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
  projection: {
    enabled: false,
    calibrating: false,
    editingSurfaces: false,
    surfaceEditMode: 'warp',
    points: null,
    selectedCorner: 0,
    selectedMaskPoint: 0,
    showTestPattern: true,
    guideOpacity: 0.85,
    nudgeStep: 1,
    blackout: false,
    patternMode: 'off',
    patternType: 'grid',
    profiles: [],
    displayId: null,
    outputWindowOpen: false,
    selectedSurfaceId: null,
    surfaces: [],
  },
  snapshots: [],
  scenes: [],
  sceneEditor: {
    activeSceneId: null,
    originalLiveState: null,
  },
  userPresets: [],
  animation: {
    isPlaying: false,
    bpm: 120,
    strobeSafety: true,
  },
  flux: {
    enabled: false,
    amount: 0.3,
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
    resumeOnStartup: true,
    midiLearnActive: false,
    midiLearnId: null,
    resetNotice: null,
    lowResPreview: false,
    perfCapFx: false,
    lockGeometry: false,
    lastActiveSection: 'geometry',
  },
  recording: { isActive: false, progress: 0 },
  undoStack: [],
  redoStack: [],
}

export const useStore = create(
  persist(
    (set, get) => ({
      ...DEFAULTS,

      // --- Setters ---
      setImage: (img) => set({ image: img }),
      setMedia: (media) => set((state) => ({
        media,
        activeMediaId: media?.id ?? (media ? state.activeMediaId : null),
        image: null,
      })),
      addMediaAsset: (asset, options = {}) => set((state) => {
        const activate = options.activate !== false
        const nextLibrary = [
          ...(state.mediaLibrary || []).filter((entry) => entry.id !== asset.id),
          asset,
        ]

        return {
          mediaLibrary: nextLibrary,
          activeMediaId: activate ? asset.id : state.activeMediaId,
          media: activate ? asset : state.media,
          image: activate ? null : state.image,
        }
      }),
      setActiveMediaAsset: (id) => set((state) => {
        const asset = (state.mediaLibrary || []).find((entry) => String(entry.id) === String(id))
        if (!asset) return {}

        return {
          activeMediaId: asset.id,
          media: asset,
          image: null,
        }
      }),
      renameMediaAsset: (id, name) => set((state) => {
        const mediaLibrary = (state.mediaLibrary || []).map((asset) => (
          String(asset.id) === String(id) ? { ...asset, name } : asset
        ))

        const activeMedia = String(state.media?.id) === String(id)
          ? { ...state.media, name }
          : state.media

        return {
          mediaLibrary,
          media: activeMedia,
        }
      }),
      removeMediaAsset: (id) => set((state) => {
        const mediaLibrary = (state.mediaLibrary || []).filter((asset) => String(asset.id) !== String(id))
        const fallbackAsset = mediaLibrary[0] || null
        const removeActive = String(state.activeMediaId) === String(id) || String(state.media?.id) === String(id)

        return {
          mediaLibrary,
          activeMediaId: removeActive ? (fallbackAsset?.id ?? null) : state.activeMediaId,
          media: removeActive ? fallbackAsset : state.media,
          image: removeActive ? null : state.image,
          projection: {
            ...state.projection,
            surfaces: resetProjectionSurfaceSources(
              state.projection.surfaces || [],
              (surface) => surface.sourceMode === 'media' && String(surface.sourceId) === String(id)
            ),
          },
        }
      }),

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
      })),

      toggleControls: (isOpen) => set((state) => ({ ui: { ...state.ui, controlsOpen: isOpen } })),
      toggleHelp: (val) => set((state) => ({
        ui: { ...state.ui, helpOpen: val !== undefined ? val : !state.ui.helpOpen }
      })),

      // --- Actions ---

      randomize: () => {
        get().pushUndo()
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

      loadSnapshot: (snap) => set((state) => applySceneStateSnapshot(state, snap)),

      saveUserPreset: (name) => set((state) => {
        const newPreset = {
          name,
          id: Date.now(),
          state: createSceneStateSnapshot(state),
        }
        return { userPresets: [...(state.userPresets || []), newPreset] }
      }),

      exportProjectData: () => createProjectDocument(get()),

      importProjectData: (doc) => set((state) => {
        const project = getProjectPayload(doc)
        if (!project) return {}

        const liveState = project.liveState || {}
        const nextProjection = {
          ...DEFAULTS.projection,
          ...createProjectProjectionState(project.projection),
          calibrating: false,
          editingSurfaces: false,
          surfaceEditMode: DEFAULTS.projection.surfaceEditMode,
          selectedCorner: 0,
          selectedMaskPoint: 0,
          outputWindowOpen: false,
        }

        return {
          schemaVersion: SCHEMA_VERSION,
          image: null,
          media: liveState.media ? cloneProjectData(liveState.media) : null,
          mediaLibrary: cloneProjectData(project.mediaLibrary) || [],
          activeMediaId: liveState.activeMediaId ?? liveState.media?.id ?? null,
          transforms: { ...DEFAULTS.transforms, ...(liveState.transforms || {}) },
          symmetry: { ...DEFAULTS.symmetry, ...(liveState.symmetry || {}) },
          warp: { ...DEFAULTS.warp, ...(liveState.warp || {}) },
          displacement: { ...DEFAULTS.displacement, ...(liveState.displacement || {}) },
          tiling: { ...DEFAULTS.tiling, ...(liveState.tiling || {}) },
          generator: { ...DEFAULTS.generator, ...(liveState.generator || {}) },
          color: { ...DEFAULTS.color, ...(liveState.color || {}) },
          effects: { ...DEFAULTS.effects, ...(liveState.effects || {}) },
          canvas: { ...DEFAULTS.canvas, ...(project.canvas || {}) },
          projection: nextProjection,
          snapshots: cloneProjectData(project.snapshots) || [],
          scenes: cloneProjectData(project.scenes) || [],
          sceneEditor: { ...DEFAULTS.sceneEditor },
          userPresets: cloneProjectData(project.userPresets) || [],
          animation: { ...DEFAULTS.animation, ...(project.animation || {}) },
          flux: { ...DEFAULTS.flux, ...(project.flux || {}) },
          audio: { ...DEFAULTS.audio, ...(project.audio || {}) },
          recording: { ...DEFAULTS.recording },
          undoStack: [],
          redoStack: [],
          ui: {
            ...state.ui,
            exportRequest: null,
            resetNotice: null,
          },
        }
      }),

      saveScene: (name, options = {}) => set((state) => {
        const sceneId = `scene-${Date.now()}-${Math.round(Math.random() * 1000)}`
        const newScene = {
          id: sceneId,
          name,
          state: createSceneStateSnapshot(state),
        }
        const assignSelectedSurface = options.assignSelectedSurface !== false
        const selectedSurfaceId = state.projection.selectedSurfaceId

        return {
          scenes: [...(state.scenes || []), newScene],
          projection: assignSelectedSurface && selectedSurfaceId
            ? {
              ...state.projection,
              surfaces: (state.projection.surfaces || []).map((surface) => (
                surface.id === selectedSurfaceId
                  ? { ...surface, sourceMode: 'scene', sourceId: sceneId }
                  : surface
              )),
            }
            : state.projection,
        }
      }),

      captureProjectionSurfaceAsScene: (surfaceId = null, name = null) => set((state) => {
        const targetSurfaceId = surfaceId || state.projection.selectedSurfaceId
        const sceneRecord = createProjectionSurfaceSceneRecord(state, targetSurfaceId, name)
        if (!sceneRecord) return {}

        return {
          scenes: [...(state.scenes || []), sceneRecord.nextScene],
          projection: {
            ...state.projection,
            selectedSurfaceId: targetSurfaceId,
            surfaces: (state.projection.surfaces || []).map((surface) => (
              surface.id === targetSurfaceId
                ? { ...surface, sourceMode: 'scene', sourceId: sceneRecord.sceneId }
                : surface
            )),
          },
        }
      }),

      startProjectionSurfaceSceneEdit: (surfaceId = null, name = null) => set((state) => {
        const targetSurfaceId = surfaceId || state.projection.selectedSurfaceId
        const sceneRecord = createProjectionSurfaceSceneRecord(state, targetSurfaceId, name)
        if (!sceneRecord) return {}

        const originalLiveState = state.sceneEditor?.originalLiveState || createSceneStateSnapshot(state)

        return {
          ...applySceneStateSnapshot(state, sceneRecord.nextScene.state),
          scenes: [...(state.scenes || []), sceneRecord.nextScene],
          projection: {
            ...state.projection,
            selectedSurfaceId: targetSurfaceId,
            surfaces: (state.projection.surfaces || []).map((surface) => (
              surface.id === targetSurfaceId
                ? { ...surface, sourceMode: 'scene', sourceId: sceneRecord.sceneId }
                : surface
            )),
          },
          sceneEditor: {
            activeSceneId: sceneRecord.sceneId,
            originalLiveState,
          },
        }
      }),

      duplicateScene: (sceneId, options = {}) => set((state) => {
        const sourceScene = (state.scenes || []).find((scene) => String(scene.id) === String(sceneId))
        if (!sourceScene) return {}

        const nextSceneId = `scene-${Date.now()}-${Math.round(Math.random() * 1000)}`
        const targetSurfaceId = options.surfaceId || state.projection.selectedSurfaceId || null
        const assignSurface = options.assignSurface !== false && Boolean(targetSurfaceId)
        const nextScene = {
          ...cloneProjectData(sourceScene),
          id: nextSceneId,
          name: options.name || `${sourceScene.name} Copy`,
        }

        return {
          scenes: [...(state.scenes || []), nextScene],
          projection: assignSurface
            ? {
              ...state.projection,
              selectedSurfaceId: targetSurfaceId,
              surfaces: (state.projection.surfaces || []).map((surface) => (
                surface.id === targetSurfaceId
                  ? { ...surface, sourceMode: 'scene', sourceId: nextSceneId }
                  : surface
              )),
            }
            : state.projection,
        }
      }),

      updateScene: (id, patch) => set((state) => ({
        scenes: (state.scenes || []).map((scene) => (
          String(scene.id) === String(id) ? { ...scene, ...patch } : scene
        )),
      })),

      captureSceneState: (id) => set((state) => ({
        scenes: (state.scenes || []).map((scene) => (
          String(scene.id) === String(id)
            ? { ...scene, state: createSceneStateSnapshot(state) }
            : scene
        )),
      })),

      loadSceneToLive: (id) => set((state) => {
        const scene = (state.scenes || []).find((entry) => String(entry.id) === String(id))
        if (!scene?.state) return {}

        return applySceneStateSnapshot(state, scene.state)
      }),

      startSceneEdit: (id) => set((state) => {
        const scene = (state.scenes || []).find((entry) => String(entry.id) === String(id))
        if (!scene?.state) return {}

        const originalLiveState = state.sceneEditor?.originalLiveState || createSceneStateSnapshot(state)

        return {
          ...applySceneStateSnapshot(state, scene.state),
          sceneEditor: {
            activeSceneId: scene.id,
            originalLiveState,
          },
        }
      }),

      stopSceneEdit: (options = {}) => set((state) => {
        const activeSceneId = state.sceneEditor?.activeSceneId
        if (!activeSceneId) return {}

        const restoreLive = options.restoreLive !== false
        const originalLiveState = state.sceneEditor?.originalLiveState
        const nextState = restoreLive && originalLiveState
          ? applySceneStateSnapshot(state, originalLiveState)
          : {}

        return {
          ...nextState,
          sceneEditor: {
            activeSceneId: null,
            originalLiveState: null,
          },
        }
      }),

      deleteScene: (id) => set((state) => ({
        scenes: (state.scenes || []).filter((scene) => String(scene.id) !== String(id)),
        sceneEditor: state.sceneEditor?.activeSceneId && String(state.sceneEditor.activeSceneId) === String(id)
          ? {
            activeSceneId: null,
            originalLiveState: null,
          }
          : state.sceneEditor,
        projection: {
          ...state.projection,
          surfaces: resetProjectionSurfaceSources(
            state.projection.surfaces || [],
            (surface) => surface.sourceMode === 'scene' && String(surface.sourceId) === String(id)
          ),
        },
      })),

      assignSceneToSurface: (sceneId, surfaceId = null) => set((state) => {
        const targetScene = (state.scenes || []).find((scene) => String(scene.id) === String(sceneId))
        const targetSurfaceId = surfaceId || state.projection.selectedSurfaceId
        if (!targetScene || !targetSurfaceId) return {}

        return {
          projection: {
            ...state.projection,
            selectedSurfaceId: targetSurfaceId,
            surfaces: (state.projection.surfaces || []).map((surface) => (
              surface.id === targetSurfaceId
                ? { ...surface, sourceMode: 'scene', sourceId: targetScene.id }
                : surface
            )),
          },
        }
      }),

      deleteUserPreset: (id) => set((state) => ({
        userPresets: state.userPresets.filter((p) => p.id !== id),
        projection: {
          ...state.projection,
          surfaces: resetProjectionSurfaceSources(
            state.projection.surfaces || [],
            (surface) => surface.sourceMode === 'user' && String(surface.sourceId) === String(id)
          ),
        },
      })),

      setProjectionSurfacesLive: (surfaceIds = null) => set((state) => {
        const targetIds = Array.isArray(surfaceIds) && surfaceIds.length > 0
          ? new Set(surfaceIds.map((id) => String(id)))
          : null

        return {
          projection: {
            ...state.projection,
            surfaces: resetProjectionSurfaceSources(
              state.projection.surfaces || [],
              (surface) => !targetIds || targetIds.has(String(surface.id))
            ),
          },
        }
      }),

      resetInvalidProjectionSurfaceSources: (surfaceIds = null) => set((state) => {
        const targetIds = Array.isArray(surfaceIds) && surfaceIds.length > 0
          ? new Set(surfaceIds.map((id) => String(id)))
          : null
        const sourceOptions = {
          mediaLibrary: state.mediaLibrary,
          scenes: state.scenes,
          userPresets: state.userPresets,
          builtinPresets: presets,
        }

        return {
          projection: {
            ...state.projection,
            surfaces: resetProjectionSurfaceSources(
              state.projection.surfaces || [],
              (surface) => {
                if (targetIds && !targetIds.has(String(surface.id))) return false
                return !getProjectionSurfaceSourceMeta(surface, sourceOptions).isValid
              }
            ),
          },
        }
      }),

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

      setProjection: (key, value) => set((state) => {
        const projection = { ...state.projection, [key]: value }
        if (key === 'enabled' && value === false) {
          projection.calibrating = false
        }
        if (key === 'calibrating' && value === true) {
          projection.enabled = true
        }
        return { projection }
      }),

      setProjectionPoint: (index, point) => set((state) => {
        const points = Array.isArray(state.projection.points)
          ? [...state.projection.points]
          : null

        if (!points || !points[index]) return {}

        points[index] = point
        return {
          projection: {
            ...state.projection,
            points,
          }
        }
      }),

      setProjectionPoints: (points) => set((state) => ({
        projection: {
          ...state.projection,
          points,
        }
      })),

      addProjectionSurface: (name = null) => set((state) => {
        const nextId = `surface-${Date.now()}-${Math.round(Math.random() * 1000)}`
        const nextIndex = (state.projection.surfaces?.length || 0) + 1
        const nextSurface = {
          id: nextId,
          name: name || `Surface ${nextIndex}`,
          visible: true,
          opacity: 1,
          blendMode: 'screen',
          sourceMode: 'live',
          sourceId: 'live',
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
          ],
          maskPoints: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
          ],
        }

        return {
          projection: {
            ...state.projection,
            enabled: true,
            editingSurfaces: true,
            surfaceEditMode: 'warp',
            selectedMaskPoint: 0,
            selectedSurfaceId: nextId,
            surfaces: [...(state.projection.surfaces || []), nextSurface],
          }
        }
      }),

      updateProjectionSurface: (id, patch) => set((state) => ({
        projection: {
          ...state.projection,
          surfaces: (state.projection.surfaces || []).map((surface) => (
            surface.id === id ? { ...surface, ...patch } : surface
          )),
        }
      })),

      setProjectionSurfacePoints: (id, points) => set((state) => ({
        projection: {
          ...state.projection,
          surfaces: (state.projection.surfaces || []).map((surface) => (
            surface.id === id ? { ...surface, points } : surface
          )),
        }
      })),

      duplicateProjectionSurface: (id) => set((state) => {
        const sourceSurface = (state.projection.surfaces || []).find((surface) => surface.id === id)
        if (!sourceSurface) return {}

        const nextId = `surface-${Date.now()}-${Math.round(Math.random() * 1000)}`
        const duplicatedSurface = {
          ...sourceSurface,
          id: nextId,
          name: `${sourceSurface.name} Copy`,
          points: sourceSurface.points.map((point) => ({
            x: Math.min(1, point.x + 0.02),
            y: Math.min(1, point.y + 0.02),
          })),
          maskPoints: (sourceSurface.maskPoints || []).map((point) => ({ ...point })),
        }

        return {
          projection: {
            ...state.projection,
            selectedSurfaceId: nextId,
            surfaces: [...(state.projection.surfaces || []), duplicatedSurface],
          }
        }
      }),

      removeProjectionSurface: (id) => set((state) => {
        const remainingSurfaces = (state.projection.surfaces || []).filter((surface) => surface.id !== id)
        return {
          projection: {
            ...state.projection,
            selectedSurfaceId: remainingSurfaces[0]?.id || null,
            surfaces: remainingSurfaces,
          }
        }
      }),

      setProjectionSurfaceMaskPoints: (id, maskPoints) => set((state) => ({
        projection: {
          ...state.projection,
          surfaces: (state.projection.surfaces || []).map((surface) => (
            surface.id === id ? { ...surface, maskPoints } : surface
          )),
        }
      })),

      addProjectionSurfaceMaskPoint: (id, insertAfterIndex = 0) => set((state) => {
        const surfaces = state.projection.surfaces || []
        const targetSurface = surfaces.find((surface) => surface.id === id)
        if (!targetSurface) return {}

        const currentMask = targetSurface.maskPoints || []
        if (currentMask.length < 2) return {}

        const nextIndex = (insertAfterIndex + 1) % currentMask.length
        const currentPoint = currentMask[insertAfterIndex]
        const nextPoint = currentMask[nextIndex]
        const insertedPoint = {
          x: (currentPoint.x + nextPoint.x) / 2,
          y: (currentPoint.y + nextPoint.y) / 2,
        }

        const nextMask = [
          ...currentMask.slice(0, insertAfterIndex + 1),
          insertedPoint,
          ...currentMask.slice(insertAfterIndex + 1),
        ]

        return {
          projection: {
            ...state.projection,
            selectedMaskPoint: insertAfterIndex + 1,
            surfaces: surfaces.map((surface) => (
              surface.id === id ? { ...surface, maskPoints: nextMask } : surface
            )),
          }
        }
      }),

      removeProjectionSurfaceMaskPoint: (id, pointIndex) => set((state) => {
        const surfaces = state.projection.surfaces || []
        const targetSurface = surfaces.find((surface) => surface.id === id)
        if (!targetSurface || !targetSurface.maskPoints || targetSurface.maskPoints.length <= 3) return {}

        const nextMask = targetSurface.maskPoints.filter((_, index) => index !== pointIndex)
        return {
          projection: {
            ...state.projection,
            selectedMaskPoint: Math.max(0, Math.min(state.projection.selectedMaskPoint, nextMask.length - 1)),
            surfaces: surfaces.map((surface) => (
              surface.id === id ? { ...surface, maskPoints: nextMask } : surface
            )),
          }
        }
      }),

      resetProjectionSurfaceMask: (id) => set((state) => ({
        projection: {
          ...state.projection,
          selectedMaskPoint: 0,
          surfaces: (state.projection.surfaces || []).map((surface) => (
            surface.id === id
              ? {
                ...surface,
                maskPoints: [
                  { x: 0, y: 0 },
                  { x: 1, y: 0 },
                  { x: 1, y: 1 },
                  { x: 0, y: 1 },
                ],
              }
              : surface
          )),
        }
      })),

      resetProjection: () => set((state) => ({
        projection: {
          ...state.projection,
          points: null,
          selectedCorner: 0,
          selectedMaskPoint: 0,
          selectedSurfaceId: state.projection.surfaces?.[0]?.id || null,
        }
      })),

      saveProjectionProfile: (name) => set((state) => {
        const points = Array.isArray(state.projection.points)
          ? state.projection.points.map((point) => ({ ...point }))
          : null

        if (!points) return {}

        const profile = {
          id: Date.now(),
          name,
          points,
          patternMode: state.projection.patternMode,
          patternType: state.projection.patternType,
        }

        return {
          projection: {
            ...state.projection,
            profiles: [...(state.projection.profiles || []), profile],
          }
        }
      }),

      applyProjectionProfile: (id) => set((state) => {
        const profile = (state.projection.profiles || []).find((entry) => entry.id === id)
        if (!profile) return {}

        return {
          projection: {
            ...state.projection,
            enabled: true,
            points: profile.points.map((point) => ({ ...point })),
            patternMode: profile.patternMode || 'off',
            patternType: profile.patternType || 'grid',
            selectedCorner: 0,
          }
        }
      }),

      deleteProjectionProfile: (id) => set((state) => ({
        projection: {
          ...state.projection,
          profiles: (state.projection.profiles || []).filter((entry) => entry.id !== id),
        }
      })),

      setFlux: (key, value) => set((state) => ({
        flux: { ...state.flux, [key]: value }
      })),

      setAudio: (key, value) => set((state) => {
        return { audio: { ...state.audio, [key]: value } }
      }),

      pushUndo: () => set((state) => {
        const snapshot = {
          transforms: state.transforms, symmetry: state.symmetry, warp: state.warp,
          displacement: state.displacement, tiling: state.tiling, generator: state.generator,
          color: state.color, effects: state.effects, canvas: state.canvas,
        }
        return {
          undoStack: [snapshot, ...state.undoStack].slice(0, 20),
          redoStack: [],
        }
      }),

      undo: () => set((state) => {
        if (state.undoStack.length === 0) return {}
        const [previous, ...rest] = state.undoStack
        const current = {
          transforms: state.transforms, symmetry: state.symmetry, warp: state.warp,
          displacement: state.displacement, tiling: state.tiling, generator: state.generator,
          color: state.color, effects: state.effects, canvas: state.canvas,
        }
        return { ...previous, undoStack: rest, redoStack: [current, ...state.redoStack].slice(0, 20) }
      }),

      redo: () => set((state) => {
        if (state.redoStack.length === 0) return {}
        const [next, ...rest] = state.redoStack
        const current = {
          transforms: state.transforms, symmetry: state.symmetry, warp: state.warp,
          displacement: state.displacement, tiling: state.tiling, generator: state.generator,
          color: state.color, effects: state.effects, canvas: state.canvas,
        }
        return { ...next, redoStack: rest, undoStack: [current, ...state.undoStack].slice(0, 20) }
      }),

      triggerExport: (req) => set((state) => ({
        ui: { ...state.ui, exportRequest: req }
      })),

      // --- RESET ACTIONS ---

      // Soft Reset: Closes params but keeps global settings and timeline
      resetParams: () => {
        const { pushUndo } = get()
        pushUndo()
        set((state) => ({
          transforms: { ...DEFAULTS.transforms },
          symmetry: { ...DEFAULTS.symmetry },
          warp: { ...DEFAULTS.warp },
          displacement: { ...DEFAULTS.displacement },
          tiling: { ...DEFAULTS.tiling },
          generator: { ...DEFAULTS.generator, type: state.generator.type },
          color: { ...DEFAULTS.color },
          effects: { ...DEFAULTS.effects },
          flux: { ...state.flux },
          audio: { ...state.audio },
          animation: { ...state.animation, isPlaying: false }
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
        flushPersist()         // drain any pending debounced write before wiping
        localStorage.clear()
        set({ ...DEFAULTS })
      },

    }),
    {
      name: 'lumen-storage',
      storage: createJSONStorage(() => {
        const debouncedSetItem = debounce((key, value) => localStorage.setItem(key, value), 500)
        flushPersist = () => debouncedSetItem.flush()
        window.addEventListener('beforeunload', () => debouncedSetItem.flush(), { once: true })
        return {
          getItem:    (key) => localStorage.getItem(key),
          setItem:    debouncedSetItem,
          removeItem: (key) => localStorage.removeItem(key),
        }
      }),
      partialize: (state) => ({
        schemaVersion: state.schemaVersion,
        media: state.media,
        mediaLibrary: state.mediaLibrary,
        activeMediaId: state.activeMediaId,
        transforms: state.transforms,
        symmetry: state.symmetry,
        warp: state.warp,
        displacement: state.displacement,
        tiling: state.tiling,
        generator: state.generator,
        color: state.color,
        effects: state.effects,
        canvas: state.canvas,
        projection: state.projection,
        snapshots: state.snapshots,
        scenes: state.scenes,
        userPresets: state.userPresets,
        audio: state.audio,
        flux: state.flux,
        animation: state.animation,
        ui: state.ui,
        midi: state.midi,
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
          media: persistedState?.media || currentState.media,
          mediaLibrary: persistedState?.mediaLibrary || currentState.mediaLibrary,
          activeMediaId: persistedState?.activeMediaId ?? currentState.activeMediaId,
          // Deep merge config objects to ensure new keys appear if schema changes
          effects: { ...currentState.effects, ...(persistedState?.effects || {}) },
          audio: { ...currentState.audio, ...(persistedState?.audio || {}) },
          flux: { ...currentState.flux, ...(persistedState?.flux || {}) },
          ui: { ...currentState.ui, ...(persistedState?.ui || {}) },
          midi: { ...currentState.midi, ...(persistedState?.midi || {}) },
          animation: { ...currentState.animation, ...(persistedState?.animation || {}) },
          scenes: persistedState?.scenes || currentState.scenes,
          symmetry: { ...currentState.symmetry, ...(persistedState?.symmetry || {}) },
          generator: { ...currentState.generator, ...(persistedState?.generator || {}) },
          color: { ...currentState.color, ...(persistedState?.color || {}) },
          projection: { ...currentState.projection, ...(persistedState?.projection || {}) },
        }
      },
    }
  )
)
