import { useEffect } from 'react'
import { useStore } from '../store/useStore'

const CHANNEL_NAME = 'lumenlab-projection-sync'

function selectProjectionPayload(state) {
  return {
    media: state.media,
    mediaLibrary: state.mediaLibrary,
    activeMediaId: state.activeMediaId,
    scenes: state.scenes,
    transforms: state.transforms,
    symmetry: state.symmetry,
    warp: state.warp,
    displacement: state.displacement,
    tiling: state.tiling,
    generator: state.generator,
    color: state.color,
    effects: state.effects,
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

    const pushState = () => {
      channel.postMessage({
        type: 'state-sync',
        payload: selectProjectionPayload(useStore.getState()),
      })
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
        pushState()
      }
    }

    pushState()

    return () => {
      if (pushTimer) {
        window.clearTimeout(pushTimer)
      }
      unsubscribe()
      channel.close()
    }
  }, [isOutputWindow])
}
