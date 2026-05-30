import { describe, expect, it } from 'vitest'
import {
  pruneProjectionCanvasRegistry,
  updateProjectionCanvasRegistry,
} from './projectionCanvasRegistry'

describe('projectionCanvasRegistry', () => {
  it('adds, updates, and removes source canvases by key', () => {
    const canvasA = { id: 'a' }
    const canvasB = { id: 'b' }

    let registry = {}
    registry = updateProjectionCanvasRegistry(registry, 'scene:1', canvasA)
    expect(registry).toEqual({ 'scene:1': canvasA })

    registry = updateProjectionCanvasRegistry(registry, 'scene:1', canvasA)
    expect(registry).toEqual({ 'scene:1': canvasA })

    registry = updateProjectionCanvasRegistry(registry, 'scene:1', canvasB)
    expect(registry).toEqual({ 'scene:1': canvasB })

    registry = updateProjectionCanvasRegistry(registry, 'scene:1', null)
    expect(registry).toEqual({})
  })

  it('prunes stale canvases that are no longer active', () => {
    const registry = {
      live: { id: 'live' },
      'scene:1': { id: 'scene-1' },
      'media:1': { id: 'media-1' },
    }

    expect(pruneProjectionCanvasRegistry(registry, ['scene:1'])).toEqual({
      'scene:1': { id: 'scene-1' },
    })
  })
})
