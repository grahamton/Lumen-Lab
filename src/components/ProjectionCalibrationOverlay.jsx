import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { useShallow } from 'zustand/shallow'
import {
  buildWarpGuidePath,
  getProjectionTargetPoints,
  normalizeViewportPoint,
} from '../utils/projectionMapping'

const HANDLE_LABELS = ['TL', 'TR', 'BR', 'BL']
const CORNER_KEYS = ['1', '2', '3', '4']
const SIDEBAR_WIDTH = 256 // matches the w-64 controls sidebar (z-30), which sits above these overlays

function clampTo(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

// Width of the left sidebar when it is covering the canvas.
function useSidebarInset() {
  return useStore((state) => (state.ui?.controlsOpen ? SIDEBAR_WIDTH : 0))
}

/**
 * A draggable handle. The drawn position is clamped inside the visible viewport
 * (clear of the sidebar); the true point is never modified. When clamped, a small
 * arrow points toward where the real point is.
 */
export function OverlayHandle({
  x,
  y,
  label,
  title,
  selected = false,
  active = false,
  tone = 'cyan',
  size = 28,
  insetLeft = 0,
  viewportWidth,
  viewportHeight,
  onPointerDown,
}) {
  const margin = size / 2 + 6
  const cx = clampTo(x, insetLeft + margin, viewportWidth - margin)
  const cy = clampTo(y, margin, viewportHeight - margin)
  const offscreen = Math.abs(cx - x) > 10 || Math.abs(cy - y) > 10
  const angle = (Math.atan2(y - cy, x - cx) * 180) / Math.PI
  const isAmber = tone === 'amber'
  const highlighted = active || selected

  const palette = isAmber
    ? highlighted
      ? 'border-amber-100 bg-amber-300 text-black shadow-[0_0_18px_rgba(251,191,36,0.4)]'
      : 'border-amber-200 bg-amber-200 text-black shadow-[0_0_12px_rgba(251,191,36,0.22)]'
    : highlighted
      ? 'border-cyan-200 bg-cyan-300 text-black shadow-[0_0_20px_rgba(34,211,238,0.4)]'
      : 'border-cyan-400 bg-black/80 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]'

  return (
    <button
      type="button"
      title={offscreen ? `${title || label} (outside the view - drag to bring it back)` : (title || label)}
      onPointerDown={onPointerDown}
      className={`absolute pointer-events-auto touch-none flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[10px] font-semibold tracking-wider transition-colors ${palette} ${offscreen ? 'ring-2 ring-amber-300/80' : ''}`}
      style={{ left: `${cx}px`, top: `${cy}px`, width: `${size}px`, height: `${size}px` }}
    >
      {label}
      {offscreen && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 text-[11px] leading-none text-amber-300"
          style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(${size / 2 + 7}px)` }}
        >
          ▶
        </span>
      )}
    </button>
  )
}

/** Small hint dock, bottom-centre of the visible (non-sidebar) area. */
export function OverlayDock({ insetLeft = 0, viewportWidth, children }) {
  return (
    <div
      className="absolute bottom-3 pointer-events-auto -translate-x-1/2 rounded-xl border border-cyan-400/30 bg-black/80 px-3 py-2 text-[11px] text-cyan-50 shadow-lg backdrop-blur"
      style={{
        left: `${insetLeft + (viewportWidth - insetLeft) / 2}px`,
        maxWidth: `${Math.max(240, viewportWidth - insetLeft - 24)}px`,
      }}
    >
      {children}
    </div>
  )
}

export function ProjectionCalibrationOverlay({
  projectionPoints,
  rect,
  viewportWidth,
  viewportHeight,
  onChangePoint,
  onClose,
}) {
  const [activeHandle, setActiveHandle] = useState(null)
  const [showSliders, setShowSliders] = useState(false)
  const insetLeft = useSidebarInset()
  const {
    selectedCorner,
    showTestPattern,
    guideOpacity,
    nudgeStep,
    setProjection,
  } = useStore(
    useShallow((state) => ({
      selectedCorner: state.projection.selectedCorner,
      showTestPattern: state.projection.showTestPattern,
      guideOpacity: state.projection.guideOpacity,
      nudgeStep: state.projection.nudgeStep,
      setProjection: state.setProjection,
    }))
  )

  const corners = useMemo(
    () => getProjectionTargetPoints(projectionPoints, rect, viewportWidth, viewportHeight),
    [projectionPoints, rect, viewportWidth, viewportHeight]
  )

  const guidePaths = useMemo(() => {
    const paths = []
    for (let step = 1; step < 4; step += 1) {
      const progress = step / 4
      paths.push(buildWarpGuidePath(corners, 'vertical', progress))
      paths.push(buildWarpGuidePath(corners, 'horizontal', progress))
    }
    return paths
  }, [corners])

  const patternLines = useMemo(() => {
    if (!showTestPattern) return []

    const lines = [
      [corners[0], corners[2]],
      [corners[1], corners[3]],
      [{ x: viewportWidth * 0.5, y: 0 }, { x: viewportWidth * 0.5, y: viewportHeight }],
      [{ x: 0, y: viewportHeight * 0.5 }, { x: viewportWidth, y: viewportHeight * 0.5 }],
    ]

    for (let step = 1; step < 4; step += 1) {
      const t = step / 4
      lines.push(
        [{ x: viewportWidth * t, y: 0 }, { x: viewportWidth * t, y: viewportHeight }],
        [{ x: 0, y: viewportHeight * t }, { x: viewportWidth, y: viewportHeight * t }]
      )
    }

    return lines
  }, [corners, showTestPattern, viewportHeight, viewportWidth])

  const updatePoint = useCallback((index, point) => {
    onChangePoint(index, point)
    setProjection('selectedCorner', index)
  }, [onChangePoint, setProjection])

  const nudgeCorner = useCallback((index, deltaX, deltaY) => {
    const corner = corners[index]
    updatePoint(
      index,
      normalizeViewportPoint(
        { x: corner.x + deltaX, y: corner.y + deltaY },
        viewportWidth,
        viewportHeight
      )
    )
  }, [corners, updatePoint, viewportHeight, viewportWidth])

  useEffect(() => {
    if (activeHandle == null) return undefined

    function handlePointerMove(event) {
      updatePoint(
        activeHandle,
        normalizeViewportPoint(
          { x: event.clientX, y: event.clientY },
          viewportWidth,
          viewportHeight
        )
      )
    }

    function handlePointerUp() {
      setActiveHandle(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [activeHandle, updatePoint, viewportHeight, viewportWidth])

  useEffect(() => {
    function handleKeyDown(event) {
      const tagName = event.target?.tagName
      const isInteractiveTarget = ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(tagName)

      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (isInteractiveTarget) {
        return
      }

      if (event.key === 'Tab') {
        event.preventDefault()
        const nextCorner = (selectedCorner + (event.shiftKey ? 3 : 1)) % 4
        setProjection('selectedCorner', nextCorner)
        return
      }

      const cornerKeyIndex = CORNER_KEYS.indexOf(event.key)
      if (cornerKeyIndex >= 0) {
        event.preventDefault()
        setProjection('selectedCorner', cornerKeyIndex)
        return
      }

      if (event.key.toLowerCase() === 'g') {
        event.preventDefault()
        setProjection('showTestPattern', !showTestPattern)
        return
      }

      const multiplier = event.shiftKey ? 10 : 1
      const delta = nudgeStep * multiplier

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          nudgeCorner(selectedCorner, 0, -delta)
          break
        case 'ArrowDown':
          event.preventDefault()
          nudgeCorner(selectedCorner, 0, delta)
          break
        case 'ArrowLeft':
          event.preventDefault()
          nudgeCorner(selectedCorner, -delta, 0)
          break
        case 'ArrowRight':
          event.preventDefault()
          nudgeCorner(selectedCorner, delta, 0)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nudgeCorner, nudgeStep, onClose, selectedCorner, setProjection, showTestPattern])

  return (
    <div className="absolute inset-0 z-20 pointer-events-none select-none">
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${viewportWidth} ${viewportHeight}`} fill="none">
        {patternLines.map(([start, end], index) => (
          <line
            key={`pattern-${index}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={`rgba(240, 249, 255, ${guideOpacity * (index < 2 ? 0.8 : 0.35)})`}
            strokeWidth={index < 2 ? '1.6' : '1'}
            strokeDasharray={index < 2 ? '10 6' : '4 10'}
          />
        ))}
        <polygon
          points={corners.map((point) => `${point.x},${point.y}`).join(' ')}
          className="fill-cyan-400/5 stroke-cyan-300"
          strokeWidth="2.2"
          strokeDasharray="10 8"
        />
        <line
          x1={corners[0].x}
          y1={corners[0].y}
          x2={corners[2].x}
          y2={corners[2].y}
          className="stroke-cyan-500/60"
          strokeWidth="1"
          strokeDasharray="6 6"
        />
        <line
          x1={corners[1].x}
          y1={corners[1].y}
          x2={corners[3].x}
          y2={corners[3].y}
          className="stroke-cyan-500/60"
          strokeWidth="1"
          strokeDasharray="6 6"
        />
        {guidePaths.map((path, index) => (
          <path
            key={`guide-${index}`}
            d={path}
            className="stroke-cyan-400/55"
            strokeWidth="1"
          />
        ))}
      </svg>

      <OverlayDock insetLeft={insetLeft} viewportWidth={viewportWidth}>
        <div className="text-center text-[11px] text-cyan-100/80">
          Drag corners · <span className="font-semibold text-cyan-200">Arrow keys</span> nudge · <span className="font-semibold text-cyan-200">Esc</span> done
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          {HANDLE_LABELS.map((label, index) => (
            <button
              key={`select-${label}`}
              type="button"
              title={`Select corner ${label} (key ${index + 1})`}
              onClick={() => setProjection('selectedCorner', index)}
              className={`h-6 min-w-[28px] rounded-md border px-1.5 text-[10px] font-semibold tracking-wider transition-colors ${
                selectedCorner === index
                  ? 'border-cyan-300 bg-cyan-300 text-black'
                  : 'border-cyan-400/30 bg-cyan-400/5 text-cyan-200 hover:bg-cyan-400/15'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            title="Show or hide the guide grid (G)"
            aria-pressed={showTestPattern}
            onClick={() => setProjection('showTestPattern', !showTestPattern)}
            className={`h-6 rounded-md border px-2 text-[10px] font-semibold tracking-[0.12em] transition-colors ${
              showTestPattern
                ? 'border-cyan-300 bg-cyan-300 text-black'
                : 'border-cyan-400/30 bg-cyan-400/5 text-cyan-200 hover:bg-cyan-400/15'
            }`}
          >
            GRID
          </button>
          <button
            type="button"
            title="Guide brightness and nudge size"
            aria-label="Guide settings"
            aria-expanded={showSliders}
            onClick={() => setShowSliders((open) => !open)}
            className={`h-6 min-w-[28px] rounded-md border px-1.5 text-[11px] transition-colors ${
              showSliders
                ? 'border-cyan-300 bg-cyan-300/20 text-cyan-100'
                : 'border-cyan-400/30 bg-cyan-400/5 text-cyan-200 hover:bg-cyan-400/15'
            }`}
          >
            ⋯
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-6 rounded-md border border-cyan-400/40 bg-cyan-400/10 px-3 text-[10px] font-semibold tracking-[0.18em] text-cyan-200 transition-colors hover:bg-cyan-400/20"
          >
            DONE
          </button>
        </div>
        {showSliders && (
          <div className="mt-2 grid grid-cols-2 gap-3">
            <label className="block">
              <div className="mb-0.5 flex items-center justify-between text-[9px] tracking-[0.14em] text-cyan-200/80">
                <span>GUIDE</span>
                <span className="tabular-nums text-cyan-100">{Math.round(guideOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1"
                step="0.05"
                value={guideOpacity}
                aria-label="Guide opacity"
                onChange={(event) => setProjection('guideOpacity', Number(event.target.value))}
                className="w-full accent-cyan-300"
              />
            </label>
            <label className="block">
              <div className="mb-0.5 flex items-center justify-between text-[9px] tracking-[0.14em] text-cyan-200/80">
                <span>NUDGE</span>
                <span className="tabular-nums text-cyan-100">{nudgeStep}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                value={nudgeStep}
                aria-label="Nudge step"
                onChange={(event) => setProjection('nudgeStep', Number(event.target.value))}
                className="w-full accent-cyan-300"
              />
            </label>
          </div>
        )}
      </OverlayDock>

      {corners.map((corner, index) => (
        <OverlayHandle
          key={HANDLE_LABELS[index]}
          x={corner.x}
          y={corner.y}
          label={HANDLE_LABELS[index]}
          title={`Corner ${HANDLE_LABELS[index]}`}
          selected={selectedCorner === index}
          active={activeHandle === index}
          insetLeft={insetLeft}
          viewportWidth={viewportWidth}
          viewportHeight={viewportHeight}
          onPointerDown={(event) => {
            event.preventDefault()
            setProjection('selectedCorner', index)
            setActiveHandle(index)
          }}
        />
      ))}
    </div>
  )
}
