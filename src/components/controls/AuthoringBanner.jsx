import { useShallow } from 'zustand/shallow'
import {
  getActiveAuthoredSceneId,
  getActiveSceneEditorMode,
  getActiveSceneEditorSourceSurfaceName,
  useStore,
} from '../../store/useStore'

/**
 * Compact sticky banner shown while a saved look ("scene") is being edited.
 * Renders nothing when no authoring session is active.
 * Edits autosave to the look either way:
 * USE ON MAIN  -> stopSceneEdit({ restoreLive: false })  (formerly KEEP LIVE)
 * DONE EDITING -> stopSceneEdit({ restoreLive: true })  (formerly RESTORE LIVE)
 */
export function AuthoringBanner({ className = '' }) {
  const { sceneName, mode, surfaceName, stopSceneEdit } = useStore(
    useShallow((state) => {
      const activeId = getActiveAuthoredSceneId(state)
      const scene = activeId
        ? (state.scenes || []).find((entry) => String(entry.id) === String(activeId))
        : null
      return {
        sceneName: activeId ? (scene?.name || 'Untitled look') : null,
        mode: getActiveSceneEditorMode(state),
        surfaceName: getActiveSceneEditorSourceSurfaceName(state),
        stopSceneEdit: state.stopSceneEdit,
      }
    })
  )

  if (!sceneName) return null

  return (
    <div
      role="status"
      aria-live="polite"
      data-help="output.authoring-banner"
      title="You are editing a saved look. The left-panel controls change this look, not the main visual."
      className={`sticky top-0 z-10 shrink-0 border-b border-cyan-400/40 bg-cyan-950/95 px-3 py-2 backdrop-blur ${className}`}
    >
      <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-cyan-50">
        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-cyan-300" />
        <span className="min-w-0 truncate">
          Editing <span className="font-semibold text-cyan-200">‘{sceneName}’</span>
          {mode === 'surface' && surfaceName ? <span className="text-cyan-100/70"> for {surfaceName}</span> : null}
        </span>
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <button
          type="button"
          data-help="output.keep-changes"
          title="Stop editing and put this look on the main visual."
          onClick={() => stopSceneEdit({ restoreLive: false })}
          className="min-w-0 flex-1 truncate rounded border border-cyan-300 bg-cyan-300 px-1.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-black transition-colors hover:bg-cyan-200"
        >
          USE ON MAIN
        </button>
        <button
          type="button"
          data-help="output.discard-exit"
          title="Stop editing. The main visual goes back to what it was; your edits stay saved in the look."
          onClick={() => stopSceneEdit({ restoreLive: true })}
          className="min-w-0 flex-1 truncate rounded border border-neutral-600 bg-neutral-800 px-1.5 py-1 text-[10px] tracking-[0.12em] text-neutral-200 transition-colors hover:border-neutral-400"
        >
          DONE EDITING
        </button>
      </div>
    </div>
  )
}
