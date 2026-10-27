import { useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'
import { useShallow } from 'zustand/shallow'
import { presets } from '../../presets'
import {
  getActiveAuthoredSceneDraftState,
  getActiveAuthoredSceneId,
} from '../../store/useStore'
import {
  getDraftAwareSceneState,
  getProjectionSurfaceSourceMeta,
  getRenderableProjectionSurfaces,
  getVisibleProjectionSurfaces,
  hasRenderableLiveProjectionSurface,
} from '../../utils/projectionSources'

// Visible labels are plain language; the `value`s are the store values and must not change.
const PATTERN_MODES = [
  { value: 'off', label: 'OFF' },
  { value: 'overlay', label: 'ON TOP' },
  { value: 'replace', label: 'GRID ONLY' },
]

const PATTERN_TYPES = [
  { value: 'grid', label: 'GRID' },
  { value: 'crosshair', label: 'CROSS' },
  { value: 'checker', label: 'CHECK' },
]

const SURFACE_BLEND_MODES = [
  { value: 'screen', label: 'LIGHTEN' },
  { value: 'normal', label: 'SOLID' },
  { value: 'add', label: 'GLOW' },
  { value: 'multiply', label: 'DARKEN' },
]

const BLEND_LABELS = Object.fromEntries(SURFACE_BLEND_MODES.map(({ value, label }) => [value, label]))

const SURFACE_EDIT_MODES = [
  { value: 'warp', label: 'MOVE CORNERS' },
  { value: 'mask', label: 'CUT SHAPE' },
]

const BTN = 'rounded border px-2 py-1.5 text-[8px] tracking-[0.14em] transition-colors'
const BTN_PRIMARY = `${BTN} border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20`
const BTN_NEUTRAL = `${BTN} border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-500`
const BTN_WARN = `${BTN} border-amber-500/40 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20`
const BTN_DANGER = `${BTN} border-red-900/50 bg-red-950/20 text-red-300 hover:border-red-500`
const LABEL = 'text-[9px] tracking-widest text-neutral-500'

function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`
}

function getSceneOriginLabel(scene) {
  const originType = scene?.origin?.type
  const originLabel = scene?.origin?.label

  if (originLabel) return originLabel.toUpperCase()
  if (originType === 'live') return 'MAIN VISUAL'
  if (originType === 'scene') return 'COPY OF A LOOK'
  if (originType === 'media') return 'MEDIA'
  if (originType === 'builtin') return 'PRESET'
  if (originType === 'user') return 'MY PRESET'
  return 'UNKNOWN'
}

function getSceneContentLabel(scene, activeSceneId = null, activeSceneDraftState = null) {
  const sceneState = getDraftAwareSceneState(scene, {
    activeSceneId,
    activeSceneDraftState,
  })

  return sceneState?.media?.name
    ? `MEDIA · ${sceneState.media.name.toUpperCase()}`
    : `GENERATOR · ${(sceneState?.generator?.type || 'none').toUpperCase()}`
}

// Plain-language label for a surface source (store meta labels are technical).
function getFriendlySourceLabel(meta) {
  if (!meta || meta.isLive) return 'MAIN VISUAL'
  if (!meta.isValid) return 'SOURCE MISSING'
  return String(meta.label || '')
    .replace(/^SCENE · /, 'LOOK · ')
    .replace(/^BUILT-IN · /, 'PRESET · ')
    .replace(/^USER · /, 'MY PRESET · ')
}

function Hint({ children, tone = 'muted' }) {
  const color = tone === 'warn' ? 'text-amber-200' : 'text-neutral-500'
  return <p className={`mt-1.5 text-[9px] leading-snug ${color}`}>{children}</p>
}

function Toggle({ label, value, onChange, help, title }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3" data-help={help} title={title}>
      <div className="min-w-0 truncate text-[9px] tracking-widest text-neutral-500">{label}</div>
      <button
        type="button"
        onClick={onChange}
        role="switch"
        aria-checked={value}
        aria-label={label}
        title={title}
        className={`relative h-4 w-8 shrink-0 rounded-full border transition-colors ${
          value ? 'border-cyan-400 bg-cyan-950' : 'border-neutral-700 bg-neutral-800'
        }`}
      >
        <div className={`absolute top-0.5 h-2.5 w-2.5 rounded-full transition-transform ${value ? 'translate-x-4 bg-cyan-300' : 'translate-x-0.5 bg-neutral-500'}`} />
      </button>
    </div>
  )
}

function SegmentRow({ options, value, onChange, help, title }) {
  return (
    <div className="flex gap-1" data-help={help} title={title}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`min-w-0 flex-1 truncate rounded border px-0.5 py-1.5 text-[8px] tracking-wide transition-colors ${
            value === option.value
              ? 'border-cyan-400 bg-cyan-950 text-cyan-300'
              : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-500'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

// Two-click destructive button: first click arms ("SURE?"), second click runs onConfirm.
function ConfirmButton({ id, armed, setArmed, onConfirm, label, className, help, title }) {
  const isArmed = armed === id
  return (
    <button
      type="button"
      data-help={help}
      title={isArmed ? 'Click again to confirm' : title}
      onClick={() => {
        if (isArmed) {
          setArmed(null)
          onConfirm()
        } else {
          setArmed(id)
        }
      }}
      onBlur={() => { if (isArmed) setArmed(null) }}
      className={`${className} ${isArmed ? '!border-red-400 !bg-red-900/60 !text-red-100' : ''}`}
    >
      {isArmed ? 'SURE?' : label}
    </button>
  )
}

function MoreToggle({ open, onToggle, help }) {
  return (
    <button
      type="button"
      data-help={help}
      title="More actions"
      aria-label="More actions"
      aria-expanded={open}
      onClick={onToggle}
      className={`${BTN} min-w-[28px] shrink-0 ${open ? 'border-cyan-400 bg-cyan-950 text-cyan-300' : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-500'}`}
    >
      ⋯
    </button>
  )
}

export function SectionOutput({ onInteract }) {
  const [displays, setDisplays] = useState([])
  const [armed, setArmed] = useState(null)
  const [openMenu, setOpenMenu] = useState(null)
  const {
    mediaLibrary,
    projection,
    scenes,
    activeSceneId,
    activeSceneDraftState,
    userPresets,
    saveScene,
    captureProjectionSurfaceAsScene,
    authorProjectionSurfaceScene,
    duplicateScene,
    updateScene,
    captureSceneState,
    loadSceneToLive,
    startSceneEdit,
    deleteScene,
    assignSceneToSurface,
    assignProjectionSurfaceSource,
    setActiveMediaAsset,
    setProjection,
    resetProjection,
    saveProjectionProfile,
    applyProjectionProfile,
    deleteProjectionProfile,
    addProjectionSurface,
    updateProjectionSurface,
    duplicateProjectionSurface,
    removeProjectionSurface,
    renameMediaAsset,
    removeMediaAsset,
    setProjectionSurfacesLive,
    resetInvalidProjectionSurfaceSources,
    addProjectionSurfaceMaskPoint,
    removeProjectionSurfaceMaskPoint,
    resetProjectionSurfaceMask,
  } = useStore(
    useShallow((state) => ({
      mediaLibrary: state.mediaLibrary,
      projection: state.projection,
      scenes: state.scenes,
      activeSceneId: getActiveAuthoredSceneId(state),
      activeSceneDraftState: getActiveAuthoredSceneDraftState(state),
      userPresets: state.userPresets,
      saveScene: state.saveScene,
      captureProjectionSurfaceAsScene: state.captureProjectionSurfaceAsScene,
      authorProjectionSurfaceScene: state.authorProjectionSurfaceScene,
      duplicateScene: state.duplicateScene,
      updateScene: state.updateScene,
      captureSceneState: state.captureSceneState,
      loadSceneToLive: state.loadSceneToLive,
      startSceneEdit: state.startSceneEdit,
      deleteScene: state.deleteScene,
      assignSceneToSurface: state.assignSceneToSurface,
      assignProjectionSurfaceSource: state.assignProjectionSurfaceSource,
      setActiveMediaAsset: state.setActiveMediaAsset,
      setProjection: state.setProjection,
      resetProjection: state.resetProjection,
      saveProjectionProfile: state.saveProjectionProfile,
      applyProjectionProfile: state.applyProjectionProfile,
      deleteProjectionProfile: state.deleteProjectionProfile,
      addProjectionSurface: state.addProjectionSurface,
      updateProjectionSurface: state.updateProjectionSurface,
      duplicateProjectionSurface: state.duplicateProjectionSurface,
      removeProjectionSurface: state.removeProjectionSurface,
      renameMediaAsset: state.renameMediaAsset,
      removeMediaAsset: state.removeMediaAsset,
      setProjectionSurfacesLive: state.setProjectionSurfacesLive,
      resetInvalidProjectionSurfaceSources: state.resetInvalidProjectionSurfaceSources,
      addProjectionSurfaceMaskPoint: state.addProjectionSurfaceMaskPoint,
      removeProjectionSurfaceMaskPoint: state.removeProjectionSurfaceMaskPoint,
      resetProjectionSurfaceMask: state.resetProjectionSurfaceMask,
    }))
  )
  const [advancedOpen, setAdvancedOpen] = useState(
    () => (projection.surfaces?.length || 0) > 0 || (scenes?.length || 0) > 0 || Boolean(activeSceneId)
  )
  const selectedSurface = projection.surfaces?.find((surface) => surface.id === projection.selectedSurfaceId) || null
  const projectionSourceOptions = {
    mediaLibrary,
    scenes,
    userPresets,
    builtinPresets: presets,
    builtinPresetCount: presets.length,
  }
  const visibleSurfaces = getVisibleProjectionSurfaces(projection)
  const renderableVisibleSurfaces = getRenderableProjectionSurfaces(projection, projectionSourceOptions)
  const surfaceSourceMetaById = new Map((projection.surfaces || []).map((surface) => ([
    surface.id,
    getProjectionSurfaceSourceMeta(surface, projectionSourceOptions),
  ])))
  const selectedSurfaceSourceMeta = selectedSurface ? surfaceSourceMetaById.get(selectedSurface.id) : null
  const liveSurfaceCount = renderableVisibleSurfaces.filter((surface) => surfaceSourceMetaById.get(surface.id)?.isLive).length
  const independentSurfaceCount = renderableVisibleSurfaces.filter((surface) => !surfaceSourceMetaById.get(surface.id)?.isLive).length
  const invalidSurfaceCount = visibleSurfaces.filter((surface) => !surfaceSourceMetaById.get(surface.id)?.isValid).length
  const visibleNonLiveSurfaceCount = visibleSurfaces.filter((surface) => !surfaceSourceMetaById.get(surface.id)?.isLive).length
  const hasVisibleLiveSurface = hasRenderableLiveProjectionSurface(projection, projectionSourceOptions)
  const hasMixedStageState = liveSurfaceCount > 0 && independentSurfaceCount > 0
  const sourceOptions = [
    { value: 'live:live', label: 'MAIN VISUAL' },
    ...(mediaLibrary || []).map((asset) => ({ value: `media:${asset.id}`, label: `NEW LOOK FROM MEDIA · ${asset.name}` })),
    ...(scenes || []).map((scene) => ({ value: `scene:${scene.id}`, label: `LOOK · ${scene.name}` })),
    ...presets.map((preset, index) => ({ value: `builtin:${index}`, label: `NEW LOOK FROM PRESET · ${preset.name}` })),
    ...(userPresets || []).map((preset) => ({ value: `user:${preset.id}`, label: `NEW LOOK FROM MY PRESET · ${preset.name}` })),
  ]
  const selectedSurfaceAssignedScene = selectedSurface?.sourceMode === 'scene'
    ? (scenes || []).find((scene) => String(scene.id) === String(selectedSurface.sourceId)) || null
    : null
  const sceneUsageCountById = new Map(
    (projection.surfaces || []).reduce((entries, surface) => {
      if (surface.sourceMode !== 'scene' || !surface.sourceId) return entries
      const current = entries.get(surface.sourceId) || 0
      entries.set(surface.sourceId, current + 1)
      return entries
    }, new Map())
  )
  const selectedSceneUsageCount = selectedSurfaceAssignedScene
    ? sceneUsageCountById.get(selectedSurfaceAssignedScene.id) || 0
    : 0
  const selectedSurfaceSceneIsShared = selectedSceneUsageCount > 1

  function wrap(fn) {
    return (...args) => {
      onInteract?.()
      fn(...args)
    }
  }

  function toggleMenu(id) {
    setOpenMenu((current) => (current === id ? null : id))
  }

  useEffect(() => {
    if (!armed) return undefined
    const timer = setTimeout(() => setArmed(null), 3500)
    return () => clearTimeout(timer)
  }, [armed])

  useEffect(() => {
    if (!window.electronAPI?.listProjectionDisplays) return undefined

    let mounted = true

    window.electronAPI.listProjectionDisplays().then((nextDisplays) => {
      if (!mounted) return
      setDisplays(nextDisplays)
      if (!projection.displayId && nextDisplays[0]) {
        setProjection('displayId', nextDisplays[0].id)
      }
    }).catch(() => {})

    const unsubscribe = window.electronAPI.onProjectionWindowClosed?.(() => {
      setProjection('outputWindowOpen', false)
    })

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [projection.displayId, setProjection])

  const sourceHint = selectedSurfaceSourceMeta?.isLive
    ? 'Follows the left panel.'
    : selectedSurfaceSourceMeta && !selectedSurfaceSourceMeta.isValid
      ? 'This shape’s source is missing.'
      : 'Has its own look. Left-panel changes don’t affect it.'

  return (
    <div className="min-w-0 overflow-x-hidden">
      {/* ───────── PROJECTOR (always visible) ───────── */}
      <Toggle
        label="PROJECTION ON"
        help="output.projection"
        title="Send the picture through the projector mapping layer."
        value={projection.enabled}
        onChange={wrap(() => setProjection('enabled', !projection.enabled))}
      />

      <button
        type="button"
        data-help="output.line-up"
        title="Drag the 4 corner dots until the picture fits your wall. Esc to finish."
        aria-pressed={projection.calibrating}
        onClick={wrap(() => {
          if (projection.calibrating) {
            setProjection('calibrating', false)
            return
          }
          setProjection('enabled', true)
          setProjection('calibrating', true)
        })}
        className={`w-full rounded-md border px-3 py-2.5 text-[10px] font-semibold tracking-[0.18em] transition-colors ${
          projection.calibrating
            ? 'border-cyan-300 bg-cyan-300 text-black'
            : 'border-cyan-400/40 bg-cyan-950 text-cyan-300 hover:bg-cyan-900'
        }`}
      >
        {projection.calibrating ? 'DONE LINING UP' : 'LINE UP PROJECTOR'}
      </button>
      <Hint>Drag the 4 corner dots until the picture fits your wall. Esc to finish.</Hint>

      <div className="mt-4">
        <p className={`mb-1.5 ${LABEL}`}>ALIGNMENT GRID</p>
        <SegmentRow
          options={PATTERN_MODES}
          value={projection.patternMode}
          onChange={wrap((value) => setProjection('patternMode', value))}
          help="output.grid-mode"
          title="Show a test grid to help you line up the projector. Press P to cycle."
        />
        <div className="mt-1.5">
          <SegmentRow
            options={PATTERN_TYPES}
            value={projection.patternType}
            onChange={wrap((value) => setProjection('patternType', value))}
            help="output.grid-style"
            title="Pick the grid style. Press Shift+P to change."
          />
        </div>
        <Hint>P cycles, Shift+P changes style.</Hint>
      </div>

      <div className="mt-4">
        <Toggle
          label="BLACKOUT (B)"
          help="output.blackout"
          title="Instantly black out the projector. Press B."
          value={projection.blackout}
          onChange={wrap(() => setProjection('blackout', !projection.blackout))}
        />
      </div>

      <button
        type="button"
        data-help="output.reset-alignment"
        title="Put the four corners back to the full picture."
        onClick={wrap(() => resetProjection())}
        className={`${BTN_NEUTRAL} w-full font-semibold tracking-[0.18em]`}
      >
        RESET ALIGNMENT
      </button>

      {displays.length > 0 && (
        <div className="mt-3" data-help="output.display" title="Which screen the output window opens on.">
          <p className={`mb-1.5 ${LABEL}`}>OUTPUT DISPLAY</p>
          <select
            value={projection.displayId ?? ''}
            onChange={wrap(async (event) => {
              const nextDisplayId = Number(event.target.value)
              setProjection('displayId', nextDisplayId)
              if (projection.outputWindowOpen && window.electronAPI?.openProjectionWindow) {
                await window.electronAPI.openProjectionWindow(nextDisplayId)
              }
            })}
            className="w-full min-w-0 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-2 text-[10px] tracking-[0.12em] text-neutral-200 outline-none focus:border-cyan-400"
          >
            {displays.map((display) => (
              <option key={display.id} value={display.id}>
                {display.label}{display.isPrimary ? ' (PRIMARY)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {window.electronAPI?.openProjectionWindow && (
        <button
          type="button"
          data-help="output.window"
          title="Open or close the full-screen output window on the projector display."
          onClick={wrap(async () => {
            if (projection.outputWindowOpen) {
              await window.electronAPI.closeProjectionWindow()
              setProjection('outputWindowOpen', false)
              return
            }

            await window.electronAPI.openProjectionWindow(projection.displayId)
            setProjection('outputWindowOpen', true)
            setProjection('enabled', true)
          })}
          className={`mt-3 w-full rounded-md border px-3 py-2 text-[9px] font-semibold tracking-[0.18em] transition-colors ${
            projection.outputWindowOpen
              ? 'border-red-900/50 bg-red-950/20 text-red-300 hover:border-red-500'
              : 'border-cyan-400/40 bg-cyan-950 text-cyan-300 hover:bg-cyan-900'
          }`}
        >
          {projection.outputWindowOpen ? 'CLOSE OUTPUT' : 'OPEN OUTPUT'}
        </button>
      )}

      {/* ───────── ADVANCED: mapped shapes, saved looks, alignments ───────── */}
      <button
        type="button"
        data-help="output.advanced"
        title="Map the picture onto several shapes, and keep saved looks."
        aria-expanded={advancedOpen}
        onClick={() => setAdvancedOpen((open) => !open)}
        className="mt-4 flex w-full items-center justify-between gap-2 rounded-md border border-neutral-800 bg-neutral-950/60 px-2.5 py-2 text-left transition-colors hover:border-neutral-600"
      >
        <span className="min-w-0 truncate text-[9px] font-semibold tracking-[0.18em] text-neutral-300">
          <span aria-hidden="true" className="mr-1.5 text-neutral-500">{advancedOpen ? '▾' : '▸'}</span>
          ADVANCED: MAPPED SHAPES
        </span>
        {(projection.surfaces?.length || 0) > 0 && (
          <span className="shrink-0 text-[9px] text-cyan-300">{projection.surfaces.length}</span>
        )}
      </button>

      {advancedOpen && (
        <div className="mt-3 min-w-0 space-y-4">
          {/* MAPPED SHAPES */}
          <div className="min-w-0 rounded-xl border border-neutral-800 bg-neutral-950/60 p-2.5">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-1.5">
              <p className={LABEL}>MAPPED SHAPES</p>
              <button
                type="button"
                data-help="output.new-shape"
                title="Add another shape that you can place on a wall or object."
                onClick={wrap(() => addProjectionSurface())}
                className={BTN_PRIMARY}
              >
                + NEW SHAPE
              </button>
            </div>

            {projection.surfaces?.length > 0 ? (
              <div className="space-y-2">
                {visibleSurfaces.length > 0 && (
                  <div data-help="output.shape-summary" className="space-y-1 text-[9px] leading-snug">
                    {invalidSurfaceCount > 0 && (
                      <div className="text-amber-200">
                        {invalidSurfaceCount === 1 ? '1 shape’s source is missing' : `${invalidSurfaceCount} shapes’ sources are missing`}.
                      </div>
                    )}
                    {hasMixedStageState && (
                      <div className="text-neutral-300">
                        Mixed: {plural(liveSurfaceCount, 'shape follows', 'shapes follow')} the main visual, {independentSurfaceCount} {independentSurfaceCount === 1 ? 'has its' : 'have their'} own look.
                      </div>
                    )}
                    {!hasVisibleLiveSurface && renderableVisibleSurfaces.length > 0 && (
                      <div className="text-amber-200">
                        {plural(independentSurfaceCount, 'shape has its', 'shapes have their')} own look, so left-panel changes won’t show on stage.
                      </div>
                    )}
                    {renderableVisibleSurfaces.length === 0 && (
                      <div className="text-amber-200">No visible shape has a working source right now.</div>
                    )}
                    {(visibleNonLiveSurfaceCount > 0 || invalidSurfaceCount > 0) && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {visibleNonLiveSurfaceCount > 0 && (
                          <button
                            type="button"
                            data-help="output.all-main"
                            title="Make every visible shape follow the main visual."
                            onClick={wrap(() => setProjectionSurfacesLive(visibleSurfaces.map((surface) => surface.id)))}
                            className={BTN_PRIMARY}
                          >
                            ALL FOLLOW MAIN VISUAL
                          </button>
                        )}
                        {invalidSurfaceCount > 0 && (
                          <button
                            type="button"
                            data-help="output.reset-missing"
                            title="Send shapes with a missing source back to the main visual."
                            onClick={wrap(() => resetInvalidProjectionSurfaceSources(visibleSurfaces.map((surface) => surface.id)))}
                            className={BTN_WARN}
                          >
                            RESET MISSING TO MAIN
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {projection.surfaces.map((surface) => {
                  const meta = surfaceSourceMetaById.get(surface.id)
                  const isSelected = projection.selectedSurfaceId === surface.id
                  return (
                    <div
                      key={surface.id}
                      data-help="output.shape-row"
                      className={`min-w-0 rounded-md border px-2 py-1.5 ${isSelected ? 'border-cyan-400/40 bg-cyan-950/30' : 'border-neutral-800 bg-neutral-950/70'}`}
                    >
                      <button
                        type="button"
                        title="Select this shape"
                        onClick={wrap(() => setProjection('selectedSurfaceId', surface.id))}
                        className="block w-full min-w-0 text-left"
                      >
                        <div className="truncate text-[9px] font-semibold tracking-[0.14em] text-cyan-200">{surface.name.toUpperCase()}</div>
                        <div className={`truncate text-[8px] tracking-[0.1em] ${meta?.isValid === false ? 'text-amber-300' : meta?.isLive ? 'text-cyan-300/80' : 'text-neutral-400'}`}>
                          {getFriendlySourceLabel(meta)} · {BLEND_LABELS[surface.blendMode || 'screen'] || 'LIGHTEN'} · {Math.round((surface.opacity ?? 1) * 100)}%{surface.visible === false ? ' · HIDDEN' : ''}
                        </div>
                      </button>
                      {isSelected && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            data-help="output.shape-copy"
                            title="Make a copy of this shape."
                            onClick={wrap(() => duplicateProjectionSurface(surface.id))}
                            className={BTN_NEUTRAL}
                          >
                            COPY
                          </button>
                          <ConfirmButton
                            id={`surface:${surface.id}`}
                            armed={armed}
                            setArmed={setArmed}
                            help="output.shape-delete"
                            title="Delete this shape."
                            label="DELETE"
                            className={BTN_DANGER}
                            onConfirm={wrap(() => removeProjectionSurface(surface.id))}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}

                <button
                  type="button"
                  data-help="output.shape-edit"
                  title="Drag shape corners right on the picture. Esc when done."
                  onClick={wrap(() => setProjection('editingSurfaces', !projection.editingSurfaces))}
                  className={`w-full rounded-md border px-3 py-2 text-[9px] font-semibold tracking-[0.18em] transition-colors ${
                    projection.editingSurfaces
                      ? 'border-cyan-400 bg-cyan-300 text-black'
                      : 'border-cyan-400/40 bg-cyan-950 text-cyan-300 hover:bg-cyan-900'
                  }`}
                >
                  {projection.editingSurfaces ? 'DONE ON CANVAS' : 'EDIT ON CANVAS'}
                </button>
                {projection.editingSurfaces && (
                  <SegmentRow
                    options={SURFACE_EDIT_MODES}
                    value={projection.surfaceEditMode}
                    onChange={wrap((value) => setProjection('surfaceEditMode', value))}
                    help="output.shape-edit-mode"
                    title="Move corners to place the shape, or cut the shape’s outline."
                  />
                )}
              </div>
            ) : (
              <Hint>Add a shape to put the picture on a wall, screen or object.</Hint>
            )}

            {selectedSurface && (
              <div className="mt-3 min-w-0 space-y-3 border-t border-neutral-800 pt-3">
                <div data-help="output.shape-source" title="What this shape shows.">
                  <p className={`mb-1.5 ${LABEL}`}>SHOWS</p>
                  <select
                    value={`${selectedSurface.sourceMode || 'live'}:${selectedSurface.sourceId || 'live'}`}
                    onChange={wrap((event) => {
                      const [sourceMode, sourceId] = event.target.value.split(':')
                      assignProjectionSurfaceSource(selectedSurface.id, sourceMode, sourceId)
                    })}
                    className="w-full min-w-0 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-2 text-[10px] tracking-[0.08em] text-neutral-200 outline-none focus:border-cyan-400"
                  >
                    {sourceOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <Hint tone={selectedSurfaceSourceMeta && !selectedSurfaceSourceMeta.isValid ? 'warn' : 'muted'}>
                    {sourceHint}
                  </Hint>
                  {selectedSurfaceSourceMeta && !selectedSurfaceSourceMeta.isLive && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        title="Make this shape follow the main visual again."
                        onClick={wrap(() => assignProjectionSurfaceSource(selectedSurface.id, 'live', 'live'))}
                        className={BTN_PRIMARY}
                      >
                        FOLLOW MAIN VISUAL
                      </button>
                      {selectedSurfaceAssignedScene && (
                        <>
                          <button
                            type="button"
                            data-help="output.look-edit"
                            title="Edit this look with the left-panel controls. Other shapes aren’t affected."
                            onClick={wrap(() => authorProjectionSurfaceScene(selectedSurface.id))}
                            className={BTN_PRIMARY}
                          >
                            {activeSceneId === selectedSurfaceAssignedScene.id
                              ? 'EDITING THIS LOOK'
                              : selectedSurfaceSceneIsShared
                                ? 'COPY & EDIT'
                                : 'EDIT THIS LOOK'}
                          </button>
                          <button
                            type="button"
                            data-help="output.look-show"
                            title="Load this look into the main visual."
                            onClick={wrap(() => loadSceneToLive(selectedSurfaceAssignedScene.id))}
                            className={BTN_NEUTRAL}
                          >
                            SHOW ON MAIN
                          </button>
                        </>
                      )}
                      {!selectedSurfaceAssignedScene && (
                        <>
                          <button
                            type="button"
                            data-help="output.look-new-edit"
                            title="Turn this into a saved look and start editing it."
                            onClick={wrap(() => authorProjectionSurfaceScene(selectedSurface.id))}
                            className={BTN_PRIMARY}
                          >
                            NEW LOOK &amp; EDIT
                          </button>
                          <button
                            type="button"
                            data-help="output.look-save-shape"
                            title="Save what this shape shows as a look."
                            onClick={wrap(() => captureProjectionSurfaceAsScene(selectedSurface.id))}
                            className={BTN_NEUTRAL}
                          >
                            SAVE AS LOOK
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {selectedSurfaceAssignedScene && selectedSceneUsageCount > 1 && (
                    <Hint tone="warn">
                      Used by {selectedSceneUsageCount} shapes. COPY &amp; EDIT makes a private copy first.
                    </Hint>
                  )}
                  {selectedSurface.visible === false && (
                    <Hint tone="warn">This shape is hidden, so it won’t show on stage.</Hint>
                  )}
                </div>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    data-help="output.shape-rename"
                    title="Rename this shape."
                    onClick={wrap(() => {
                      const nextName = window.prompt('Rename shape:', selectedSurface.name)
                      if (!nextName?.trim()) return
                      updateProjectionSurface(selectedSurface.id, { name: nextName.trim() })
                    })}
                    className={`${BTN_NEUTRAL} min-w-0 flex-1 truncate`}
                  >
                    RENAME
                  </button>
                  <button
                    type="button"
                    data-help="output.shape-visibility"
                    title="Hide or show this shape on stage."
                    onClick={wrap(() => updateProjectionSurface(selectedSurface.id, { visible: selectedSurface.visible === false }))}
                    className={`${selectedSurface.visible === false ? BTN_PRIMARY : BTN_WARN} min-w-0 flex-1 truncate`}
                  >
                    {selectedSurface.visible === false ? 'SHOW SHAPE' : 'HIDE SHAPE'}
                  </button>
                </div>

                <div data-help="output.shape-opacity" title="How see-through this shape is.">
                  <div className="mb-1 flex items-center justify-between text-[9px] tracking-[0.18em] text-neutral-500">
                    <span>OPACITY</span>
                    <span className="text-cyan-300">{Math.round((selectedSurface.opacity ?? 1) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={selectedSurface.opacity ?? 1}
                    aria-label="Shape opacity"
                    onChange={wrap((event) => updateProjectionSurface(selectedSurface.id, { opacity: Number(event.target.value) }))}
                    className="w-full accent-cyan-300"
                  />
                </div>

                <div>
                  <p className={`mb-1.5 ${LABEL}`}>BLEND</p>
                  <SegmentRow
                    options={SURFACE_BLEND_MODES}
                    value={selectedSurface.blendMode}
                    onChange={wrap((value) => updateProjectionSurface(selectedSurface.id, { blendMode: value }))}
                    help="output.shape-blend"
                    title="How this shape mixes with the shapes beneath it: lighten, solid, glow or darken."
                  />
                </div>

                {projection.editingSurfaces && projection.surfaceEditMode === 'mask' && (
                  <div data-help="output.cut-points" title="Points that outline the shape. Drag them on the canvas.">
                    <div className="mb-1 flex items-center justify-between text-[9px] tracking-[0.18em] text-neutral-500">
                      <span>CUT POINTS</span>
                      <span className="text-amber-300">{selectedSurface.maskPoints?.length || 0}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={wrap(() => addProjectionSurfaceMaskPoint(selectedSurface.id, projection.selectedMaskPoint || 0))}
                        className={BTN_NEUTRAL}
                      >
                        + POINT
                      </button>
                      <button
                        type="button"
                        onClick={wrap(() => removeProjectionSurfaceMaskPoint(selectedSurface.id, projection.selectedMaskPoint || 0))}
                        disabled={(selectedSurface.maskPoints?.length || 0) <= 3}
                        className={`${BTN_DANGER} disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        − POINT
                      </button>
                      <button
                        type="button"
                        onClick={wrap(() => resetProjectionSurfaceMask(selectedSurface.id))}
                        className={`${BTN} border-amber-900/50 bg-amber-950/20 text-amber-300 hover:border-amber-500`}
                      >
                        RESET CUT
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SAVED LOOKS */}
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <p className={LABEL}>SAVED LOOKS</p>
              <button
                type="button"
                data-help="output.save-look"
                title="Save the generator, color and effects you have now as a reusable look."
                onClick={wrap(() => {
                  const name = window.prompt('Save look as:', `Look ${(scenes?.length || 0) + 1}`)
                  if (!name?.trim()) return
                  saveScene(name.trim(), { assignSelectedSurface: Boolean(selectedSurface) })
                })}
                className={BTN_PRIMARY}
              >
                SAVE CURRENT LOOK
              </button>
            </div>
            {(scenes || []).length > 0 ? (
              scenes.map((scene) => {
                const isEditing = activeSceneId === scene.id
                const usage = sceneUsageCountById.get(scene.id) || 0
                const menuId = `scene:${scene.id}`
                return (
                  <div
                    key={scene.id}
                    data-help="output.look-row"
                    className={`min-w-0 rounded-md border px-2 py-1.5 ${isEditing ? 'border-cyan-400/50 bg-cyan-950/30' : 'border-neutral-800 bg-neutral-950/70'}`}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-1.5">
                      <div className="min-w-0 truncate text-[9px] font-semibold tracking-[0.14em] text-cyan-200">{scene.name.toUpperCase()}</div>
                      <MoreToggle help="output.look-more" open={openMenu === menuId} onToggle={() => toggleMenu(menuId)} />
                    </div>
                    <div className="truncate text-[8px] tracking-[0.1em] text-neutral-400">
                      {getSceneContentLabel(scene, activeSceneId, activeSceneDraftState)}
                    </div>
                    <div className="flex min-w-0 items-center gap-1 text-[8px] tracking-[0.1em] text-neutral-600">
                      <span className="min-w-0 truncate">ORIGIN · {getSceneOriginLabel(scene)}</span>
                      {usage > 0 && <span className="shrink-0">· {plural(usage, 'SHAPE', 'SHAPES')}</span>}
                    </div>
                    <div className="mt-1.5 flex gap-1.5">
                      <button
                        type="button"
                        data-help="output.look-show"
                        title="Load this look into the main visual."
                        onClick={wrap(() => loadSceneToLive(scene.id))}
                        className={`${BTN_PRIMARY} min-w-0 flex-1 whitespace-nowrap !px-1 !tracking-[0.06em]`}
                      >
                        SHOW ON MAIN
                      </button>
                      <button
                        type="button"
                        data-help="output.look-edit"
                        title="Edit this look with the left-panel controls. Changes autosave to the look."
                        onClick={wrap(() => startSceneEdit(scene.id))}
                        className={`${BTN} min-w-0 flex-1 whitespace-nowrap !px-1 !tracking-[0.06em] ${
                          isEditing
                            ? 'border-cyan-400 bg-cyan-300 text-black'
                            : 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20'
                        }`}
                      >
                        {isEditing ? 'EDITING' : 'EDIT THIS LOOK'}
                      </button>
                    </div>
                    {openMenu === menuId && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5 border-t border-neutral-800 pt-1.5">
                        <button
                          type="button"
                          title="Rename this look."
                          onClick={wrap(() => {
                            const nextName = window.prompt('Rename look:', scene.name)
                            if (!nextName?.trim()) return
                            updateScene(scene.id, { name: nextName.trim() })
                          })}
                          className={BTN_NEUTRAL}
                        >
                          RENAME
                        </button>
                        {selectedSurface && (
                          <>
                            <button
                              type="button"
                              title="Use this look on the selected shape."
                              onClick={wrap(() => assignSceneToSurface(scene.id, selectedSurface.id))}
                              className={BTN_NEUTRAL}
                            >
                              USE ON SHAPE
                            </button>
                            <button
                              type="button"
                              title="Copy this look and use the copy on the selected shape."
                              onClick={wrap(() => duplicateScene(scene.id, {
                                surfaceId: selectedSurface.id,
                                assignSurface: true,
                                name: `${scene.name} ${selectedSurface.name}`,
                              }))}
                              className={BTN_NEUTRAL}
                            >
                              COPY
                            </button>
                          </>
                        )}
                        <ConfirmButton
                          id={`overwrite:${scene.id}`}
                          armed={armed}
                          setArmed={setArmed}
                          title="Replace this look with what the main visual shows now."
                          label="OVERWRITE WITH CURRENT"
                          className={BTN_PRIMARY}
                          onConfirm={wrap(() => captureSceneState(scene.id))}
                        />
                        <ConfirmButton
                          id={`delete-look:${scene.id}`}
                          armed={armed}
                          setArmed={setArmed}
                          title="Delete this look."
                          label="DELETE"
                          className={BTN_DANGER}
                          onConfirm={wrap(() => deleteScene(scene.id))}
                        />
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <Hint>Save the current look to reuse it later or put it on a shape.</Hint>
            )}
          </div>

          {/* SAVED ALIGNMENTS (profiles) */}
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <p className={LABEL}>SAVED ALIGNMENTS</p>
              <button
                type="button"
                data-help="output.save-alignment"
                title={projection.points ? 'Save the current projector alignment.' : 'Move a corner first'}
                onClick={wrap(() => {
                  const name = window.prompt('Save alignment as:', `Alignment ${projection.profiles.length + 1}`)
                  if (!name) return
                  saveProjectionProfile(name.trim())
                })}
                disabled={!projection.points}
                className={`${BTN_PRIMARY} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                SAVE ALIGNMENT
              </button>
            </div>
            {!projection.points && <Hint>Move a corner first.</Hint>}
            {projection.profiles.map((profile) => (
              <div key={profile.id} data-help="output.alignment-row" className="min-w-0 rounded-md border border-neutral-800 bg-neutral-950/70 px-2 py-1.5">
                <div className="truncate text-[9px] font-semibold tracking-[0.14em] text-cyan-200">{profile.name.toUpperCase()}</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    data-help="output.alignment-load"
                    title="Apply this saved alignment."
                    onClick={wrap(() => applyProjectionProfile(profile.id))}
                    className={BTN_PRIMARY}
                  >
                    LOAD
                  </button>
                  <ConfirmButton
                    id={`profile:${profile.id}`}
                    armed={armed}
                    setArmed={setArmed}
                    title="Delete this saved alignment."
                    label="DELETE"
                    className={BTN_DANGER}
                    onConfirm={wrap(() => deleteProjectionProfile(profile.id))}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* MEDIA LIBRARY */}
          {(mediaLibrary || []).length > 0 && (
            <div className="min-w-0 space-y-2">
              <p className={LABEL}>MEDIA LIBRARY</p>
              {mediaLibrary.map((asset) => {
                const menuId = `media:${asset.id}`
                return (
                  <div key={asset.id} data-help="output.media-row" className="min-w-0 rounded-md border border-neutral-800 bg-neutral-950/70 px-2 py-1.5">
                    <div className="flex min-w-0 items-center justify-between gap-1.5">
                      <div className="min-w-0 truncate text-[9px] font-semibold tracking-[0.14em] text-cyan-200">{asset.name.toUpperCase()}</div>
                      <MoreToggle help="output.media-more" open={openMenu === menuId} onToggle={() => toggleMenu(menuId)} />
                    </div>
                    <div className="truncate text-[8px] tracking-[0.1em] text-neutral-500">{asset.type.toUpperCase()}</div>
                    <div className="mt-1.5 flex gap-1.5">
                      <button
                        type="button"
                        data-help="output.media-main"
                        title="Show this media on the main visual."
                        onClick={wrap(() => setActiveMediaAsset(asset.id))}
                        className={`${BTN_PRIMARY} min-w-0 flex-1 whitespace-nowrap !px-1 !tracking-[0.06em]`}
                      >
                        SHOW ON MAIN
                      </button>
                      {selectedSurface && (
                        <button
                          type="button"
                          data-help="output.media-assign"
                          title="Put this media on the selected shape."
                          onClick={wrap(() => assignProjectionSurfaceSource(selectedSurface.id, 'media', asset.id))}
                          className={`${BTN_NEUTRAL} min-w-0 flex-1 whitespace-nowrap !px-1 !tracking-[0.06em]`}
                        >
                          USE ON SHAPE
                        </button>
                      )}
                    </div>
                    {openMenu === menuId && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5 border-t border-neutral-800 pt-1.5">
                        <button
                          type="button"
                          title="Rename this media."
                          onClick={wrap(() => {
                            const nextName = window.prompt('Rename media:', asset.name)
                            if (!nextName?.trim()) return
                            renameMediaAsset(asset.id, nextName.trim())
                          })}
                          className={BTN_NEUTRAL}
                        >
                          RENAME
                        </button>
                        <ConfirmButton
                          id={`delete-media:${asset.id}`}
                          armed={armed}
                          setArmed={setArmed}
                          title="Remove this media from the library."
                          label="DELETE"
                          className={BTN_DANGER}
                          onConfirm={wrap(() => removeMediaAsset(asset.id))}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
