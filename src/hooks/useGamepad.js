import { useEffect, useRef } from 'react'
import { getEffectiveAuthoredSceneState, useStore } from '../store/useStore'

export function useGamepad(enabled = true) {
  const requestRef = useRef()
  // We do NOT call useStore() here to avoid subscribing the component (App) to every state change.
  // We will access the store transiently via useStore.getState() inside the loop.

  // Gamepad State Keepers (for edge detection on buttons)
  const prevButtons = useRef([])

  // Configuration
  const DEADZONE = 0.1
  const POLL_RATE = 16 // ~60fps

  useEffect(() => {
    if (!enabled) return undefined
    const scanGamepads = () => {
      const store = useStore.getState()
      const effectiveSceneState = getEffectiveAuthoredSceneState(store)
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : []
      if (!gamepads) return

      // Assume Player 1 (Index 0)
      const gp = gamepads[0]

      // Update Connection Status (Throttled check could be better but this is fine for now)
      if (!!gp !== store.ui.gamepadConnected) {
        store.setUi('gamepadConnected', !!gp)
      }

      if (!gp) {
        requestRef.current = requestAnimationFrame(scanGamepads)
        return
      }

      // --- AXES MAPPING ---
      // Standard Xbox:
      // 0: Left Stick X (-1 Left, 1 Right)
      // 1: Left Stick Y (-1 Up, 1 Down)
      // 2: Right Stick X
      // 3: Right Stick Y

      const lx = Math.abs(gp.axes[0]) > DEADZONE ? gp.axes[0] : 0
      const ly = Math.abs(gp.axes[1]) > DEADZONE ? gp.axes[1] : 0
      const rx = Math.abs(gp.axes[2]) > DEADZONE ? gp.axes[2] : 0
      const ry = Math.abs(gp.axes[3]) > DEADZONE ? gp.axes[3] : 0

      // Apply Analog Transforms (Continuous)
      // We read current state to apply delta or absolute?
      // For "Performance/DJ" feel, delta is often better for Pan, but Absolute might be better for "Tilt".
      // Let's go with DELTA for transforms to allow fine tuning, but maybe faster speed.

      if (lx !== 0 || ly !== 0) {
        store.setTransform('x', effectiveSceneState.transforms.x + lx * 2)
        store.setTransform('y', effectiveSceneState.transforms.y - ly * 2) // Invert Y natural feel
      }

      if (rx !== 0) {
        // Rotation
        store.setTransform('rotation', effectiveSceneState.transforms.rotation + rx * 0.05)
      }

      if (ry !== 0) {
        // Log-style Zoom (scale)
        const scaleDelta = ry * 0.02
        store.setTransform('scale', Math.max(0.1, effectiveSceneState.transforms.scale - scaleDelta))
      }

      // --- TRIGGERS (Often mapped to Buttons 6 & 7 in API, acts as axes 0-1) ---
      // Some browsers map triggers to buttons[6] (L2) and buttons[7] (R2) with 'value' property.
      const l2 = gp.buttons[6]?.value || 0
      const r2 = gp.buttons[7]?.value || 0

      if (l2 > 0.05) {
        // Modifier: Displacement Amp (Temporary boost?) or absolute set?
        // Let's overwrite for now so you can "play" the distortion
        store.setDisplacement('amp', l2 * 100)
      }

      if (r2 > 0.05) {
        // Modifier: Displacement Freq
        store.setDisplacement('freq', 10 + (r2 * 50))
      }


      // --- BUTTONS (Digital) ---
      // 0: A
      // 1: B
      // 2: X
      // 3: Y
      // 4: LB
      // 5: RB
      // 8: Back/Select
      // 9: Start
      // 12: D-Pad Up
      // 13: D-Pad Down
      // 14: D-Pad Left
      // 15: D-Pad Right

      gp.buttons.forEach((btn, index) => {
        const pressed = btn.pressed
        const prev = prevButtons.current[index]

        // Rising Edge (Just Pressed)
        if (pressed && !prev) {
          handleButtonPress(index, store)
        }

        prevButtons.current[index] = pressed
      })

      requestRef.current = requestAnimationFrame(scanGamepads)
    }

    requestRef.current = requestAnimationFrame(scanGamepads)
    return () => cancelAnimationFrame(requestRef.current)
  }, [enabled]) // Dependencies should be stable
}

function handleButtonPress(index, store) {
  const effectiveSceneState = getEffectiveAuthoredSceneState(store)
  // console.log("Button Pressed:", index)

  switch (index) {
    case 0: // A - Toggle Play/Pause
      store.setAnimation('isPlaying', !store.animation.isPlaying)
      break
    case 1: // B - Toggle Symmetry
      store.setSymmetry('enabled', !effectiveSceneState.symmetry.enabled)
      break
    case 2: { // X - Toggle Invert
      const isInverted = effectiveSceneState.effects.invert > 0
      store.setEffect('invert', isInverted ? 0 : 100)
      break
    }
    case 3: // Y - Randomize
      store.randomize()
      break
    case 4: // LB - Prev Generator (placeholder logic)
      cycleGenerator(store, -1)
      break
    case 5: // RB - Next Generator
      cycleGenerator(store, 1)
      break
    case 8: // Back - Reset
      store.resetParams()
      break
    case 9: // Start - Toggle Flux
      store.setFlux('enabled', !store.flux.enabled)
      break
    case 12: // D-Pad Up
    case 14: // D-Pad Left
      cycleSymmetry(store, -1)
      break
    case 13: // D-Pad Down
    case 15: // D-Pad Right
      cycleSymmetry(store, 1)
      break
    default:
      break
  }
}

const GENERATORS = ['fibonacci', 'voronoi', 'grid', 'liquid', 'plasma', 'fractal']
function cycleGenerator(store, dir) {
  const current = getEffectiveAuthoredSceneState(store).generator.type
  let idx = GENERATORS.indexOf(current)
  if (idx === -1) idx = 0

  let nextIdx = (idx + dir + GENERATORS.length) % GENERATORS.length
  store.setGenerator('type', GENERATORS[nextIdx])
}

const SYMMETRIES = ['radial', 'mirrorX', 'mirrorY']
function cycleSymmetry(store, dir) {
  const current = getEffectiveAuthoredSceneState(store).symmetry.type
  let idx = SYMMETRIES.indexOf(current)
  if (idx === -1) idx = 0

  let nextIdx = (idx + dir + SYMMETRIES.length) % SYMMETRIES.length
  store.setSymmetry('type', SYMMETRIES[nextIdx])
}
