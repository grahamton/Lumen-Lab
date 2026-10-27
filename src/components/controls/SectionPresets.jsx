import React, { useMemo, useRef } from 'react'
import { useStore } from '../../store/useStore'
import { useShallow } from 'zustand/shallow'
import { presets } from '../../presets'

const BTN = 'bg-neutral-800 border border-neutral-700 hover:border-cyan-400 hover:text-cyan-400 text-neutral-300 rounded py-2 text-[10px] tracking-wider transition-colors'

export const SectionPresets = React.memo(function SectionPresets({ onInteract }) {
  const importRef = useRef(null)
  const {
    userPresets, snapshots, loadSnapshot, addSnapshot, deleteSnapshot,
    setUi, resetParams, exportProjectData, importProjectData, notify,
  } = useStore(
    useShallow((state) => ({
      userPresets:       state.userPresets,
      snapshots:         state.snapshots,
      loadSnapshot:      state.loadSnapshot,
      addSnapshot:       state.addSnapshot,
      deleteSnapshot:    state.deleteSnapshot,
      setUi:             state.setUi,
      resetParams:       state.resetParams,
      exportProjectData: state.exportProjectData,
      importProjectData: state.importProjectData,
      notify:            state.notify,
    }))
  )

  const allPresets = useMemo(() => [
    ...presets.map((p) => ({ ...p, isBuiltIn: true })),
    ...(userPresets ?? []).map((p) => ({ ...p, isBuiltIn: false })),
  ], [userPresets])

  function handleSaveLook() {
    onInteract?.()
    addSnapshot()
    notify?.(`Saved Look ${(useStore.getState().snapshots?.length ?? 0)}`)
  }

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

  function handleStartOver() {
    onInteract?.()
    resetParams()
    notify?.('Started over. Press Ctrl+Z to undo.')
  }

  return (
    <div>
      <p className="text-[10px] tracking-widest text-cyan-400 mb-1.5">YOUR LOOKS</p>
      {snapshots?.length > 0 ? (
        <div className="grid grid-cols-3 gap-1 mb-2" data-testid="look-grid">
          {snapshots.map((snap, i) => (
            <div key={`${snap.id}-${i}`} className="relative group">
              <button
                data-help="look.chip"
                onClick={() => { onInteract?.(); loadSnapshot(snap) }}
                className={`w-full ${BTN} px-1 truncate`}
              >
                Look {i + 1}
              </button>
              <button
                data-help="look.delete"
                aria-label={`Delete Look ${i + 1}`}
                onClick={() => { onInteract?.(); deleteSnapshot(i) }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neutral-900 border border-neutral-600 text-neutral-300 text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:border-red-500 hover:text-red-400 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-neutral-400 mb-2 leading-snug" data-testid="look-empty">
          Press S any time to save a look here.
        </p>
      )}
      <button
        data-help="look.save"
        onClick={handleSaveLook}
        className={`w-full mb-3 ${BTN}`}
      >
        SAVE LOOK (S)
      </button>

      {allPresets.length > 0 && (
        <>
          <p className="text-[10px] tracking-widest text-cyan-400 mb-1.5">READY-MADE</p>
          <div className="grid grid-cols-2 gap-1 mb-3">
            {allPresets.map((preset, i) => (
              <button
                key={preset.name + i}
                data-help="preset.item"
                onClick={() => { onInteract?.(); loadSnapshot(preset.state) }}
                className={`${BTN} px-2 text-left truncate`}
              >
                {preset.name.toUpperCase()}
              </button>
            ))}
          </div>
        </>
      )}

      <p className="text-[10px] tracking-widest text-cyan-400 mb-1.5">FILES</p>
      <div className="flex gap-1 mb-1">
        <button
          data-help="look.export"
          onClick={() => { onInteract?.(); setUi('exportRequest', { longEdge: 3840, filename: `LumenLab_${Date.now()}.png` }) }}
          className={`flex-1 ${BTN}`}
        >
          EXPORT PNG
        </button>
      </div>
      <div className="flex gap-1 mb-3">
        <button data-help="project.save" onClick={handleProjectExport} className={`flex-1 ${BTN}`}>
          SAVE PROJECT
        </button>
        <button data-help="project.load" onClick={() => { onInteract?.(); importRef.current?.click() }} className={`flex-1 ${BTN}`}>
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
      <button
        data-help="project.reset"
        onClick={handleStartOver}
        className="w-full bg-neutral-800 border border-red-900/50 hover:border-red-500 hover:text-red-400 text-neutral-400 rounded py-2 text-[10px] tracking-wider transition-colors"
      >
        START OVER
      </button>
    </div>
  )
})
