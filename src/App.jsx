import { lazy, Suspense, useEffect } from 'react'
import { ControlsShell } from './components/controls/ControlsShell'
import { HelpModal } from './components/HelpModal'
import { useAnimator } from './hooks/useAnimator'
import { useGamepad } from './hooks/useGamepad'
import { useStore } from './store/useStore'
import { midiManager } from './core/MidiManager'

import { ErrorBoundary } from './components/ErrorBoundary'

const LazyCanvas = lazy(() => import('./components/CanvasGL').then(mod => ({ default: mod.CanvasGL })))

function App() {
  useAnimator() // Hook for physics/animation loop (updates store)
  useGamepad() // Hook for Xbox controller input

  useEffect(() => {
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
        case 'tab':
          e.preventDefault()
          store.toggleControls(!store.ui.controlsOpen)
          break
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
      <ControlsShell />
      {/* Blank state helper */}
      {!useStore((state) => state.image || (state.generator?.type && state.generator.type !== 'none')) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="bg-black/60 border border-white/10 rounded-xl px-6 py-4 text-center max-w-xs">
            <div className="text-sm font-semibold text-white mb-1">Start creating</div>
            <div className="text-xs text-neutral-400">Upload an image/video or pick a generator to begin.</div>
          </div>
        </div>
      )}
      {/* Floating Toggle Button (Visible when UI hidden) */}
      {!useStore((state) => state.ui.controlsOpen) && (
        <button
          onClick={() => useStore.getState().toggleControls(true)}
          className="fixed bottom-4 right-4 z-40 p-2 bg-neutral-800/50 hover:bg-neutral-800 text-white rounded-full border border-white/10 backdrop-blur transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v18h-6M10 17l5-5-5-5M13 12H3" /></svg>
        </button>
      )}

      {/* Recording Indicator */}
      {useStore((state) => state.recording.isActive) && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 pointer-events-none animate-pulse">
          <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
          <span className="text-red-500 font-bold font-mono text-xs tracking-widest uppercase">REC</span>
        </div>
      )}

      <HelpModal />
    </div>
  )
}

export default App
