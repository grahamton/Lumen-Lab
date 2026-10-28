import React, { useCallback } from 'react'
import { getEffectiveAuthoredSceneState, useStore } from '../../store/useStore'
import { useShallow } from 'zustand/shallow'
import { ControlGroup } from './ControlGroup'
import { Toggle } from './Toggle'

const BEND_MODES = [
  { value: 'none',      label: 'OFF'    },
  { value: 'polar',     label: 'TUNNEL' },
  { value: 'log-polar', label: 'VORTEX' },
]

export const SectionGeometry = React.memo(function SectionGeometry({ onInteract }) {
  // Fine-grained selectors: each primitive only triggers a re-render when its own value changes,
  // preventing cascading re-renders during animation playback.
  const {
    symmetryEnabled, symmetrySlices,
    transformsRotation, transformsX, transformsY,
    displacementAmp, displacementFreq, warpType, tilingType,
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
        displacementFreq: effectiveSceneState.displacement.freq,
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

  const toggleMirror = useCallback(() => {
    onInteract?.()
    setSymmetry('enabled', !symmetryEnabled)
  }, [onInteract, setSymmetry, symmetryEnabled])

  const toggleRepeat = useCallback(() => {
    onInteract?.()
    setTiling('type', tilingType === 'none' ? 'p4m' : 'none')
  }, [onInteract, setTiling, tilingType])

  return (
    <div>
      <Toggle label="MIRROR" help="symmetry.enabled" isOn={symmetryEnabled} onToggle={toggleMirror} />
      <ControlGroup section="symmetry" param="slices" value={symmetrySlices} set={setSymmetry} onInteract={onInteract} />
      <ControlGroup section="transforms" param="rotation" value={transformsRotation} set={setTransform} onInteract={onInteract} />
      <ControlGroup section="displacement" param="amp" value={displacementAmp} set={setDisplacement} onInteract={onInteract} />
      {displacementAmp > 0 && (
        <ControlGroup section="displacement" param="freq" value={displacementFreq} set={setDisplacement} onInteract={onInteract} />
      )}

      <div className="mb-3" data-help="warp.type">
        <p className="text-[10px] tracking-widest text-neutral-400 mb-1.5">BEND</p>
        <div className="flex gap-1">
          {BEND_MODES.map(({ value, label }) => (
            <button
              key={value}
              data-help={`warp.${value}`}
              onClick={() => { onInteract?.(); setWarp('type', value) }}
              aria-pressed={warpType === value}
              className={`flex-1 py-1.5 rounded text-[10px] tracking-wider border transition-colors ${
                warpType === value
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-400'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ControlGroup section="transforms" param="x" value={transformsX} set={setTransform} onInteract={onInteract} />
      <ControlGroup section="transforms" param="y" value={transformsY} set={setTransform} onInteract={onInteract} />

      <Toggle label="REPEAT" help="tiling.type" isOn={tilingType !== 'none'} onToggle={toggleRepeat} />
    </div>
  )
})
