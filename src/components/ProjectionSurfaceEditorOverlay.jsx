import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { useShallow } from 'zustand/shallow'
import { applyProjectiveMatrix, clamp01, computeProjectiveMatrix } from '../utils/projectionMapping'
import { OverlayDock, OverlayHandle } from './ProjectionCalibrationOverlay'

const HANDLE_LABELS = ['TL', 'TR', 'BR', 'BL']
const SIDEBAR_WIDTH = 256 // w-64 controls sidebar, drawn above this overlay

function normalizePoint(x, y, rect) {
  return {
    x: clamp01((x - rect.left) / Math.max(1, rect.width)),
    y: clamp01((y - rect.top) / Math.max(1, rect.height)),
  }
}

export function ProjectionSurfaceEditorOverlay({ rect, viewportWidth, viewportHeight }) {
  const [dragState, setDragState] = useState(null)
  const insetLeft = useStore((state) => (state.ui?.controlsOpen ? SIDEBAR_WIDTH : 0))
  const {
    surfaces,
    selectedSurfaceId,
    selectedMaskPoint,
    surfaceEditMode,
    setProjection,
    setProjectionSurfacePoints,
    setProjectionSurfaceMaskPoints,
  } = useStore(
    useShallow((state) => ({
      surfaces: state.projection.surfaces || [],
      selectedSurfaceId: state.projection.selectedSurfaceId,
      selectedMaskPoint: state.projection.selectedMaskPoint,
      surfaceEditMode: state.projection.surfaceEditMode,
      setProjection: state.setProjection,
      setProjectionSurfacePoints: state.setProjectionSurfacePoints,
      setProjectionSurfaceMaskPoints: state.setProjectionSurfaceMaskPoints,
    }))
  )

  const selectedSurface = useMemo(
    () => surfaces.find((surface) => surface.id === selectedSurfaceId) || surfaces[0] || null,
    [selectedSurfaceId, surfaces]
  )

  const visibleSurfaces = useMemo(
    () => surfaces.filter((surface) => surface.visible !== false),
    [surfaces]
  )
  const selectedSurfaceScreenPoints = useMemo(
    () => selectedSurface
      ? selectedSurface.points.map((point) => ({
        x: rect.left + point.x * rect.width,
        y: rect.top + point.y * rect.height,
      }))
      : [],
    [rect.height, rect.left, rect.top, rect.width, selectedSurface]
  )

  const sourceRectPoints = useMemo(
    () => ([
      { x: 0, y: 0 },
      { x: rect.width, y: 0 },
      { x: rect.width, y: rect.height },
      { x: 0, y: rect.height },
    ]),
    [rect.height, rect.width]
  )

  const localToScreenMatrix = useMemo(
    () => selectedSurfaceScreenPoints.length === 4
      ? computeProjectiveMatrix(sourceRectPoints, selectedSurfaceScreenPoints)
      : null,
    [selectedSurfaceScreenPoints, sourceRectPoints]
  )
  const screenToLocalMatrix = useMemo(
    () => selectedSurfaceScreenPoints.length === 4
      ? computeProjectiveMatrix(selectedSurfaceScreenPoints, sourceRectPoints)
      : null,
    [selectedSurfaceScreenPoints, sourceRectPoints]
  )
  const maskScreenPoints = useMemo(
    () => {
      if (!selectedSurface || !localToScreenMatrix) return []
      return (selectedSurface.maskPoints || []).map((point) => (
        applyProjectiveMatrix(localToScreenMatrix, point.x * rect.width, point.y * rect.height)
      ))
    },
    [localToScreenMatrix, rect.height, rect.width, selectedSurface]
  )

  useEffect(() => {
    if (!dragState || !selectedSurface) return undefined

    function handlePointerMove(event) {
      if (dragState.type === 'warp') {
        const nextPoints = selectedSurface.points.map((point, index) => (
          index === dragState.handleIndex
            ? normalizePoint(event.clientX, event.clientY, rect)
            : point
        ))

        setProjectionSurfacePoints(selectedSurface.id, nextPoints)
        return
      }

      if (dragState.type === 'mask' && screenToLocalMatrix) {
        const localPoint = applyProjectiveMatrix(screenToLocalMatrix, event.clientX, event.clientY)
        const normalizedLocalPoint = {
          x: clamp01(localPoint.x / Math.max(1, rect.width)),
          y: clamp01(localPoint.y / Math.max(1, rect.height)),
        }

        const nextMaskPoints = (selectedSurface.maskPoints || []).map((point, index) => (
          index === dragState.handleIndex ? normalizedLocalPoint : point
        ))

        setProjectionSurfaceMaskPoints(selectedSurface.id, nextMaskPoints)
      }
    }

    function handlePointerUp() {
      setDragState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [dragState, rect, screenToLocalMatrix, selectedSurface, setProjectionSurfaceMaskPoints, setProjectionSurfacePoints])

  useEffect(() => {
    function handleKeyDown(event) {
      const tagName = event.target?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName)) return
      if (event.key === 'Escape') {
        event.preventDefault()
        setProjection('editingSurfaces', false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setProjection])

  if (!selectedSurface) return null

  return (
    <div className="absolute inset-0 z-20 pointer-events-none select-none">
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${viewportWidth} ${viewportHeight}`} fill="none">
        {visibleSurfaces.map((surface) => (
          <polygon
            key={surface.id}
            points={surface.points.map((point) => `${rect.left + point.x * rect.width},${rect.top + point.y * rect.height}`).join(' ')}
            fill={surface.id === selectedSurface.id ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.04)'}
            stroke={surface.id === selectedSurface.id ? 'rgba(34,211,238,0.95)' : 'rgba(255,255,255,0.45)'}
            strokeWidth={surface.id === selectedSurface.id ? '2' : '1'}
            strokeDasharray={surface.id === selectedSurface.id ? '10 8' : '4 8'}
            onClick={() => setProjection('selectedSurfaceId', surface.id)}
            className="pointer-events-auto cursor-pointer"
          />
        ))}
      </svg>

      <OverlayDock insetLeft={insetLeft} viewportWidth={viewportWidth}>
        <div className="text-center text-[11px] text-cyan-100/80">
          {surfaceEditMode === 'warp'
            ? 'Drag corners to place the shape · Esc done'
            : 'Drag points to cut the shape · Esc done'}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          {[['warp', 'MOVE CORNERS'], ['mask', 'CUT SHAPE']].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={surfaceEditMode === value}
              onClick={() => setProjection('surfaceEditMode', value)}
              className={`h-6 rounded-md border px-2 text-[10px] font-semibold tracking-[0.1em] transition-colors ${
                surfaceEditMode === value
                  ? 'border-cyan-300 bg-cyan-300 text-black'
                  : 'border-cyan-400/30 bg-cyan-400/5 text-cyan-200 hover:bg-cyan-400/15'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setProjection('editingSurfaces', false)}
            className="h-6 rounded-md border border-cyan-400/40 bg-cyan-400/10 px-3 text-[10px] font-semibold tracking-[0.18em] text-cyan-200 transition-colors hover:bg-cyan-400/20"
          >
            DONE
          </button>
        </div>
      </OverlayDock>

      {selectedSurface.points.map((point, index) => (
        <OverlayHandle
          key={`${selectedSurface.id}-${HANDLE_LABELS[index]}`}
          x={rect.left + point.x * rect.width}
          y={rect.top + point.y * rect.height}
          label={HANDLE_LABELS[index]}
          title={`${selectedSurface.name} corner ${HANDLE_LABELS[index]}`}
          selected={surfaceEditMode === 'warp'}
          active={dragState?.type === 'warp' && dragState.handleIndex === index}
          insetLeft={insetLeft}
          viewportWidth={viewportWidth}
          viewportHeight={viewportHeight}
          onPointerDown={(event) => {
            event.preventDefault()
            setProjection('selectedSurfaceId', selectedSurface.id)
            setDragState({ type: 'warp', handleIndex: index })
          }}
        />
      ))}
      {surfaceEditMode === 'mask' && (
        <>
          <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${viewportWidth} ${viewportHeight}`} fill="none">
            <polygon
              points={maskScreenPoints.map((point) => `${point.x},${point.y}`).join(' ')}
              fill="rgba(255,255,255,0.04)"
              stroke="rgba(255,220,120,0.9)"
              strokeWidth="1.5"
              strokeDasharray="8 6"
            />
          </svg>
          {maskScreenPoints.map((point, index) => (
            <OverlayHandle
              key={`${selectedSurface.id}-mask-${index}`}
              x={point.x}
              y={point.y}
              label={String(index + 1)}
              title={`Cut point ${index + 1}`}
              tone="amber"
              size={26}
              selected={selectedMaskPoint === index}
              active={dragState?.type === 'mask' && dragState.handleIndex === index}
              insetLeft={insetLeft}
              viewportWidth={viewportWidth}
              viewportHeight={viewportHeight}
              onPointerDown={(event) => {
                event.preventDefault()
                setProjection('selectedSurfaceId', selectedSurface.id)
                setProjection('selectedMaskPoint', index)
                setDragState({ type: 'mask', handleIndex: index })
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}
