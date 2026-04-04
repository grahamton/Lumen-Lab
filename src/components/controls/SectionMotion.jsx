import { useStore } from '../../store/useStore'
import { shallow } from 'zustand/shallow'
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

export function SectionMotion({ onInteract }) {
  const { globalPause, setUi, animation, setAnimation, flux, setFlux } = useStore(
    (state) => ({
      globalPause:  state.ui.globalPause,
      setUi:        state.setUi,
      animation:    state.animation,
      setAnimation: state.setAnimation,
      flux:         state.flux,
      setFlux:      state.setFlux,
    }),
    shallow
  )
  const isPlaying = !globalPause

  function wrap(fn) {
    return (...args) => { onInteract?.(); fn(...args) }
  }

  return (
    <div>
      <Toggle
        label="ANIMATE"
        isOn={isPlaying}
        onToggle={wrap(() => setUi('globalPause', isPlaying))}
      />
      <ControlGroup
        section="animation"
        param="speed"
        value={animation.bpm}
        onChange={wrap((v) => setAnimation('bpm', v))}
      />
      <Toggle
        label="DRIFT"
        isOn={flux.enabled}
        onToggle={wrap(() => setFlux('enabled', !flux.enabled))}
      />
      {flux.enabled && (
        <ControlGroup
          section="flux"
          param="amount"
          value={flux.amount}
          onChange={wrap((v) => setFlux('amount', v))}
        />
      )}
    </div>
  )
}
