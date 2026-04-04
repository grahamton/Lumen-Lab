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
