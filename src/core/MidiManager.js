import { useStore } from '../store/useStore'

export class MidiManager {
  constructor() {
    this.midiAccess = null
    this.inputs = new Map()
    this.isEnabled = false
  }

  async init() {
    if (!navigator.requestMIDIAccess) {
      console.warn("WebMIDI is not supported in this environment.")
      return false
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess()
      this.isEnabled = true

      // Initial Scan
      this.scanInputs()

      // Listen for connection changes
      this.midiAccess.onstatechange = (e) => {
        console.log(`MIDI State Change: ${e.port.name} -> ${e.port.state}`)
        this.scanInputs()
      }

      return true
    } catch (err) {
      console.error("WebMIDI Access Failed:", err)
      return false
    }
  }

  scanInputs() {
    if (!this.midiAccess) return

    const inputList = []
    const inputs = this.midiAccess.inputs.values()

    for (let input of inputs) {
      inputList.push({
        id: input.id,
        name: input.name,
        manufacturer: input.manufacturer
      })

      // Bind listener if new
      if (!this.inputs.has(input.id)) {
        input.onmidimessage = this.onMessage.bind(this)
        this.inputs.set(input.id, input)
        console.log(`MIDI Listener attached to: ${input.name}`)
      }
    }

    // Update Store
    useStore.getState().setMidi('inputs', inputList)
    useStore.getState().setMidi('isEnabled', true)
  }

  onMessage(message) {
    const [status, data1, data2] = message.data
    const command = status & 0xf0
    const channel = status & 0x0f

    // Normalize Data (0-127 -> 0.0-1.0)
    const note = data1
    const velocity = (data2 || 0) / 127.0

    // Construct unified message
    // 144 = Note On, 128 = Note Off, 176 = CC
    let type = 'unknown'
    if (command === 144 && data2 > 0) type = 'noteOn'
    if (command === 128 || (command === 144 && data2 === 0)) type = 'noteOff'
    if (command === 176) type = 'cc'

    // Clock, active sensing, pitch bend and the like arrive constantly; they
    // can't be mapped and would otherwise churn the store (and MIDI learn).
    if (type === 'unknown') return

    const msg = {
      type,
      channel: channel + 1,
      note,     // Note Number or CC Number
      value: velocity, // Normalized Value
      timestamp: Date.now()
    }

    // Pipe to Store (Careful with per-frame performance, maybe optimize later)
    useStore.getState().setMidi('lastMsg', msg)

    // Optional: Direct logging for dev
    // console.log(`MIDI: [${type}] Ch:${channel+1} Note/CC:${note} Val:${velocity.toFixed(2)}`)
  }
}

// Singleton Instance
export const midiManager = new MidiManager()
