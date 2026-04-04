import { useStore } from '../../store/useStore'
import { CONTROLS } from '../../config/uiConfig'

export function ControlGroup({ section, param, value, onChange }) {
  const { ui, setUi } = useStore()
  const cfg = CONTROLS[section]?.[param]
  if (!cfg) return null

  const learnId = `${section}.${param}`
  const isLearning = ui.midiLearnActive && ui.midiLearnId === learnId

  function handleContainerClick() {
    if (ui.midiLearnActive) setUi('midiLearnId', learnId)
  }

  return (
    <div className="mb-3" onClick={handleContainerClick}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[9px] tracking-widest ${isLearning ? 'text-cyan-400' : 'text-neutral-500'}`}>
          {cfg.label.toUpperCase()}
        </span>
        <span className="text-[9px] text-cyan-400 tabular-nums min-w-[32px] text-right">
          {typeof value === 'number' ? value.toFixed(2) : value}
        </span>
      </div>
      <input
        type="range"
        min={cfg.min}
        max={cfg.max}
        step={cfg.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-[3px] bg-neutral-700 rounded-full appearance-none cursor-pointer accent-cyan-400"
      />
    </div>
  )
}
