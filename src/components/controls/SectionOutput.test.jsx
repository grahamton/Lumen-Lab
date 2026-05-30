import { render, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { act } from 'react'
import { SectionOutput } from './SectionOutput'
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

  it('applies surface source changes from the source select', () => {
    render(<SectionOutput />)

    const sourceSelect = screen.getByDisplayValue('LIVE OUTPUT')
    fireEvent.change(sourceSelect, { target: { value: 'builtin:0' } })

    const state = useStore.getState()
    expect(state.projection.surfaces[0].sourceMode).toBe('builtin')
    expect(state.projection.surfaces[0].sourceId).toBe('0')
  })

  it('applies opacity changes from the surface slider', () => {
    const { container } = render(<SectionOutput />)
    const opacitySlider = container.querySelector('input[type="range"]')

    fireEvent.change(opacitySlider, { target: { value: '0.35' } })

    expect(useStore.getState().projection.surfaces[0].opacity).toBeCloseTo(0.35)
  })

  it('toggles surface visibility from the selected surface controls', () => {
    render(<SectionOutput />)

    fireEvent.click(screen.getByRole('button', { name: 'HIDE SURFACE' }))
    expect(useStore.getState().projection.surfaces[0].visible).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'SHOW SURFACE' }))
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

    fireEvent.click(screen.getByRole('button', { name: 'RESET MISSING TO LIVE' }))

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

    fireEvent.click(screen.getByRole('button', { name: 'MAKE ALL LIVE' }))

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

    expect(screen.getByText(/Stage is mixed: 1 live, 1 independent\./i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'MAKE ALL LIVE' })).toBeInTheDocument()
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

    expect(screen.getAllByText(/No visible surface is following/i)).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'MAKE ALL LIVE' })).toBeInTheDocument()
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

    expect(screen.getAllByText('Independent from live controls').length).toBeGreaterThan(0)
    expect(screen.getByText('This surface is independent from live controls until returned to `LIVE OUTPUT`.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'FOLLOW LIVE OUTPUT' })).toBeInTheDocument()
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

    expect(document.body.textContent).toContain('This surface is hidden and will not render on stage until shown again.')
    fireEvent.click(screen.getByRole('button', { name: 'SHOW SURFACE' }))
    expect(useStore.getState().projection.surfaces[0].visible).toBe(true)
    expect(document.body.textContent).not.toContain('This surface is hidden and will not render on stage until shown again.')
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

    fireEvent.click(screen.getByText('LOAD LIVE'))

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

    render(<SectionOutput />)

    fireEvent.click(screen.getByText('EDIT'))
    expect(useStore.getState().sceneEditor.activeSceneId).toBe('scene-1')
    expect(useStore.getState().generator.type).toBe('plasma')

    act(() => {
      useStore.getState().setGenerator('type', 'grid')
    })

    fireEvent.click(screen.getByText('RESTORE LIVE'))

    expect(useStore.getState().sceneEditor.activeSceneId).toBeNull()
    expect(useStore.getState().generator.type).toBe('voronoi')
  })

  it('forks a shared scene for the selected surface', () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'FORK TO SURFACE' }))

    const state = useStore.getState()
    expect(state.scenes).toHaveLength(2)
    expect(state.projection.surfaces[0].sourceId).toBe('scene-1')
    expect(state.projection.surfaces[1].sourceId).not.toBe('scene-1')
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

    fireEvent.click(screen.getByRole('button', { name: 'CAPTURE TO SCENE' }))

    const state = useStore.getState()
    expect(state.scenes).toHaveLength(1)
    expect(state.projection.surfaces[0].sourceMode).toBe('scene')
    expect(state.projection.surfaces[0].sourceId).toBe(state.scenes[0].id)
  })

  it('starts editing a non-scene surface as a new scene', () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'EDIT AS SCENE' }))

    const state = useStore.getState()
    expect(state.scenes).toHaveLength(1)
    expect(state.sceneEditor.activeSceneId).toBe(state.scenes[0].id)
    expect(state.projection.surfaces[0].sourceMode).toBe('scene')
  })
})
