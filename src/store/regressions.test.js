import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { act } from '@testing-library/react'
import { debounce, dehydrateStoredMedia, rehydrateStoredMedia, useStore } from './useStore'
import { presets } from '../presets'

describe('store regressions', () => {
  beforeEach(() => {
    act(() => {
      useStore.getState().resetAll()
      useStore.setState({ undoStack: [], redoStack: [] })
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it.each(presets.map((preset) => [preset.name, preset]))('preset %s loads a complete look', (_, preset) => {
    act(() => useStore.getState().loadSnapshot(preset.state))
    const { color, symmetry, generator } = useStore.getState()
    // Partial presets used to wipe these, sending NaN to the shader (black output).
    for (const key of ['hue', 'sat', 'light', 'posterize']) expect(Number.isFinite(color[key])).toBe(true)
    expect(symmetry.type).toBeTruthy()
    expect(generator.isAnimated).toBe(true)
    expect(generator.type).toBe(preset.state.generator.type)
  })

  it('records slider edits for undo, one step per gesture', () => {
    vi.useFakeTimers()
    vi.advanceTimersByTime(1000) // clear the coalescing window left by earlier tests
    const store = useStore.getState()
    const before = useStore.getState().transforms.scale

    act(() => {
      store.setTransform('scale', 2)
      vi.advanceTimersByTime(50)
      store.setTransform('scale', 2.5)
      vi.advanceTimersByTime(50)
      store.setTransform('scale', 3)
    })
    expect(useStore.getState().undoStack).toHaveLength(1)

    act(() => useStore.getState().undo())
    expect(useStore.getState().transforms.scale).toBe(before)

    act(() => useStore.getState().redo())
    expect(useStore.getState().transforms.scale).toBe(3)
  })

  it('starts a new undo step after a pause', () => {
    vi.useFakeTimers()
    vi.advanceTimersByTime(1000)
    act(() => {
      useStore.getState().setColor('hue', 0.2)
      vi.advanceTimersByTime(2000)
      useStore.getState().setColor('hue', 0.4)
    })
    expect(useStore.getState().undoStack).toHaveLength(2)
  })

  it('does not record animation frames as undo steps', () => {
    act(() => useStore.getState().loadSnapshot(presets[0].state, { recordUndo: false }))
    expect(useStore.getState().undoStack).toHaveLength(0)
  })
})

describe('persisted media', () => {
  const image = { id: 'media-1', type: 'image', src: 'data:image/png;base64,AAAA', name: 'a.png' }
  const video = { id: 'media-2', type: 'video', src: 'blob:http://localhost/123', name: 'b.mp4' }

  it('stores each library file once and restores references', () => {
    const persisted = {
      media: image,
      mediaLibrary: [image],
      activeMediaId: image.id,
      snapshots: [{ id: 1, media: image }],
      scenes: [{ id: 's1', state: { media: image } }],
      userPresets: [{ id: 'p1', state: { media: image } }],
    }

    const stored = dehydrateStoredMedia(persisted)
    expect(JSON.stringify(stored).split(image.src)).toHaveLength(2) // exactly one copy
    expect(stored.snapshots[0].media).toEqual({ id: image.id, libraryRef: true })

    const restored = rehydrateStoredMedia(JSON.parse(JSON.stringify(stored)))
    expect(restored.media).toEqual(image)
    expect(restored.snapshots[0].media).toEqual(image)
    expect(restored.scenes[0].state.media).toEqual(image)
    expect(restored.userPresets[0].state.media).toEqual(image)
  })

  it('drops blob: videos that cannot survive a reload', () => {
    const restored = rehydrateStoredMedia({
      media: { id: video.id, libraryRef: true },
      mediaLibrary: [image, video],
      activeMediaId: video.id,
    })
    expect(restored.mediaLibrary).toEqual([image])
    expect(restored.media).toBeNull()
    expect(restored.activeMediaId).toBeNull()
  })
})

describe('debounce', () => {
  it('still fires under a steady stream of calls', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 500)
    for (let i = 0; i < 60; i += 1) {
      debounced(i)
      vi.advanceTimersByTime(50) // e.g. audio meters at 20 Hz
    }
    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(1)
    vi.useRealTimers()
  })
})
