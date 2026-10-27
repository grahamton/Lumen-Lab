import { useEffect } from 'react'
import { getEffectiveRenderState, useStore } from '../store/useStore'

const CHANNEL_NAME = 'lumenlab-projection-sync'

function selectProjectionPayload(state) {
  const effectiveState = getEffectiveRenderState(state)
  return {
    media: effectiveState.media,
    mediaLibrary: state.mediaLibrary,
    activeMediaId: effectiveState.activeMediaId,
    scenes: state.scenes,
    transforms: effectiveState.transforms,
    symmetry: effectiveState.symmetry,
    warp: effectiveState.warp,
    displacement: effectiveState.displacement,
    tiling: effectiveState.tiling,
    generator: effectiveState.generator,
    color: effectiveState.color,
    effects: effectiveState.effects,
    canvas: state.canvas,
    audio: state.audio,
    flux: state.flux,
    projection: state.projection,
    userPresets: state.userPresets,
    ui: {
      globalPause: state.ui.globalPause,
      lowResPreview: state.ui.lowResPreview,
      perfCapFx: state.ui.perfCapFx,
    },
  }
}

export function useProjectionStateBridge(isOutputWindow) {
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined

    const channel = new BroadcastChannel(CHANNEL_NAME)

    if (isOutputWindow) {
      channel.onmessage = (event) => {
        if (event.data?.type !== 'state-sync' || !event.data.payload) return
        useStore.setState((state) => ({
          ...state,
          ...event.data.payload,
          ui: { ...state.ui, ...(event.data.payload.ui || {}) },
        }))
      }

      channel.postMessage({ type: 'request-sync' })
      return () => channel.close()
    }

    // Large, rarely-changing sections are only re-sent when their reference
    // changes; structured-cloning inline media on every slider tick janked the UI.
    const HEAVY_KEYS = ['media', 'mediaLibrary', 'scenes', 'userPresets']
    let lastSent = {}
    let outputWindowSeen = false

    const pushState = ({ full = false } = {}) => {
      const state = useStore.getState()
      if (!full && !outputWindowSeen && !state.projection?.outputWindowOpen) return

      const payload = selectProjectionPayload(state)
      for (const key of HEAVY_KEYS) {
        if (!full && payload[key] === lastSent[key]) delete payload[key]
        else lastSent[key] = payload[key]
      }
      channel.postMessage({ type: 'state-sync', payload })
    }

    let pushTimer = null
    const schedulePush = () => {
      if (pushTimer) return
      pushTimer = window.setTimeout(() => {
        pushTimer = null
        pushState()
      }, 33)
    }

    const unsubscribe = useStore.subscribe(() => {
      schedulePush()
    })

    channel.onmessage = (event) => {
      if (event.data?.type === 'request-sync') {
        outputWindowSeen = true
        pushState({ full: true })
      }
    }

    return () => {
      if (pushTimer) {
        window.clearTimeout(pushTimer)
      }
      unsubscribe()
      channel.close()
    }
  }, [isOutputWindow])
}
