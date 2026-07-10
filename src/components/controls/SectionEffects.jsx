import { getEffectiveAuthoredSceneState, useStore } from '../../store/useStore'
import { useShallow } from 'zustand/shallow'
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
  const { effectsBloom, effectsCA, effectsNoise, audioEnabled, audioSensitivity, setEffect, setAudio, canvasShape, setCanvas } = useStore(
    useShallow((state) => {
      const effectiveSceneState = getEffectiveAuthoredSceneState(state)
      return {
        effectsBloom: effectiveSceneState.effects.bloom,
        effectsCA: effectiveSceneState.effects.chromaticAberration,
        effectsNoise: effectiveSceneState.effects.noise,
        audioEnabled: state.audio.enabled,
        audioSensitivity: state.audio.sensitivity,
        setEffect: state.setEffect,
        setAudio: state.setAudio,
        canvasShape: state.canvas.shape,
        setCanvas: state.setCanvas,
      }
    })
  )

  function wrap(fn) {
    return (...args) => { onInteract?.(); fn(...args) }
  }

  const circleCrop = canvasShape === 'circle'

  return (
    <div>
      <ControlGroup section="effects" param="bloom"               value={effectsBloom}  onChange={wrap((v) => setEffect('bloom', v))} />
      <ControlGroup section="effects" param="chromaticAberration" value={effectsCA}     onChange={wrap((v) => setEffect('chromaticAberration', v))} />
      <ControlGroup section="effects" param="noise"               value={effectsNoise}  onChange={wrap((v) => setEffect('noise', v))} />

      <Toggle
        label="AUDIO REACTIVE"
        isOn={audioEnabled}
        onToggle={wrap(() => setAudio('enabled', !audioEnabled))}
      />

      {audioEnabled && (
        <ControlGroup
          section="audio"
          param="sensitivity"
          value={audioSensitivity}
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
