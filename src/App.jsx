import { lazy, Suspense, useEffect } from 'react'
import { ControlsShell } from './components/controls/ControlsShell'
import { HelpModal } from './components/HelpModal'
import { useAnimator } from './hooks/useAnimator'
import { useGamepad } from './hooks/useGamepad'
import { useProjectionStateBridge } from './hooks/useProjectionStateBridge'
import { presets } from './presets'
import { getEffectiveAuthoredSceneState, useStore } from './store/useStore'
import { hasRenderableProjectionSurface } from './utils/projectionSources'
import { isProjectionWindow } from './utils/windowMode'
import { midiManager } from './core/MidiManager'

import { ErrorBoundary } from './components/ErrorBoundary'
import { Toasts } from './components/Toasts'

const LazyCanvas = lazy(() => import('./components/CanvasGL').then(mod => ({ default: mod.CanvasGL })))
const PROJECTION_PATTERN_MODES = ['off', 'overlay', 'replace']
const PROJECTION_PATTERN_TYPES = ['grid', 'crosshair', 'checker']
const PATTERN_MODE_LABELS = { off: 'Alignment grid off', overlay: 'Alignment grid: on top', replace: 'Alignment grid only' }
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'number', 'password', 'url', 'tel'])

// Shortcuts stay live on sliders, toggles and buttons; only fields that take
// typed text (and selects, which use letters to jump) swallow keys.
function isTextEntryTarget(target) {
  if (!target) return false
  if (target.isContentEditable) return true
  if (target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return true
  return target.tagName === 'INPUT' && TEXT_INPUT_TYPES.has(target.type || 'text')
}
const projectionWindowMode = isProjectionWindow()

function App() {
  useAnimator(!projectionWindowMode) // Hook for physics/animation loop (updates store)
  useGamepad(!projectionWindowMode) // Hook for Xbox controller input
  useProjectionStateBridge(projectionWindowMode)
  const hasVisualSource = useStore((state) => {
    const effectiveSceneState = getEffectiveAuthoredSceneState(state)
    return (
      effectiveSceneState.media ||
      (effectiveSceneState.generator?.type && effectiveSceneState.generator.type !== 'none') ||
    hasRenderableProjectionSurface(state.projection, {
      mediaLibrary: state.mediaLibrary,
      scenes: state.scenes,
      userPresets: state.userPresets,
      builtinPresetCount: presets.length,
    }) ||
    state.projection?.blackout ||
    (state.projection?.patternMode && state.projection.patternMode !== 'off')
    )
  })
  const controlsOpen = useStore((state) => state.ui.controlsOpen)
  const recordingIsActive = useStore((state) => state.recording.isActive)
  const blackoutActive = useStore((state) => Boolean(state.projection?.blackout))
  const storageNotice = useStore((state) => state.ui.storageNotice)

  useEffect(() => {
    if (projectionWindowMode) {
      return undefined
    }

    const state = useStore.getState()

    // Startup Preference Check
    if (state.ui.resumeOnStartup === false) {
      console.log("Startup Preference: Start Fresh. Resetting state...")
      state.resetAll()
      // We need to re-fetch state after reset to ensure we have clean state for other checks if needed,
      // but resetAll() sets state synchronously in Zustand.
    }
    // Self-Repair (Only needed if we didn't just reset)
    else if (!state.audio || !state.flux || state.effects.bloom === undefined) {
      console.warn("Corrupted State detected. Performing Factory Reset.")
      state.resetAll()
      window.location.reload()
      return
    }

    midiManager.init()

    const handleKeyDown = (e) => {
      const store = useStore.getState()
      const typing = isTextEntryTarget(e.target)

      // Undo / Redo. Text fields keep their own undo.
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault()
        const redo = e.shiftKey
        const stack = redo ? store.redoStack : store.undoStack
        if (stack.length === 0) {
          store.notify(redo ? 'Nothing to redo' : 'Nothing to undo')
        } else {
          if (redo) store.redo()
          else store.undo()
          store.notify(redo ? 'Redo' : 'Undo')
        }
        return
      }

      // Leave browser/OS combos (Ctrl+R, Ctrl+S, Alt+F...) alone, and don't
      // re-toggle while a key is held down.
      if (typing || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return

      if (e.key === '?') {
        store.toggleHelp()
        return
      }
      // The help dialog handles its own keys (Esc closes it).
      if (store.ui.helpOpen) return

      switch (e.key.toLowerCase()) {
        case 'h':
          store.toggleControls(!store.ui.controlsOpen)
          break
        case 'b': {
          const blackout = !store.projection?.blackout
          store.setProjection('blackout', blackout)
          store.notify(blackout ? 'Blackout on · press B to bring it back' : 'Blackout off')
          break
        }
        case 'escape':
          if (store.projection?.calibrating) {
            store.setProjection('calibrating', false)
          }
          break
        case 'p': {
          if (e.shiftKey) {
            const currentPatternType = store.projection?.patternType || 'grid'
            const typeIndex = PROJECTION_PATTERN_TYPES.indexOf(currentPatternType)
            const nextType = PROJECTION_PATTERN_TYPES[(typeIndex + 1) % PROJECTION_PATTERN_TYPES.length]
            store.setProjection('patternType', nextType)
            store.notify(`Grid style: ${nextType}`)
            break
          }

          const currentPatternMode = store.projection?.patternMode || 'off'
          const modeIndex = PROJECTION_PATTERN_MODES.indexOf(currentPatternMode)
          const nextMode = PROJECTION_PATTERN_MODES[(modeIndex + 1) % PROJECTION_PATTERN_MODES.length]
          store.setProjection('patternMode', nextMode)
          store.notify(PATTERN_MODE_LABELS[nextMode])
          break
        }
        case 's':
          store.addSnapshot()
          store.notify(`Look ${useStore.getState().snapshots.length} saved`)
          break
        case 'r': {
          const recording = !store.recording.isActive
          store.setRecording('isActive', recording)
          store.notify(recording ? 'Recording · press R to stop' : 'Recording stopped · saving video')
          break
        }
        case 'f':
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => store.notify('Fullscreen is not available here'))
          } else {
            document.exitFullscreen?.().catch(() => {})
          }
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white">
      <ErrorBoundary fallback={<div className="absolute inset-0 flex items-center justify-center text-red-500 font-mono text-xs">Canvas Error - Recovering...</div>}>
        <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-neutral-500 font-mono text-xs">Loading viewer...</div>}>
          <LazyCanvas />
        </Suspense>
      </ErrorBoundary>
      {!projectionWindowMode && (
        <ErrorBoundary fallback={<div className="absolute left-0 top-0 h-full w-64 flex items-center justify-center text-red-500 font-mono text-xs bg-neutral-900">Panel Error</div>}>
          <ControlsShell />
        </ErrorBoundary>
      )}
      {/* Blank state helper */}
      {!projectionWindowMode && !hasVisualSource && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="bg-black/60 border border-white/10 rounded-xl px-6 py-4 text-center max-w-xs">
            <div className="text-sm font-semibold text-white mb-1">Nothing to show yet</div>
            <div className="text-xs text-neutral-400">Pick a pattern, drop in a picture or video, or press Surprise Me.</div>
          </div>
        </div>
      )}
      {/* Floating Toggle Button (Visible when UI hidden) */}
      {!projectionWindowMode && !controlsOpen && (
        <button
          onClick={() => useStore.getState().toggleControls(true)}
          title="Show panel (H)"
          className="fixed top-4 left-4 z-40 px-3 py-2 bg-neutral-900/90 hover:bg-neutral-800 text-cyan-400 font-bold tracking-widest text-xs rounded border border-neutral-700 hover:border-cyan-400 backdrop-blur transition-all"
        >
          ☰ LUMEN LAB
        </button>
      )}

      {/* Live-state pills: things that change what the audience sees */}
      {!projectionWindowMode && (recordingIsActive || blackoutActive) && (
        <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
          {recordingIsActive && (
            <div className="flex items-center gap-2 animate-pulse">
              <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
              <span className="text-red-500 font-bold font-mono text-xs tracking-widest uppercase">REC</span>
            </div>
          )}
          {blackoutActive && (
            <div className="rounded-full border border-amber-400/60 bg-black/80 px-3 py-1 font-mono text-xs font-bold tracking-widest text-amber-300">
              BLACKOUT · B
            </div>
          )}
        </div>
      )}

      {!projectionWindowMode && storageNotice && (
        <div role="alert" className="fixed top-4 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-lg border border-amber-400/50 bg-neutral-950/90 px-4 py-2 text-xs text-amber-200 shadow-lg">
          {storageNotice}
        </div>
      )}

      {!projectionWindowMode && <Toasts />}

      {!projectionWindowMode && <HelpModal />}
    </div>
  )
}

export default App
