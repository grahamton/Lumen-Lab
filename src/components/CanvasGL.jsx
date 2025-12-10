/* eslint-disable react-hooks/immutability */
import React, { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { useVideoRecorder } from '../hooks/useVideoRecorder'
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
  // Recording State from Store (Triggers)
  const recordingState = useStore((state) => state.recording)
  const setRecording = useStore((state) => state.setRecording)

  const { gl, size } = useThree()
  const timeRef = useRef(0)
  const imageAspect = useRef(1)

  // Video Recorder Hook
  const { isRecording, duration, startRecording, stopRecording } = useVideoRecorder(gl)

  // Sync Store -> Recorder (Start/Stop trigger)
  // We use a "request" pattern or simply check mapped state?
  // Let's assume UI toggles store.recording.isActive, but that might create a loop.
  // Better: UI calls store.toggleRecording(), which sets a specific flag or we handle it here.
  // Actually, simpler: Let the UI set `isActive` to true/false, and we react here.
  useEffect(() => {
    if (recordingState.isActive && !isRecording) {
      startRecording()
    } else if (!recordingState.isActive && isRecording) {
      stopRecording()
    }
  }, [recordingState.isActive, isRecording, startRecording, stopRecording])

  // Sync Timer -> Store (for UI display)
  useEffect(() => {
    if (isRecording) {
      setRecording('progress', duration)
    }
  }, [duration, isRecording, setRecording])


  const [texture] = useState(() => {
    const t = new THREE.Texture()
    t.image = new Image()
    return t
  })

  // ... (rest of uniforms initialization)
  const [uniforms] = useState(() => ({
    uTexture: { value: texture },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uAspect: { value: size.width / size.height },
    uImageAspect: { value: 1.0 }, // New: Image Aspect
    uShape: { value: 0 }, // New: 0=Rect, 1=Circle
    uTime: { value: 0 },
    uTransforms: { value: new THREE.Vector4(0, 0, 1, 0) }, // x, y, scale, rotation
    uSymEnabled: { value: false },
    uSymSlices: { value: 6 },
    uWarpType: { value: 0 }, // 0=none, 1=polar, 2=log
    uDisplacement: { value: new THREE.Vector2(0, 10) },
    uTilingType: { value: 0 }, // 0=none
    uTilingScale: { value: 1 },
    uPosterize: { value: 256 },
    uEffects: { value: new THREE.Vector4(0, 0, 0, 0) }, // edge, invert, solarize, shift
    uGenType: { value: 0 },
    uGenParams: { value: new THREE.Vector3(50, 50, 50) }
  }))

  // ... (rest of useEffects)
  // Sync Texture when image changes
  useEffect(() => {
    if (!image || !image.complete) return

    const uniformValues = uniforms

    texture.image = image
    texture.needsUpdate = true
    // Update Aspect Ratio
    if (image.naturalHeight > 0) {
      imageAspect.current = image.naturalWidth / image.naturalHeight
      uniformValues.uImageAspect.value = imageAspect.current
    }
  }, [image, texture, uniforms])

  // Resize Handler
  useEffect(() => {
    const uniformValues = uniforms
    uniformValues.uResolution.value.set(size.width, size.height)
    uniformValues.uAspect.value = size.width / size.height
  }, [size, uniforms])

  // Render Loop (60FPS)
  useFrame((stateThree, delta) => {
    const uniformValues = uniforms
    const {
      transforms, symmetry, warp, displacement, tiling,
      color, effects, generator
    } = useStore.getState() // Access fresh state without re-render

    // Flux Time Logic
    if (fluxEnabled) {
      timeRef.current += delta
    }
    uniformValues.uTime.value = timeRef.current

    // Update Shape Uniform
    uniformValues.uShape.value = shape === 'circle' ? 1 : 0

    // Sync Uniforms
    uniformValues.uTransforms.value.set(
      transforms.x,
      transforms.y,
      transforms.scale,
      transforms.rotation
    )

    uniformValues.uSymEnabled.value = symmetry.enabled
    uniformValues.uSymSlices.value = symmetry.slices

    const warpMap = { 'none': 0, 'polar': 1, 'log-polar': 2 }
    uniformValues.uWarpType.value = warpMap[warp.type] || 0

    uniformValues.uDisplacement.value.set(displacement.amp, displacement.freq)

    const tileMap = { 'none': 0, 'p1': 1, 'p2': 2, 'p4m': 3 }
    uniformValues.uTilingType.value = tileMap[tiling.type] || 0
    uniformValues.uTilingScale.value = tiling.scale

    uniformValues.uPosterize.value = color.posterize

    uniformValues.uEffects.value.set(
      effects.edgeDetect,
      effects.invert,
      effects.solarize,
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
