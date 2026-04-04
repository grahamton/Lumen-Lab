import { useStore } from '../../store/useStore'
import { ControlGroup } from './ControlGroup'

function Toggle({ label, isOn, onToggle }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-[9px] tracking-widest text-neutral-500">{label}</span>
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={isOn}
        className={`w-7 h-3.5 rounded-full relative transition-colors ${isOn ? 'bg-cyan-950 border border-cyan-400' : 'bg-neutral-700'}`}
      >
        <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-transform ${isOn ? 'translate-x-3.5 bg-cyan-400' : 'translate-x-0.5 bg-neutral-500'}`} />
      </button>
    </div>
  )
}

export function SectionColor({ onInteract }) {
  const { color, setColor, effects, setEffect } = useStore()

  function wrap(fn) {
    return (...args) => { onInteract?.(); fn(...args) }
  }

  return (
    <div>
      <ControlGroup section="color" param="hue"       value={color.hue}       onChange={wrap((v) => setColor('hue', v))} />
      <ControlGroup section="color" param="sat"       value={color.sat}       onChange={wrap((v) => setColor('sat', v))} />
      <ControlGroup section="color" param="light"     value={color.light}     onChange={wrap((v) => setColor('light', v))} />
      <ControlGroup section="color" param="posterize" value={color.posterize} onChange={wrap((v) => setColor('posterize', v))} />

      <Toggle
        label="INVERT"
        isOn={effects.invert > 0}
        onToggle={wrap(() => setEffect('invert', effects.invert > 0 ? 0 : 100))}
      />
    </div>
  )
}
