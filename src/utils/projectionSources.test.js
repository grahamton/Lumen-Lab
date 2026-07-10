import { describe, expect, it } from 'vitest'
import {
  collectProjectionSourceDefinitions,
  getProjectionSourceKey,
  getRenderableProjectionSurfaces,
  getProjectionSurfaceSceneState,
  getProjectionSurfaceSourceDefinition,
  getProjectionSurfaceSourceMeta,
  getVisibleProjectionSurfaces,
  hasRenderableProjectionSurface,
  hasRenderableLiveProjectionSurface,
  hasValidProjectionSurfaceSource,
} from './projectionSources'

describe('projectionSources', () => {
  it('treats live surfaces as renderable output', () => {
    expect(hasRenderableProjectionSurface({
      enabled: true,
      surfaces: [{ id: 'surface-1', visible: true, sourceMode: 'live', sourceId: 'live' }],
    })).toBe(true)
  })

  it('requires referenced media, built-ins, and user presets to exist', () => {
    expect(hasValidProjectionSurfaceSource(
      { visible: true, sourceMode: 'media', sourceId: 'asset-1' },
      { mediaLibrary: [{ id: 'asset-1' }] }
    )).toBe(true)

    expect(hasValidProjectionSurfaceSource(
      { visible: true, sourceMode: 'builtin', sourceId: '1' },
      { builtinPresetCount: 3 }
    )).toBe(true)

    expect(hasValidProjectionSurfaceSource(
      { visible: true, sourceMode: 'user', sourceId: 'preset-1' },
      { userPresets: [{ id: 'preset-1' }] }
    )).toBe(true)

    expect(hasValidProjectionSurfaceSource(
      { visible: true, sourceMode: 'media', sourceId: 'missing' },
      { mediaLibrary: [] }
    )).toBe(false)

    expect(hasValidProjectionSurfaceSource(
      { visible: true, sourceMode: 'scene', sourceId: 'scene-1' },
      { scenes: [{ id: 'scene-1' }] }
    )).toBe(true)
  })

  it('returns readable source metadata for live and missing sources', () => {
    expect(getProjectionSurfaceSourceMeta(
      { visible: true, sourceMode: 'live', sourceId: 'live' }
    )).toMatchObject({
      isLive: true,
      isValid: true,
      label: 'LIVE OUTPUT',
    })

    expect(getProjectionSurfaceSourceMeta(
      { visible: true, sourceMode: 'user', sourceId: 'missing' },
      { userPresets: [] }
    )).toMatchObject({
      isLive: false,
      isValid: false,
      label: 'USER · MISSING',
    })

    expect(getProjectionSurfaceSourceMeta(
      { visible: true, sourceMode: 'scene', sourceId: 'scene-1' },
      { scenes: [{ id: 'scene-1', name: 'Scene 1' }] }
    )).toMatchObject({
      isLive: false,
      isValid: true,
      label: 'SCENE · Scene 1',
    })
  })

  it('builds consistent keys and source definitions for render consumers', () => {
    expect(getProjectionSourceKey({ sourceMode: 'live', sourceId: 'live' })).toBe('live')
    expect(getProjectionSourceKey({ sourceMode: 'media', sourceId: 'asset-1' })).toBe('media:asset-1')

    expect(getProjectionSurfaceSourceDefinition(
      { visible: true, sourceMode: 'media', sourceId: 'asset-1' },
      { mediaLibrary: [{ id: 'asset-1', name: 'Alpha', src: 'file:///alpha.png', type: 'image' }] }
    )).toMatchObject({
      key: 'media:asset-1',
      meta: { isValid: true, isLive: false },
      mediaDescriptor: { id: 'asset-1', name: 'Alpha' },
      stateOverride: {
        media: { id: 'asset-1', name: 'Alpha', src: 'file:///alpha.png', type: 'image' },
        activeMediaId: 'asset-1',
      },
    })
  })

  it('deduplicates non-live source definitions across surfaces', () => {
    const definitions = collectProjectionSourceDefinitions([
      { id: 'surface-1', visible: true, sourceMode: 'media', sourceId: 'asset-1' },
      { id: 'surface-2', visible: true, sourceMode: 'media', sourceId: 'asset-1' },
      { id: 'surface-3', visible: true, sourceMode: 'live', sourceId: 'live' },
    ], {
      mediaLibrary: [{ id: 'asset-1', name: 'Alpha', src: 'file:///alpha.png', type: 'image' }],
    })

    expect(definitions).toHaveLength(1)
    expect(definitions[0].key).toBe('media:asset-1')
  })

  it('skips hidden surfaces when collecting non-live source definitions', () => {
    const definitions = collectProjectionSourceDefinitions([
      { id: 'surface-1', visible: false, sourceMode: 'media', sourceId: 'asset-1' },
      { id: 'surface-2', visible: true, sourceMode: 'media', sourceId: 'asset-2' },
    ], {
      mediaLibrary: [
        { id: 'asset-1', name: 'Hidden', src: 'file:///hidden.png', type: 'image' },
        { id: 'asset-2', name: 'Visible', src: 'file:///visible.png', type: 'image' },
      ],
    })

    expect(definitions).toHaveLength(1)
    expect(definitions[0].key).toBe('media:asset-2')
  })

  it('creates render definitions for scene-based surfaces', () => {
    const definition = getProjectionSurfaceSourceDefinition(
      { visible: true, sourceMode: 'scene', sourceId: 'scene-1' },
      {
        scenes: [{
          id: 'scene-1',
          name: 'Scene 1',
          state: {
            generator: { type: 'plasma', param1: 20, param2: 80, param3: 50 },
            media: null,
            activeMediaId: null,
          },
        }],
      }
    )

    expect(definition).toMatchObject({
      key: 'scene:scene-1',
      meta: { isValid: true, isLive: false, label: 'SCENE · Scene 1' },
      stateOverride: {
        generator: { type: 'plasma', param1: 20, param2: 80, param3: 50 },
      },
    })
  })

  it('prefers active draft state for the scene being authored', () => {
    const definition = getProjectionSurfaceSourceDefinition(
      { visible: true, sourceMode: 'scene', sourceId: 'scene-1' },
      {
        scenes: [{
          id: 'scene-1',
          name: 'Scene 1',
          state: {
            generator: { type: 'plasma', param1: 20, param2: 80, param3: 50 },
            media: null,
            activeMediaId: null,
          },
        }],
        activeSceneId: 'scene-1',
        activeSceneDraftState: {
          generator: { type: 'voronoi', param1: 10, param2: 20, param3: 30 },
          media: null,
          activeMediaId: null,
        },
      }
    )

    expect(definition.stateOverride).toMatchObject({
      generator: { type: 'voronoi', param1: 10, param2: 20, param3: 30 },
    })
  })

  it('resolves surface sources into scene-ready state snapshots', () => {
    expect(getProjectionSurfaceSceneState(
      { visible: true, sourceMode: 'live', sourceId: 'live' },
      {
        liveState: {
          generator: { type: 'plasma', param1: 20, param2: 80, param3: 50 },
          media: null,
          activeMediaId: null,
        },
      }
    )).toMatchObject({
      generator: { type: 'plasma', param1: 20, param2: 80, param3: 50 },
    })

    expect(getProjectionSurfaceSceneState(
      { visible: true, sourceMode: 'media', sourceId: 'asset-1' },
      {
        liveState: {
          generator: { type: 'voronoi', param1: 10, param2: 20, param3: 30 },
          color: { hue: 0.25 },
          media: null,
          activeMediaId: null,
        },
        mediaLibrary: [{ id: 'asset-1', name: 'Alpha', src: 'file:///alpha.png', type: 'image' }],
      }
    )).toMatchObject({
      generator: { type: 'none', param1: 10, param2: 20, param3: 30 },
      color: { hue: 0.25 },
      media: { id: 'asset-1', name: 'Alpha' },
      activeMediaId: 'asset-1',
    })
  })

  it('ignores hidden or disabled surfaces for blank-state decisions', () => {
    expect(hasRenderableProjectionSurface({
      enabled: false,
      surfaces: [{ id: 'surface-1', visible: true, sourceMode: 'live', sourceId: 'live' }],
    })).toBe(false)

    expect(hasRenderableProjectionSurface({
      enabled: true,
      surfaces: [{ id: 'surface-1', visible: false, sourceMode: 'live', sourceId: 'live' }],
    })).toBe(false)
  })

  it('distinguishes visible surfaces from renderable/live-renderable surfaces', () => {
    const projection = {
      enabled: true,
      surfaces: [
        { id: 'surface-1', visible: true, sourceMode: 'media', sourceId: 'missing' },
        { id: 'surface-2', visible: true, sourceMode: 'live', sourceId: 'live' },
        { id: 'surface-3', visible: false, sourceMode: 'builtin', sourceId: '0' },
      ],
    }

    expect(getVisibleProjectionSurfaces(projection)).toHaveLength(2)
    expect(getRenderableProjectionSurfaces(projection, {
      builtinPresetCount: 1,
      mediaLibrary: [],
    })).toHaveLength(1)
    expect(hasRenderableLiveProjectionSurface(projection, {
      builtinPresetCount: 1,
      mediaLibrary: [],
    })).toBe(true)
  })
})
