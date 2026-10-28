import React from 'react'
import { getMidiMappingLabel, useStore } from '../../store/useStore'
import { useShallow } from 'zustand/shallow'
import { CONTROLS } from '../../config/uiConfig'

export const ControlGroup = React.memo(function ControlGroup({ section, param, value, onChange }) {
  const learnId = `${section}.${param}`
  const { midiLearnActive, midiLearnId, mappingLabel, setUi, clearMidiMappingsFor } = useStore(
    useShallow((state) => ({
      midiLearnActive:      state.ui.midiLearnActive,
      midiLearnId:          state.ui.midiLearnId,
      mappingLabel:         getMidiMappingLabel(state.midi.mappings, learnId),
      setUi:                state.setUi,
      clearMidiMappingsFor: state.clearMidiMappingsFor,
    }))
  )
  const cfg = CONTROLS[section]?.[param]
  if (!cfg) return null

  const isLearning = midiLearnActive && midiLearnId === learnId

  // Pointer-down rather than click so dragging the slider also selects it.
  function selectForLearn() {
    if (midiLearnActive && midiLearnId !== learnId) setUi('midiLearnId', learnId)
  }

  function handleContextMenu(e) {
    if (!midiLearnActive || !mappingLabel) return
    e.preventDefault()
    clearMidiMappingsFor(learnId)
  }

  const learnRing = midiLearnActive
    ? isLearning
      ? 'outline outline-1 outline-cyan-400 bg-cyan-950/40'
      : 'outline-dashed outline-1 outline-neutral-600 hover:outline-cyan-700'
    : ''

  return (
    <div
      className={`mb-3 rounded ${midiLearnActive ? '-mx-1 px-1 py-0.5' : ''} ${learnRing}`}
      onPointerDown={selectForLearn}
      onFocus={selectForLearn}
      onContextMenu={handleContextMenu}
      data-midi-learnable={midiLearnActive || undefined}
      data-midi-learning={isLearning || undefined}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[9px] tracking-widest ${isLearning ? 'text-cyan-400' : 'text-neutral-500'}`}>
          {cfg.label.toUpperCase()}
          {isLearning && <span className="ml-1.5 text-cyan-300 animate-pulse">● WAITING</span>}
        </span>
        <span className="flex items-center gap-1">
          {mappingLabel && (
            <span
              className="flex items-center text-[8px] tracking-wider px-1 rounded bg-neutral-800 border border-neutral-700 text-amber-300"
              title={`MIDI ${mappingLabel}`}
            >
              {mappingLabel}
              {midiLearnActive && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => clearMidiMappingsFor(learnId)}
                  aria-label={`Clear MIDI mapping for ${cfg.label}`}
                  className="ml-1 text-neutral-400 hover:text-red-400"
                >
                  ×
                </button>
              )}
            </span>
          )}
          <span className="text-[9px] text-cyan-400 tabular-nums min-w-[32px] text-right">
            {typeof value === 'number' ? value.toFixed(2) : value}
          </span>
        </span>
      </div>
      <input
        type="range"
        min={cfg.min}
        max={cfg.max}
        step={cfg.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={cfg.label}
        className="w-full h-[3px] bg-neutral-700 rounded-full appearance-none cursor-pointer accent-cyan-400"
      />
    </div>
  )
})
