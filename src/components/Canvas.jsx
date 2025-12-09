import React, { useRef, useEffect, useState, useMemo } from 'react'
import { useStore } from '../store/useStore'
import { renderCanvas } from '../core/render'

export function Canvas() {
  const canvasRef = useRef(null)
  const backBufferRef = useRef(null)
  const state = useStore()

  // Destructure state
  const {
    image, transforms, symmetry, warp, displacement,
    masking, feedback, recording, setRecording,
    tiling, color, effects, animation, canvas: canvasSettings
  } = state

  // Window Size Tracker for "Contain" logic
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight })

  useEffect(() => {
    const handleResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Calculate CSS Viewport (Letterboxing)
  const viewportStyle = useMemo(() => {
    const targetAspect = canvasSettings.width / canvasSettings.height
    const windowAspect = windowSize.w / windowSize.h

    let style = {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      boxShadow: '0 0 50px rgba(0,0,0,0.5)', // Drop shadow to separate canvas
      border: '1px solid #333'
    }

    if (windowAspect > targetAspect) {
      // Window is wider than canvas -> Fit Height
      style.height = `${windowSize.h}px`
      style.width = `${windowSize.h * targetAspect}px`
    } else {
      // Window is taller than canvas -> Fit Width
      style.width = `${windowSize.w}px`
      style.height = `${windowSize.w / targetAspect}px`
    }

    // For "Free" mode, we might just want full screen
    if (canvasSettings.aspect === 'free') {
      return { width: '100%', height: '100%' }
    }

    return style
  }, [windowSize, canvasSettings.width, canvasSettings.height, canvasSettings.aspect])


  // Recording Logic
  useEffect(() => {
    if (!recording.isActive) return
    const canvas = canvasRef.current
    if (!canvas) return
    const stream = canvas.captureStream(60)
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 5000000 })
    const chunks = []
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lumen-loop.webm`
      a.click()
      URL.revokeObjectURL(url)
      setRecording('isActive', false)
      setRecording('progress', 0)
    }
    mediaRecorder.start()
    setTimeout(() => { mediaRecorder.stop() }, 3000)
  }, [recording.isActive])


  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    // Debug Log
    // console.log("Render frame. Image:", !!image, "Canvas:", canvasSettings.width, canvasSettings.height)

    // Set Internal Resolution
    if (canvas.width !== canvasSettings.width || canvas.height !== canvasSettings.height) {
      canvas.width = canvasSettings.width
      canvas.height = canvasSettings.height
    }

    // Initialize Back Buffer
    if (!backBufferRef.current) {
      // Compatibility Mode: Use standard canvas
      const c = document.createElement('canvas')
      c.width = canvasSettings.width
      c.height = canvasSettings.height
      backBufferRef.current = c
    }
    const backBuffer = backBufferRef.current
    if (backBuffer.width !== canvasSettings.width || backBuffer.height !== canvasSettings.height) {
      backBuffer.width = canvasSettings.width
      backBuffer.height = canvasSettings.height
    }
    const backCtx = backBuffer.getContext('2d')

    // Call Core Renderer
    try {
      renderCanvas(ctx, backBuffer, canvasSettings.width, canvasSettings.height, state)
    } catch (err) {
      console.error("Render Loop Error:", err)
      if (!window.hasAlertedRenderError) {
        window.hasAlertedRenderError = true
        alert("Critial Render Error: " + err.message)
      }
    }

    // Update Back Buffer
    backCtx.clearRect(0, 0, canvasSettings.width, canvasSettings.height)
    backCtx.drawImage(canvas, 0, 0)

  }, [
    image, transforms, symmetry, warp, displacement,
    masking, feedback, tiling, color, effects, canvasSettings
  ])

  return (
    <div className="w-full h-full bg-neutral-900 flex items-center justify-center relative overflow-hidden">
      {/* The Viewport Container */}
      {canvasSettings.aspect !== 'free' && (
        <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-neutral-800 opacity-20"></div>
      )}

      <canvas
        ref={canvasRef}
        style={viewportStyle}
        // Dimensions are controlled by ref logic, but good to have defaults
        width={canvasSettings.width}
        height={canvasSettings.height}
      />
    </div>
  )
}
