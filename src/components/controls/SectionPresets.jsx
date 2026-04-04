import { useStore } from '../../store/useStore'
import { presets } from '../../presets'

export function SectionPresets({ onInteract }) {
  const { userPresets, loadSnapshot, addSnapshot, setUi } = useStore()

  const allPresets = [
    ...presets.map((p) => ({ ...p, isBuiltIn: true })),
    ...(userPresets ?? []).map((p) => ({ ...p, isBuiltIn: false })),
  ]

  return (
    <div>
      {allPresets.length > 0 && (
        <div className="grid grid-cols-2 gap-1 mb-3">
          {allPresets.map((preset, i) => (
            <button
              key={preset.name + i}
              onClick={() => { onInteract?.(); loadSnapshot(preset.state) }}
              className="bg-neutral-800 border border-neutral-700 hover:border-cyan-400 hover:text-cyan-400 rounded px-2 py-1.5 text-[8px] text-neutral-400 text-left tracking-wider truncate transition-colors"
            >
              {preset.name.toUpperCase()}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => { onInteract?.(); addSnapshot() }}
          className="flex-1 bg-neutral-800 border border-neutral-700 hover:border-cyan-400 hover:text-cyan-400 text-neutral-400 rounded py-1.5 text-[8px] tracking-wider transition-colors"
        >
          SAVE SNAPSHOT
        </button>
        <button
          onClick={() => { onInteract?.(); setUi('exportRequest', true) }}
          className="flex-1 bg-neutral-800 border border-neutral-700 hover:border-cyan-400 hover:text-cyan-400 text-neutral-400 rounded py-1.5 text-[8px] tracking-wider transition-colors"
        >
          EXPORT
        </button>
      </div>
    </div>
  )
}
