import { describe, it, expect, beforeEach } from 'vitest'
import { getEffectiveAuthoredSceneState, getMidiMappingLabel, useStore } from './useStore'

describe('MIDI Integration', () => {
  beforeEach(() => {
    useStore.getState().resetAll()
  })

  it('should create a MIDI mapping when in Learn Mode', () => {
    const store = useStore.getState()

    // 1. Enable Learn Mode
    store.setUi('midiLearnActive', true)

    // 2. Select a parameter
    store.setUi('midiLearnId', 'generator.param1')
    expect(useStore.getState().ui.midiLearnId).toBe('generator.param1')

    // 3. Simulate incoming MIDI message
    const midiMsg = { type: 'cc', channel: 1, note: 10, value: 0.5 }
    store.setMidi('lastMsg', midiMsg)

    // 4. Verify Mapping Created
    // Key format: channel-type-note => 1-cc-10
    const mappingKey = '1-cc-10'
    const mappings = useStore.getState().midi.mappings
    expect(mappings[mappingKey]).toBe('generator.param1')

    // 5. Verify Learn Mode Selection Cleared
    expect(useStore.getState().ui.midiLearnId).toBeNull()
  })

  it('should update mapped parameter when MIDI message received', () => {
    const store = useStore.getState()

    // 1. Setup Mapping manually
    const mappingKey = '1-cc-20'
    store.setMidiMapping(mappingKey, 'generator.param1')

    // 2. Initial Value
    expect(useStore.getState().generator.param1).toBe(50) // Default

    // 3. Send MIDI Message (value 1.0 => Max 100)
    store.setMidi('lastMsg', { type: 'cc', channel: 1, note: 20, value: 1.0 })

    // 4. Verify Parameter Updated
    // Generator param1 range: 0-100. Input 1.0 should map to 100.
    expect(useStore.getState().generator.param1).toBe(100)

    // 5. Send another message (value 0.0 => Min 0)
    store.setMidi('lastMsg', { type: 'cc', channel: 1, note: 20, value: 0.0 })
    expect(useStore.getState().generator.param1).toBe(0)
  })

  it('should clear mapping', () => {
    const store = useStore.getState()
    const mappingKey = '1-cc-30'
    store.setMidiMapping(mappingKey, 'effects.bloom')

    expect(useStore.getState().midi.mappings[mappingKey]).toBe('effects.bloom')

    store.clearMidiMapping(mappingKey)
    expect(useStore.getState().midi.mappings[mappingKey]).toBeUndefined()
  })
})

describe('MIDI learn toggle and quantization', () => {
  beforeEach(() => {
    useStore.getState().resetAll()
  })

  it('setMidiLearn toggles learn mode and clears the pending target on exit', () => {
    const store = useStore.getState()
    store.setMidiLearn(true)
    store.setUi('midiLearnId', 'color.hue')
    expect(useStore.getState().ui.midiLearnActive).toBe(true)

    useStore.getState().setMidiLearn(false)
    expect(useStore.getState().ui.midiLearnActive).toBe(false)
    expect(useStore.getState().ui.midiLearnId).toBeNull()

    // With learn off, incoming messages never create mappings.
    useStore.getState().setUi('midiLearnId', 'color.hue')
    useStore.getState().setMidi('lastMsg', { type: 'cc', channel: 1, note: 5, value: 0.5 })
    expect(useStore.getState().midi.mappings).toEqual({})
  })

  it('re-learning a param replaces its previous mapping', () => {
    const store = useStore.getState()
    store.setMidiLearn(true)
    store.setUi('midiLearnId', 'effects.bloom')
    store.setMidi('lastMsg', { type: 'cc', channel: 1, note: 1, value: 0 })
    useStore.getState().setUi('midiLearnId', 'effects.bloom')
    useStore.getState().setMidi('lastMsg', { type: 'cc', channel: 2, note: 7, value: 0 })

    expect(useStore.getState().midi.mappings).toEqual({ '2-cc-7': 'effects.bloom' })
    expect(getMidiMappingLabel(useStore.getState().midi.mappings, 'effects.bloom')).toBe('CC7/2')
  })

  it('clearMidiMappingsFor removes every mapping of a param', () => {
    const store = useStore.getState()
    store.setMidiMapping('1-cc-1', 'color.hue')
    store.setMidiMapping('1-noteOn-60', 'color.hue')
    store.setMidiMapping('1-cc-2', 'color.sat')

    useStore.getState().clearMidiMappingsFor('color.hue')
    expect(useStore.getState().midi.mappings).toEqual({ '1-cc-2': 'color.sat' })
  })

  it('quantizes integer params to their step', () => {
    const store = useStore.getState()
    store.setMidiMapping('1-cc-40', 'symmetry.slices')
    store.setMidiMapping('1-cc-41', 'color.posterize')

    // slices: 2..32 → 2 + 30 * 0.37 = 13.1
    useStore.getState().setMidi('lastMsg', { type: 'cc', channel: 1, note: 40, value: 0.37 })
    expect(getEffectiveAuthoredSceneState(useStore.getState()).symmetry.slices).toBe(13)

    // posterize: 2..32 → 2 + 30 * 0.33 = 11.9
    useStore.getState().setMidi('lastMsg', { type: 'cc', channel: 1, note: 41, value: 0.33 })
    expect(useStore.getState().color.posterize).toBe(12)

    useStore.getState().setMidi('lastMsg', { type: 'cc', channel: 1, note: 41, value: 1 })
    expect(useStore.getState().color.posterize).toBe(32)
  })

  it('leaves fractional params smooth', () => {
    useStore.getState().setMidiMapping('1-cc-42', 'effects.chromaticAberration')
    useStore.getState().setMidi('lastMsg', { type: 'cc', channel: 1, note: 42, value: 0.333 })
    expect(useStore.getState().effects.chromaticAberration).toBeCloseTo(0.333)
  })

  it('drives the motion speed slider (animation.bpm)', () => {
    useStore.getState().setMidiMapping('1-cc-43', 'animation.bpm')
    useStore.getState().setMidi('lastMsg', { type: 'cc', channel: 1, note: 43, value: 0.5 })
    expect(useStore.getState().animation.bpm).toBe(110)
  })
})
