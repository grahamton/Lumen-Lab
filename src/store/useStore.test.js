import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useStore } from './useStore'

describe('Zustand Store', () => {
  // Reset store before each test to ensure isolation
  beforeEach(() => {
    act(() => {
      useStore.getState().resetAll()
      useStore.setState({
        // Minimal reset to defaults relevant for testing
        transforms: { x: 0, y: 0, scale: 1, rotation: 0 },
        audio: { enabled: false, source: 'mic', sensitivity: 1.0, reactivity: { bass: 1.0, mid: 1.0, high: 1.0 } },
        effects: { bloom: 0, chromaticAberration: 0, noise: 0, edgeDetect: 0, invert: 0, solarize: 0, shift: 0 }
      })
    })
  })

  it('should initialize with default values', () => {
    const state = useStore.getState()
    expect(state.transforms.scale).toBe(1)
    expect(state.audio.enabled).toBe(false)
    expect(state.media).toBeNull()
    expect(state.mediaLibrary).toEqual([])
    expect(state.activeMediaId).toBeNull()
  })

  it('should update transforms via setTransform', () => {
    const { setTransform } = useStore.getState()

    act(() => {
      setTransform('scale', 2.5)
      setTransform('rotation', 45)
    })

    const state = useStore.getState()
    expect(state.transforms.scale).toBe(2.5)
    expect(state.transforms.rotation).toBe(45)
  })

  it('should update audio settings via setAudio', () => {
    const { setAudio } = useStore.getState()

    act(() => {
      setAudio('enabled', true)
      setAudio('sensitivity', 1.5)
    })

    const state = useStore.getState()
    expect(state.audio.enabled).toBe(true)
    expect(state.audio.sensitivity).toBe(1.5)
  })

  it('should update nested reactivity settings correctly', () => {
    const { setAudio } = useStore.getState()

    act(() => {
      setAudio('reactivity', { bass: 2.0, mid: 0.5, high: 1.0 })
    })

    const state = useStore.getState()
    expect(state.audio.reactivity.bass).toBe(2.0)
    expect(state.audio.reactivity.mid).toBe(0.5)
  })

  it('should update post-processing effects', () => {
    const { setEffect } = useStore.getState()

    act(() => {
      setEffect('bloom', 0.8)
      setEffect('noise', 0.2)
    })

    const state = useStore.getState()
    expect(state.effects.bloom).toBe(0.8)
    expect(state.effects.noise).toBe(0.2)
  })

  // --- NEW TESTS ---

  it('should reset all state to defaults when resetAll is called', () => {
    const { setTransform, setAudio, resetAll } = useStore.getState()

    // Modifying state
    act(() => {
      setTransform('scale', 5.0)
      setAudio('enabled', true)
    })

    // Confirm change
    let state = useStore.getState()
    expect(state.transforms.scale).toBe(5.0)
    expect(state.audio.enabled).toBe(true)

    // Reset
    act(() => {
      resetAll()
    })

    // Verify Default State
    state = useStore.getState()
    expect(state.transforms.scale).toBe(1)
    expect(state.audio.enabled).toBe(false)
  })

  it('should soft reset params but keep audio/global settings when resetParams is called', () => {
    const { setTransform, setAudio, resetParams } = useStore.getState()

    // Modifying state
    act(() => {
      setTransform('scale', 5.0)
      setAudio('enabled', true)
    })

    // Soft Reset
    act(() => {
      resetParams()
    })

    // Verify State
    const state = useStore.getState()
    expect(state.transforms.scale).toBe(1) // Param should reset
    expect(state.audio.enabled).toBe(true) // Audio (Global) should PERSIST
  })

  it('should not have lfo or masking state', () => {
    const state = useStore.getState()
    expect(state.lfo).toBeUndefined()
    expect(state.masking).toBeUndefined()
  })

  it('should have lastActiveSection in ui', () => {
    expect(useStore.getState().ui.lastActiveSection).toBe('geometry')
  })

  it('should initialize projection calibration state', () => {
    const state = useStore.getState()
    expect(state.projection.enabled).toBe(false)
    expect(state.projection.calibrating).toBe(false)
    expect(state.projection.editingSurfaces).toBe(false)
    expect(state.projection.surfaceEditMode).toBe('warp')
    expect(state.projection.points).toBeNull()
    expect(state.projection.selectedCorner).toBe(0)
    expect(state.projection.selectedMaskPoint).toBe(0)
    expect(state.projection.showTestPattern).toBe(true)
    expect(state.projection.guideOpacity).toBe(0.85)
    expect(state.projection.nudgeStep).toBe(1)
    expect(state.projection.blackout).toBe(false)
    expect(state.projection.patternMode).toBe('off')
    expect(state.projection.patternType).toBe('grid')
    expect(state.projection.profiles).toEqual([])
    expect(state.projection.selectedSurfaceId).toBeNull()
    expect(state.projection.surfaces).toEqual([])
  })

  it('should keep projection enabled when calibration is started', () => {
    const { setProjection } = useStore.getState()

    act(() => {
      setProjection('calibrating', true)
    })

    const state = useStore.getState()
    expect(state.projection.enabled).toBe(true)
    expect(state.projection.calibrating).toBe(true)
  })

  it('should clear calibration mode when projection output is disabled', () => {
    const { setProjection } = useStore.getState()

    act(() => {
      setProjection('calibrating', true)
      setProjection('enabled', false)
    })

    const state = useStore.getState()
    expect(state.projection.enabled).toBe(false)
    expect(state.projection.calibrating).toBe(false)
  })

  it('should reset projection points and corner selection together', () => {
    const { setProjection, setProjectionPoints, resetProjection } = useStore.getState()

    act(() => {
      setProjectionPoints([
        { x: 0.1, y: 0.1 },
        { x: 0.9, y: 0.1 },
        { x: 0.9, y: 0.9 },
        { x: 0.1, y: 0.9 },
      ])
      setProjection('selectedCorner', 2)
    })

    act(() => {
      resetProjection()
    })

    const state = useStore.getState()
    expect(state.projection.points).toBeNull()
    expect(state.projection.selectedCorner).toBe(0)
  })

  it('should save and apply projection profiles', () => {
    const { setProjection, setProjectionPoints, saveProjectionProfile, applyProjectionProfile } = useStore.getState()

    act(() => {
      setProjectionPoints([
        { x: 0.12, y: 0.08 },
        { x: 0.88, y: 0.09 },
        { x: 0.9, y: 0.92 },
        { x: 0.1, y: 0.88 },
      ])
      setProjection('patternMode', 'replace')
      setProjection('patternType', 'crosshair')
      saveProjectionProfile('House Left')
    })

    let state = useStore.getState()
    expect(state.projection.profiles).toHaveLength(1)
    expect(state.projection.profiles[0].name).toBe('House Left')

    act(() => {
      setProjection('patternMode', 'off')
      setProjection('patternType', 'grid')
      applyProjectionProfile(state.projection.profiles[0].id)
    })

    state = useStore.getState()
    expect(state.projection.enabled).toBe(true)
    expect(state.projection.patternMode).toBe('replace')
    expect(state.projection.patternType).toBe('crosshair')
    expect(state.projection.points[0].x).toBeCloseTo(0.12)
  })

  it('should add and duplicate projection surfaces', () => {
    const { addProjectionSurface, duplicateProjectionSurface } = useStore.getState()

    act(() => {
      addProjectionSurface('Main Wall')
    })

    let state = useStore.getState()
    expect(state.projection.surfaces).toHaveLength(1)
    expect(state.projection.selectedSurfaceId).toBe(state.projection.surfaces[0].id)

    act(() => {
      duplicateProjectionSurface(state.projection.surfaces[0].id)
    })

    state = useStore.getState()
    expect(state.projection.surfaces).toHaveLength(2)
    expect(state.projection.selectedSurfaceId).toBe(state.projection.surfaces[1].id)
    expect(state.projection.surfaces[0].maskPoints).toHaveLength(4)
    expect(state.projection.surfaces[0].sourceMode).toBe('live')
  })

  it('should add, activate, rename, and remove media assets', () => {
    const {
      addMediaAsset,
      setActiveMediaAsset,
      renameMediaAsset,
      removeMediaAsset,
    } = useStore.getState()

    act(() => {
      addMediaAsset({ id: 'asset-a', type: 'image', src: 'file:///a.png', name: 'Alpha' })
      addMediaAsset({ id: 'asset-b', type: 'video', src: 'file:///b.mp4', name: 'Beta' }, { activate: false })
    })

    let state = useStore.getState()
    expect(state.mediaLibrary).toHaveLength(2)
    expect(state.activeMediaId).toBe('asset-a')
    expect(state.media.name).toBe('Alpha')

    act(() => {
      setActiveMediaAsset('asset-b')
    })

    state = useStore.getState()
    expect(state.activeMediaId).toBe('asset-b')
    expect(state.media.name).toBe('Beta')

    act(() => {
      renameMediaAsset('asset-b', 'Renamed Beta')
    })

    state = useStore.getState()
    expect(state.mediaLibrary[1].name).toBe('Renamed Beta')
    expect(state.media.name).toBe('Renamed Beta')

    act(() => {
      removeMediaAsset('asset-b')
    })

    state = useStore.getState()
    expect(state.mediaLibrary).toHaveLength(1)
    expect(state.activeMediaId).toBe('asset-a')
    expect(state.media.name).toBe('Alpha')
  })

  it('should clear hydrated image state whenever live media changes', () => {
    const {
      addMediaAsset,
      setActiveMediaAsset,
      setImage,
      setMedia,
    } = useStore.getState()

    act(() => {
      setImage({ src: 'stale' })
      addMediaAsset({ id: 'asset-a', type: 'image', src: 'file:///a.png', name: 'Alpha' })
    })

    let state = useStore.getState()
    expect(state.image).toBeNull()

    act(() => {
      setImage({ src: 'stale-again' })
      addMediaAsset({ id: 'asset-b', type: 'image', src: 'file:///b.png', name: 'Beta' }, { activate: false })
    })

    state = useStore.getState()
    expect(state.image.src).toBe('stale-again')

    act(() => {
      setActiveMediaAsset('asset-b')
    })

    state = useStore.getState()
    expect(state.activeMediaId).toBe('asset-b')
    expect(state.image).toBeNull()

    act(() => {
      setImage({ src: 'stale-third' })
      setMedia({ id: 'asset-c', type: 'image', src: 'file:///c.png', name: 'Gamma' })
    })

    state = useStore.getState()
    expect(state.media.name).toBe('Gamma')
    expect(state.image).toBeNull()
  })

  it('should reset media-bound surfaces to live when a media asset is removed', () => {
    const {
      addProjectionSurface,
      addMediaAsset,
      updateProjectionSurface,
      removeMediaAsset,
    } = useStore.getState()

    act(() => {
      addProjectionSurface('Media Surface')
      addMediaAsset({ id: 'asset-a', type: 'image', src: 'file:///a.png', name: 'Alpha' })
      updateProjectionSurface(useStore.getState().projection.selectedSurfaceId, { sourceMode: 'media', sourceId: 'asset-a' })
    })

    act(() => {
      removeMediaAsset('asset-a')
    })

    const state = useStore.getState()
    expect(state.projection.surfaces[0].sourceMode).toBe('live')
    expect(state.projection.surfaces[0].sourceId).toBe('live')
  })

  it('should save preset media context with user presets', () => {
    const { addMediaAsset, saveUserPreset } = useStore.getState()

    act(() => {
      addMediaAsset({ id: 'asset-a', type: 'image', src: 'file:///a.png', name: 'Alpha' })
      saveUserPreset('Media Preset')
    })

    const state = useStore.getState()
    expect(state.userPresets[0].state.media.name).toBe('Alpha')
    expect(state.userPresets[0].state.activeMediaId).toBe('asset-a')
  })

  it('should reset user-preset-bound surfaces to live when a user preset is removed', () => {
    const {
      addProjectionSurface,
      saveUserPreset,
      updateProjectionSurface,
      deleteUserPreset,
    } = useStore.getState()

    act(() => {
      addProjectionSurface('User Preset Surface')
      saveUserPreset('Scene A')
    })

    let state = useStore.getState()
    const presetId = state.userPresets[0].id

    act(() => {
      updateProjectionSurface(state.projection.selectedSurfaceId, { sourceMode: 'user', sourceId: presetId })
      deleteUserPreset(presetId)
    })

    state = useStore.getState()
    expect(state.userPresets).toHaveLength(0)
    expect(state.projection.surfaces[0].sourceMode).toBe('live')
    expect(state.projection.surfaces[0].sourceId).toBe('live')
  })

  it('should repair invalid sources or force selected projection surfaces back to live', () => {
    const {
      resetInvalidProjectionSurfaceSources,
      setProjectionSurfacesLive,
    } = useStore.getState()

    act(() => {
      useStore.setState({
        projection: {
          ...useStore.getState().projection,
          enabled: true,
          selectedSurfaceId: 'surface-1',
          surfaces: [
            {
              id: 'surface-1',
              name: 'Surface 1',
              visible: true,
              opacity: 1,
              blendMode: 'screen',
              sourceMode: 'media',
              sourceId: 'missing-asset',
              points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
              maskPoints: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
            },
            {
              id: 'surface-2',
              name: 'Surface 2',
              visible: true,
              opacity: 1,
              blendMode: 'screen',
              sourceMode: 'builtin',
              sourceId: '0',
              points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
              maskPoints: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
            },
          ],
        },
      })
    })

    act(() => {
      resetInvalidProjectionSurfaceSources()
    })

    let state = useStore.getState()
    expect(state.projection.surfaces[0].sourceMode).toBe('live')
    expect(state.projection.surfaces[0].sourceId).toBe('live')
    expect(state.projection.surfaces[1].sourceMode).toBe('builtin')
    expect(state.projection.surfaces[1].sourceId).toBe('0')

    act(() => {
      setProjectionSurfacesLive(['surface-2'])
    })

    state = useStore.getState()
    expect(state.projection.surfaces[0].sourceMode).toBe('live')
    expect(state.projection.surfaces[1].sourceMode).toBe('live')
    expect(state.projection.surfaces[1].sourceId).toBe('live')
  })

  it('should save scenes and assign them to selected surfaces', () => {
    const {
      addProjectionSurface,
      setGenerator,
      saveScene,
      duplicateScene,
      assignSceneToSurface,
      captureSceneState,
      loadSceneToLive,
      startSceneEdit,
      stopSceneEdit,
      deleteScene,
    } = useStore.getState()

    act(() => {
      addProjectionSurface('Scene Surface')
      setGenerator('type', 'plasma')
      saveScene('Scene A')
    })

    let state = useStore.getState()
    const sceneId = state.scenes[0].id

    expect(state.scenes).toHaveLength(1)
    expect(state.scenes[0].state.generator.type).toBe('plasma')
    expect(state.projection.surfaces[0].sourceMode).toBe('scene')
    expect(state.projection.surfaces[0].sourceId).toBe(sceneId)

    act(() => {
      setGenerator('type', 'grid')
      captureSceneState(sceneId)
    })

    state = useStore.getState()
    expect(state.scenes[0].state.generator.type).toBe('grid')

    act(() => {
      setGenerator('type', 'none')
      loadSceneToLive(sceneId)
    })

    state = useStore.getState()
    expect(state.generator.type).toBe('grid')

    act(() => {
      setGenerator('type', 'voronoi')
      startSceneEdit(sceneId)
    })

    state = useStore.getState()
    expect(state.sceneEditor.activeSceneId).toBe(sceneId)
    expect(state.generator.type).toBe('grid')

    act(() => {
      setGenerator('type', 'liquid')
      stopSceneEdit({ restoreLive: true })
    })

    state = useStore.getState()
    expect(state.sceneEditor.activeSceneId).toBeNull()
    expect(state.generator.type).toBe('voronoi')

    act(() => {
      startSceneEdit(sceneId)
      setGenerator('type', 'fibonacci')
      stopSceneEdit({ restoreLive: false })
    })

    state = useStore.getState()
    expect(state.sceneEditor.activeSceneId).toBeNull()
    expect(state.generator.type).toBe('fibonacci')

    act(() => {
      addProjectionSurface('Scene Surface 2')
    })

    state = useStore.getState()
    const secondSurfaceId = state.projection.surfaces[1].id

    act(() => {
      assignSceneToSurface(sceneId, secondSurfaceId)
    })

    act(() => {
      duplicateScene(sceneId, { surfaceId: secondSurfaceId, assignSurface: true })
    })

    state = useStore.getState()
    expect(state.scenes).toHaveLength(2)
    expect(state.projection.surfaces[0].sourceId).toBe(sceneId)
    expect(state.projection.surfaces[1].sourceId).not.toBe(sceneId)
    expect(state.projection.surfaces[1].sourceMode).toBe('scene')

    act(() => {
      assignSceneToSurface(sceneId, state.projection.surfaces[0].id)
      deleteScene(sceneId)
    })

    state = useStore.getState()
    expect(state.scenes).toHaveLength(1)
    expect(state.sceneEditor.activeSceneId).toBeNull()
    expect(state.projection.surfaces[0].sourceMode).toBe('live')
    expect(state.projection.surfaces[0].sourceId).toBe('live')
    expect(state.projection.surfaces[1].sourceMode).toBe('scene')
  })

  it('should export and import project documents with stable project state only', () => {
    const {
      addProjectionSurface,
      addMediaAsset,
      saveScene,
      saveUserPreset,
      setGenerator,
      setProjection,
      updateProjectionSurface,
      exportProjectData,
      importProjectData,
    } = useStore.getState()

    act(() => {
      addMediaAsset({ id: 'asset-a', type: 'image', src: 'file:///a.png', name: 'Alpha' })
      setGenerator('type', 'plasma')
      setProjection('enabled', true)
      addProjectionSurface('Project Surface')
      saveScene('Scene A')
      saveUserPreset('Preset A')
    })

    let state = useStore.getState()
    const sceneId = state.scenes[0].id

    act(() => {
      updateProjectionSurface(state.projection.selectedSurfaceId, { sourceMode: 'scene', sourceId: sceneId })
      state = useStore.getState()
      state.startSceneEdit(sceneId)
      setGenerator('type', 'grid')
    })

    const exported = exportProjectData()
    expect(exported.type).toBe('lumenlab-project')
    expect(exported.project.liveState.generator.type).toBe('grid')
    expect(exported.project.scenes).toHaveLength(1)
    expect(exported.project.userPresets).toHaveLength(1)
    expect(exported.project.projection.surfaces[0].sourceMode).toBe('scene')
    expect(exported.project.projection.outputWindowOpen).toBeUndefined()
    expect(exported.project.projection.calibrating).toBeUndefined()

    act(() => {
      useStore.getState().resetAll()
      useStore.getState().setUi('helpOpen', false)
      importProjectData(exported)
    })

    state = useStore.getState()
    expect(state.generator.type).toBe('grid')
    expect(state.mediaLibrary[0].name).toBe('Alpha')
    expect(state.scenes).toHaveLength(1)
    expect(state.userPresets).toHaveLength(1)
    expect(state.projection.enabled).toBe(true)
    expect(state.projection.surfaces[0].sourceMode).toBe('scene')
    expect(state.projection.outputWindowOpen).toBe(false)
    expect(state.projection.calibrating).toBe(false)
    expect(state.sceneEditor.activeSceneId).toBeNull()
    expect(state.ui.helpOpen).toBe(false)
  })

  it('should capture a selected projection surface source into a reusable scene', () => {
    const {
      addProjectionSurface,
      addMediaAsset,
      updateProjectionSurface,
      setGenerator,
      setColor,
      captureProjectionSurfaceAsScene,
      startProjectionSurfaceSceneEdit,
    } = useStore.getState()

    act(() => {
      addProjectionSurface('Media Surface')
      addMediaAsset({ id: 'asset-a', type: 'image', src: 'file:///a.png', name: 'Alpha' })
      setGenerator('type', 'voronoi')
      setColor('hue', 0.35)
      updateProjectionSurface(useStore.getState().projection.selectedSurfaceId, { sourceMode: 'media', sourceId: 'asset-a' })
      captureProjectionSurfaceAsScene()
    })

    const state = useStore.getState()
    expect(state.scenes).toHaveLength(1)
    expect(state.scenes[0].state.media.name).toBe('Alpha')
    expect(state.scenes[0].state.generator.type).toBe('none')
    expect(state.scenes[0].state.color.hue).toBeCloseTo(0.35)
    expect(state.projection.surfaces[0].sourceMode).toBe('scene')
    expect(state.projection.surfaces[0].sourceId).toBe(state.scenes[0].id)

    act(() => {
      useStore.getState().resetAll()
      addProjectionSurface('Preset Surface')
      setGenerator('type', 'liquid')
      updateProjectionSurface(useStore.getState().projection.selectedSurfaceId, { sourceMode: 'builtin', sourceId: '0' })
      startProjectionSurfaceSceneEdit()
    })

    const editedState = useStore.getState()
    expect(editedState.scenes).toHaveLength(1)
    expect(editedState.sceneEditor.activeSceneId).toBe(editedState.scenes[0].id)
    expect(editedState.generator.type).not.toBe('liquid')
    expect(editedState.projection.surfaces[0].sourceMode).toBe('scene')
  })

  it('should add and remove mask points on a projection surface', () => {
    const {
      addProjectionSurface,
      addProjectionSurfaceMaskPoint,
      removeProjectionSurfaceMaskPoint,
      resetProjectionSurfaceMask,
    } = useStore.getState()

    act(() => {
      addProjectionSurface('Mask Test')
    })

    let state = useStore.getState()
    const surfaceId = state.projection.selectedSurfaceId
    expect(state.projection.surfaces[0].maskPoints).toHaveLength(4)

    act(() => {
      addProjectionSurfaceMaskPoint(surfaceId, 1)
    })

    state = useStore.getState()
    expect(state.projection.surfaces[0].maskPoints).toHaveLength(5)

    act(() => {
      removeProjectionSurfaceMaskPoint(surfaceId, 2)
    })

    state = useStore.getState()
    expect(state.projection.surfaces[0].maskPoints).toHaveLength(4)

    act(() => {
      resetProjectionSurfaceMask(surfaceId)
    })

    state = useStore.getState()
    expect(state.projection.surfaces[0].maskPoints).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ])
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
})
