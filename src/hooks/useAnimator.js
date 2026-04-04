import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useStore } from '../store/useStore'

// Exported for tests
export const interpolateState = (s1, s2, t) => {
  // Helper: Linear Interpolation
  const lerp = (start, end, t) => start * (1 - t) + end * t
  // Helper: Rotation Interpolation (Shortest Path)
  const lerpAngle = (start, end, t) => {
    const delta = (end - start + Math.PI * 3) % (Math.PI * 2) - Math.PI
    return start + delta * t
  }

  if (!s1 || !s2) return s1 || s2

  // Safety: Ensure subsections exist
  const t1 = s1.transforms || {}; const t2 = s2.transforms || {}
  const sym1 = s1.symmetry || {}; const sym2 = s2.symmetry || {}
  const w1 = s1.warp || {}; const w2 = s2.warp || {}
  const d1 = s1.displacement || {}; const d2 = s2.displacement || {}
  const til1 = s1.tiling || {}; const til2 = s2.tiling || {}
  const c1 = s1.color || {}; const c2 = s2.color || {}
  const eff1 = s1.effects || {}; const eff2 = s2.effects || {}
  const gen1 = s1.generator || {}; const gen2 = s2.generator || {}

  return {
    transforms: {
      x: lerp(t1.x || 0, t2.x || 0, t),
      y: lerp(t1.y || 0, t2.y || 0, t),
      scale: lerp(t1.scale ?? 1, t2.scale ?? 1, t),
      rotation: lerpAngle(t1.rotation || 0, t2.rotation || 0, t),
    },
    symmetry: {
      enabled: t < 0.5 ? !!sym1.enabled : !!sym2.enabled,
      type: t < 0.5 ? (sym1.type || 'radial') : (sym2.type || sym1.type || 'radial'),
      offset: lerp(sym1.offset || 0, sym2.offset || 0, t),
      slices: Math.round(lerp(sym1.slices || 6, sym2.slices || 6, t)),
    },
    warp: { type: t < 0.5 ? (w1.type || 'none') : (w2.type || w1.type || 'none') },
    displacement: {
      amp: lerp(d1.amp || 0, d2.amp || 0, t),
      freq: lerp(d1.freq || 10, d2.freq || 10, t),
    },
    tiling: {
      type: t < 0.5 ? (til1.type || 'none') : (til2.type || til1.type || 'none'),
      scale: lerp(til1.scale ?? 1, til2.scale ?? 1, t),
    },
    color: {
      posterize: lerp(c1.posterize || 256, c2.posterize || 256, t),
      hue: lerp(c1.hue ?? 0.0, c2.hue ?? 0.0, t),
      sat: lerp(c1.sat ?? 1.0, c2.sat ?? 1.0, t),
      light: lerp(c1.light ?? 1.0, c2.light ?? 1.0, t),
    },
    effects: {
      edgeDetect: lerp(eff1.edgeDetect || 0, eff2.edgeDetect || 0, t),
      invert: lerp(eff1.invert || 0, eff2.invert || 0, t),
      solarize: lerp(eff1.solarize || 0, eff2.solarize || 0, t),
      shift: lerp(eff1.shift || 0, eff2.shift || 0, t),
      bloom: lerp(eff1.bloom || 0, eff2.bloom || 0, t),
      chromaticAberration: lerp(eff1.chromaticAberration || 0, eff2.chromaticAberration || 0, t),
      noise: lerp(eff1.noise || 0, eff2.noise || 0, t),
    },
    generator: {
      type: t < 0.5 ? (gen1.type || 'none') : (gen2.type || gen1.type || 'none'),
      param1: lerp(gen1.param1 ?? 50, gen2.param1 ?? 50, t),
      param2: lerp(gen1.param2 ?? 50, gen2.param2 ?? 50, t),
      param3: lerp(gen1.param3 ?? 50, gen2.param3 ?? 50, t),
      isAnimated: gen1.isAnimated ?? gen2.isAnimated, // pass through; not interpolated
    }
  }
}

export function useAnimator() {
  const { snapshots, animation, loadSnapshot, setAnimation } = useStore()
  const requestRef = useRef()
  const startTimeRef = useRef()
  // const currentIndexRef = useRef(0) // Removed: Use store's activeStep for UI consistency if needed, checking below
  const directionRef = useRef(1) // 1 for forward, -1 for backward

  // Easing Functions
  const easings = useMemo(() => ({
    linear: t => t,
    easeIn: t => t * t,
    easeOut: t => t * (2 - t),
    easeInOut: t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    bounce: t => {
      const n1 = 7.5625; const d1 = 2.75
      if (t < 1 / d1) return n1 * t * t
      else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
      else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
      else return n1 * (t -= 2.625 / d1) * t + 0.984375
    },
    elastic: t => {
      const c4 = (2 * Math.PI) / 3
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
    }
  }), [])

  const animate = useCallback(function animateFrame(time) {
    if (useStore.getState().ui.globalPause) {
      requestRef.current = requestAnimationFrame(animateFrame)
      return
    }

    if (!animation.isPlaying || snapshots.length < 2) {
      startTimeRef.current = null // Reset timing when paused
      requestRef.current = requestAnimationFrame(animateFrame)
      return
    }

    // Safety Clamp: Prevent Seizures
    // Fallback to 2000ms if transitionTime is undefined (old state)
    const duration = animation.transitionTime || 2000
    const safeDuration = Math.max(duration, animation.strobeSafety ? 500 : 50)

    if (!startTimeRef.current) startTimeRef.current = time
    const elapsed = time - startTimeRef.current

    // Normalize progress 0-1
    let rawT = Math.min(elapsed / safeDuration, 1)

    // Apply Easing
    const easeFn = easings[animation.easing] || easings.linear
    const progress = easeFn(rawT)

    // Determine Indices
    let currIdx = animation.activeStep

    // GUARD: Index out of bounds (e.g. after deletion)
    if (currIdx >= snapshots.length || currIdx < 0) {
      // Auto-correct to 0 and stop this frame to prevent crash
      setAnimation('activeStep', 0)
      return
    }

    let nextIdx = currIdx + directionRef.current

    // Loop Logic (Wrap around)
    if (nextIdx >= snapshots.length) {
      if (animation.mode === 'loop') nextIdx = 0
      else { nextIdx = currIdx - 1; directionRef.current = -1 }
    } else if (nextIdx < 0) {
      if (animation.mode === 'loop') nextIdx = snapshots.length - 1
      else { nextIdx = currIdx + 1; directionRef.current = 1 }
    }

    // Index Safety (Double Check)
    if (nextIdx >= snapshots.length) nextIdx = 0
    if (nextIdx < 0) nextIdx = 0

    // GUARD: Ensure snapshots exist before accessing
    const s1 = snapshots[currIdx]
    const s2 = snapshots[nextIdx]

    if (!s1 || !s2) return

    // Interpolate & Load
    const currentState = interpolateState(s1, s2, progress)
    if (currentState) loadSnapshot(currentState)

    // Cycle Complete?
    if (elapsed >= safeDuration) {
      startTimeRef.current = time // Reset timer for next step

      // Advance Step
      setAnimation('activeStep', nextIdx)

      // Ping Pong Turnaround logic
      if (animation.mode === 'pingpong') {
        if (nextIdx >= snapshots.length - 1) directionRef.current = -1
        if (nextIdx <= 0) directionRef.current = 1
      }

      // Once mode stop
      if (animation.mode === 'once' && nextIdx === snapshots.length - 1) {
        setAnimation('isPlaying', false)
      }
    }

    requestRef.current = requestAnimationFrame(animateFrame)
  }, [animation, snapshots, easings, loadSnapshot, setAnimation])

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(requestRef.current)
  }, [animate])
}
