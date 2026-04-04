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

export function SectionEffects({ onInteract }) {
  const { effects, setEffect, audio, setAudio, canvasShape, setCanvas } = useStore(
    (state) => ({
      effects:     state.effects,
      setEffect:   state.setEffect,
      audio:       state.audio,
      setAudio:    state.setAudio,
      canvasShape: state.canvas.shape,
      setCanvas:   state.setCanvas,
    }),
    shallow
  )

  function wrap(fn) {
    return (...args) => { onInteract?.(); fn(...args) }
  }

  const circleCrop = canvasShape === 'circle'

  return (
    <div>
      <ControlGroup section="effects" param="bloom"               value={effects.bloom}               onChange={wrap((v) => setEffect('bloom', v))} />
      <ControlGroup section="effects" param="chromaticAberration" value={effects.chromaticAberration} onChange={wrap((v) => setEffect('chromaticAberration', v))} />
      <ControlGroup section="effects" param="noise"               value={effects.noise}               onChange={wrap((v) => setEffect('noise', v))} />

      <Toggle
        label="AUDIO REACTIVE"
        isOn={audio.enabled}
        onToggle={wrap(() => setAudio('enabled', !audio.enabled))}
      />

      {audio.enabled && (
        <ControlGroup
          section="audio"
          param="sensitivity"
          value={audio.sensitivity}
          onChange={wrap((v) => setAudio('sensitivity', v))}
        />
      )}

      <Toggle
        label="CIRCLE CROP"
        isOn={circleCrop}
        onToggle={wrap(() => setCanvas('shape', circleCrop ? 'rectangle' : 'circle'))}
      />
    </div>
  )
}
