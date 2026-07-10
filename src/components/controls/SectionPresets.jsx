import { useRef } from 'react'
import { useStore } from '../../store/useStore'
import { useShallow } from 'zustand/shallow'
import { presets } from '../../presets'

export function SectionPresets({ onInteract }) {
  const importRef = useRef(null)
  const { userPresets, loadSnapshot, addSnapshot, setUi, resetParams, exportProjectData, importProjectData } = useStore(
    useShallow((state) => ({
      userPresets:       state.userPresets,
      loadSnapshot:      state.loadSnapshot,
      addSnapshot:       state.addSnapshot,
      setUi:             state.setUi,
      resetParams:       state.resetParams,
      exportProjectData: state.exportProjectData,
      importProjectData: state.importProjectData,
    }))
  )

  const allPresets = [
    ...presets.map((p) => ({ ...p, isBuiltIn: true })),
    ...(userPresets ?? []).map((p) => ({ ...p, isBuiltIn: false })),
  ]

  function handleProjectExport() {
    onInteract?.()
    const suggestedName = window.prompt('Save project as:', 'lumenlab-project')
    if (!suggestedName?.trim()) return

    const projectData = exportProjectData()
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' })
    const downloadUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = downloadUrl
    anchor.download = suggestedName.trim().endsWith('.json')
      ? suggestedName.trim()
      : `${suggestedName.trim()}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(downloadUrl)
  }

  async function handleProjectImport(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!window.confirm('Replace the current project with the selected project file?')) return

    try {
      const raw = await file.text()
      importProjectData(JSON.parse(raw))
      onInteract?.()
    } catch {
      window.alert('Unable to load that project file.')
    }
  }

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
          EXPORT PNG
        </button>
      </div>
      <div className="mt-2 rounded-md border border-neutral-800 bg-neutral-950/70 px-2 py-2 text-[9px] leading-relaxed text-neutral-500">
        Project files now separate layout, reusable sources, and look presets explicitly, while keeping the live composition as its own boundary for compatibility.
      </div>
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleProjectExport}
          className="flex-1 bg-neutral-800 border border-neutral-700 hover:border-cyan-400 hover:text-cyan-400 text-neutral-400 rounded py-1.5 text-[8px] tracking-wider transition-colors"
        >
          SAVE PROJECT
        </button>
        <button
          onClick={() => { onInteract?.(); importRef.current?.click() }}
          className="flex-1 bg-neutral-800 border border-neutral-700 hover:border-cyan-400 hover:text-cyan-400 text-neutral-400 rounded py-1.5 text-[8px] tracking-wider transition-colors"
        >
          LOAD PROJECT
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleProjectImport}
        />
      </div>
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => { onInteract?.(); if (window.confirm('Reset all parameters to defaults?')) resetParams() }}
          className="flex-1 bg-neutral-800 border border-red-900/50 hover:border-red-500 hover:text-red-400 text-neutral-500 rounded py-1.5 text-[8px] tracking-wider transition-colors"
        >
          RESET
        </button>
      </div>
    </div>
  )
}
