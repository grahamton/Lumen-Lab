import { useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'
import { useShallow } from 'zustand/shallow'
import { presets } from '../../presets'
import {
  getProjectionSurfaceSourceMeta,
  getRenderableProjectionSurfaces,
  getVisibleProjectionSurfaces,
  hasRenderableLiveProjectionSurface,
} from '../../utils/projectionSources'

const PATTERN_MODES = [
  { value: 'off', label: 'OFF' },
  { value: 'overlay', label: 'OVERLAY' },
  { value: 'replace', label: 'REPLACE' },
]

const PATTERN_TYPES = [
  { value: 'grid', label: 'GRID' },
  { value: 'crosshair', label: 'CROSS' },
  { value: 'checker', label: 'CHECK' },
]

const SURFACE_BLEND_MODES = [
  { value: 'screen', label: 'SCREEN' },
  { value: 'normal', label: 'NORMAL' },
  { value: 'add', label: 'ADD' },
  { value: 'multiply', label: 'MULT' },
]

const SURFACE_EDIT_MODES = [
  { value: 'warp', label: 'WARP' },
  { value: 'mask', label: 'MASK' },
]

function Toggle({ label, value, onChange }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div>
        <div className="text-[9px] tracking-widest text-neutral-500">{label}</div>
      </div>
      <button
        type="button"
        onClick={onChange}
        role="switch"
        aria-checked={value}
        className={`relative h-4 w-8 rounded-full border transition-colors ${
          value ? 'border-cyan-400 bg-cyan-950' : 'border-neutral-700 bg-neutral-800'
        }`}
      >
        <div className={`absolute top-0.5 h-2.5 w-2.5 rounded-full transition-transform ${value ? 'translate-x-4 bg-cyan-300' : 'translate-x-0.5 bg-neutral-500'}`} />
      </button>
    </div>
  )
}

export function SectionOutput({ onInteract }) {
  const [displays, setDisplays] = useState([])
  const {
    mediaLibrary,
    projection,
    scenes,
    sceneEditor,
    userPresets,
    saveScene,
    captureProjectionSurfaceAsScene,
    startProjectionSurfaceSceneEdit,
    duplicateScene,
    updateScene,
    captureSceneState,
    loadSceneToLive,
    startSceneEdit,
    stopSceneEdit,
    deleteScene,
    assignSceneToSurface,
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
      sceneEditor: state.sceneEditor,
      userPresets: state.userPresets,
      saveScene: state.saveScene,
      captureProjectionSurfaceAsScene: state.captureProjectionSurfaceAsScene,
      startProjectionSurfaceSceneEdit: state.startProjectionSurfaceSceneEdit,
      duplicateScene: state.duplicateScene,
      updateScene: state.updateScene,
      captureSceneState: state.captureSceneState,
      loadSceneToLive: state.loadSceneToLive,
      startSceneEdit: state.startSceneEdit,
      stopSceneEdit: state.stopSceneEdit,
      deleteScene: state.deleteScene,
      assignSceneToSurface: state.assignSceneToSurface,
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
  const hasVisibleLiveSurface = hasRenderableLiveProjectionSurface(projection, projectionSourceOptions)
  const firstVisibleSurface = visibleSurfaces[0] || null
  const sourceOptions = [
    { value: 'live:live', label: 'LIVE OUTPUT' },
    ...(mediaLibrary || []).map((asset) => ({ value: `media:${asset.id}`, label: `MEDIA · ${asset.name}` })),
    ...(scenes || []).map((scene) => ({ value: `scene:${scene.id}`, label: `SCENE · ${scene.name}` })),
    ...presets.map((preset, index) => ({ value: `builtin:${index}`, label: `BUILT-IN · ${preset.name}` })),
    ...(userPresets || []).map((preset) => ({ value: `user:${preset.id}`, label: `USER · ${preset.name}` })),
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
  const activeEditedScene = sceneEditor?.activeSceneId
    ? (scenes || []).find((scene) => String(scene.id) === String(sceneEditor.activeSceneId)) || null
    : null

  function wrap(fn) {
    return (...args) => {
      onInteract?.()
      fn(...args)
    }
  }

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

  return (
    <div>
      <Toggle
        label="PROJECTION OUTPUT"
        value={projection.enabled}
        onChange={wrap(() => setProjection('enabled', !projection.enabled))}
      />
      <Toggle
        label="CALIBRATION OVERLAY"
        value={projection.calibrating}
        onChange={wrap(() => setProjection('calibrating', !projection.calibrating))}
      />
      <Toggle
        label="BLACKOUT"
        value={projection.blackout}
        onChange={wrap(() => setProjection('blackout', !projection.blackout))}
      />

      <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-[10px] leading-relaxed text-neutral-400">
        Four-corner mapping warps the final output to match a projector surface. Calibration is stored locally and reapplied on launch.
      </div>
      <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-[10px]">
        <div className="mb-2 flex items-center justify-between text-[9px] tracking-[0.18em] text-neutral-500">
          <span>STAGE SOURCES</span>
          <span className="text-cyan-300">{visibleSurfaces.length} VISIBLE</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-[9px] tracking-[0.16em]">
          <div className="rounded-md border border-neutral-800 bg-neutral-950/80 px-2 py-2">
            <div className="mb-1 text-[8px] text-neutral-500">LIVE</div>
            <div className={hasVisibleLiveSurface ? 'text-cyan-300' : 'text-amber-300'}>{liveSurfaceCount}</div>
          </div>
          <div className="rounded-md border border-neutral-800 bg-neutral-950/80 px-2 py-2">
            <div className="mb-1 text-[8px] text-neutral-500">INDEPENDENT</div>
            <div className="text-neutral-200">{independentSurfaceCount}</div>
          </div>
          <div className="rounded-md border border-neutral-800 bg-neutral-950/80 px-2 py-2">
            <div className="mb-1 text-[8px] text-neutral-500">MISSING</div>
            <div className={invalidSurfaceCount > 0 ? 'text-amber-300' : 'text-neutral-200'}>{invalidSurfaceCount}</div>
          </div>
        </div>
        {visibleSurfaces.length > 0 && renderableVisibleSurfaces.length === 0 && (
          <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-950/20 px-2 py-2 text-amber-100">
            Visible surfaces exist, but none have a valid renderable source right now.
          </div>
        )}
        {!hasVisibleLiveSurface && visibleSurfaces.length > 0 && (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-950/20 px-2 py-2 text-amber-100">
            <div>No visible surface is following the live generator.</div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={wrap(() => {
                  const targetSurface = selectedSurface || firstVisibleSurface
                  if (!targetSurface) return
                  updateProjectionSurface(targetSurface.id, { sourceMode: 'live', sourceId: 'live' })
                  setProjection('selectedSurfaceId', targetSurface.id)
                })}
                className="rounded border border-amber-500/40 bg-amber-400/10 px-2 py-1 text-[8px] tracking-[0.18em] text-amber-100 transition-colors hover:bg-amber-400/20"
              >
                FOLLOW LIVE
              </button>
              <button
                type="button"
                onClick={wrap(() => setProjectionSurfacesLive(visibleSurfaces.map((surface) => surface.id)))}
                className="rounded border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[8px] tracking-[0.18em] text-cyan-200 transition-colors hover:bg-cyan-400/20"
              >
                MAKE ALL LIVE
              </button>
            </div>
          </div>
        )}
        {(invalidSurfaceCount > 0 || visibleSurfaces.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {invalidSurfaceCount > 0 && (
              <button
                type="button"
                onClick={wrap(() => resetInvalidProjectionSurfaceSources(visibleSurfaces.map((surface) => surface.id)))}
                className="rounded border border-amber-500/40 bg-amber-400/10 px-2 py-1 text-[8px] tracking-[0.18em] text-amber-100 transition-colors hover:bg-amber-400/20"
              >
                RESET MISSING TO LIVE
              </button>
            )}
            {hasVisibleLiveSurface && visibleSurfaces.length > 1 && (
              <button
                type="button"
                onClick={wrap(() => setProjectionSurfacesLive(visibleSurfaces.map((surface) => surface.id)))}
                className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-[8px] tracking-[0.18em] text-neutral-300 transition-colors hover:border-neutral-500"
              >
                MAKE VISIBLE LIVE
              </button>
            )}
          </div>
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[9px] tracking-[0.2em] text-neutral-500">
        <div className="rounded-md border border-neutral-800 bg-neutral-950/80 px-2 py-2 text-center">
          <div className="mb-1 text-[8px]">CORNER</div>
          <div className="text-cyan-300">{['TL', 'TR', 'BR', 'BL'][projection.selectedCorner] ?? 'TL'}</div>
        </div>
        <div className="rounded-md border border-neutral-800 bg-neutral-950/80 px-2 py-2 text-center">
          <div className="mb-1 text-[8px]">PATTERN</div>
          <div className="text-cyan-300">{projection.patternMode.toUpperCase()}</div>
        </div>
        <div className="rounded-md border border-neutral-800 bg-neutral-950/80 px-2 py-2 text-center">
          <div className="mb-1 text-[8px]">NUDGE</div>
          <div className="text-cyan-300">{projection.nudgeStep}px</div>
        </div>
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-[9px] tracking-widest text-neutral-500">TEST PATTERN</p>
        <div className="flex gap-1">
          {PATTERN_MODES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={wrap(() => setProjection('patternMode', value))}
              aria-pressed={projection.patternMode === value}
              className={`flex-1 rounded py-1 text-[8px] tracking-wider border transition-colors ${
                projection.patternMode === value
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-[9px] tracking-widest text-neutral-500">PATTERN TYPE</p>
        <div className="flex gap-1">
          {PATTERN_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={wrap(() => setProjection('patternType', value))}
              aria-pressed={projection.patternType === value}
              className={`flex-1 rounded py-1 text-[8px] tracking-wider border transition-colors ${
                projection.patternType === value
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {displays.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[9px] tracking-widest text-neutral-500">OUTPUT DISPLAY</p>
          <select
            value={projection.displayId ?? ''}
            onChange={wrap((event) => setProjection('displayId', Number(event.target.value)))}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-2 text-[10px] tracking-[0.16em] text-neutral-200 outline-none focus:border-cyan-400"
          >
            {displays.map((display) => (
              <option key={display.id} value={display.id}>
                {display.label}{display.isPrimary ? ' (PRIMARY)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={wrap(() => resetProjection())}
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-[9px] font-semibold tracking-[0.2em] text-neutral-300 transition-colors hover:border-neutral-500"
        >
          RESET WARP
        </button>
        <button
          type="button"
          onClick={wrap(() => {
            setProjection('enabled', true)
            setProjection('calibrating', true)
          })}
          className="flex-1 rounded-md border border-cyan-400/40 bg-cyan-950 px-3 py-2 text-[9px] font-semibold tracking-[0.2em] text-cyan-300 transition-colors hover:bg-cyan-900"
        >
          CALIBRATE
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={wrap(() => {
            const name = window.prompt('Save projection profile as:', `Projection ${projection.profiles.length + 1}`)
            if (!name) return
            saveProjectionProfile(name.trim())
          })}
          disabled={!projection.points}
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-[9px] font-semibold tracking-[0.2em] text-neutral-300 transition-colors hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          SAVE PROFILE
        </button>
      </div>

      {window.electronAPI?.openProjectionWindow && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
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
            className={`flex-1 rounded-md border px-3 py-2 text-[9px] font-semibold tracking-[0.2em] transition-colors ${
              projection.outputWindowOpen
                ? 'border-red-900/50 bg-red-950/20 text-red-300 hover:border-red-500'
                : 'border-cyan-400/40 bg-cyan-950 text-cyan-300 hover:bg-cyan-900'
            }`}
          >
            {projection.outputWindowOpen ? 'CLOSE OUTPUT' : 'OPEN OUTPUT'}
          </button>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[9px] tracking-widest text-neutral-500">SURFACES</p>
          <button
            type="button"
            onClick={wrap(() => addProjectionSurface())}
            className="rounded border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[8px] tracking-[0.18em] text-cyan-200 transition-colors hover:bg-cyan-400/20"
          >
            ADD
          </button>
        </div>
        {projection.surfaces?.length > 0 ? (
          <div className="space-y-2">
            {projection.surfaces.map((surface) => (
              <div
                key={surface.id}
                className={`rounded-md border px-2 py-2 ${projection.selectedSurfaceId === surface.id ? 'border-cyan-400/40 bg-cyan-950/30' : 'border-neutral-800 bg-neutral-950/70'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={wrap(() => setProjection('selectedSurfaceId', surface.id))}
                    className="min-w-0 text-left"
                  >
                    <div className="truncate text-[9px] font-semibold tracking-[0.18em] text-cyan-200">{surface.name.toUpperCase()}</div>
                    <div className="text-[8px] tracking-[0.16em] text-neutral-500">
                      {surfaceSourceMetaById.get(surface.id)?.label || 'LIVE OUTPUT'} / {(surface.blendMode || 'screen').toUpperCase()} / {Math.round((surface.opacity ?? 1) * 100)}%{surface.visible === false ? ' / HIDDEN' : ''}
                    </div>
                    <div className={`mt-1 text-[8px] tracking-[0.14em] ${
                      surfaceSourceMetaById.get(surface.id)?.isValid === false
                        ? 'text-amber-300'
                        : surfaceSourceMetaById.get(surface.id)?.isLive
                          ? 'text-cyan-300'
                          : 'text-neutral-500'
                    }`}>
                      {surfaceSourceMetaById.get(surface.id)?.detail || 'Follows the main generator and effect controls'}
                    </div>
                  </button>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={wrap(() => duplicateProjectionSurface(surface.id))}
                      className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-[8px] tracking-[0.18em] text-neutral-300 transition-colors hover:border-neutral-500"
                    >
                      DUP
                    </button>
                    <button
                      type="button"
                      onClick={wrap(() => removeProjectionSurface(surface.id))}
                      className="rounded border border-red-900/50 bg-red-950/20 px-2 py-1 text-[8px] tracking-[0.18em] text-red-300 transition-colors hover:border-red-500"
                    >
                      X
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={wrap(() => setProjection('editingSurfaces', !projection.editingSurfaces))}
                className={`flex-1 rounded-md border px-3 py-2 text-[9px] font-semibold tracking-[0.2em] transition-colors ${
                  projection.editingSurfaces
                    ? 'border-cyan-400 bg-cyan-300 text-black'
                    : 'border-cyan-400/40 bg-cyan-950 text-cyan-300 hover:bg-cyan-900'
                }`}
              >
                {projection.editingSurfaces ? 'DONE EDITING' : 'EDIT SURFACES'}
              </button>
            </div>
            {projection.editingSurfaces && (
              <div className="mt-2 flex gap-1">
                {SURFACE_EDIT_MODES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={wrap(() => setProjection('surfaceEditMode', value))}
                    aria-pressed={projection.surfaceEditMode === value}
                    className={`flex-1 rounded py-1 text-[8px] tracking-wider border transition-colors ${
                      projection.surfaceEditMode === value
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-[10px] leading-relaxed text-neutral-500">
            Add mapped surfaces to duplicate the live visual across multiple projectable areas.
          </div>
        )}

        {selectedSurface && (
          <div className="mt-3 space-y-3 border-t border-neutral-800 pt-3">
            {!hasVisibleLiveSurface && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-[10px] leading-relaxed text-amber-200">
                No mapped surface is using <span className="font-semibold">LIVE OUTPUT</span>, so generator and effect changes will not appear on stage.
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={wrap(() => updateProjectionSurface(selectedSurface.id, { sourceMode: 'live', sourceId: 'live' }))}
                    className="rounded border border-amber-500/40 bg-amber-400/10 px-2 py-1 text-[8px] tracking-[0.18em] text-amber-100 transition-colors hover:bg-amber-400/20"
                  >
                    SET SELECTED TO LIVE
                  </button>
                </div>
              </div>
            )}
            <div>
              <p className="mb-1.5 text-[9px] tracking-widest text-neutral-500">SURFACE SOURCE</p>
              {selectedSurfaceSourceMeta && (
                <div className={`mb-2 rounded-md border px-2 py-2 text-[9px] leading-relaxed ${
                  selectedSurfaceSourceMeta.isValid
                    ? selectedSurfaceSourceMeta.isLive
                      ? 'border-cyan-400/30 bg-cyan-950/20 text-cyan-100'
                      : 'border-neutral-800 bg-neutral-950/80 text-neutral-300'
                    : 'border-amber-500/30 bg-amber-950/20 text-amber-100'
                }`}>
                  <div className="font-semibold tracking-[0.16em]">{selectedSurfaceSourceMeta.label}</div>
                  <div className="mt-1">{selectedSurfaceSourceMeta.detail}</div>
                </div>
              )}
              <select
                value={`${selectedSurface.sourceMode || 'live'}:${selectedSurface.sourceId || 'live'}`}
                onChange={wrap((event) => {
                  const [sourceMode, sourceId] = event.target.value.split(':')
                  updateProjectionSurface(selectedSurface.id, { sourceMode, sourceId })
                })}
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-2 text-[10px] tracking-[0.16em] text-neutral-200 outline-none focus:border-cyan-400"
              >
                {sourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <p className="mt-1.5 text-[9px] leading-relaxed text-neutral-500">
                `LIVE OUTPUT` follows the main generator, geometry, color, and effect controls. Other source modes are intentionally independent.
              </p>
              {selectedSurfaceSourceMeta && !selectedSurfaceSourceMeta.isLive && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={wrap(() => updateProjectionSurface(selectedSurface.id, { sourceMode: 'live', sourceId: 'live' }))}
                    className="rounded border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[8px] tracking-[0.18em] text-cyan-200 transition-colors hover:bg-cyan-400/20"
                  >
                    FOLLOW LIVE OUTPUT
                  </button>
                  {selectedSurfaceAssignedScene && (
                    <>
                      <button
                        type="button"
                        onClick={wrap(() => loadSceneToLive(selectedSurfaceAssignedScene.id))}
                        className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-[8px] tracking-[0.18em] text-neutral-300 transition-colors hover:border-neutral-500"
                      >
                        LOAD SCENE TO LIVE
                      </button>
                      <button
                        type="button"
                        onClick={wrap(() => startSceneEdit(selectedSurfaceAssignedScene.id))}
                        className="rounded border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[8px] tracking-[0.18em] text-cyan-200 transition-colors hover:bg-cyan-400/20"
                      >
                        {sceneEditor?.activeSceneId === selectedSurfaceAssignedScene.id ? 'EDITING SCENE' : 'EDIT SCENE'}
                      </button>
                      <button
                        type="button"
                        onClick={wrap(() => duplicateScene(selectedSurfaceAssignedScene.id, {
                          surfaceId: selectedSurface.id,
                          assignSurface: true,
                          name: `${selectedSurfaceAssignedScene.name} ${selectedSurface.name}`,
                        }))}
                        className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-[8px] tracking-[0.18em] text-neutral-300 transition-colors hover:border-neutral-500"
                      >
                        FORK TO SURFACE
                      </button>
                    </>
                  )}
                  {!selectedSurfaceAssignedScene && (
                    <>
                      <button
                        type="button"
                        onClick={wrap(() => captureProjectionSurfaceAsScene(selectedSurface.id))}
                        className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-[8px] tracking-[0.18em] text-neutral-300 transition-colors hover:border-neutral-500"
                      >
                        CAPTURE TO SCENE
                      </button>
                      <button
                        type="button"
                        onClick={wrap(() => startProjectionSurfaceSceneEdit(selectedSurface.id))}
                        className="rounded border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[8px] tracking-[0.18em] text-cyan-200 transition-colors hover:bg-cyan-400/20"
                      >
                        EDIT AS SCENE
                      </button>
                    </>
                  )}
                </div>
              )}
              {selectedSurfaceAssignedScene && selectedSceneUsageCount > 1 && (
                <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-950/20 px-2 py-2 text-[9px] leading-relaxed text-amber-100">
                  This scene is shared by {selectedSceneUsageCount} surfaces. Use <span className="font-semibold">FORK TO SURFACE</span> before editing if this surface should diverge.
                </div>
              )}
              {selectedSurface.visible === false && (
                <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-950/20 px-2 py-2 text-[9px] leading-relaxed text-amber-100">
                  This surface is hidden and will not render on stage until it is shown again.
                </div>
              )}
            </div>
            <div>
              <p className="mb-1.5 text-[9px] tracking-widest text-neutral-500">SURFACE STATE</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={wrap(() => {
                    const nextName = window.prompt('Rename surface:', selectedSurface.name)
                    if (!nextName?.trim()) return
                    updateProjectionSurface(selectedSurface.id, { name: nextName.trim() })
                  })}
                  className="flex-1 rounded border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-[8px] tracking-[0.18em] text-neutral-300 transition-colors hover:border-neutral-500"
                >
                  RENAME
                </button>
                <button
                  type="button"
                  onClick={wrap(() => updateProjectionSurface(selectedSurface.id, { visible: selectedSurface.visible === false }))}
                  className={`flex-1 rounded border px-2 py-1.5 text-[8px] tracking-[0.18em] transition-colors ${
                    selectedSurface.visible === false
                      ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20'
                      : 'border-amber-500/40 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20'
                  }`}
                >
                  {selectedSurface.visible === false ? 'SHOW SURFACE' : 'HIDE SURFACE'}
                </button>
              </div>
            </div>
            <div>
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
                onChange={wrap((event) => updateProjectionSurface(selectedSurface.id, { opacity: Number(event.target.value) }))}
                className="w-full accent-cyan-300"
              />
            </div>
            <div>
              <p className="mb-1.5 text-[9px] tracking-widest text-neutral-500">BLEND MODE</p>
              <div className="flex gap-1">
                {SURFACE_BLEND_MODES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={wrap(() => updateProjectionSurface(selectedSurface.id, { blendMode: value }))}
                    aria-pressed={selectedSurface.blendMode === value}
                    className={`flex-1 rounded py-1 text-[8px] tracking-wider border transition-colors ${
                      selectedSurface.blendMode === value
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[9px] tracking-[0.18em] text-neutral-500">
                <span>MASK POINTS</span>
                <span className="text-amber-300">{selectedSurface.maskPoints?.length || 0}</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={wrap(() => addProjectionSurfaceMaskPoint(selectedSurface.id, projection.selectedMaskPoint || 0))}
                  className="flex-1 rounded border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-[8px] tracking-[0.18em] text-neutral-300 transition-colors hover:border-neutral-500"
                >
                  ADD POINT
                </button>
                <button
                  type="button"
                  onClick={wrap(() => removeProjectionSurfaceMaskPoint(selectedSurface.id, projection.selectedMaskPoint || 0))}
                  disabled={(selectedSurface.maskPoints?.length || 0) <= 3}
                  className="flex-1 rounded border border-red-900/50 bg-red-950/20 px-2 py-1.5 text-[8px] tracking-[0.18em] text-red-300 transition-colors hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  DELETE
                </button>
                <button
                  type="button"
                  onClick={wrap(() => resetProjectionSurfaceMask(selectedSurface.id))}
                  className="flex-1 rounded border border-amber-900/50 bg-amber-950/20 px-2 py-1.5 text-[8px] tracking-[0.18em] text-amber-300 transition-colors hover:border-amber-500"
                >
                  RESET
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {projection.profiles.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-[9px] tracking-widest text-neutral-500">PROJECTION PROFILES</p>
          {projection.profiles.map((profile) => (
            <div key={profile.id} className="rounded-md border border-neutral-800 bg-neutral-950/70 px-2 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[9px] font-semibold tracking-[0.18em] text-cyan-200">{profile.name.toUpperCase()}</div>
                  <div className="text-[8px] tracking-[0.16em] text-neutral-500">{(profile.patternMode || 'off').toUpperCase()} / {(profile.patternType || 'grid').toUpperCase()}</div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={wrap(() => applyProjectionProfile(profile.id))}
                    className="rounded border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[8px] tracking-[0.18em] text-cyan-200 transition-colors hover:bg-cyan-400/20"
                  >
                    LOAD
                  </button>
                  <button
                    type="button"
                    onClick={wrap(() => deleteProjectionProfile(profile.id))}
                    className="rounded border border-red-900/50 bg-red-950/20 px-2 py-1 text-[8px] tracking-[0.18em] text-red-300 transition-colors hover:border-red-500"
                  >
                    X
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(mediaLibrary || []).length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[9px] tracking-widest text-neutral-500">MEDIA LIBRARY</p>
          {mediaLibrary.map((asset) => (
            <div key={asset.id} className="rounded-md border border-neutral-800 bg-neutral-950/70 px-2 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[9px] font-semibold tracking-[0.18em] text-cyan-200">{asset.name.toUpperCase()}</div>
                  <div className="text-[8px] tracking-[0.16em] text-neutral-500">{asset.type.toUpperCase()}</div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={wrap(() => setActiveMediaAsset(asset.id))}
                    className="rounded border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[8px] tracking-[0.18em] text-cyan-200 transition-colors hover:bg-cyan-400/20"
                  >
                    LIVE
                  </button>
                  {selectedSurface && (
                    <button
                      type="button"
                      onClick={wrap(() => updateProjectionSurface(selectedSurface.id, { sourceMode: 'media', sourceId: asset.id }))}
                      className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-[8px] tracking-[0.18em] text-neutral-300 transition-colors hover:border-neutral-500"
                    >
                      ASSIGN
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={wrap(() => {
                      const nextName = window.prompt('Rename media asset:', asset.name)
                      if (!nextName?.trim()) return
                      renameMediaAsset(asset.id, nextName.trim())
                    })}
                    className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-[8px] tracking-[0.18em] text-neutral-300 transition-colors hover:border-neutral-500"
                  >
                    NAME
                  </button>
                  <button
                    type="button"
                    onClick={wrap(() => removeMediaAsset(asset.id))}
                    className="rounded border border-red-900/50 bg-red-950/20 px-2 py-1 text-[8px] tracking-[0.18em] text-red-300 transition-colors hover:border-red-500"
                  >
                    X
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[9px] tracking-widest text-neutral-500">SCENE LIBRARY</p>
          <button
            type="button"
            onClick={wrap(() => {
              const name = window.prompt('Save scene as:', `Scene ${(scenes?.length || 0) + 1}`)
              if (!name?.trim()) return
              saveScene(name.trim(), { assignSelectedSurface: Boolean(selectedSurface) })
            })}
            className="rounded border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[8px] tracking-[0.18em] text-cyan-200 transition-colors hover:bg-cyan-400/20"
          >
            CAPTURE LIVE
          </button>
        </div>
        {activeEditedScene && (
          <div className="rounded-md border border-cyan-400/30 bg-cyan-950/20 px-3 py-2 text-[9px] leading-relaxed text-cyan-100">
            <div className="font-semibold tracking-[0.16em]">EDITING SCENE · {activeEditedScene.name.toUpperCase()}</div>
            <div className="mt-1 text-cyan-50/80">
              The live controls are temporarily driving this scene. Use UPDATE to save changes, then restore the previous live composition or keep the edited result intentionally.
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={wrap(() => stopSceneEdit({ restoreLive: true }))}
                className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-[8px] tracking-[0.18em] text-neutral-300 transition-colors hover:border-neutral-500"
              >
                RESTORE LIVE
              </button>
              <button
                type="button"
                onClick={wrap(() => stopSceneEdit({ restoreLive: false }))}
                className="rounded border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[8px] tracking-[0.18em] text-cyan-200 transition-colors hover:bg-cyan-400/20"
              >
                KEEP LIVE
              </button>
            </div>
          </div>
        )}
        {(scenes || []).length > 0 ? (
          scenes.map((scene) => (
            <div key={scene.id} className="rounded-md border border-neutral-800 bg-neutral-950/70 px-2 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[9px] font-semibold tracking-[0.18em] text-cyan-200">{scene.name.toUpperCase()}</div>
                  <div className="text-[8px] tracking-[0.16em] text-neutral-500">
                    {scene.state.media?.name ? `MEDIA · ${scene.state.media.name.toUpperCase()}` : `GENERATOR · ${(scene.state.generator?.type || 'none').toUpperCase()}`}
                  </div>
                  <div className="mt-1 text-[8px] tracking-[0.14em] text-neutral-600">
                    Load to the live controls, make changes, then use UPDATE to re-capture this scene.
                  </div>
                  <div className="mt-1 text-[8px] tracking-[0.14em] text-neutral-600">
                    USED BY {sceneUsageCountById.get(scene.id) || 0} SURFACE{(sceneUsageCountById.get(scene.id) || 0) === 1 ? '' : 'S'}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={wrap(() => loadSceneToLive(scene.id))}
                    className="rounded border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[8px] tracking-[0.18em] text-cyan-200 transition-colors hover:bg-cyan-400/20"
                  >
                    LOAD LIVE
                  </button>
                  <button
                    type="button"
                    onClick={wrap(() => startSceneEdit(scene.id))}
                    className={`rounded border px-2 py-1 text-[8px] tracking-[0.18em] transition-colors ${
                      sceneEditor?.activeSceneId === scene.id
                        ? 'border-cyan-400 bg-cyan-300 text-black'
                        : 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20'
                    }`}
                  >
                    {sceneEditor?.activeSceneId === scene.id ? 'EDITING' : 'EDIT'}
                  </button>
                  {selectedSurface && (
                    <button
                      type="button"
                      onClick={wrap(() => duplicateScene(scene.id, {
                        surfaceId: selectedSurface.id,
                        assignSurface: true,
                        name: `${scene.name} ${selectedSurface.name}`,
                      }))}
                      className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-[8px] tracking-[0.18em] text-neutral-300 transition-colors hover:border-neutral-500"
                    >
                      FORK
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={wrap(() => {
                      const nextName = window.prompt('Rename scene:', scene.name)
                      if (!nextName?.trim()) return
                      updateScene(scene.id, { name: nextName.trim() })
                    })}
                    className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-[8px] tracking-[0.18em] text-neutral-300 transition-colors hover:border-neutral-500"
                  >
                    NAME
                  </button>
                  <button
                    type="button"
                    onClick={wrap(() => captureSceneState(scene.id))}
                    className="rounded border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[8px] tracking-[0.18em] text-cyan-200 transition-colors hover:bg-cyan-400/20"
                  >
                    UPDATE
                  </button>
                  {selectedSurface && (
                    <button
                      type="button"
                      onClick={wrap(() => assignSceneToSurface(scene.id, selectedSurface.id))}
                      className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-[8px] tracking-[0.18em] text-neutral-300 transition-colors hover:border-neutral-500"
                    >
                      ASSIGN
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={wrap(() => deleteScene(scene.id))}
                    className="rounded border border-red-900/50 bg-red-950/20 px-2 py-1 text-[8px] tracking-[0.18em] text-red-300 transition-colors hover:border-red-500"
                  >
                    X
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-md border border-neutral-800 bg-neutral-950/70 px-2 py-2 text-[10px] leading-relaxed text-neutral-500">
            Capture the current live generator/media state into reusable scenes and assign them to mapped surfaces.
          </div>
        )}
      </div>
    </div>
  )
}
