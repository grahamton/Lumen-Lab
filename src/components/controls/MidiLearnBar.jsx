import { useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { useShallow } from 'zustand/shallow'
import { HELP_TEXT } from '../../config/helpText'

export function MidiLearnBar() {
  const { isEnabled, inputCount, learnActive, setMidiLearn } = useStore(
    useShallow((state) => ({
      isEnabled:     state.midi.isEnabled,
      inputCount:    state.midi.inputs.length,
      learnActive:   state.ui.midiLearnActive,
      setMidiLearn:  state.setMidiLearn,
    }))
  )
  const available = isEnabled && inputCount > 0

  useEffect(() => {
    if (!learnActive) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') setMidiLearn(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [learnActive, setMidiLearn])

  // Leaving learn mode on with no device would strand the highlight.
  useEffect(() => {
    if (!available && learnActive) setMidiLearn(false)
  }, [available, learnActive, setMidiLearn])

  if (!available) {
    return (
      <div className="px-3 py-1.5 border-b border-neutral-800 shrink-0" title={HELP_TEXT.midiUnavailable}>
        <span className="text-[9px] tracking-widest text-neutral-600">NO MIDI DEVICE</span>
      </div>
    )
  }

  return (
    <div className="border-b border-neutral-800 shrink-0">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-[9px] tracking-widest text-neutral-500">MIDI</span>
        <button
          onClick={() => setMidiLearn(!learnActive)}
          aria-pressed={learnActive}
          title={HELP_TEXT.midiLearn}
          className={`px-2 py-0.5 rounded text-[9px] tracking-widest font-semibold border transition-colors ${
            learnActive
              ? 'bg-cyan-400 border-cyan-400 text-neutral-900'
              : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
          }`}
        >
          MIDI LEARN
        </button>
      </div>
      {learnActive && (
        <div role="status" className="px-3 py-1.5 bg-cyan-950/60 border-t border-cyan-900 text-[9px] tracking-wider text-cyan-300">
          Move a control, then turn a knob · Esc to exit
        </div>
      )}
    </div>
  )
}
