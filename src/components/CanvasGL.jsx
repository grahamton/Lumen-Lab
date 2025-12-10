/* eslint-disable react-hooks/immutability */
import React, { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { useVideoRecorder } from '../hooks/useVideoRecorder'
import { useAudioAnalyzer } from '../hooks/useAudioAnalyzer'
import vertShader from '../shaders/visualizer.vert?raw'
import fragShader from '../shaders/visualizer.frag?raw'

// The Inner Scene
function VisualizerScene() {
  const meshRef = useRef()
  // Store Subscriptions
  const image = useStore((state) => state.image)
  const exportRequest = useStore((state) => state.ui.exportRequest)
  const triggerExport = useStore((state) => state.triggerExport)
  const fluxEnabled = useStore((state) => state.flux.enabled)
  const shape = useStore((state) => state.canvas.shape)
  // Audio State
  const audio = useStore((state) => state.audio)

  // Recording State from Store (Triggers)
  const recordingState = useStore((state) => state.recording)
  const setRecording = useStore((state) => state.setRecording)

  const { gl, size } = useThree()
  const timeRef = useRef(0)
  const imageAspect = useRef(1)

  // Hooks
  const { isRecording, duration, startRecording, stopRecording } = useVideoRecorder(gl)
  const { isReady: audioReady, getFrequencyData } = useAudioAnalyzer(audio.enabled, audio.source)

  // ... (Video Recording UseEffects handled as before)
  useEffect(() => {
    if (recordingState.isActive && !isRecording) {
      startRecording()
    } else if (!recordingState.isActive && isRecording) {
      stopRecording()
    }
  }, [recordingState.isActive, isRecording, startRecording, stopRecording])

  useEffect(() => {
    if (isRecording) setRecording('progress', duration)
  }, [duration, isRecording, setRecording])


  const [texture] = useState(() => {
    const t = new THREE.Texture()
    t.image = new Image()
    return t
  })

  const [uniforms] = useState(() => ({
    uTexture: { value: texture },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uAspect: { value: size.width / size.height },
    uImageAspect: { value: 1.0 },
    uShape: { value: 0 },
    uTime: { value: 0 },
    uTransforms: { value: new THREE.Vector4(0, 0, 1, 0) },
    uSymEnabled: { value: false },
    uSymSlices: { value: 6 },
    uWarpType: { value: 0 },
    uDisplacement: { value: new THREE.Vector2(0, 10) },
    uTilingType: { value: 0 },
    uTilingScale: { value: 1 },
    uPosterize: { value: 256 },
    uEffects: { value: new THREE.Vector4(0, 0, 0, 0) },
    uGenType: { value: 0 },
    uGenParams: { value: new THREE.Vector3(50, 50, 50) },
    // Audio Uniforms
    uAudioLow: { value: 0 },
    uAudioMid: { value: 0 },
    uAudioHigh: { value: 0 }
  }))

  // ... (Texture & Resize UseEffects same as before)
  useEffect(() => {
    if (!image || !image.complete) return
    texture.image = image
    texture.needsUpdate = true
    if (image.naturalHeight > 0) {
      imageAspect.current = image.naturalWidth / image.naturalHeight
      uniforms.uImageAspect.value = imageAspect.current
    }
  }, [image, texture, uniforms])

  useEffect(() => {
    uniforms.uResolution.value.set(size.width, size.height)
    uniforms.uAspect.value = size.width / size.height
  }, [size, uniforms])

  // Render Loop (60FPS)
  useFrame((stateThree, delta) => {
    const uniformValues = uniforms
    const {
      transforms, symmetry, warp, displacement, tiling,
      color, effects, generator, audio: audioState
    } = useStore.getState()

    // Time
    if (fluxEnabled) {
      timeRef.current += delta
    }
    uniformValues.uTime.value = timeRef.current

    // Audio Analysis
    let bass = 0, mid = 0, high = 0
    if (audioState.enabled && audioReady) {
      const freq = getFrequencyData()
      // Normalize 0-255 to 0-1 range
      // Apply sensitivity
      const sens = audioState.sensitivity
      bass = (freq.low / 255) * sens
      mid = (freq.mid / 255) * sens
      high = (freq.high / 255) * sens
    }

    uniformValues.uAudioLow.value = bass
    uniformValues.uAudioMid.value = mid
    uniformValues.uAudioHigh.value = high

    // Reactive Modifications (in-shader or here? Let's do here for some, shader for texture fx)
    // Actually, modulating uniforms here is very powerful.

    // Example: Bass hits scale
    const reactiveScale = transforms.scale + (bass * audioState.reactivity.bass * 0.2)

    uniformValues.uTransforms.value.set(
      transforms.x,
      transforms.y,
      reactiveScale,
      transforms.rotation + (mid * audioState.reactivity.mid * 0.01) // slight rotation on mids
    )

    uniformValues.uShape.value = shape === 'circle' ? 1 : 0
    uniformValues.uSymEnabled.value = symmetry.enabled
    uniformValues.uSymSlices.value = symmetry.slices

    const warpMap = { 'none': 0, 'polar': 1, 'log-polar': 2 }
    uniformValues.uWarpType.value = warpMap[warp.type] || 0

    // Displace amp can react to Mids
    const reactiveAmp = displacement.amp + (mid * audioState.reactivity.mid * 50)
    uniformValues.uDisplacement.value.set(reactiveAmp, displacement.freq)

    const tileMap = { 'none': 0, 'p1': 1, 'p2': 2, 'p4m': 3 }
    uniformValues.uTilingType.value = tileMap[tiling.type] || 0
    // Tiling scale reactive to Highs?
    // const reactiveTileScale = tiling.scale + (high * audioState.reactivity.high * 0.5)
    uniformValues.uTilingScale.value = tiling.scale

    uniformValues.uPosterize.value = color.posterize

    // Effects react to highs?
    const reactiveMids = effects.solarize + (high * audioState.reactivity.high * 50)
    uniformValues.uEffects.value.set(
      effects.edgeDetect,
      effects.invert,
      reactiveMids,
      effects.shift
    )

    const genMap = { 'none': 0, 'fibonacci': 1, 'voronoi': 2, 'grid': 3 }
    uniformValues.uGenType.value = genMap[generator.type] || 0
    uniformValues.uGenParams.value.set(generator.param1, generator.param2, generator.param3)
  })

  // Export Request Handler
  useEffect(() => {
    if (exportRequest) {
      const { width, height, filename } = exportRequest
      const uniformValues = uniforms

      // Force refresh uniforms for export frame
      const { transforms, symmetry, warp, displacement, tiling, color, effects, generator } = useStore.getState()
      uniformValues.uTransforms.value.set(transforms.x, transforms.y, transforms.scale, transforms.rotation)
      uniformValues.uSymEnabled.value = symmetry.enabled
      uniformValues.uSymSlices.value = symmetry.slices
      const warpMap = { 'none': 0, 'polar': 1, 'log-polar': 2 }
      uniformValues.uWarpType.value = warpMap[warp.type] || 0
      uniformValues.uDisplacement.value.set(displacement.amp, displacement.freq)
      const tileMap = { 'none': 0, 'p1': 1, 'p2': 2, 'p4m': 3 }
      uniformValues.uTilingType.value = tileMap[tiling.type] || 0
      uniformValues.uTilingScale.value = tiling.scale
      uniformValues.uPosterize.value = color.posterize
      uniformValues.uEffects.value.set(effects.edgeDetect, effects.invert, effects.solarize, effects.shift)
      const genMap = { 'none': 0, 'fibonacci': 1, 'voronoi': 2, 'grid': 3 }
      uniformValues.uGenType.value = genMap[generator.type] || 0
      uniformValues.uGenParams.value.set(generator.param1, generator.param2, generator.param3)

      // Resize
      const originalSize = new THREE.Vector2()
      gl.getSize(originalSize)
      gl.setSize(width, height)
      uniformValues.uResolution.value.set(width, height)
      uniformValues.uAspect.value = width / height

      // Render
      gl.render(gl.scene, gl.camera)

      // Capture
      gl.domElement.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)

        // Reset
        gl.setSize(originalSize.x, originalSize.y)
        uniformValues.uResolution.value.set(originalSize.x, originalSize.y)
        uniformValues.uAspect.value = originalSize.x / originalSize.y
        triggerExport(null) // Clear request
      }, 'image/png')
    }
  }, [exportRequest, gl, triggerExport, uniforms])

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

export function CanvasGL() {
  const { canvas } = useStore()

  // Calculate viewport style (Letterboxing)
  const style = useMemo(() => {
    if (canvas.aspect === 'free') return { width: '100%', height: '100%' }

    const targetAspect = canvas.width / canvas.height
    const windowAspect = window.innerWidth / window.innerHeight

    if (windowAspect > targetAspect) {
      return { height: '100vh', width: `${100 * targetAspect / windowAspect}vw`, transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
    } else {
      return { width: '100vw', height: `${100 * windowAspect / targetAspect}vh`, transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
    }
  }, [canvas.width, canvas.height, canvas.aspect])

  return (
    <div className="w-full h-full bg-neutral-900 flex items-center justify-center overflow-hidden relative">
      <div style={{ ...style, position: 'relative' }}>
        <Canvas
          gl={{
            preserveDrawingBuffer: true, // Needed for Export & Recording
            antialias: false,
            powerPreference: "high-performance"
          }}
          camera={{ position: [0, 0, 1] }}
        >
          <VisualizerScene />
        </Canvas>
      </div>
    </div>
  )
}
