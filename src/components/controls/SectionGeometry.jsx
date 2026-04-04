import { useStore } from '../../store/useStore'
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
        className={`w-7 h-3.5 rounded-full relative transition-colors ${isOn ? 'bg-cyan-950 border border-cyan-400' : 'bg-neutral-700'}`}
      >
        <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-transform ${isOn ? 'translate-x-3.5 bg-cyan-400' : 'translate-x-0.5 bg-neutral-500'}`} />
      </button>
    </div>
  )
}

export function SectionGeometry({ onInteract }) {
  const { symmetry, setSymmetry, transforms, setTransform, warp, setWarp, displacement, setDisplacement, tiling, setTiling } = useStore()

  function wrap(fn) {
    return (...args) => { onInteract?.(); fn(...args) }
  }

  return (
    <div>
      <ControlGroup section="symmetry" param="slices" value={symmetry.slices} onChange={wrap((v) => setSymmetry('slices', v))} />
      <ControlGroup section="transforms" param="rotation" value={transforms.rotation} onChange={wrap((v) => setTransform('rotation', v))} />
      <ControlGroup section="displacement" param="amp" value={displacement.amp} onChange={wrap((v) => setDisplacement('amp', v))} />

      <div className="mb-3">
        <p className="text-[9px] tracking-widest text-neutral-500 mb-1.5">WARP MODE</p>
        <div className="flex gap-1">
          {WARP_MODES.map(({ value, label }) => (
            <button
              key={value}
              onClick={wrap(() => setWarp('type', value))}
              className={`flex-1 py-1 rounded text-[8px] tracking-wider border transition-colors ${
                warp.type === value
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-400'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ControlGroup section="transforms" param="x" value={transforms.x} onChange={wrap((v) => setTransform('x', v))} />
      <ControlGroup section="transforms" param="y" value={transforms.y} onChange={wrap((v) => setTransform('y', v))} />

      <Toggle
        label="TILING"
        isOn={tiling.type !== 'none'}
        onToggle={wrap(() => setTiling('type', tiling.type === 'none' ? 'p4m' : 'none'))}
      />
    </div>
  )
}
