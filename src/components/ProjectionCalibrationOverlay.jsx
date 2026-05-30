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

export function ProjectionCalibrationOverlay({
  projectionPoints,
  rect,
  viewportWidth,
  viewportHeight,
  onChangePoint,
  onClose,
}) {
  const [activeHandle, setActiveHandle] = useState(null)
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

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [activeHandle, updatePoint, viewportHeight, viewportWidth])

  useEffect(() => {
    function handleKeyDown(event) {
      const tagName = event.target?.tagName
      const isInteractiveTarget = ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(tagName)

      if (event.key === 'Enter') {
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

      <div className="absolute top-4 right-4 pointer-events-auto max-w-xs rounded-xl border border-cyan-400/30 bg-black/75 px-4 py-3 text-[11px] text-cyan-50 backdrop-blur">
        <div className="mb-1 text-[10px] font-semibold tracking-[0.25em] text-cyan-300">PROJECTION CALIBRATION</div>
        <div className="text-cyan-100/75">Drag corners for coarse alignment, then use <span className="font-semibold text-cyan-200">arrow keys</span> for pixel nudging. Hold <span className="font-semibold text-cyan-200">Shift</span> for larger jumps.</div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {HANDLE_LABELS.map((label, index) => (
            <button
              key={`select-${label}`}
              type="button"
              onClick={() => setProjection('selectedCorner', index)}
              className={`rounded-md border px-2 py-1 text-[10px] font-semibold tracking-[0.16em] transition-colors ${
                selectedCorner === index
                  ? 'border-cyan-300 bg-cyan-300 text-black'
                  : 'border-cyan-400/30 bg-cyan-400/5 text-cyan-200 hover:bg-cyan-400/15'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[10px] tracking-[0.18em] text-cyan-200/80">PATTERN</span>
          <button
            type="button"
            onClick={() => setProjection('showTestPattern', !showTestPattern)}
            className={`rounded-md border px-3 py-1 text-[10px] font-semibold tracking-[0.18em] transition-colors ${
              showTestPattern
                ? 'border-cyan-300 bg-cyan-300 text-black'
                : 'border-cyan-400/30 bg-cyan-400/5 text-cyan-200 hover:bg-cyan-400/15'
            }`}
          >
            {showTestPattern ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[10px] tracking-[0.16em] text-cyan-200/80">
            <span>GUIDE OPACITY</span>
            <span className="tabular-nums text-cyan-100">{Math.round(guideOpacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.05"
            value={guideOpacity}
            onChange={(event) => setProjection('guideOpacity', Number(event.target.value))}
            className="w-full accent-cyan-300"
          />
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[10px] tracking-[0.16em] text-cyan-200/80">
            <span>NUDGE STEP</span>
            <span className="tabular-nums text-cyan-100">{nudgeStep}px</span>
          </div>
          <input
            type="range"
            min="1"
            max="12"
            step="1"
            value={nudgeStep}
            onChange={(event) => setProjection('nudgeStep', Number(event.target.value))}
            className="w-full accent-cyan-300"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 rounded-md border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-semibold tracking-[0.2em] text-cyan-200 transition-colors hover:bg-cyan-400/20"
        >
          DONE
        </button>
      </div>

      {corners.map((corner, index) => (
        <button
          key={HANDLE_LABELS[index]}
          type="button"
          onPointerDown={(event) => {
            event.preventDefault()
            setProjection('selectedCorner', index)
            setActiveHandle(index)
          }}
          className={`absolute pointer-events-auto flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[10px] font-semibold tracking-wider transition-colors ${
            activeHandle === index || selectedCorner === index
              ? 'border-cyan-200 bg-cyan-300 text-black shadow-[0_0_20px_rgba(34,211,238,0.35)]'
              : 'border-cyan-400 bg-black/80 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
          }`}
          style={{ left: `${corner.x}px`, top: `${corner.y}px` }}
        >
          {HANDLE_LABELS[index]}
        </button>
      ))}
    </div>
  )
}
