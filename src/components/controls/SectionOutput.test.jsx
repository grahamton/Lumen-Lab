import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { SectionOutput } from './SectionOutput'
import { AuthoringBanner } from './AuthoringBanner'
import { useStore } from '../../store/useStore'

describe('SectionOutput', () => {
  beforeEach(() => {
    act(() => {
      useStore.getState().resetAll()
      useStore.setState({
        projection: {
          ...useStore.getState().projection,
          enabled: true,
          selectedSurfaceId: 'surface-1',
          surfaces: [{
            id: 'surface-1',
            name: 'Surface 1',
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
          }],
        },
      })
    })
  })

  it('captures a scene when assigning a built-in source from the source select', () => {
    render(<SectionOutput />)

    const sourceSelect = screen.getByDisplayValue('MAIN VISUAL')
    fireEvent.change(sourceSelect, { target: { value: 'builtin:0' } })

    const state = useStore.getState()
    expect(state.scenes).toHaveLength(1)
    expect(state.projection.surfaces[0].sourceMode).toBe('scene')
    expect(state.projection.surfaces[0].sourceId).toBe(state.scenes[0].id)
  })

  it('applies opacity changes from the surface slider', () => {
    const { container } = render(<SectionOutput />)
    const opacitySlider = container.querySelector('input[type="range"]')

    fireEvent.change(opacitySlider, { target: { value: '0.35' } })

    expect(useStore.getState().projection.surfaces[0].opacity).toBeCloseTo(0.35)
  })

  it('toggles surface visibility from the selected surface controls', () => {
    render(<SectionOutput />)

    fireEvent.click(screen.getByRole('button', { name: 'HIDE SHAPE' }))
    expect(useStore.getState().projection.surfaces[0].visible).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'SHOW SHAPE' }))
    expect(useStore.getState().projection.surfaces[0].visible).toBe(true)
  })

  it('renames a surface from the selected surface controls', () => {
    const prompt = window.prompt
    window.prompt = () => 'Portal Wall'

    render(<SectionOutput />)
    fireEvent.click(screen.getByRole('button', { name: 'RENAME' }))

    expect(useStore.getState().projection.surfaces[0].name).toBe('Portal Wall')
    window.prompt = prompt
  })

  it('repairs missing visible surface sources back to live from the stage summary', () => {
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

    render(<SectionOutput />)

    fireEvent.click(screen.getByRole('button', { name: 'RESET MISSING TO MAIN' }))

    const state = useStore.getState()
    expect(state.projection.surfaces[0].sourceMode).toBe('live')
    expect(state.projection.surfaces[1].sourceMode).toBe('builtin')
  })

  it('makes every visible surface live from the stage summary', () => {
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
              sourceMode: 'builtin',
              sourceId: '0',
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

    render(<SectionOutput />)

    fireEvent.click(screen.getByRole('button', { name: 'ALL FOLLOW MAIN VISUAL' }))

    expect(useStore.getState().projection.surfaces.every((surface) => (
      surface.sourceMode === 'live' && surface.sourceId === 'live'
    ))).toBe(true)
  })

  it('shows a mixed-stage warning and unified recovery action', () => {
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
              sourceMode: 'live',
              sourceId: 'live',
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

    render(<SectionOutput />)

    expect(screen.getByText(/Mixed: 1 shape follows the main visual, 1 has its own look\./i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ALL FOLLOW MAIN VISUAL' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'MAKE VISIBLE LIVE' })).not.toBeInTheDocument()
  })

  it('shows the no-live warning when all visible surfaces are independent', () => {
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
              sourceMode: 'builtin',
              sourceId: '0',
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

    render(<SectionOutput />)

    expect(screen.getByText(/2 shapes have their own look, so left-panel changes won’t show on stage\./i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ALL FOLLOW MAIN VISUAL' })).toBeInTheDocument()
  })

  it('shows follow-live controls and independent copy for a selected non-live surface', () => {
    act(() => {
      useStore.setState({
        projection: {
          ...useStore.getState().projection,
          enabled: true,
          selectedSurfaceId: 'surface-1',
          surfaces: [{
            id: 'surface-1',
            name: 'Surface 1',
            visible: true,
            opacity: 1,
            blendMode: 'screen',
            sourceMode: 'builtin',
            sourceId: '0',
            points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
            maskPoints: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
          }],
        },
      })
    })

    render(<SectionOutput />)

    expect(screen.getByText(/Has its own look\. Left-panel changes don’t affect it\./i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'FOLLOW MAIN VISUAL' })).toBeInTheDocument()
  })

  it('shows the hidden-surface message and toggles back cleanly', () => {
    act(() => {
      useStore.setState({
        projection: {
          ...useStore.getState().projection,
          enabled: true,
          selectedSurfaceId: 'surface-1',
          surfaces: [{
            id: 'surface-1',
            name: 'Surface 1',
            visible: false,
            opacity: 1,
            blendMode: 'screen',
            sourceMode: 'live',
            sourceId: 'live',
            points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
            maskPoints: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
          }],
        },
      })
    })

    render(<SectionOutput />)

    expect(document.body.textContent).toContain('This shape is hidden, so it won’t show on stage.')
    fireEvent.click(screen.getByRole('button', { name: 'SHOW SHAPE' }))
    expect(useStore.getState().projection.surfaces[0].visible).toBe(true)
    expect(document.body.textContent).not.toContain('This shape is hidden, so it won’t show on stage.')
  })

  it('rehomes the output window when the selected display changes while it is open', async () => {
    const originalElectronAPI = window.electronAPI
    const openProjectionWindow = vi.fn(async () => true)
    const closeProjectionWindow = vi.fn(async () => true)
    const listProjectionDisplays = vi.fn(async () => ([
      { id: 11, label: 'Display A', isPrimary: true },
      { id: 22, label: 'Display B', isPrimary: false },
    ]))
    const onProjectionWindowClosed = vi.fn(() => () => {})

    window.electronAPI = {
      listProjectionDisplays,
      openProjectionWindow,
      closeProjectionWindow,
      onProjectionWindowClosed,
    }

    try {
      act(() => {
        useStore.setState({
          projection: {
            ...useStore.getState().projection,
            enabled: true,
            outputWindowOpen: true,
            displayId: 11,
            surfaces: [useStore.getState().projection.surfaces[0]],
          },
        })
      })

      render(<SectionOutput />)

      const displaySelect = await screen.findByDisplayValue('Display A (PRIMARY)')
      fireEvent.change(displaySelect, { target: { value: '22' } })

      await waitFor(() => {
        expect(useStore.getState().projection.displayId).toBe(22)
        expect(openProjectionWindow).toHaveBeenCalledWith(22)
      })
    } finally {
      window.electronAPI = originalElectronAPI
    }
  })

  it('loads scene state into the live controls from the scene library', () => {
    act(() => {
      useStore.setState({
        generator: {
          ...useStore.getState().generator,
          type: 'none',
        },
        scenes: [{
          id: 'scene-1',
          name: 'Scene 1',
          state: {
            transforms: { x: 0, y: 0, scale: 1, rotation: 0 },
            symmetry: { enabled: true, type: 'radial', slices: 6, offset: 0 },
            warp: { type: 'none' },
            displacement: { amp: 0, freq: 10 },
            tiling: { type: 'none', scale: 1 },
            color: { posterize: 32, hue: 0, sat: 1, light: 1 },
            effects: {
              edgeDetect: 0,
              invert: 0,
              solarize: 0,
              shift: 0,
              bloom: 0,
              chromaticAberration: 0,
              noise: 0,
            },
            generator: {
              type: 'plasma',
              param1: 50,
              param2: 50,
              param3: 50,
              isAnimated: true,
            },
            media: null,
            activeMediaId: null,
          },
        }],
      })
    })

    render(<SectionOutput />)

    fireEvent.click(screen.getByText('SHOW ON MAIN'))

    expect(useStore.getState().generator.type).toBe('plasma')
  })

  it('starts a scene edit session and can restore the previous live state', () => {
    act(() => {
      useStore.setState({
        generator: {
          ...useStore.getState().generator,
          type: 'voronoi',
        },
        scenes: [{
          id: 'scene-1',
          name: 'Scene 1',
          state: {
            transforms: { x: 0, y: 0, scale: 1, rotation: 0 },
            symmetry: { enabled: true, type: 'radial', slices: 6, offset: 0 },
            warp: { type: 'none' },
            displacement: { amp: 0, freq: 10 },
            tiling: { type: 'none', scale: 1 },
            color: { posterize: 32, hue: 0, sat: 1, light: 1 },
            effects: {
              edgeDetect: 0,
              invert: 0,
              solarize: 0,
              shift: 0,
              bloom: 0,
              chromaticAberration: 0,
              noise: 0,
            },
            generator: {
              type: 'plasma',
              param1: 50,
              param2: 50,
              param3: 50,
              isAnimated: true,
            },
            media: null,
            activeMediaId: null,
          },
        }],
      })
    })

    render(<><SectionOutput /><AuthoringBanner /></>)

    fireEvent.click(screen.getByText('EDIT THIS LOOK'))
    expect(useStore.getState().sceneEditor.activeSceneId).toBe('scene-1')
    expect(useStore.getState().generator.type).toBe('voronoi')
    expect(useStore.getState().sceneEditor.mode).toBe('library')
    expect(useStore.getState().sceneEditor.draftState.generator.type).toBe('plasma')
    expect(screen.getByText('‘Scene 1’')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'EDITING' })).toBeInTheDocument()

    act(() => {
      useStore.getState().setGenerator('type', 'grid')
    })

    expect(useStore.getState().scenes[0].state.generator.type).toBe('grid')
    expect(useStore.getState().sceneEditor.draftState.generator.type).toBe('grid')
    expect(useStore.getState().generator.type).toBe('voronoi')
    expect(screen.getByText('GENERATOR · GRID')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'DONE EDITING' }))

    expect(useStore.getState().sceneEditor.activeSceneId).toBeNull()
    expect(useStore.getState().generator.type).toBe('voronoi')
  })

  it('forks a shared scene automatically when authoring for the selected surface', () => {
    act(() => {
      useStore.setState({
        projection: {
          ...useStore.getState().projection,
          enabled: true,
          selectedSurfaceId: 'surface-2',
          surfaces: [
            {
              id: 'surface-1',
              name: 'Surface 1',
              visible: true,
              opacity: 1,
              blendMode: 'screen',
              sourceMode: 'scene',
              sourceId: 'scene-1',
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
            },
            {
              id: 'surface-2',
              name: 'Surface 2',
              visible: true,
              opacity: 1,
              blendMode: 'screen',
              sourceMode: 'scene',
              sourceId: 'scene-1',
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
            },
          ],
        },
        scenes: [{
          id: 'scene-1',
          name: 'Scene 1',
          state: {
            transforms: { x: 0, y: 0, scale: 1, rotation: 0 },
            symmetry: { enabled: true, type: 'radial', slices: 6, offset: 0 },
            warp: { type: 'none' },
            displacement: { amp: 0, freq: 10 },
            tiling: { type: 'none', scale: 1 },
            color: { posterize: 32, hue: 0, sat: 1, light: 1 },
            effects: {
              edgeDetect: 0,
              invert: 0,
              solarize: 0,
              shift: 0,
              bloom: 0,
              chromaticAberration: 0,
              noise: 0,
            },
            generator: {
              type: 'plasma',
              param1: 50,
              param2: 50,
              param3: 50,
              isAnimated: true,
            },
            media: null,
            activeMediaId: null,
          },
        }],
      })
    })

    render(<SectionOutput />)

    fireEvent.click(screen.getByRole('button', { name: 'COPY & EDIT' }))

    const state = useStore.getState()
    expect(state.scenes).toHaveLength(2)
    expect(state.projection.surfaces[0].sourceId).toBe('scene-1')
    expect(state.projection.surfaces[1].sourceId).not.toBe('scene-1')
    expect(state.sceneEditor.activeSceneId).toBe(state.projection.surfaces[1].sourceId)
    expect(state.sceneEditor.sourceSurfaceName).toBe('Surface 2')
  })

  it('captures a non-scene surface source into a scene', () => {
    act(() => {
      useStore.setState({
        projection: {
          ...useStore.getState().projection,
          enabled: true,
          selectedSurfaceId: 'surface-1',
          surfaces: [{
            id: 'surface-1',
            name: 'Surface 1',
            visible: true,
            opacity: 1,
            blendMode: 'screen',
            sourceMode: 'builtin',
            sourceId: '0',
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
          }],
        },
        scenes: [],
      })
    })

    render(<SectionOutput />)

    fireEvent.click(screen.getByRole('button', { name: 'SAVE AS LOOK' }))

    const state = useStore.getState()
    expect(state.scenes).toHaveLength(1)
    expect(state.projection.surfaces[0].sourceMode).toBe('scene')
    expect(state.projection.surfaces[0].sourceId).toBe(state.scenes[0].id)
  })

  it('starts authoring a non-scene surface as a new scene', () => {
    act(() => {
      useStore.setState({
        projection: {
          ...useStore.getState().projection,
          enabled: true,
          selectedSurfaceId: 'surface-1',
          surfaces: [{
            id: 'surface-1',
            name: 'Surface 1',
            visible: true,
            opacity: 1,
            blendMode: 'screen',
            sourceMode: 'builtin',
            sourceId: '0',
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
          }],
        },
        scenes: [],
        generator: {
          ...useStore.getState().generator,
          type: 'none',
        },
      })
    })

    render(<SectionOutput />)

    fireEvent.click(screen.getByRole('button', { name: 'NEW LOOK & EDIT' }))

    const state = useStore.getState()
    expect(state.scenes).toHaveLength(1)
    expect(state.sceneEditor.activeSceneId).toBe(state.scenes[0].id)
    expect(state.projection.surfaces[0].sourceMode).toBe('scene')
  })

  it('captures a scene when assigning media from the media library', () => {
    act(() => {
      useStore.setState({
        mediaLibrary: [{
          id: 'asset-1',
          name: 'Clip 1',
          type: 'image',
          src: 'file:///clip-1.png',
        }],
      })
    })

    render(<SectionOutput />)

    fireEvent.click(screen.getByRole('button', { name: 'USE ON SHAPE' }))

    const state = useStore.getState()
    expect(state.scenes).toHaveLength(1)
    expect(state.scenes[0].name).toBe('Clip 1 Scene')
    expect(state.scenes[0].origin).toMatchObject({
      type: 'media',
      sourceId: 'asset-1',
      mediaName: 'Clip 1',
    })
    expect(state.projection.surfaces[0].sourceMode).toBe('scene')
    expect(state.projection.surfaces[0].sourceId).toBe(state.scenes[0].id)
  })

  it('shows scene origin context in the scene library', () => {
    act(() => {
      useStore.setState({
        scenes: [{
          id: 'scene-1',
          name: 'Scene 1',
          state: {
            transforms: { x: 0, y: 0, scale: 1, rotation: 0 },
            symmetry: { enabled: true, type: 'radial', slices: 6, offset: 0 },
            warp: { type: 'none' },
            displacement: { amp: 0, freq: 10 },
            tiling: { type: 'none', scale: 1 },
            color: { posterize: 32, hue: 0, sat: 1, light: 1 },
            effects: {
              edgeDetect: 0,
              invert: 0,
              solarize: 0,
              shift: 0,
              bloom: 0,
              chromaticAberration: 0,
              noise: 0,
            },
            generator: {
              type: 'plasma',
              param1: 50,
              param2: 50,
              param3: 50,
              isAnimated: true,
            },
            media: null,
            activeMediaId: null,
          },
          origin: {
            type: 'builtin',
            sourceId: '0',
            label: 'BUILT-IN · Portal',
          },
        }],
      })
    })

    render(<SectionOutput />)

    expect(screen.getByText('ORIGIN · BUILT-IN · PORTAL')).toBeInTheDocument()
  })

  it('keeps the advanced mapped-shapes block collapsed until it is needed', () => {
    act(() => {
      useStore.setState({
        projection: { ...useStore.getState().projection, surfaces: [], selectedSurfaceId: null },
        scenes: [],
      })
    })

    render(<SectionOutput />)

    expect(screen.getByRole('button', { name: 'LINE UP PROJECTOR' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ NEW SHAPE' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /ADVANCED: MAPPED SHAPES/ }))
    fireEvent.click(screen.getByRole('button', { name: '+ NEW SHAPE' }))
    expect(useStore.getState().projection.surfaces).toHaveLength(1)
  })

  it('starts line-up from the projector block', () => {
    act(() => {
      useStore.setState({ projection: { ...useStore.getState().projection, enabled: false, calibrating: false } })
    })
    render(<SectionOutput />)

    fireEvent.click(screen.getByRole('button', { name: 'LINE UP PROJECTOR' }))
    expect(useStore.getState().projection.enabled).toBe(true)
    expect(useStore.getState().projection.calibrating).toBe(true)
  })

  it('maps alignment grid labels onto the stored pattern modes', () => {
    render(<SectionOutput />)

    fireEvent.click(screen.getByRole('button', { name: 'ON TOP' }))
    expect(useStore.getState().projection.patternMode).toBe('overlay')
    fireEvent.click(screen.getByRole('button', { name: 'GRID ONLY' }))
    expect(useStore.getState().projection.patternMode).toBe('replace')
  })

  it('needs a second click before deleting a shape', () => {
    render(<SectionOutput />)

    fireEvent.click(screen.getByRole('button', { name: 'DELETE' }))
    expect(useStore.getState().projection.surfaces).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'SURE?' }))
    expect(useStore.getState().projection.surfaces).toHaveLength(0)
  })

  it('explains why SAVE ALIGNMENT is disabled', () => {
    act(() => {
      useStore.setState({ projection: { ...useStore.getState().projection, points: null } })
    })
    render(<SectionOutput />)

    expect(screen.getByRole('button', { name: 'SAVE ALIGNMENT' })).toBeDisabled()
    expect(screen.getByText('Move a corner first.')).toBeInTheDocument()
  })

  it('hides secondary look actions behind the more menu and confirms destructive ones', () => {
    act(() => {
      useStore.setState({
        scenes: [{
          id: 'scene-1',
          name: 'Scene 1',
          state: {
            transforms: { x: 0, y: 0, scale: 1, rotation: 0 },
            symmetry: { enabled: true, type: 'radial', slices: 6, offset: 0 },
            warp: { type: 'none' },
            displacement: { amp: 0, freq: 10 },
            tiling: { type: 'none', scale: 1 },
            color: { posterize: 32, hue: 0, sat: 1, light: 1 },
            effects: { edgeDetect: 0, invert: 0, solarize: 0, shift: 0, bloom: 0, chromaticAberration: 0, noise: 0 },
            generator: { type: 'plasma', param1: 50, param2: 50, param3: 50, isAnimated: true },
            media: null,
            activeMediaId: null,
          },
        }],
      })
    })
    render(<SectionOutput />)

    expect(screen.queryByRole('button', { name: 'OVERWRITE WITH CURRENT' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))

    fireEvent.click(screen.getByRole('button', { name: 'OVERWRITE WITH CURRENT' }))
    expect(useStore.getState().scenes[0].state.generator.type).toBe('plasma')
    fireEvent.click(screen.getByRole('button', { name: 'SURE?' }))

    fireEvent.click(screen.getAllByRole('button', { name: 'DELETE' }).at(-1))
    fireEvent.click(screen.getByRole('button', { name: 'SURE?' }))
    expect(useStore.getState().scenes).toHaveLength(0)
  })
})
