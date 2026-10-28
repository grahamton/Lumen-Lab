import React from 'react'
import { getMidiMappingLabel, useStore, DEFAULTS } from '../../store/useStore'
import { useShallow } from 'zustand/shallow'
import { CONTROLS } from '../../config/uiConfig'
import { formatControlValue } from '../../config/helpText'

// A labelled slider. Pass either a ready-made `onChange(value)`, or a store
// setter (`set`) plus optional `onInteract`; the latter keeps every prop stable
// so the memoized sections do not re-render while a slider is being dragged.
// `storeKey` is the key the setter expects when it differs from `param`.
// Double-click resets to the default.
export const ControlGroup = React.memo(function ControlGroup({
  section, param, value, onChange, set, storeKey, onInteract, defaultValue,
}) {
  const learnId = `${section}.${param}`
  const { midiLearnActive, midiLearnId, mappingLabel, setUi, clearMidiMappingsFor, notify } = useStore(
    useShallow((state) => ({
      midiLearnActive:      state.ui.midiLearnActive,
      midiLearnId:          state.ui.midiLearnId,
      mappingLabel:         getMidiMappingLabel(state.midi.mappings, learnId),
      setUi:                state.setUi,
      clearMidiMappingsFor: state.clearMidiMappingsFor,
      notify:               state.notify,
    }))
  )
  const cfg = CONTROLS[section]?.[param]
  if (!cfg) return null

  const key = storeKey ?? param
  const isLearning = midiLearnActive && midiLearnId === learnId
  const fallbackDefault = DEFAULTS[section]?.[key]
  const resetTo = defaultValue ?? fallbackDefault

  function commit(next) {
    if (set) {
      onInteract?.()
      set(key, next)
    } else {
      onChange?.(next)
    }
  }

  function handleReset() {
    if (typeof resetTo !== 'number') return
    commit(resetTo)
    notify?.(`Reset ${cfg.label}`)
  }

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

  const shown = formatControlValue(section, param, value, cfg.step)
  // Presets can store values beyond the slider range (e.g. posterize 256 = off).
  const sliderValue = typeof value === 'number' ? Math.max(cfg.min, Math.min(cfg.max, value)) : value

  return (
    <div
      className={`mb-3 rounded ${midiLearnActive ? '-mx-1 px-1 py-0.5' : ''} ${learnRing}`}
      onPointerDown={selectForLearn}
      onFocus={selectForLearn}
      onContextMenu={handleContextMenu}
      data-help={learnId}
      data-midi-learnable={midiLearnActive || undefined}
      data-midi-learning={isLearning || undefined}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[10px] tracking-widest ${isLearning ? 'text-cyan-400' : 'text-neutral-400'}`}>
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
          <span className="text-[11px] text-cyan-400 tabular-nums min-w-[32px] text-right">
            {shown}
          </span>
        </span>
      </div>
      <input
        type="range"
        min={cfg.min}
        max={cfg.max}
        step={cfg.step}
        value={sliderValue}
        onChange={(e) => commit(Number(e.target.value))}
        onDoubleClick={handleReset}
        aria-label={cfg.label}
        aria-valuetext={shown}
        title="Double-click to reset"
        className="w-full h-[3px] bg-neutral-700 rounded-full appearance-none cursor-pointer accent-cyan-400"
      />
    </div>
  )
})
