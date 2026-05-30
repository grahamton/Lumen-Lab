import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { useShallow } from 'zustand/shallow'
import { applyProjectiveMatrix, clamp01, computeProjectiveMatrix } from '../utils/projectionMapping'

const HANDLE_LABELS = ['TL', 'TR', 'BR', 'BL']

function normalizePoint(x, y, rect) {
  return {
    x: clamp01((x - rect.left) / Math.max(1, rect.width)),
    y: clamp01((y - rect.top) / Math.max(1, rect.height)),
  }
}

export function ProjectionSurfaceEditorOverlay({ rect, viewportWidth, viewportHeight }) {
  const [dragState, setDragState] = useState(null)
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
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [dragState, rect, screenToLocalMatrix, selectedSurface, setProjectionSurfaceMaskPoints, setProjectionSurfacePoints])

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

      <div className="absolute top-4 right-4 pointer-events-auto max-w-xs rounded-xl border border-cyan-400/30 bg-black/75 px-4 py-3 text-[11px] text-cyan-50 backdrop-blur">
        <div className="mb-1 text-[10px] font-semibold tracking-[0.25em] text-cyan-300">SURFACE EDITOR</div>
        <div className="text-cyan-100/75">
          {surfaceEditMode === 'warp'
            ? 'Drag corners to place each mapped surface. Surfaces render the current visual source independently.'
            : 'Drag mask points to cut non-rectangular silhouettes inside the selected surface.'}
        </div>
        <button
          type="button"
          onClick={() => setProjection('editingSurfaces', false)}
          className="mt-3 rounded-md border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-semibold tracking-[0.2em] text-cyan-200 transition-colors hover:bg-cyan-400/20"
        >
          DONE
        </button>
      </div>

      {selectedSurface.points.map((point, index) => (
        <button
          key={`${selectedSurface.id}-${HANDLE_LABELS[index]}`}
          type="button"
          onPointerDown={(event) => {
            event.preventDefault()
            setProjection('selectedSurfaceId', selectedSurface.id)
            setDragState({ type: 'warp', handleIndex: index })
          }}
          className={`absolute pointer-events-auto flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[10px] font-semibold tracking-wider text-black shadow-[0_0_20px_rgba(34,211,238,0.35)] ${
            surfaceEditMode === 'warp' ? 'border-cyan-200 bg-cyan-300' : 'border-cyan-300/40 bg-cyan-300/40'
          }`}
          style={{
            left: `${rect.left + point.x * rect.width}px`,
            top: `${rect.top + point.y * rect.height}px`,
          }}
        >
          {HANDLE_LABELS[index]}
        </button>
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
            <button
              key={`${selectedSurface.id}-mask-${index}`}
              type="button"
              onPointerDown={(event) => {
                event.preventDefault()
                setProjection('selectedSurfaceId', selectedSurface.id)
                setProjection('selectedMaskPoint', index)
                setDragState({ type: 'mask', handleIndex: index })
              }}
              className={`absolute pointer-events-auto flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[9px] font-semibold tracking-wider text-black ${
                selectedMaskPoint === index
                  ? 'border-amber-100 bg-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.35)]'
                  : 'border-amber-200 bg-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.22)]'
              }`}
              style={{ left: `${point.x}px`, top: `${point.y}px` }}
            >
              {index + 1}
            </button>
          ))}
        </>
      )}
    </div>
  )
}
