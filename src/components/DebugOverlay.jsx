import React from 'react'
import { useStore } from '../store/useStore'

export function DebugOverlay() {
  const state = useStore()
  const { image, canvas, transforms } = state

  // if (!window.location.search.includes('debug') && !import.meta.env.DEV) return null
  // Always show for this troubleshooting session
  if (false) return null

  return (
    <div className="fixed bottom-4 left-4 p-4 bg-black/90 text-green-400 font-mono text-xs z-[100] pointer-events-none border border-green-800 rounded opacity-80">
      <h3 className="font-bold border-b border-green-800 mb-2">DEBUG INFO</h3>
      <div>Image: {image ? 'LOADED' : 'NULL'}</div>
      {image && (
        <>
          <div>Src: {image.src ? image.src.substring(0, 30) + '...' : 'No Src'}</div>
          <div>Dims: {image.width}x{image.height}</div>
          <div>Complete: {image.complete.toString()}</div>
        </>
      )}
      <div className="mt-2 text-blue-400">Canvas</div>
      <div>Size: {canvas.width}x{canvas.height}</div>
      <div>Aspect: {canvas.aspect}</div>

      <div className="mt-2 text-yellow-400">Transforms</div>
      <div>Scale: {transforms.scale.toFixed(2)}</div>
      <div>X/Y: {transforms.x.toFixed(0)}, {transforms.y.toFixed(0)}</div>

      <div className="mt-2 text-red-400">Errors</div>
      <div>Global: {window.hasAlertedRenderError ? 'YES' : 'NO'}</div>
    </div>
  )
}
