import React from 'react'
import { getEffectiveAuthoredSceneState, useStore } from '../../store/useStore'
import { useShallow } from 'zustand/shallow'
import { ControlGroup } from './ControlGroup'

const WARP_MODES = [
  { value: 'none',      label: 'OFF'   },
  { value: 'polar',     label: 'POLAR' },
  { value: 'log-polar', label: 'LOG'   },
]

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

export const SectionGeometry = React.memo(function SectionGeometry({ onInteract }) {
  // Fine-grained selectors: each primitive only triggers a re-render when its own value changes,
  // preventing cascading re-renders during animation playback.
  const {
    symmetryEnabled, symmetrySlices,
    transformsRotation, transformsX, transformsY,
    displacementAmp, warpType, tilingType,
    setSymmetry, setTransform, setWarp, setDisplacement, setTiling,
  } = useStore(
    useShallow((s) => {
      const effectiveSceneState = getEffectiveAuthoredSceneState(s)
      return {
        symmetryEnabled: effectiveSceneState.symmetry.enabled,
        symmetrySlices: effectiveSceneState.symmetry.slices,
        transformsRotation: effectiveSceneState.transforms.rotation,
        transformsX: effectiveSceneState.transforms.x,
        transformsY: effectiveSceneState.transforms.y,
        displacementAmp: effectiveSceneState.displacement.amp,
        warpType: effectiveSceneState.warp.type,
        tilingType: effectiveSceneState.tiling.type,
        setSymmetry: s.setSymmetry,
        setTransform: s.setTransform,
        setWarp: s.setWarp,
        setDisplacement: s.setDisplacement,
        setTiling: s.setTiling,
      }
    })
  )

  function wrap(fn) {
    return (...args) => { onInteract?.(); fn(...args) }
  }

  return (
    <div>
      <Toggle
        label="KALEIDOSCOPE"
        isOn={symmetryEnabled}
        onToggle={wrap(() => setSymmetry('enabled', !symmetryEnabled))}
      />
      <ControlGroup section="symmetry" param="slices" value={symmetrySlices} onChange={wrap((v) => setSymmetry('slices', v))} />
      <ControlGroup section="transforms" param="rotation" value={transformsRotation} onChange={wrap((v) => setTransform('rotation', v))} />
      <ControlGroup section="displacement" param="amp" value={displacementAmp} onChange={wrap((v) => setDisplacement('amp', v))} />

      <div className="mb-3">
        <p className="text-[9px] tracking-widest text-neutral-500 mb-1.5">WARP MODE</p>
        <div className="flex gap-1">
          {WARP_MODES.map(({ value, label }) => (
            <button
              key={value}
              onClick={wrap(() => setWarp('type', value))}
              aria-pressed={warpType === value}
              className={`flex-1 py-1 rounded text-[8px] tracking-wider border transition-colors ${
                warpType === value
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-400'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ControlGroup section="transforms" param="x" value={transformsX} onChange={wrap((v) => setTransform('x', v))} />
      <ControlGroup section="transforms" param="y" value={transformsY} onChange={wrap((v) => setTransform('y', v))} />

      <Toggle
        label="TILING"
        isOn={tilingType !== 'none'}
        onToggle={wrap(() => setTiling('type', tilingType === 'none' ? 'p4m' : 'none'))}
      />
    </div>
  )
})
