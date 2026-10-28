import { useCallback, useMemo, useRef, useState } from 'react'
import { Dices, HelpCircle } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useShallow } from 'zustand/shallow'
import { TopStrip } from './TopStrip'
import { MidiLearnBar } from './MidiLearnBar'
import { CollapsibleSection } from './CollapsibleSection'
import { InfoBar } from './InfoBar'
import { AuthoringBanner } from './AuthoringBanner'
import { SectionGeometry } from './SectionGeometry'
import { SectionColor } from './SectionColor'
import { SectionEffects } from './SectionEffects'
import { SectionMotion } from './SectionMotion'
import { SectionOutput } from './SectionOutput'
import { SectionPresets } from './SectionPresets'

const SECTIONS = [
  { id: 'geometry', title: 'GEOMETRY',  Component: SectionGeometry },
  { id: 'output',   title: 'OUTPUT',    Component: SectionOutput   },
  { id: 'color',    title: 'COLOR',     Component: SectionColor    },
  { id: 'effects',  title: 'EFFECTS',   Component: SectionEffects  },
  { id: 'motion',   title: 'MOTION',    Component: SectionMotion   },
  { id: 'presets',  title: 'PRESETS',   Component: SectionPresets  },
]

const ICON_BTN = 'w-7 h-7 flex items-center justify-center rounded text-neutral-400 hover:text-cyan-400 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm'

export function ControlsShell({ className = '' }) {
  const {
    undo, redo, undoStackLen, redoStackLen,
    controlsOpen, lastActiveSection, globalPause,
    setUi, recordingIsActive, setRecording, toggleControls, toggleHelp, randomize,
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
      toggleHelp:        state.toggleHelp,
      randomize:         state.randomize,
    }))
  )

  const rootRef = useRef(null)
  const [diceSpin, setDiceSpin] = useState(0)
  const [openSections, setOpenSections] = useState(() => new Set([lastActiveSection ?? 'geometry']))

  const handleToggle = useCallback((id) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Touching a control opens its section and remembers it. Handlers are created
  // once per section so the memoized section components never re-render for it.
  const interactHandlers = useMemo(() => {
    const handlers = {}
    for (const { id } of SECTIONS) {
      handlers[id] = () => {
        if (useStore.getState().ui.lastActiveSection !== id) setUi('lastActiveSection', id)
        setOpenSections((prev) => (prev.has(id) ? prev : new Set([...prev, id])))
      }
    }
    return handlers
  }, [setUi])

  function handleSurprise() {
    setDiceSpin((n) => n + 1)
    randomize()
  }

  return (
    <div
      ref={rootRef}
      className={`absolute left-0 top-0 h-full z-30 w-64 flex flex-col bg-neutral-900 border-r border-neutral-700 transition-transform duration-200 ${controlsOpen ? 'translate-x-0' : '-translate-x-full'} ${className}`}
    >
      {/* Topbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 shrink-0">
        <span className="text-cyan-400 font-bold tracking-widest text-sm">LUMEN LAB</span>
        <div className="flex gap-0.5">
          <button
            onClick={undo}
            disabled={undoStackLen === 0}
            data-help="ui.undo"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            className={ICON_BTN}
          >
            ↩
          </button>
          <button
            onClick={redo}
            disabled={redoStackLen === 0}
            data-help="ui.redo"
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo"
            className={ICON_BTN}
          >
            ↪
          </button>
          <button
            onClick={() => toggleHelp(true)}
            data-help="ui.help"
            title="Help (?)"
            aria-label="Help"
            className={ICON_BTN}
          >
            <HelpCircle size={15} />
          </button>
          <button
            onClick={() => toggleControls(false)}
            data-help="ui.hide"
            title="Hide panel (H)"
            aria-label="Hide panel"
            className={ICON_BTN}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Surprise me */}
      <div className="px-3 pt-2.5 shrink-0">
        <button
          onClick={handleSurprise}
          data-help="ui.surprise"
          className="w-full flex items-center justify-center gap-2 py-2 rounded bg-cyan-400 hover:bg-cyan-300 active:scale-[0.98] text-neutral-900 font-bold text-[11px] tracking-[0.2em] transition"
        >
          <Dices
            size={16}
            key={diceSpin}
            className={diceSpin > 0 ? 'animate-[spin_0.5s_ease-out_1]' : ''}
          />
          SURPRISE ME
        </button>
      </div>

      {/* While a saved look is being edited every control below targets it */}
      <AuthoringBanner />

      {/* TopStrip */}
      <TopStrip />

      <MidiLearnBar />

      {/* Collapsible sections */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {SECTIONS.map((section) => (
          <CollapsibleSection
            key={section.id}
            id={section.id}
            title={section.title}
            isOpen={openSections.has(section.id)}
            onToggle={handleToggle}
          >
            <section.Component onInteract={interactHandlers[section.id]} />
          </CollapsibleSection>
        ))}
      </div>

      {/* Info bar */}
      <InfoBar rootRef={rootRef} />

      {/* Bottombar */}
      <div className="flex gap-2 px-3 py-2.5 border-t border-neutral-800 shrink-0">
        <button
          onClick={() => setUi('globalPause', !globalPause)}
          data-help="ui.freeze"
          aria-pressed={globalPause}
          className={`flex-1 py-2 rounded text-[10px] tracking-widest font-semibold border transition-colors ${
            globalPause
              ? 'bg-cyan-400 border-cyan-400 text-neutral-900'
              : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-500'
          }`}
        >
          FREEZE
        </button>
        <button
          onClick={() => setRecording('isActive', !recordingIsActive)}
          data-help="ui.record"
          aria-pressed={recordingIsActive}
          aria-label={recordingIsActive ? 'Stop recording' : 'Start recording'}
          className={`flex-1 py-2 rounded text-[10px] tracking-widest font-semibold border transition-colors ${
            recordingIsActive
              ? 'bg-red-500 border-red-500 text-white'
              : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-500'
          }`}
        >
          {recordingIsActive ? 'REC ●' : 'REC'}
        </button>
      </div>
    </div>
  )
}
