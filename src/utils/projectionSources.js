function getSurfaceSourceMode(surface) {
  return surface?.sourceMode || 'live'
}

function mergeProjectionSceneState(baseState = {}, overrideState = {}) {
  return {
    ...baseState,
    media: overrideState.media === undefined ? (baseState.media ?? null) : overrideState.media,
    activeMediaId: overrideState.activeMediaId ?? baseState.activeMediaId ?? overrideState.media?.id ?? null,
    transforms: { ...(baseState.transforms || {}), ...(overrideState.transforms || {}) },
    symmetry: { ...(baseState.symmetry || {}), ...(overrideState.symmetry || {}) },
    warp: { ...(baseState.warp || {}), ...(overrideState.warp || {}) },
    displacement: { ...(baseState.displacement || {}), ...(overrideState.displacement || {}) },
    tiling: { ...(baseState.tiling || {}), ...(overrideState.tiling || {}) },
    color: { ...(baseState.color || {}), ...(overrideState.color || {}) },
    effects: { ...(baseState.effects || {}), ...(overrideState.effects || {}) },
    generator: { ...(baseState.generator || {}), ...(overrideState.generator || {}) },
  }
}

function resolveSceneState(scene, activeSceneId = null, activeSceneDraftState = null) {
  if (!scene) return null
  if (activeSceneDraftState && activeSceneId != null && String(scene.id) === String(activeSceneId)) {
    return activeSceneDraftState
  }
  return scene.state || null
}

export function getDraftAwareSceneState(scene, {
  activeSceneId = null,
  activeSceneDraftState = null,
} = {}) {
  return resolveSceneState(scene, activeSceneId, activeSceneDraftState)
}

export function getProjectionSourceKey(surface) {
  const sourceMode = getSurfaceSourceMode(surface)
  const sourceId = surface?.sourceId ?? 'live'

  if (sourceMode === 'live' || !sourceId) {
    return 'live'
  }

  return `${sourceMode}:${sourceId}`
}

export function getProjectionSurfaceSourceMeta(surface, {
  mediaLibrary = [],
  scenes = [],
  userPresets = [],
  builtinPresets = [],
  builtinPresetCount = builtinPresets.length,
} = {}) {
  const sourceMode = getSurfaceSourceMode(surface)
  const sourceId = surface?.sourceId ?? 'live'

  if (sourceMode === 'live') {
    return {
      sourceMode,
      sourceId: 'live',
      isLive: true,
      isValid: true,
      label: 'LIVE OUTPUT',
      detail: 'Follows the main generator, geometry, color, and effect controls.',
    }
  }

  if (sourceMode === 'media') {
    const asset = mediaLibrary.find((entry) => String(entry.id) === String(sourceId)) || null
    return {
      sourceMode,
      sourceId,
      isLive: false,
      isValid: Boolean(asset),
      label: asset ? `MEDIA · ${asset.name}` : 'MEDIA · MISSING',
      detail: asset ? 'Independent from live controls' : 'Assigned source is missing',
    }
  }

  if (sourceMode === 'scene') {
    const scene = scenes.find((entry) => String(entry.id) === String(sourceId)) || null
    return {
      sourceMode,
      sourceId,
      isLive: false,
      isValid: Boolean(scene),
      label: scene ? `SCENE · ${scene.name}` : 'SCENE · MISSING',
      detail: scene ? 'Independent from live controls' : 'Assigned source is missing',
    }
  }

  if (sourceMode === 'builtin') {
    const presetIndex = Number(sourceId)
    const preset = Number.isInteger(presetIndex) ? builtinPresets[presetIndex] : null
    const isValid = Number.isInteger(presetIndex) && presetIndex >= 0 && presetIndex < builtinPresetCount
    return {
      sourceMode,
      sourceId,
      isLive: false,
      isValid,
      label: preset ? `BUILT-IN · ${preset.name}` : 'BUILT-IN · MISSING',
      detail: preset ? 'Independent from live controls' : 'Assigned source is missing',
    }
  }

  if (sourceMode === 'user') {
    const preset = userPresets.find((entry) => String(entry.id) === String(sourceId)) || null
    return {
      sourceMode,
      sourceId,
      isLive: false,
      isValid: Boolean(preset),
      label: preset ? `USER · ${preset.name}` : 'USER · MISSING',
      detail: preset ? 'Independent from live controls' : 'Assigned source is missing',
    }
  }

  return {
    sourceMode,
    sourceId,
    isLive: false,
    isValid: false,
    label: `${String(sourceMode).toUpperCase()} · UNKNOWN`,
    detail: 'Assigned source is missing',
  }
}

export function getProjectionSurfaceSourceDefinition(surface, {
  mediaLibrary = [],
  scenes = [],
  userPresets = [],
  builtinPresets = [],
  activeSceneId = null,
  activeSceneDraftState = null,
} = {}) {
  const meta = getProjectionSurfaceSourceMeta(surface, {
    mediaLibrary,
    scenes,
    userPresets,
    builtinPresets,
  })

  if (meta.isLive || !meta.isValid) {
    return {
      key: getProjectionSourceKey(surface),
      meta,
      mediaDescriptor: null,
      stateOverride: null,
    }
  }

  if (meta.sourceMode === 'media') {
    const asset = mediaLibrary.find((entry) => String(entry.id) === String(meta.sourceId)) || null
    return {
      key: getProjectionSourceKey(surface),
      meta,
      mediaDescriptor: asset,
      stateOverride: asset ? {
        media: asset,
        activeMediaId: asset.id,
        generator: { type: 'none' },
      } : null,
    }
  }

  if (meta.sourceMode === 'scene') {
    const scene = scenes.find((entry) => String(entry.id) === String(meta.sourceId)) || null
    const sceneState = resolveSceneState(scene, activeSceneId, activeSceneDraftState)
    return {
      key: getProjectionSourceKey(surface),
      meta,
      mediaDescriptor: sceneState?.media || null,
      stateOverride: sceneState,
    }
  }

  if (meta.sourceMode === 'builtin') {
    const preset = builtinPresets[Number(meta.sourceId)] || null
    return {
      key: getProjectionSourceKey(surface),
      meta,
      mediaDescriptor: preset?.state?.media || null,
      stateOverride: preset?.state || null,
    }
  }

  if (meta.sourceMode === 'user') {
    const preset = userPresets.find((entry) => String(entry.id) === String(meta.sourceId)) || null
    const presetMedia = preset?.state?.media
      || mediaLibrary.find((asset) => String(asset.id) === String(preset?.state?.activeMediaId))
      || null

    return {
      key: getProjectionSourceKey(surface),
      meta,
      mediaDescriptor: presetMedia,
      stateOverride: preset?.state || null,
    }
  }

  return {
    key: getProjectionSourceKey(surface),
    meta,
    mediaDescriptor: null,
    stateOverride: null,
  }
}

export function collectProjectionSourceDefinitions(surfaces = [], options = {}) {
  const definitions = new Map()

  for (const surface of surfaces) {
    if (!surface || surface.visible === false) continue
    const definition = getProjectionSurfaceSourceDefinition(surface, options)
    if (definition.key === 'live' || !definition.meta.isValid || definitions.has(definition.key)) continue
    definitions.set(definition.key, definition)
  }

  return Array.from(definitions.values())
}

export function getVisibleProjectionSurfaces(projection) {
  return (projection?.surfaces || []).filter((surface) => surface?.visible !== false)
}

export function getRenderableProjectionSurfaces(projection, options = {}) {
  return getVisibleProjectionSurfaces(projection).filter((surface) => (
    hasValidProjectionSurfaceSource(surface, options)
  ))
}

export function hasRenderableLiveProjectionSurface(projection, options = {}) {
  return getRenderableProjectionSurfaces(projection, options).some((surface) => (
    getProjectionSourceKey(surface) === 'live'
  ))
}

export function getProjectionSurfaceSceneState(surface, {
  liveState = null,
  mediaLibrary = [],
  scenes = [],
  userPresets = [],
  builtinPresets = [],
  activeSceneId = null,
  activeSceneDraftState = null,
} = {}) {
  const definition = getProjectionSurfaceSourceDefinition(surface, {
    mediaLibrary,
    scenes,
    userPresets,
    builtinPresets,
    activeSceneId,
    activeSceneDraftState,
  })

  if (!definition.meta.isValid) return null
  if (definition.meta.isLive) return liveState ? mergeProjectionSceneState(liveState) : null

  return mergeProjectionSceneState(liveState || {}, definition.stateOverride || {})
}

export function hasValidProjectionSurfaceSource(surface, {
  mediaLibrary = [],
  scenes = [],
  userPresets = [],
  builtinPresetCount = 0,
} = {}) {
  if (!surface || surface.visible === false) return false

  return getProjectionSurfaceSourceMeta(surface, {
    mediaLibrary,
    scenes,
    userPresets,
    builtinPresetCount,
  }).isValid
}

export function hasRenderableProjectionSurface(projection, options = {}) {
  if (!projection?.enabled) return false

  return getRenderableProjectionSurfaces(projection, options).length > 0
}
