import React from 'react'
import { useStore, DEFAULTS } from '../../store/useStore'
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
  const { midiLearnActive, midiLearnId, setUi, notify } = useStore(
    useShallow((state) => ({
      midiLearnActive: state.ui.midiLearnActive,
      midiLearnId: state.ui.midiLearnId,
      setUi: state.setUi,
      notify: state.notify,
    }))
  )
  const cfg = CONTROLS[section]?.[param]
  if (!cfg) return null

  const key = storeKey ?? param
  const learnId = `${section}.${param}`
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

  function handleContainerClick() {
    if (midiLearnActive) setUi('midiLearnId', learnId)
  }

  const shown = formatControlValue(section, param, value, cfg.step)
  // Presets can store values beyond the slider range (e.g. posterize 256 = off).
  const sliderValue = typeof value === 'number' ? Math.max(cfg.min, Math.min(cfg.max, value)) : value

  return (
    <div className="mb-3" onClick={handleContainerClick} data-help={learnId}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[10px] tracking-widest ${isLearning ? 'text-cyan-400' : 'text-neutral-400'}`}>
          {cfg.label.toUpperCase()}
        </span>
        <span className="text-[11px] text-cyan-400 tabular-nums min-w-[32px] text-right">
          {shown}
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
