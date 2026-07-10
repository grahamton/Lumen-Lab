/* eslint-disable react-hooks/immutability */
import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Texture,
  Vector2,
  Vector3,
  Vector4,
  VideoTexture,
  WebGLRenderTarget,
  LinearFilter,
  RGBAFormat,
} from 'three'
import { EffectComposer, Bloom, Noise, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useStore } from '../store/useStore'
import { useShallow } from 'zustand/shallow'
import {
  getActiveAuthoredSceneDraftState,
  getActiveAuthoredSceneId,
  getEffectiveAuthoredSceneState,
  getEffectiveRenderState,
} from '../store/useStore'
import { useVideoRecorder } from '../hooks/useVideoRecorder'
import { useAudioAnalyzer } from '../hooks/useAudioAnalyzer'
import { ProjectionCalibrationOverlay } from './ProjectionCalibrationOverlay'
import { ProjectionSurfaceEditorOverlay } from './ProjectionSurfaceEditorOverlay'
import { presets } from '../presets'
import vertShader from '../shaders/visualizer.vert?raw'
import fragShader from '../shaders/visualizer.frag?raw'
import {
  getOutputRect,
  getProjectionTargetPoints,
  getProjectionTransform,
} from '../utils/projectionMapping'
import {
  collectProjectionSourceDefinitions,
  getProjectionSourceKey,
  hasValidProjectionSurfaceSource,
} from '../utils/projectionSources'
import {
  updateProjectionCanvasRegistry,
} from '../utils/projectionCanvasRegistry'
import { isProjectionWindow } from '../utils/windowMode'

const SYM_TYPE_MAP = { radial: 0, mirrorX: 1, mirrorY: 2 }
const WARP_MAP     = { none: 0, polar: 1, 'log-polar': 2 }
const TILE_MAP     = { none: 0, p1: 1, p2: 2, p4m: 3 }
const GEN_MAP      = { none: 0, fibonacci: 1, voronoi: 2, grid: 3, liquid: 4, plasma: 5, fractal: 6 }
const projectionWindowMode = isProjectionWindow()
const BLEND_MODE_MAP = {
  normal: 'normal',
  screen: 'screen',
  add: 'plus-lighter',
  multiply: 'multiply',
}

function mergeRenderState(baseState, overrideState = {}) {
  return {
    ...baseState,
    media: overrideState.media === undefined ? baseState.media : overrideState.media,
    activeMediaId: overrideState.activeMediaId ?? baseState.activeMediaId,
    transforms: { ...baseState.transforms, ...(overrideState.transforms || {}) },
    symmetry: { ...baseState.symmetry, ...(overrideState.symmetry || {}) },
    warp: { ...baseState.warp, ...(overrideState.warp || {}) },
    displacement: { ...baseState.displacement, ...(overrideState.displacement || {}) },
    tiling: { ...baseState.tiling, ...(overrideState.tiling || {}) },
    color: { ...baseState.color, ...(overrideState.color || {}) },
    effects: { ...baseState.effects, ...(overrideState.effects || {}) },
    generator: { ...baseState.generator, ...(overrideState.generator || {}) },
    audio: { ...baseState.audio, ...(overrideState.audio || {}) },
    flux: { ...baseState.flux, ...(overrideState.flux || {}) },
    canvas: { ...baseState.canvas, ...(overrideState.canvas || {}) },
    ui: { ...baseState.ui, ...(overrideState.ui || {}) },
  }
}

function ProjectionPatternStage({ blackout, patternMode, patternType }) {
  if (blackout) {
    return <div className="absolute inset-0 bg-black" />
  }

  if (patternMode === 'off') return null

  const overlayClass = patternMode === 'replace'
    ? 'absolute inset-0 bg-black'
    : 'absolute inset-0 bg-transparent mix-blend-screen'

  return (
    <div className={overlayClass}>
      <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none">
        {patternType === 'checker' && (
          <>
            {Array.from({ length: 8 }).map((_, row) => (
              Array.from({ length: 8 }).map((__, col) => (
                <rect
                  key={`checker-${row}-${col}`}
                  x={col * 12.5}
                  y={row * 12.5}
                  width="12.5"
                  height="12.5"
                  fill={(row + col) % 2 === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)'}
                />
              ))
            ))}
          </>
        )}
        {patternType !== 'checker' && (
          <>
            <rect x="0.5" y="0.5" width="99" height="99" stroke="rgba(255,255,255,0.92)" strokeWidth="1" />
            {patternType === 'grid' && Array.from({ length: 9 }).map((_, index) => {
              const position = (index + 1) * 10
              return (
                <g key={`grid-${position}`}>
                  <line x1={position} y1="0" x2={position} y2="100" stroke={position === 50 ? 'rgba(34,211,238,0.95)' : 'rgba(255,255,255,0.4)'} strokeWidth={position === 50 ? '0.8' : '0.45'} />
                  <line x1="0" y1={position} x2="100" y2={position} stroke={position === 50 ? 'rgba(34,211,238,0.95)' : 'rgba(255,255,255,0.4)'} strokeWidth={position === 50 ? '0.8' : '0.45'} />
                </g>
              )
            })}
            {patternType === 'crosshair' && (
              <>
                <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(34,211,238,0.95)" strokeWidth="0.9" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(34,211,238,0.95)" strokeWidth="0.9" />
                <circle cx="50" cy="50" r="12" stroke="rgba(255,255,255,0.75)" strokeWidth="0.7" />
                <circle cx="50" cy="50" r="24" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
              </>
            )}
            <circle cx="50" cy="50" r="1.4" fill="rgba(255,80,80,0.95)" />
            <circle cx="0.8" cy="0.8" r="0.9" fill="rgba(255,255,255,0.95)" />
            <circle cx="99.2" cy="0.8" r="0.9" fill="rgba(255,255,255,0.95)" />
            <circle cx="99.2" cy="99.2" r="0.9" fill="rgba(255,255,255,0.95)" />
            <circle cx="0.8" cy="99.2" r="0.9" fill="rgba(255,255,255,0.95)" />
          </>
        )}
      </svg>
    </div>
  )
}

function ProjectionSourceCanvas({ sourceKey, renderStateResolver, mediaDescriptor, width, height, dpr, onCanvasReady }) {
  useEffect(() => {
    return () => {
      onCanvasReady(sourceKey, null)
    }
  }, [onCanvasReady, sourceKey])

  return (
    <div
      style={{
        position: 'absolute',
        left: '-99999px',
        top: 0,
        width: `${width}px`,
        height: `${height}px`,
        opacity: 0,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        gl={{
          preserveDrawingBuffer: true,
          antialias: false,
          powerPreference: 'high-performance',
        }}
        dpr={dpr}
        camera={{ position: [0, 0, 1] }}
        onCreated={({ gl }) => onCanvasReady(sourceKey, gl.domElement)}
      >
        <VisualizerScene
          renderState={renderStateResolver}
          mediaDescriptor={mediaDescriptor}
          preferImageElement={false}
          enableOutputActions={false}
          useMirroredAudio={true}
        />
        <EffectsLayer />
      </Canvas>
    </div>
  )
}

function ProjectionSurfaceCanvas({ surface, sourceCanvas, sourceRect }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const outputCanvas = canvasRef.current
    if (!outputCanvas) return undefined

    const context = outputCanvas.getContext('2d')
    if (!sourceCanvas) {
      context?.clearRect(0, 0, outputCanvas.width, outputCanvas.height)
      return undefined
    }

    let frameId = null

    const syncFrame = () => {
      if (!outputCanvas || !sourceCanvas || !context) return

      if (outputCanvas.width !== sourceCanvas.width || outputCanvas.height !== sourceCanvas.height) {
        outputCanvas.width = sourceCanvas.width
        outputCanvas.height = sourceCanvas.height
      }

      context.clearRect(0, 0, outputCanvas.width, outputCanvas.height)
      context.drawImage(sourceCanvas, 0, 0, outputCanvas.width, outputCanvas.height)
      frameId = requestAnimationFrame(syncFrame)
    }

    syncFrame()
    return () => {
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [sourceCanvas])

  const targetPoints = surface.points.map((point) => ({
    x: point.x * sourceRect.width,
    y: point.y * sourceRect.height,
  }))
  const transform = getProjectionTransform(sourceRect, targetPoints)
  const clipPath = (surface.maskPoints || [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ])
    .map((point) => `${(point.x * 100).toFixed(2)}% ${(point.y * 100).toFixed(2)}%`)
    .join(', ')

  return (
    <canvas
      ref={canvasRef}
      className="absolute left-0 top-0 pointer-events-none"
      style={{
        width: `${sourceRect.width}px`,
        height: `${sourceRect.height}px`,
        transformOrigin: '0 0',
        transform,
        opacity: surface.opacity ?? 1,
        mixBlendMode: BLEND_MODE_MAP[surface.blendMode] || 'screen',
        clipPath: `polygon(${clipPath})`,
      }}
    />
  )
}

// The Inner Scene
function VisualizerScene({ renderState = null, mediaDescriptor = null, preferImageElement = true, enableOutputActions = true, useMirroredAudio = false }) {
  const meshRef = useRef()
  const {
    image,
    liveMedia,
    exportRequest,
    triggerExport,
    audioEnabled,
    audioSource,
    audioFileUrl,
    recordingIsActive,
    setRecording,
    setAudio,
  } = useStore(
    useShallow((state) => ({
      image: state.image,
      liveMedia: getEffectiveAuthoredSceneState(state).media,
      exportRequest: state.ui.exportRequest,
      triggerExport: state.triggerExport,
      audioEnabled: state.audio.enabled,
      audioSource: state.audio.source,
      audioFileUrl: state.audio.fileUrl,
      recordingIsActive: state.recording.isActive,
      setRecording: state.setRecording,
      setAudio: state.setAudio,
    }))
  )

  const { gl, size } = useThree()
  const timeRef = useRef(0)
  const genTimeRef = useRef(0)
  const fluxDriftRef = useRef({ rotation: 0, scale: 0 })
  const imageAspect = useRef(1)
  // Cache for stable (non-audio-reactive) uniform values to skip redundant writes.
  const prevUniRef = useRef({})
  const [resolvedMedia, setResolvedMedia] = useState(null)
  const lastMeterSyncRef = useRef(0)
  const effectiveMedia = mediaDescriptor ?? liveMedia
  const canUseImageElement = preferImageElement
    && image
    && (
      !effectiveMedia?.src
      || image.currentSrc === effectiveMedia.src
      || image.src === effectiveMedia.src
    )

  // Hooks
  const { isRecording, duration, startRecording, stopRecording } = useVideoRecorder(gl)
  const { isReady: audioReady, getFrequencyData } = useAudioAnalyzer(
    !projectionWindowMode && !useMirroredAudio && audioEnabled,
    audioSource,
    audioFileUrl
  )

  useEffect(() => {
    if (projectionWindowMode || !enableOutputActions) return undefined
    if (recordingIsActive && !isRecording) {
      startRecording()
    } else if (!recordingIsActive && isRecording) {
      stopRecording()
    }
  }, [enableOutputActions, isRecording, recordingIsActive, startRecording, stopRecording])

  useEffect(() => {
    if (projectionWindowMode || !enableOutputActions) return
    if (isRecording) setRecording('progress', duration)
  }, [duration, enableOutputActions, isRecording, setRecording])


  const [texture] = useState(() => {
    const t = new Texture()
    t.image = new Image()
    return t
  })

  // ... (rest of uniforms initialization)
  const [uniforms] = useState(() => ({
    uTexture: { value: texture },
    uResolution: { value: new Vector2(size.width, size.height) },
    uAspect: { value: size.width / size.height },
    uImageAspect: { value: 1.0 }, // New: Image Aspect
    uShape: { value: 0 }, // New: 0=Rect, 1=Circle
    uTime: { value: 0 },
    uGenTime: { value: 0 }, // New: Generator specific time
    uTransforms: { value: new Vector4(0, 0, 1, 0) }, // x, y, scale, rotation
    uSymEnabled: { value: false },
    uSymSlices: { value: 6 },
    uSymType: { value: 0 }, // 0=Radial, 1=MirrorX, 2=MirrorY
    uSymOffset: { value: 0 },
    uWarpType: { value: 0 }, // 0=none, 1=polar, 2=log
    uDisplacement: { value: new Vector2(0, 10) },
    uTilingType: { value: 0 }, // 0=none
    uTilingScale: { value: 1 },
    uTilingOverlap: { value: 0 }, // 0-1 blend between tiled/original UVs
    uPosterize: { value: 256 },
    uColorHSL: { value: new Vector3(0, 1, 1) },
    uEffects: { value: new Vector4(0, 0, 0, 0) }, // edge, invert, solarize, shift
    uEdgeQuality: { value: 1 }, // 1 = full Sobel (9-tap), 0 = fast Laplacian (5-tap)
    uGenType: { value: 0 },
    uGenParams: { value: new Vector3(50, 50, 50) },
    // Audio Uniforms
    uAudioLow: { value: 0 },
    uAudioMid: { value: 0 },
    uAudioHigh: { value: 0 }
  }))
  const clearResolvedTexture = useCallback(() => {
    const uniformValues = uniforms
    const currentTexture = uniformValues.uTexture.value

    if (currentTexture && currentTexture !== texture && typeof currentTexture.dispose === 'function') {
      currentTexture.dispose()
    }

    texture.image = new Image()
    texture.needsUpdate = true
    uniformValues.uTexture.value = texture
    uniformValues.uImageAspect.value = 1
  }, [texture, uniforms])

  // ... (rest of useEffects)
  useEffect(() => {
    if (canUseImageElement) {
      setResolvedMedia(image)
      return undefined
    }

    if (!effectiveMedia?.src || !effectiveMedia?.type) {
      setResolvedMedia(null)
      return undefined
    }

    let disposed = false
    setResolvedMedia(null)

    if (effectiveMedia.type === 'video') {
      const video = document.createElement('video')
      video.src = effectiveMedia.src
      video.loop = true
      video.muted = true
      video.playsInline = true

      const handleLoaded = () => {
        if (disposed) return
        setResolvedMedia(video)
        video.play().catch(() => {})
      }

      video.addEventListener('loadeddata', handleLoaded, { once: true })
      video.addEventListener('error', () => {
        if (!disposed) {
          setResolvedMedia(null)
        }
      }, { once: true })
      video.load()

      return () => {
        disposed = true
        video.pause()
      }
    }

    const nextImage = new Image()
    const handleLoaded = () => {
      if (!disposed) {
        setResolvedMedia(nextImage)
      }
    }

    nextImage.addEventListener('load', handleLoaded, { once: true })
    nextImage.addEventListener('error', () => {
      if (!disposed) {
        setResolvedMedia(null)
      }
    }, { once: true })
    nextImage.src = effectiveMedia.src

    return () => {
      disposed = true
    }
  }, [canUseImageElement, effectiveMedia, image])

  useEffect(() => {
    if (!resolvedMedia) {
      clearResolvedTexture()
      return
    }

    const isVideo = resolvedMedia.tagName === 'VIDEO'
    // For video, wait for readyState; for image, check complete
    if (isVideo && resolvedMedia.readyState < 2) return
    if (!isVideo && !resolvedMedia.complete) return

    const uniformValues = uniforms
    const currentTexture = uniformValues.uTexture.value
    let finalTexture = currentTexture

    // If switching types, create new texture instance
    if (isVideo && !(finalTexture instanceof VideoTexture)) {
      finalTexture = new VideoTexture(resolvedMedia)
      if (currentTexture && currentTexture !== texture && typeof currentTexture.dispose === 'function') {
        currentTexture.dispose()
      }
      uniformValues.uTexture.value = finalTexture
    } else if (!isVideo && (finalTexture instanceof VideoTexture)) {
      finalTexture = new Texture(resolvedMedia)
      currentTexture.dispose()
      uniformValues.uTexture.value = finalTexture
    }

    finalTexture.image = resolvedMedia
    finalTexture.needsUpdate = true

    // Update Aspect Ratio
    let w = isVideo ? resolvedMedia.videoWidth : resolvedMedia.naturalWidth
    let h = isVideo ? resolvedMedia.videoHeight : resolvedMedia.naturalHeight

    if (h > 0) {
      imageAspect.current = w / h
      uniformValues.uImageAspect.value = imageAspect.current
    }
  }, [clearResolvedTexture, resolvedMedia, texture, uniforms])

  // Resize Handler
  useEffect(() => {
    const uniformValues = uniforms
    uniformValues.uResolution.value.set(size.width, size.height)
    uniformValues.uAspect.value = size.width / size.height
  }, [size, uniforms])

  // Render Loop (60FPS)
  useFrame((stateThree, delta) => {
    const uniformValues = uniforms
    const sourceState = typeof renderState === 'function'
      ? renderState(useStore.getState())
      : (renderState || useStore.getState())

    const {
      transforms, symmetry, warp, displacement, tiling,
      color, effects, generator, audio: audioState, ui, flux, canvas
    } = sourceState

    // Time Logic: Always translate global time
    if (!ui.globalPause) {
      timeRef.current += delta
      // Generator Time Logic: Only advance if animated
      if (generator.isAnimated !== false) { // Default to true if undefined
        genTimeRef.current += delta
      }
    }
    uniformValues.uTime.value = timeRef.current
    uniformValues.uGenTime.value = genTimeRef.current

    // Audio Analysis
    let bass = 0, mid = 0, high = 0
    if ((projectionWindowMode || useMirroredAudio) && audioState.enabled) {
      bass = audioState.meters?.bass || 0
      mid = audioState.meters?.mid || 0
      high = audioState.meters?.high || 0
    } else if (audioState.enabled && audioReady) {
      const freq = getFrequencyData()
      // Normalize 0-255 to 0-1 range
      // Apply sensitivity
      const sens = audioState.sensitivity

      bass = (freq.low / 255) * sens
      mid = (freq.mid / 255) * sens
      high = (freq.high / 255) * sens
    }

    if (!projectionWindowMode && enableOutputActions && !useMirroredAudio && audioState.enabled && stateThree.clock.elapsedTime - lastMeterSyncRef.current > 0.05) {
      lastMeterSyncRef.current = stateThree.clock.elapsedTime
      setAudio('meters', { bass, mid, high })
    }

    // Audio Uniforms
    uniformValues.uAudioLow.value = bass
    uniformValues.uAudioMid.value = mid
    uniformValues.uAudioHigh.value = high

    // --- FLUX DRIFT LOGIC ---
    const fluxDrift = fluxDriftRef.current
    fluxDrift.rotation = 0
    fluxDrift.scale = 0
    if (flux?.enabled) {
      const fluxAmount = flux.amount ?? 0.3
      // Use time-based Perlin-like noise for smooth drifting
      const driftSpeed = 0.3 // Slow drift frequency
      fluxDrift.scale = Math.sin(timeRef.current * driftSpeed) * fluxAmount
      fluxDrift.rotation = Math.cos(timeRef.current * driftSpeed * 0.7) * fluxAmount
    }

    // --- UNIFORM UPDATES ---

    // Example: Bass hits scale
    const rBass = audioState.reactivity?.bass ?? 1.0
    const rMid = audioState.reactivity?.mid ?? 1.0
    const rHigh = audioState.reactivity?.high ?? 1.0

    const reactiveScale = transforms.scale + (bass * rBass * 0.2) + fluxDrift.scale

    uniformValues.uTransforms.value.set(
      transforms.x,
      transforms.y,
      reactiveScale,
      transforms.rotation + (mid * rMid * 0.01) + fluxDrift.rotation
    )

    // Effects react to highs?
    const reactiveMids = effects.solarize + (high * rHigh * 50)
    const perfCap = ui?.perfCapFx
    const cappedEdge = perfCap ? Math.min(effects.edgeDetect || 0, 30) : effects.edgeDetect
    uniformValues.uEffects.value.set(
      cappedEdge,
      effects.invert,
      reactiveMids,
      effects.shift
    )

    // --- CACHED UNIFORM WRITES ---
    // Skip writes for stable (non-audio-reactive) uniforms when values haven't changed.
    const p = prevUniRef.current

    const shape = canvas.shape === 'circle' ? 1 : 0
    if (p.shape !== shape) { uniformValues.uShape.value = shape; p.shape = shape }

    if (p.symEnabled !== symmetry.enabled) { uniformValues.uSymEnabled.value = symmetry.enabled; p.symEnabled = symmetry.enabled }
    if (p.symSlices !== symmetry.slices) { uniformValues.uSymSlices.value = symmetry.slices; p.symSlices = symmetry.slices }
    const symType = SYM_TYPE_MAP[symmetry.type] || 0
    if (p.symType !== symType) { uniformValues.uSymType.value = symType; p.symType = symType }
    const symOffset = symmetry.offset || 0
    if (p.symOffset !== symOffset) { uniformValues.uSymOffset.value = symOffset; p.symOffset = symOffset }

    const warpType = WARP_MAP[warp.type] || 0
    if (p.warpType !== warpType) { uniformValues.uWarpType.value = warpType; p.warpType = warpType }

    if (p.dispAmp !== displacement.amp || p.dispFreq !== displacement.freq) {
      uniformValues.uDisplacement.value.set(displacement.amp, displacement.freq)
      p.dispAmp = displacement.amp; p.dispFreq = displacement.freq
    }

    const tilingType = TILE_MAP[tiling.type] || 0
    if (p.tilingType !== tilingType) { uniformValues.uTilingType.value = tilingType; p.tilingType = tilingType }
    if (p.tilingScale !== tiling.scale) { uniformValues.uTilingScale.value = tiling.scale; p.tilingScale = tiling.scale }
    const tilingOverlap = tiling.overlap || 0
    if (p.tilingOverlap !== tilingOverlap) { uniformValues.uTilingOverlap.value = tilingOverlap; p.tilingOverlap = tilingOverlap }

    if (p.posterize !== color.posterize) { uniformValues.uPosterize.value = color.posterize; p.posterize = color.posterize }

    if (p.hue !== color.hue || p.sat !== color.sat || p.light !== color.light) {
      uniformValues.uColorHSL.value.set(color.hue, color.sat, color.light)
      p.hue = color.hue; p.sat = color.sat; p.light = color.light
    }

    const genType = GEN_MAP[generator.type] || 0
    if (p.genType !== genType) { uniformValues.uGenType.value = genType; p.genType = genType }

    if (p.genP1 !== generator.param1 || p.genP2 !== generator.param2 || p.genP3 !== generator.param3) {
      uniformValues.uGenParams.value.set(generator.param1, generator.param2, generator.param3)
      p.genP1 = generator.param1; p.genP2 = generator.param2; p.genP3 = generator.param3
    }

    // Edge quality: full Sobel when uncapped, fast Laplacian when perfCapFx is active.
    const edgeQuality = perfCap ? 0 : 1
    if (p.edgeQuality !== edgeQuality) { uniformValues.uEdgeQuality.value = edgeQuality; p.edgeQuality = edgeQuality }

    // Debug Generators
    /* if (stateThree.clock.elapsedTime % 2 < 0.05) {
       console.log("GenType:", generator.type, "uGenType:", uniformValues.uGenType.value, "uGenTime:", uniformValues.uGenTime.value.toFixed(2))
    } */
  })

  // Export Request Handler (Safe RenderTarget Method)
  useEffect(() => {
    if (!enableOutputActions) return undefined
    if (exportRequest) {
      try {
        const { width, height, filename } = exportRequest

        // Create a RenderTarget
        const rt = new WebGLRenderTarget(width, height, {
          minFilter: LinearFilter,
          magFilter: LinearFilter,
          format: RGBAFormat
        })

        const uniformValues = uniforms // Current uniforms

        // Resize Uniforms for Export
        const originalResolution = uniformValues.uResolution.value.clone()
        const originalAspect = uniformValues.uAspect.value

        uniformValues.uResolution.value.set(width, height)
        uniformValues.uAspect.value = width / height

        // Render to Target
        gl.setRenderTarget(rt)
        gl.render(gl.scene, gl.camera)
        gl.setRenderTarget(null) // Back to screen

        // Read Pixels
        const buffer = new Uint8Array(width * height * 4)
        gl.readRenderTargetPixels(rt, 0, 0, width, height, buffer)

        // Flip Y (WebGL reads upside down)
        const flippedBuffer = new Uint8Array(width * height * 4)
        const stride = width * 4
        for (let y = 0; y < height; y++) {
          const srcRow = (height - 1 - y) * stride
          const dstRow = y * stride
          flippedBuffer.set(buffer.subarray(srcRow, srcRow + stride), dstRow)
        }

        // Convert to Blob (via temporary Canvas) - Safest for browser compatibility
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        const imageData = ctx.createImageData(width, height)
        imageData.data.set(flippedBuffer)
        ctx.putImageData(imageData, 0, 0)

        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = filename
          a.click()
          URL.revokeObjectURL(url)
          triggerExport(null)
        }, 'image/png')

        // Cleanup
        rt.dispose()

        // Restore Uniforms
        uniformValues.uResolution.value.copy(originalResolution)
        uniformValues.uAspect.value = originalAspect
      } catch (err) {
        console.error("Export Failed:", err)
        triggerExport(null)
      }
    }
  }, [enableOutputActions, exportRequest, gl, triggerExport, uniforms])

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertShader}
        fragmentShader={fragShader}
        uniforms={uniforms}
        transparent={true} // Needed for Portal/Circle Mask Alpha
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}

function EffectsLayer() {
  const { perfCapFx, bloom, chromaticRaw, noiseRaw } = useStore(
    useShallow((state) => ({
      perfCapFx: state.ui?.perfCapFx,
      bloom: getEffectiveAuthoredSceneState(state).effects.bloom,
      chromaticRaw: getEffectiveAuthoredSceneState(state).effects.chromaticAberration,
      noiseRaw: getEffectiveAuthoredSceneState(state).effects.noise,
    }))
  )

  const chromaticAberration = perfCapFx ? Math.min(chromaticRaw, 0.5) : chromaticRaw
  const noise = perfCapFx ? Math.min(noiseRaw, 0.5) : noiseRaw
  return (
    <EffectComposer>
      {bloom > 0 && <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={bloom * 2} />}
      {chromaticAberration > 0 && <ChromaticAberration offset={[chromaticAberration * 0.01, chromaticAberration * 0.01]} />}
      {noise > 0 && <Noise opacity={noise} blendFunction={BlendFunction.OVERLAY} />}
    </EffectComposer>
  )
}

export function CanvasGL() {
  const {
    canvasWidth,
    canvasHeight,
    canvasAspect,
    lowResPreview,
    mediaLibrary,
    scenes,
    activeSceneId,
    activeSceneDraftState,
    projection,
    userPresets,
    setProjection,
    setProjectionPoint,
    setProjectionPoints,
  } = useStore(
    useShallow((state) => ({
      canvasWidth:   state.canvas.width,
      canvasHeight:  state.canvas.height,
      canvasAspect:  state.canvas.aspect,
      lowResPreview: state.ui.lowResPreview,
      mediaLibrary:  state.mediaLibrary,
      scenes:        state.scenes,
      activeSceneId:  getActiveAuthoredSceneId(state),
      activeSceneDraftState: getActiveAuthoredSceneDraftState(state),
      projection:    state.projection,
      userPresets:   state.userPresets,
      setProjection: state.setProjection,
      setProjectionPoint: state.setProjectionPoint,
      setProjectionPoints: state.setProjectionPoints,
    }))
  )
  const [sourceCanvasElement, setSourceCanvasElement] = useState(null)
  const [auxSourceCanvases, setAuxSourceCanvases] = useState({})

  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))

  useEffect(() => {
    function handleResize() {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const rect = useMemo(
    () => getOutputRect(viewport.width, viewport.height, canvasWidth, canvasHeight, canvasAspect),
    [viewport.width, viewport.height, canvasWidth, canvasHeight, canvasAspect]
  )
  const visibleSurfaces = useMemo(
    () => (projection.surfaces || []).filter((surface) => surface.visible !== false),
    [projection.surfaces]
  )
  const renderableVisibleSurfaces = useMemo(
    () => visibleSurfaces.filter((surface) => (
      hasValidProjectionSurfaceSource(surface, {
        mediaLibrary,
        scenes,
        userPresets,
        builtinPresetCount: presets.length,
      })
    )),
    [mediaLibrary, scenes, userPresets, visibleSurfaces]
  )
  const surfaceModeActive = projection.enabled && renderableVisibleSurfaces.length > 0
  const hasVisibleLiveSurface = useMemo(
    () => renderableVisibleSurfaces.some((surface) => getProjectionSourceKey(surface) === 'live'),
    [renderableVisibleSurfaces]
  )
  const surfaceEditingActive = surfaceModeActive && projection.editingSurfaces
  const sourceRect = useMemo(
    () => ({ left: 0, top: 0, width: rect.width, height: rect.height }),
    [rect.height, rect.width]
  )
  const sourceDescriptors = useMemo(() => {
    if (!surfaceModeActive) return []

    return collectProjectionSourceDefinitions(renderableVisibleSurfaces, {
      mediaLibrary,
      scenes,
      userPresets,
      builtinPresets: presets,
      activeSceneId,
      activeSceneDraftState,
    }).map((definition) => ({
      key: definition.key,
      mediaDescriptor: definition.mediaDescriptor,
      resolveState: (storeState) => mergeRenderState(getEffectiveRenderState(storeState), definition.stateOverride || {}),
    }))
  }, [activeSceneDraftState, activeSceneId, mediaLibrary, renderableVisibleSurfaces, scenes, surfaceModeActive, userPresets])
  const registerAuxSourceCanvas = useCallback((sourceKey, canvasElement) => {
    setAuxSourceCanvases((current) => updateProjectionCanvasRegistry(current, sourceKey, canvasElement))
  }, [])

  const identityTargetPoints = useMemo(() => getProjectionTargetPoints(null, rect, viewport.width, viewport.height), [rect, viewport.width, viewport.height])

  const activeTargetPoints = useMemo(
    () => (
      projection.enabled
        ? getProjectionTargetPoints(projection.points, rect, viewport.width, viewport.height)
        : identityTargetPoints
    ),
    [identityTargetPoints, projection.enabled, projection.points, rect, viewport.height, viewport.width]
  )

  const outputTransform = useMemo(
    () => getProjectionTransform(rect, activeTargetPoints),
    [rect, activeTargetPoints]
  )
  const surfaceStageTransform = useMemo(
    () => (
      surfaceEditingActive
        ? `translate(${rect.left}px, ${rect.top}px)`
        : outputTransform
    ),
    [outputTransform, rect.left, rect.top, surfaceEditingActive]
  )
  const surfaceStageReady = surfaceModeActive && (!hasVisibleLiveSurface || Boolean(sourceCanvasElement))

  const handleCalibrationPointChange = useCallback((index, point) => {
    if (!projection.points || projection.points.length !== 4) {
      const nextPoints = identityTargetPoints.map((targetPoint, targetIndex) => ({
        x: targetIndex === index ? point.x : targetPoint.x / Math.max(1, viewport.width),
        y: targetIndex === index ? point.y : targetPoint.y / Math.max(1, viewport.height),
      }))
      setProjectionPoints(nextPoints)
      return
    }

    setProjectionPoint(index, point)
  }, [identityTargetPoints, projection.points, setProjectionPoint, setProjectionPoints, viewport.height, viewport.width])

  return (
    <div className="w-full h-full bg-neutral-900 flex items-center justify-center overflow-hidden relative">
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          transformOrigin: '0 0',
          transform: surfaceModeActive ? 'none' : outputTransform,
          transition: projection.calibrating || projection.editingSurfaces ? 'none' : 'transform 180ms ease-out',
          opacity: surfaceModeActive ? 0 : 1,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: projection.blackout || projection.patternMode === 'replace' ? 0 : 1,
          }}
        >
          <Canvas
            gl={{
              preserveDrawingBuffer: true, // Needed for Export & Recording
              antialias: false,
              powerPreference: "high-performance"
            }}
            dpr={lowResPreview ? 0.75 : undefined}
            camera={{ position: [0, 0, 1] }}
            onCreated={({ gl }) => setSourceCanvasElement(gl.domElement)}
          >
            <VisualizerScene
              renderState={getEffectiveRenderState}
              enableOutputActions={!projectionWindowMode}
              useMirroredAudio={projectionWindowMode}
            />
            <EffectsLayer />
          </Canvas>
        </div>
        <ProjectionPatternStage
          blackout={projection.blackout}
          patternMode={projection.patternMode}
          patternType={projection.patternType}
        />
      </div>
      {sourceDescriptors.map((descriptor) => (
        <ProjectionSourceCanvas
          key={descriptor.key}
          sourceKey={descriptor.key}
          renderStateResolver={descriptor.resolveState}
          mediaDescriptor={descriptor.mediaDescriptor}
          width={rect.width}
          height={rect.height}
          dpr={lowResPreview ? 0.75 : undefined}
          onCanvasReady={registerAuxSourceCanvas}
        />
      ))}
      {surfaceStageReady && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            transformOrigin: '0 0',
            transform: surfaceStageTransform,
            transition: projection.calibrating || projection.editingSurfaces ? 'none' : 'transform 180ms ease-out',
            pointerEvents: 'none',
          }}
        >
          {renderableVisibleSurfaces.map((surface) => (
            <ProjectionSurfaceCanvas
              key={surface.id}
              surface={surface}
              sourceCanvas={
                getProjectionSourceKey(surface) === 'live'
                  ? sourceCanvasElement
                  : (auxSourceCanvases[getProjectionSourceKey(surface)] || null)
              }
              sourceRect={sourceRect}
            />
          ))}
          <ProjectionPatternStage
            blackout={projection.blackout}
            patternMode={projection.patternMode}
            patternType={projection.patternType}
          />
        </div>
      )}
      {!projectionWindowMode && projection.calibrating && !projection.editingSurfaces && (
        <ProjectionCalibrationOverlay
          projectionPoints={projection.points}
          rect={rect}
          viewportWidth={viewport.width}
          viewportHeight={viewport.height}
          onChangePoint={handleCalibrationPointChange}
          onClose={() => setProjection('calibrating', false)}
        />
      )}
      {!projectionWindowMode && projection.editingSurfaces && surfaceModeActive && (
        <ProjectionSurfaceEditorOverlay
          rect={rect}
          viewportWidth={viewport.width}
          viewportHeight={viewport.height}
        />
      )}
    </div>
  )
}
