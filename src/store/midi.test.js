import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from './useStore'

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
    store.setGenerator('param1', 50)
    expect(useStore.getState().generator.param1).toBe(50)

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
