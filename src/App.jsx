import { lazy, Suspense, useEffect } from 'react'
import { ControlsShell } from './components/controls/ControlsShell'
import { HelpModal } from './components/HelpModal'
import { useAnimator } from './hooks/useAnimator'
import { useGamepad } from './hooks/useGamepad'
import { useProjectionStateBridge } from './hooks/useProjectionStateBridge'
import { presets } from './presets'
import { useStore } from './store/useStore'
import { hasRenderableProjectionSurface } from './utils/projectionSources'
import { isProjectionWindow } from './utils/windowMode'
import { midiManager } from './core/MidiManager'

import { ErrorBoundary } from './components/ErrorBoundary'

const LazyCanvas = lazy(() => import('./components/CanvasGL').then(mod => ({ default: mod.CanvasGL })))
const PROJECTION_PATTERN_MODES = ['off', 'overlay', 'replace']
const PROJECTION_PATTERN_TYPES = ['grid', 'crosshair', 'checker']
const projectionWindowMode = isProjectionWindow()

function App() {
  useAnimator(!projectionWindowMode) // Hook for physics/animation loop (updates store)
  useGamepad(!projectionWindowMode) // Hook for Xbox controller input
  useProjectionStateBridge(projectionWindowMode)
  const hasVisualSource = useStore((state) => (
    state.media ||
    (state.generator?.type && state.generator.type !== 'none') ||
    hasRenderableProjectionSurface(state.projection, {
      mediaLibrary: state.mediaLibrary,
      scenes: state.scenes,
      userPresets: state.userPresets,
      builtinPresetCount: presets.length,
    }) ||
    state.projection?.blackout ||
    (state.projection?.patternMode && state.projection.patternMode !== 'off')
  ))
  const controlsOpen = useStore((state) => state.ui.controlsOpen)
  const recordingIsActive = useStore((state) => state.recording.isActive)

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

      // Undo / Redo (always works, even with input focus)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        store.undo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        store.redo()
        return
      }

      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      switch (e.key.toLowerCase()) {
        case 'h':
          store.toggleControls(!store.ui.controlsOpen)
          break
        case 'b':
          store.setProjection('blackout', !store.projection?.blackout)
          break
        case 'escape':
          if (store.projection?.calibrating) {
            store.setProjection('calibrating', false)
          }
          break
        case 'p': {
          if (e.shiftKey) {
            const currentPatternType = store.projection?.patternType || 'grid'
            const typeIndex = PROJECTION_PATTERN_TYPES.indexOf(currentPatternType)
            store.setProjection('patternType', PROJECTION_PATTERN_TYPES[(typeIndex + 1) % PROJECTION_PATTERN_TYPES.length])
            break
          }

          const currentPatternMode = store.projection?.patternMode || 'off'
          const modeIndex = PROJECTION_PATTERN_MODES.indexOf(currentPatternMode)
          store.setProjection('patternMode', PROJECTION_PATTERN_MODES[(modeIndex + 1) % PROJECTION_PATTERN_MODES.length])
          break
        }
        case 's':
          store.addSnapshot()
          // Visual feedback could be added here
          break
        case 'r':
          // Toggle Recording
          store.setRecording('isActive', !store.recording.isActive)
          break
        case 'f':
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
          } else {
            document.exitFullscreen()
          }
          break
        case 'backspace':
          // Optional: Reset param helper? Maybe too dangerous.
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
            <div className="text-sm font-semibold text-white mb-1">Start creating</div>
            <div className="text-xs text-neutral-400">Upload an image/video or pick a generator to begin.</div>
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

      {/* Recording Indicator */}
      {!projectionWindowMode && recordingIsActive && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 pointer-events-none animate-pulse">
          <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
          <span className="text-red-500 font-bold font-mono text-xs tracking-widest uppercase">REC</span>
        </div>
      )}

      {!projectionWindowMode && <HelpModal />}
    </div>
  )
}

export default App
