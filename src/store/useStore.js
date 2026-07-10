import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { CONTROLS } from '../config/uiConfig'
import { presets } from '../presets'
import {
  getDraftAwareSceneState,
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

const SCENE_STATE_KEYS = [
  'transforms',
  'symmetry',
  'warp',
  'displacement',
  'tiling',
  'color',
  'effects',
  'generator',
  'media',
  'activeMediaId',
]

const SCENE_STATE_SECTION_KEYS = new Set([
  'transforms',
  'symmetry',
  'warp',
  'displacement',
  'tiling',
  'color',
  'effects',
  'generator',
])

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

function createSceneOrigin(sourceMode, sourceId = null, extra = {}) {
  return {
    type: sourceMode || 'live',
    sourceId: sourceId ?? null,
    ...cloneProjectData(extra),
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

function createProjectLayoutState(state) {
  return {
    canvas: cloneProjectData(state.canvas),
    projection: createProjectProjectionState(state.projection),
  }
}

function createProjectSourceState(state) {
  return {
    mediaLibrary: cloneProjectData(state.mediaLibrary) || [],
    scenes: cloneProjectData(state.scenes) || [],
  }
}

function createProjectLookPresetState(state) {
  return {
    userPresets: cloneProjectData(state.userPresets) || [],
    snapshots: cloneProjectData(state.snapshots) || [],
  }
}

function createProjectDocument(state) {
  const layout = createProjectLayoutState(state)
  const sources = createProjectSourceState(state)
  const lookPresets = createProjectLookPresetState(state)

  return {
    type: 'lumenlab-project',
    version: PROJECT_DOCUMENT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    project: {
      layout,
      sources,
      lookPresets,
      liveState: createSceneStateSnapshot(state),
      canvas: layout.canvas,
      mediaLibrary: sources.mediaLibrary,
      projection: layout.projection,
      snapshots: lookPresets.snapshots,
      scenes: sources.scenes,
      userPresets: lookPresets.userPresets,
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
  return createProjectionSceneRecordFromSourceState({
    sourceMode: targetSurface.sourceMode || 'live',
    sourceId: targetSurface.sourceId ?? null,
    liveState: createSceneStateSnapshot(state),
    mediaLibrary: state.mediaLibrary,
    scenes: state.scenes,
    userPresets: state.userPresets,
    builtinPresets: presets,
    activeSceneId: getActiveAuthoredSceneId(state),
    activeSceneDraftState: getActiveAuthoredSceneDraftState(state),
    name: name || `${targetSurface.name} Scene`,
    extraOrigin: {
      capturedFromSurfaceId: targetSurface.id,
      capturedFromSurfaceName: targetSurface.name,
    },
  })
}

function createProjectionSceneRecordFromSourceState({
  sourceMode,
  sourceId,
  liveState,
  mediaLibrary,
  scenes,
  userPresets,
  builtinPresets,
  activeSceneId = null,
  activeSceneDraftState = null,
  name = null,
  extraOrigin = {},
}) {
  const sourceMeta = getProjectionSurfaceSourceMeta({ sourceMode, sourceId }, {
    mediaLibrary,
    scenes,
    userPresets,
    builtinPresets,
  })

  const sceneState = getProjectionSurfaceSceneState({ sourceMode, sourceId }, {
    liveState,
    mediaLibrary,
    scenes,
    userPresets,
    builtinPresets,
    activeSceneId,
    activeSceneDraftState,
  })

  if (!sceneState) return null

  const sceneId = `scene-${Date.now()}-${Math.round(Math.random() * 1000)}`
  let defaultName = 'Scene'
  let origin = createSceneOrigin(sourceMode, sourceId)

  if (sourceMode === 'media') {
    const asset = (mediaLibrary || []).find((entry) => String(entry.id) === String(sourceId))
    defaultName = asset?.name ? `${asset.name} Scene` : 'Media Scene'
    origin = createSceneOrigin(sourceMode, sourceId, {
      label: asset?.name ? `MEDIA · ${asset.name}` : sourceMeta.label,
      detail: 'Created from a media assignment shortcut.',
      mediaName: asset?.name || null,
      ...extraOrigin,
    })
  } else if (sourceMode === 'builtin') {
    const preset = builtinPresets[Number(sourceId)] || null
    defaultName = preset?.name ? `${preset.name} Scene` : 'Built-In Scene'
    origin = createSceneOrigin(sourceMode, sourceId, {
      label: preset?.name ? `BUILT-IN · ${preset.name}` : sourceMeta.label,
      detail: 'Created from a built-in preset shortcut.',
      presetName: preset?.name || null,
      ...extraOrigin,
    })
  } else if (sourceMode === 'user') {
    const preset = (userPresets || []).find((entry) => String(entry.id) === String(sourceId))
    defaultName = preset?.name ? `${preset.name} Scene` : 'Preset Scene'
    origin = createSceneOrigin(sourceMode, sourceId, {
      label: preset?.name ? `USER · ${preset.name}` : sourceMeta.label,
      detail: 'Created from a user preset shortcut.',
      presetName: preset?.name || null,
      ...extraOrigin,
    })
  }

  return {
    sceneId,
    nextScene: {
      id: sceneId,
      name: name || defaultName,
      state: sceneState,
      origin,
    },
    sourceMeta,
  }
}

function mergeSceneStateSnapshot(baseState, patch = {}) {
  return {
    transforms: patch.transforms ?? { ...(baseState.transforms || {}) },
    symmetry: patch.symmetry ?? { ...(baseState.symmetry || {}) },
    warp: patch.warp ?? { ...(baseState.warp || {}) },
    displacement: patch.displacement ?? { ...(baseState.displacement || {}) },
    tiling: patch.tiling ?? { ...(baseState.tiling || {}) },
    color: patch.color ?? { ...(baseState.color || {}) },
    effects: patch.effects ?? { ...(baseState.effects || {}) },
    generator: patch.generator ?? { ...(baseState.generator || {}) },
    media: Object.hasOwn(patch, 'media') ? patch.media : (baseState.media ?? null),
    activeMediaId: Object.hasOwn(patch, 'activeMediaId')
      ? patch.activeMediaId
      : (baseState.activeMediaId ?? baseState.media?.id ?? null),
  }
}

function createProjectionSceneRecordFromSource(state, sourceMode, sourceId, name = null, extraOrigin = {}) {
  const sceneRecord = createProjectionSceneRecordFromSourceState({
    sourceMode,
    sourceId,
    liveState: createSceneStateSnapshot(state),
    mediaLibrary: state.mediaLibrary,
    scenes: state.scenes,
    userPresets: state.userPresets,
    builtinPresets: presets,
    activeSceneId: getActiveAuthoredSceneId(state),
    activeSceneDraftState: getActiveAuthoredSceneDraftState(state),
    name,
    extraOrigin,
  })

  if (!sceneRecord) return null

  return {
    sceneId: sceneRecord.sceneId,
    targetSurface: null,
    nextScene: sceneRecord.nextScene,
  }
}

function normalizeProjectionSourcesInState(state) {
  const liveState = createSceneStateSnapshot(state)
  const nextScenes = [...(cloneProjectData(state.scenes) || [])]
  const seenSceneKeys = new Map()
  const normalizedProjection = {
    ...state.projection,
    surfaces: (cloneProjectData(state.projection?.surfaces) || []).map((surface) => {
      if (!surface || surface.visible === false) return surface
      if (surface.sourceMode !== 'media' && surface.sourceMode !== 'builtin' && surface.sourceMode !== 'user') {
        return surface
      }

      const sourceKey = `${surface.sourceMode}:${surface.sourceId}`
      let sceneId = seenSceneKeys.get(sourceKey)
      if (!sceneId) {
        const sceneRecord = createProjectionSceneRecordFromSourceState({
          sourceMode: surface.sourceMode,
          sourceId: surface.sourceId,
          liveState,
          mediaLibrary: state.mediaLibrary,
          scenes: nextScenes,
          userPresets: state.userPresets,
          builtinPresets: presets,
        })

        if (!sceneRecord) return surface

        sceneId = sceneRecord.sceneId
        seenSceneKeys.set(sourceKey, sceneId)
        nextScenes.push(sceneRecord.nextScene)
      }

      return {
        ...surface,
        sourceMode: 'scene',
        sourceId: sceneId,
      }
    }),
  }

  return {
    ...state,
    scenes: nextScenes,
    projection: normalizedProjection,
  }
}

function createLiveProjectionSurface(surface) {
  return {
    ...surface,
    sourceMode: 'live',
    sourceId: 'live',
  }
}

function countSceneSurfaceUsage(surfaces = [], sceneId) {
  return surfaces.filter((surface) => (
    surface?.sourceMode === 'scene' && String(surface.sourceId) === String(sceneId)
  )).length
}

function withActiveSceneSnapshot(state, patch) {
  const activeSceneId = getActiveAuthoredSceneId(state)
  if (!activeSceneId) return patch

  const scenePatch = {}
  const rootPatch = { ...patch }
  let hasScenePatch = false

  for (const key of SCENE_STATE_KEYS) {
    if (!Object.hasOwn(rootPatch, key)) continue
    scenePatch[key] = rootPatch[key]
    delete rootPatch[key]
    hasScenePatch = true
  }

  if (!hasScenePatch) return patch

  const nextDraftState = mergeSceneStateSnapshot(getEffectiveAuthoredSceneState(state), scenePatch)
  const sourceScenes = rootPatch.scenes ?? state.scenes ?? []
  return {
    ...rootPatch,
    scenes: sourceScenes.map((scene) => (
      String(scene.id) === String(activeSceneId)
        ? { ...scene, state: cloneProjectData(nextDraftState) }
        : scene
    )),
    sceneEditor: {
      ...(rootPatch.sceneEditor || state.sceneEditor),
      hasLocalEdits: true,
      draftState: nextDraftState,
    },
  }
}

function createSceneEditorSession({
  activeSceneId,
  originalLiveState,
  mode = 'library',
  sourceSurfaceId = null,
  sourceSurfaceName = null,
  hasLocalEdits = false,
  draftState = null,
}) {
  return {
    activeSceneId,
    originalLiveState,
    mode,
    sourceSurfaceId,
    sourceSurfaceName,
    hasLocalEdits,
    draftState,
  }
}

function clearSceneEditorSession() {
  return { ...DEFAULTS.sceneEditor }
}

export function getActiveSceneEditorSession(state) {
  return state?.sceneEditor || { ...DEFAULTS.sceneEditor }
}

export function getActiveAuthoredSceneId(state) {
  return getActiveSceneEditorSession(state).activeSceneId
}

export function getActiveAuthoredSceneDraftState(state) {
  return getActiveSceneEditorSession(state).draftState || null
}

export function getActiveSceneEditorOriginalLiveState(state) {
  return getActiveSceneEditorSession(state).originalLiveState || null
}

export function getActiveSceneEditorMode(state) {
  return getActiveSceneEditorSession(state).mode || null
}

export function getActiveSceneEditorSourceSurfaceName(state) {
  return getActiveSceneEditorSession(state).sourceSurfaceName || null
}

export function getActiveSceneEditorHasLocalEdits(state) {
  return Boolean(getActiveSceneEditorSession(state).hasLocalEdits)
}

export function getEffectiveAuthoredSceneState(state) {
  const draftState = getActiveAuthoredSceneDraftState(state)
  if (draftState) return draftState

  return {
    transforms: state.transforms,
    symmetry: state.symmetry,
    warp: state.warp,
    displacement: state.displacement,
    tiling: state.tiling,
    color: state.color,
    effects: state.effects,
    generator: state.generator,
    media: state.media,
    activeMediaId: state.activeMediaId,
  }
}

export function getEffectiveRenderState(state) {
  const effectiveSceneState = getEffectiveAuthoredSceneState(state)
  return {
    ...state,
    transforms: effectiveSceneState.transforms,
    symmetry: effectiveSceneState.symmetry,
    warp: effectiveSceneState.warp,
    displacement: effectiveSceneState.displacement,
    tiling: effectiveSceneState.tiling,
    color: effectiveSceneState.color,
    effects: effectiveSceneState.effects,
    generator: effectiveSceneState.generator,
    media: effectiveSceneState.media,
    activeMediaId: effectiveSceneState.activeMediaId,
  }
}

function getEffectiveSceneSection(state, key) {
  return getEffectiveAuthoredSceneState(state)?.[key] ?? state[key]
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
    mode: null,
    sourceSurfaceId: null,
    sourceSurfaceName: null,
    hasLocalEdits: false,
    draftState: null,
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
      setMedia: (media) => set((state) => withActiveSceneSnapshot(state, {
        media,
        activeMediaId: media?.id ?? (media ? getEffectiveAuthoredSceneState(state).activeMediaId : null),
        image: null,
      })),
      addMediaAsset: (asset, options = {}) => set((state) => {
        const activate = options.activate !== false
        const nextLibrary = [
          ...(state.mediaLibrary || []).filter((entry) => entry.id !== asset.id),
          asset,
        ]

        return withActiveSceneSnapshot(state, {
          mediaLibrary: nextLibrary,
          activeMediaId: activate ? asset.id : getEffectiveAuthoredSceneState(state).activeMediaId,
          media: activate ? asset : getEffectiveAuthoredSceneState(state).media,
          image: activate ? null : state.image,
        })
      }),
      setActiveMediaAsset: (id) => set((state) => {
        const asset = (state.mediaLibrary || []).find((entry) => String(entry.id) === String(id))
        if (!asset) return {}

        return withActiveSceneSnapshot(state, {
          activeMediaId: asset.id,
          media: asset,
          image: null,
        })
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
          if (SCENE_STATE_SECTION_KEYS.has(section)) {
            return withActiveSceneSnapshot(state, {
              [section]: {
                ...getEffectiveSceneSection(state, section),
                [param]: val,
              },
            })
          }

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
        ...withActiveSceneSnapshot(state, {
          generator: { ...getEffectiveSceneSection(state, 'generator'), isAnimated: false },
        }),
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
          const effectiveSceneState = getEffectiveAuthoredSceneState(state)
          const rng = (min, max) => Math.random() * (max - min) + min
          const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

          const symmetrySlices = pick([4, 6, 8, 12, 16])
          const tilingType = Math.random() > 0.3 ? pick(['p1', 'p2', 'p4m']) : 'none'
          const warpType = Math.random() > 0.4 ? pick(['polar', 'log-polar']) : 'none'

          return withActiveSceneSnapshot(state, {
            transforms: {
              x: rng(-100, 100),
              y: rng(-100, 100),
              scale: rng(0.5, 1.5),
              rotation: rng(0, Math.PI * 2),
            },
            symmetry: {
              enabled: Math.random() > 0.3,
              type: effectiveSceneState.symmetry.type,
              slices: symmetrySlices,
              offset: effectiveSceneState.symmetry.offset
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
              ...effectiveSceneState.color,
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
              ...effectiveSceneState.generator,
              param1: rng(10, 90),
              param2: rng(10, 90),
            },
          })
        })
      },

      addSnapshot: () => set((state) => {
        const snap = {
          ...cloneProjectData(getEffectiveAuthoredSceneState(state)),
          id: Date.now()
        }
        return { snapshots: [...state.snapshots, snap] }
      }),

      deleteSnapshot: (index) => set((state) => ({
        snapshots: state.snapshots.filter((_, i) => i !== index)
      })),

      loadSnapshot: (snap) => set((state) => withActiveSceneSnapshot(state, applySceneStateSnapshot(state, snap))),

      saveUserPreset: (name) => set((state) => {
        const newPreset = {
          name,
          id: Date.now(),
          state: cloneProjectData(getEffectiveAuthoredSceneState(state)),
        }
        return { userPresets: [...(state.userPresets || []), newPreset] }
      }),

      exportProjectData: () => createProjectDocument(get()),

      importProjectData: (doc) => set((state) => {
        const project = getProjectPayload(doc)
        if (!project) return {}

        const liveState = project.liveState || {}
        const layoutSource = project.layout || project
        const sourcesSource = project.sources || project
        const lookPresetsSource = project.lookPresets || project
        const nextProjection = {
          ...DEFAULTS.projection,
          ...createProjectProjectionState(layoutSource.projection || project.projection),
          calibrating: false,
          editingSurfaces: false,
          surfaceEditMode: DEFAULTS.projection.surfaceEditMode,
          selectedCorner: 0,
          selectedMaskPoint: 0,
          outputWindowOpen: false,
        }

        const importedState = normalizeProjectionSourcesInState({
          ...state,
          schemaVersion: SCHEMA_VERSION,
          image: null,
          media: liveState.media ? cloneProjectData(liveState.media) : null,
          mediaLibrary: cloneProjectData(sourcesSource.mediaLibrary) || [],
          activeMediaId: liveState.activeMediaId ?? liveState.media?.id ?? null,
          transforms: { ...DEFAULTS.transforms, ...(liveState.transforms || {}) },
          symmetry: { ...DEFAULTS.symmetry, ...(liveState.symmetry || {}) },
          warp: { ...DEFAULTS.warp, ...(liveState.warp || {}) },
          displacement: { ...DEFAULTS.displacement, ...(liveState.displacement || {}) },
          tiling: { ...DEFAULTS.tiling, ...(liveState.tiling || {}) },
          generator: { ...DEFAULTS.generator, ...(liveState.generator || {}) },
          color: { ...DEFAULTS.color, ...(liveState.color || {}) },
          effects: { ...DEFAULTS.effects, ...(liveState.effects || {}) },
          canvas: { ...DEFAULTS.canvas, ...(layoutSource.canvas || {}) },
          projection: nextProjection,
          snapshots: cloneProjectData(lookPresetsSource.snapshots) || [],
          scenes: cloneProjectData(sourcesSource.scenes) || [],
          sceneEditor: clearSceneEditorSession(),
          userPresets: cloneProjectData(lookPresetsSource.userPresets) || [],
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
        })

        return {
          ...importedState,
          schemaVersion: SCHEMA_VERSION,
        }
      }),

      saveScene: (name, options = {}) => set((state) => {
        const sceneId = `scene-${Date.now()}-${Math.round(Math.random() * 1000)}`
        const selectedSurfaceId = state.projection.selectedSurfaceId
        const selectedSurface = (state.projection.surfaces || []).find((surface) => surface.id === selectedSurfaceId) || null
        const newScene = {
          id: sceneId,
          name,
          state: cloneProjectData(getEffectiveAuthoredSceneState(state)),
          origin: createSceneOrigin('live', 'live', {
            label: 'LIVE OUTPUT',
            detail: 'Captured from the live controls.',
            capturedFromSurfaceId: selectedSurface?.id || null,
            capturedFromSurfaceName: selectedSurface?.name || null,
          }),
        }
        const assignSelectedSurface = options.assignSelectedSurface !== false

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
        const targetSurface = (state.projection.surfaces || []).find((surface) => surface.id === targetSurfaceId) || null
        const sceneRecord = createProjectionSurfaceSceneRecord(state, targetSurfaceId, name)
        if (!sceneRecord) return {}

        const originalLiveState = state.sceneEditor?.originalLiveState || createSceneStateSnapshot(state)

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
          sceneEditor: createSceneEditorSession({
            activeSceneId: sceneRecord.sceneId,
            originalLiveState,
            mode: 'surface',
            sourceSurfaceId: targetSurfaceId,
            sourceSurfaceName: targetSurface?.name || null,
            draftState: cloneProjectData(sceneRecord.nextScene.state),
          }),
        }
      }),

      authorProjectionSurfaceScene: (surfaceId = null, options = {}) => set((state) => {
        const targetSurfaceId = surfaceId || state.projection.selectedSurfaceId
        const targetSurface = (state.projection.surfaces || []).find((surface) => surface.id === targetSurfaceId)
        if (!targetSurface) return {}

        const originalLiveState = state.sceneEditor?.originalLiveState || createSceneStateSnapshot(state)

        if (targetSurface.sourceMode === 'scene' && targetSurface.sourceId) {
          const sourceScene = (state.scenes || []).find((scene) => String(scene.id) === String(targetSurface.sourceId))
          if (!sourceScene?.state) return {}

          const usageCount = countSceneSurfaceUsage(state.projection.surfaces || [], sourceScene.id)
          if (usageCount <= 1 && options.forkShared !== true) {
            return {
              sceneEditor: createSceneEditorSession({
                activeSceneId: sourceScene.id,
                originalLiveState,
                mode: 'surface',
                sourceSurfaceId: targetSurfaceId,
                sourceSurfaceName: targetSurface?.name || null,
                draftState: cloneProjectData(sourceScene.state),
              }),
            }
          }

          const nextSceneId = `scene-${Date.now()}-${Math.round(Math.random() * 1000)}`
          const nextScene = {
            ...cloneProjectData(sourceScene),
            id: nextSceneId,
            name: options.name || `${sourceScene.name} ${targetSurface.name}`,
            origin: createSceneOrigin('scene', sourceScene.id, {
              label: `SCENE · ${sourceScene.name}`,
              detail: 'Forked for surface-specific authoring.',
              sourceSceneName: sourceScene.name,
              forkedForSurfaceId: targetSurface.id,
              forkedForSurfaceName: targetSurface.name,
            }),
          }

          return {
            scenes: [...(state.scenes || []), nextScene],
            projection: {
              ...state.projection,
              selectedSurfaceId: targetSurfaceId,
              surfaces: (state.projection.surfaces || []).map((surface) => (
                surface.id === targetSurfaceId
                  ? { ...surface, sourceMode: 'scene', sourceId: nextSceneId }
                  : surface
              )),
            },
            sceneEditor: createSceneEditorSession({
              activeSceneId: nextSceneId,
              originalLiveState,
              mode: 'surface',
              sourceSurfaceId: targetSurfaceId,
              sourceSurfaceName: targetSurface?.name || null,
              draftState: cloneProjectData(nextScene.state),
            }),
          }
        }

        const sceneRecord = createProjectionSurfaceSceneRecord(state, targetSurfaceId, options.name || null)
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
          sceneEditor: createSceneEditorSession({
            activeSceneId: sceneRecord.sceneId,
            originalLiveState,
            mode: 'surface',
            sourceSurfaceId: targetSurfaceId,
            sourceSurfaceName: targetSurface?.name || null,
            draftState: cloneProjectData(sceneRecord.nextScene.state),
          }),
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
          origin: createSceneOrigin('scene', sourceScene.id, {
            label: `SCENE · ${sourceScene.name}`,
            detail: 'Forked from another reusable scene.',
            sourceSceneName: sourceScene.name,
          }),
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
            ? { ...scene, state: cloneProjectData(getEffectiveAuthoredSceneState(state)) }
            : scene
        )),
        sceneEditor: getActiveAuthoredSceneId(state) && String(getActiveAuthoredSceneId(state)) === String(id)
          ? {
            ...state.sceneEditor,
            hasLocalEdits: false,
            draftState: cloneProjectData(getEffectiveAuthoredSceneState(state)),
          }
          : state.sceneEditor,
      })),

      loadSceneToLive: (id) => set((state) => {
        const scene = (state.scenes || []).find((entry) => String(entry.id) === String(id))
        const sceneState = getDraftAwareSceneState(scene, {
          activeSceneId: getActiveAuthoredSceneId(state),
          activeSceneDraftState: getActiveAuthoredSceneDraftState(state),
        })
        if (!sceneState) return {}

        return applySceneStateSnapshot(state, sceneState)
      }),

      startSceneEdit: (id) => set((state) => {
        const scene = (state.scenes || []).find((entry) => String(entry.id) === String(id))
        const sceneState = getDraftAwareSceneState(scene, {
          activeSceneId: getActiveAuthoredSceneId(state),
          activeSceneDraftState: getActiveAuthoredSceneDraftState(state),
        })
        if (!sceneState) return {}

        const originalLiveState = getActiveSceneEditorOriginalLiveState(state) || createSceneStateSnapshot(state)

        return {
          sceneEditor: createSceneEditorSession({
            activeSceneId: scene.id,
            originalLiveState,
            mode: 'library',
            draftState: cloneProjectData(sceneState),
          }),
        }
      }),

      stopSceneEdit: (options = {}) => set((state) => {
        const activeSceneId = getActiveAuthoredSceneId(state)
        if (!activeSceneId) return {}

        const restoreLive = options.restoreLive !== false
        const originalLiveState = getActiveSceneEditorOriginalLiveState(state)
        const draftState = getEffectiveAuthoredSceneState(state)
        const nextState = restoreLive && originalLiveState
          ? applySceneStateSnapshot(state, originalLiveState)
          : applySceneStateSnapshot(state, draftState)

        return {
          ...nextState,
          sceneEditor: clearSceneEditorSession(),
        }
      }),

      deleteScene: (id) => set((state) => ({
        scenes: (state.scenes || []).filter((scene) => String(scene.id) !== String(id)),
        sceneEditor: getActiveAuthoredSceneId(state) && String(getActiveAuthoredSceneId(state)) === String(id)
          ? clearSceneEditorSession()
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

      assignProjectionSurfaceSource: (surfaceId, sourceMode, sourceId, options = {}) => set((state) => {
        const targetSurfaceId = surfaceId || state.projection.selectedSurfaceId
        if (!targetSurfaceId) return {}

        if (sourceMode === 'live' || !sourceMode) {
          return {
            projection: {
              ...state.projection,
              selectedSurfaceId: targetSurfaceId,
              surfaces: (state.projection.surfaces || []).map((surface) => (
                surface.id === targetSurfaceId
                  ? { ...surface, sourceMode: 'live', sourceId: 'live' }
                  : surface
              )),
            },
          }
        }

        if (sourceMode === 'scene') {
          const targetScene = (state.scenes || []).find((scene) => String(scene.id) === String(sourceId))
          if (!targetScene) return {}

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
        }

        if (['media', 'builtin', 'user'].includes(sourceMode)) {
          const sceneRecord = createProjectionSceneRecordFromSource(
            state,
            sourceMode,
            sourceId,
            options.sceneName || null
          )

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
        }

        return {
          projection: {
            ...state.projection,
            selectedSurfaceId: targetSurfaceId,
            surfaces: (state.projection.surfaces || []).map((surface) => (
              surface.id === targetSurfaceId
                ? { ...surface, sourceMode, sourceId }
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

      setTransform: (key, value) => set((state) => withActiveSceneSnapshot(state, {
        transforms: { ...getEffectiveSceneSection(state, 'transforms'), [key]: value }
      })),

      setSymmetry: (key, value) => set((state) => withActiveSceneSnapshot(state, {
        symmetry: { ...getEffectiveSceneSection(state, 'symmetry'), [key]: value }
      })),

      setWarp: (key, value) => set((state) => withActiveSceneSnapshot(state, {
        warp: { ...getEffectiveSceneSection(state, 'warp'), [key]: value }
      })),

      setDisplacement: (key, value) => set((state) => withActiveSceneSnapshot(state, {
        displacement: { ...getEffectiveSceneSection(state, 'displacement'), [key]: value }
      })),

      setRecording: (key, value) => set((state) => ({
        recording: { ...state.recording, [key]: value }
      })),

      setTiling: (key, value) => set((state) => withActiveSceneSnapshot(state, {
        tiling: { ...getEffectiveSceneSection(state, 'tiling'), [key]: value }
      })),

      setColor: (key, value) => {
        set((state) => withActiveSceneSnapshot(state, {
          color: { ...getEffectiveSceneSection(state, 'color'), [key]: value }
        }))
      },

      setEffect: (key, value) => set((state) => withActiveSceneSnapshot(state, {
        effects: { ...getEffectiveSceneSection(state, 'effects'), [key]: value }
      })),

      setGenerator: (key, value) => {
        set((state) => withActiveSceneSnapshot(state, {
          generator: { ...getEffectiveSceneSection(state, 'generator'), [key]: value }
        }))
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

        const mergedState = {
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

        return normalizeProjectionSourcesInState(mergedState)
      },
    }
  )
)
