import { render, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { act } from 'react'
import { AuthoringBanner } from './AuthoringBanner'
import { useStore } from '../../store/useStore'

const SCENE_STATE = {
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
}

describe('AuthoringBanner', () => {
  beforeEach(() => {
    act(() => {
      useStore.getState().resetAll()
      useStore.setState({
        generator: { ...useStore.getState().generator, type: 'voronoi' },
        scenes: [{ id: 'scene-1', name: 'Neon Wall', state: SCENE_STATE }],
      })
    })
  })

  it('renders nothing when no authoring session is active', () => {
    const { container } = render(<AuthoringBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the scene name and exits with USE ON MAIN', () => {
    act(() => { useStore.getState().startSceneEdit('scene-1') })
    render(<AuthoringBanner />)

    expect(screen.getByText(/Editing/)).toBeInTheDocument()
    expect(screen.getByText('‘Neon Wall’')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'USE ON MAIN' }))
    expect(useStore.getState().sceneEditor.activeSceneId).toBeNull()
    expect(useStore.getState().generator.type).toBe('plasma')
  })

  it('restores the previous live state with DONE EDITING', () => {
    act(() => { useStore.getState().startSceneEdit('scene-1') })
    render(<AuthoringBanner />)

    fireEvent.click(screen.getByRole('button', { name: 'DONE EDITING' }))
    expect(useStore.getState().sceneEditor.activeSceneId).toBeNull()
    expect(useStore.getState().generator.type).toBe('voronoi')
  })

  it('names the surface when authoring from a surface', () => {
    act(() => {
      useStore.setState({
        projection: {
          ...useStore.getState().projection,
          selectedSurfaceId: 'surface-1',
          surfaces: [{
            id: 'surface-1',
            name: 'Back Wall',
            visible: true,
            opacity: 1,
            blendMode: 'screen',
            sourceMode: 'scene',
            sourceId: 'scene-1',
            points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
            maskPoints: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
          }],
        },
      })
      useStore.getState().authorProjectionSurfaceScene('surface-1')
    })
    render(<AuthoringBanner />)

    expect(useStore.getState().sceneEditor.mode).toBe('surface')
    expect(screen.getByText(/for Back Wall/)).toBeInTheDocument()
  })
})
