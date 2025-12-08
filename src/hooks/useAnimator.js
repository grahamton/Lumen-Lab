import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'

export function useAnimator() {
  const { snapshots, animation, loadSnapshot } = useStore()
  const requestRef = useRef()
  const startTimeRef = useRef()
  const currentIndexRef = useRef(0)
  const directionRef = useRef(1) // 1 for forward, -1 for backward (pingpong)

  // Linear Interpolation Helper
  const lerp = (start, end, t) => start * (1 - t) + end * t

  // Deep Lerp for our state object
  const interpolateState = (s1, s2, t) => {
    return {
      transforms: {
        x: lerp(s1.transforms.x, s2.transforms.x, t),
        y: lerp(s1.transforms.y, s2.transforms.y, t),
        scale: lerp(s1.transforms.scale, s2.transforms.scale, t),
        rotation: lerp(s1.transforms.rotation, s2.transforms.rotation, t),
      },
      symmetry: {
        enabled: s1.symmetry.enabled, // Discrete
        slices: Math.round(lerp(s1.symmetry.slices, s2.symmetry.slices, t)),
      },
      warp: {
        type: s1.warp.type, // Discrete
      },
      displacement: {
        amp: lerp(s1.displacement.amp, s2.displacement.amp, t),
        freq: lerp(s1.displacement.freq, s2.displacement.freq, t),
      },
      tiling: {
        type: s1.tiling.type, // Discrete
        scale: lerp(s1.tiling.scale, s2.tiling.scale, t),
        overlap: lerp(s1.tiling.overlap, s2.tiling.overlap, t),
      },
      masking: {
        lumaThreshold: lerp(s1.masking.lumaThreshold, s2.masking.lumaThreshold, t),
        centerRadius: lerp(s1.masking.centerRadius, s2.masking.centerRadius, t),
        invertLuma: s1.masking.invertLuma, // Discrete
        feather: lerp(s1.masking.feather, s2.masking.feather, t),
      },
      color: {
        posterize: lerp(s1.color.posterize, s2.color.posterize, t),
      },
      effects: {
        edgeDetect: s1.effects.edgeDetect, // Discrete
        edgeStrength: lerp(s1.effects.edgeStrength, s2.effects.edgeStrength, t),
      }
    }
  }

  const animate = (time) => {
    if (!animation.isPlaying || snapshots.length < 2) {
      requestRef.current = requestAnimationFrame(animate)
      return
    }

    if (!startTimeRef.current) startTimeRef.current = time
    const elapsed = time - startTimeRef.current
    const progress = Math.min(elapsed / animation.duration, 1)

    // Interpolate
    const currIdx = currentIndexRef.current
    let nextIdx = currIdx + directionRef.current

    // Loop Logic
    if (nextIdx >= snapshots.length) {
      if (animation.mode === 'loop') nextIdx = 0
      else { nextIdx = currIdx - 1; directionRef.current = -1 } // Ping-pong turn back
    } else if (nextIdx < 0) {
      if (animation.mode === 'loop') nextIdx = snapshots.length - 1 // Should not happen in pure playback but logical safety
      else { nextIdx = currIdx + 1; directionRef.current = 1 } // Ping-pong turn forward
    }

    // Safety
    if (nextIdx >= snapshots.length) nextIdx = 0
    if (nextIdx < 0) nextIdx = 0

    const currentState = interpolateState(snapshots[currIdx], snapshots[nextIdx], progress)
    loadSnapshot(currentState)

    // Check for completion of this segment
    if (progress >= 1) {
      startTimeRef.current = time
      currentIndexRef.current = nextIdx

      // If Ping Pong, we need to check bounds again to potentially flip direction for next frame
      if (animation.mode === 'pingpong') {
        if (currentIndexRef.current >= snapshots.length - 1) directionRef.current = -1
        if (currentIndexRef.current <= 0) directionRef.current = 1
      }
    }

    requestRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(requestRef.current)
  }, [animation.isPlaying, animation.mode, animation.duration, snapshots.length]) // Re-bind if settings change
}
