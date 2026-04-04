import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { useShallow } from 'zustand/shallow'
import { TopStrip } from './TopStrip'
import { CollapsibleSection } from './CollapsibleSection'
import { SectionGeometry } from './SectionGeometry'
import { SectionColor } from './SectionColor'
import { SectionEffects } from './SectionEffects'
import { SectionMotion } from './SectionMotion'
import { SectionPresets } from './SectionPresets'

const SECTIONS = [
  { id: 'geometry', title: 'GEOMETRY',  Component: SectionGeometry },
  { id: 'color',    title: 'COLOR',     Component: SectionColor    },
  { id: 'effects',  title: 'EFFECTS',   Component: SectionEffects  },
  { id: 'motion',   title: 'MOTION',    Component: SectionMotion   },
  { id: 'presets',  title: 'PRESETS',   Component: SectionPresets  },
]

export function ControlsShell({ className = '' }) {
  const {
    undo, redo, undoStackLen, redoStackLen,
    controlsOpen, lastActiveSection, globalPause,
    setUi, recordingIsActive, setRecording, toggleControls
  } = useStore(
    useShallow((state) => ({
      undo:              state.undo,
      redo:              state.redo,
      undoStackLen:      state.undoStack.length,
      redoStackLen:      state.redoStack.length,
      controlsOpen:      state.ui.controlsOpen,
      lastActiveSection: state.ui.lastActiveSection,
      globalPause:       state.ui.globalPause,
      setUi:             state.setUi,
      recordingIsActive: state.recording.isActive,
      setRecording:      state.setRecording,
      toggleControls:    state.toggleControls,
    }))
  )

  const initialSection = lastActiveSection ?? 'geometry'
  const [openSections, setOpenSections] = useState(() => new Set([initialSection]))
  const [activeSection, setActiveSection] = useState(initialSection)

  function handleToggle(id) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleInteract(id) {
    setActiveSection(id)
    if (id !== activeSection) {
      setUi('lastActiveSection', id)
    }
    setOpenSections((prev) => {
      if (prev.has(id)) return prev
      return new Set([...prev, id])
    })
  }

  return (
    <div className={`absolute left-0 top-0 h-full z-30 w-64 flex flex-col bg-neutral-900 border-r border-neutral-700 transition-transform duration-200 ${controlsOpen ? 'translate-x-0' : '-translate-x-full'} ${className}`}>
      {/* Topbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 shrink-0">
        <span className="text-cyan-400 font-bold tracking-widest text-sm">LUMEN LAB</span>
        <div className="flex gap-1">
          <button
            onClick={undo}
            disabled={undoStackLen === 0}
            title="Undo"
            aria-label="Undo"
            className="w-6 h-6 flex items-center justify-center rounded text-neutral-400 hover:text-cyan-400 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
          >
            ↩
          </button>
          <button
            onClick={redo}
            disabled={redoStackLen === 0}
            title="Redo"
            aria-label="Redo"
            className="w-6 h-6 flex items-center justify-center rounded text-neutral-400 hover:text-cyan-400 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
          >
            ↪
          </button>
          <button
            onClick={() => toggleControls(false)}
            title="Hide panel (H)"
            aria-label="Hide panel"
            className="w-6 h-6 flex items-center justify-center rounded text-neutral-400 hover:text-cyan-400 hover:bg-neutral-800 transition-colors text-sm"
          >
            ✕
          </button>
        </div>
      </div>

      {/* TopStrip */}
      <TopStrip />

      {/* Collapsible sections */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {SECTIONS.map(({ id, title, Component }) => (
          <CollapsibleSection
            key={id}
            id={id}
            title={title}
            isOpen={openSections.has(id)}
            isActive={activeSection === id}
            onToggle={handleToggle}
          >
            <Component onInteract={() => handleInteract(id)} />
          </CollapsibleSection>
        ))}
      </div>

      {/* Bottombar */}
      <div className="flex gap-2 px-3 py-2.5 border-t border-neutral-800 shrink-0">
        <button
          onClick={() => setUi('globalPause', !globalPause)}
          aria-pressed={globalPause}
          className={`flex-1 py-1.5 rounded text-[9px] tracking-widest font-semibold border transition-colors ${
            globalPause
              ? 'bg-cyan-400 border-cyan-400 text-neutral-900'
              : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
          }`}
        >
          FREEZE
        </button>
        <button
          onClick={() => setRecording('isActive', !recordingIsActive)}
          aria-pressed={recordingIsActive}
          aria-label={recordingIsActive ? 'Stop recording' : 'Start recording'}
          className={`flex-1 py-1.5 rounded text-[9px] tracking-widest font-semibold border transition-colors ${
            recordingIsActive
              ? 'bg-red-500 border-red-500 text-white'
              : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
          }`}
        >
          {recordingIsActive ? 'REC ●' : 'REC'}
        </button>
      </div>
    </div>
  )
}
