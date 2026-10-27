import React, { useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { useShallow } from 'zustand/shallow'
import { ControlGroup } from './ControlGroup'
import { Toggle } from './Toggle'

export const SectionMotion = React.memo(function SectionMotion({ onInteract }) {
  // Fine-grained selectors: subscribe to individual leaf values so this component
  // only re-renders when a specific motion value actually changes.
  const { globalPause, animationBpm, fluxEnabled, fluxAmount, setUi, setAnimation, setFlux } = useStore(
    useShallow((s) => ({
      globalPause:  s.ui.globalPause,
      animationBpm: s.animation.bpm,
      fluxEnabled:  s.flux.enabled,
      fluxAmount:   s.flux.amount,
      setUi:        s.setUi,
      setAnimation: s.setAnimation,
      setFlux:      s.setFlux,
    }))
  )
  const isPlaying = !globalPause

  const toggleAnimate = useCallback(() => {
    onInteract?.()
    setUi('globalPause', isPlaying)
  }, [onInteract, setUi, isPlaying])

  const toggleWander = useCallback(() => {
    onInteract?.()
    setFlux('enabled', !fluxEnabled)
  }, [onInteract, setFlux, fluxEnabled])

  return (
    <div>
      <Toggle label="ANIMATE" help="animation.enabled" isOn={isPlaying} onToggle={toggleAnimate} />
      <ControlGroup
        section="animation"
        param="speed"
        storeKey="bpm"
        value={animationBpm}
        set={setAnimation}
        onInteract={onInteract}
      />
      <Toggle label="WANDER" help="flux.enabled" isOn={fluxEnabled} onToggle={toggleWander} />
      {fluxEnabled && (
        <ControlGroup section="flux" param="amount" value={fluxAmount} set={setFlux} onInteract={onInteract} />
      )}
    </div>
  )
})
