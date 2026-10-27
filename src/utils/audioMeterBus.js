// Latest audio levels from the main window's analyser. Canvases in the same
// window read this directly; going through the store would re-render the UI on
// every meter tick.
export const audioMeters = { bass: 0, mid: 0, high: 0 }

export function publishAudioMeters(bass, mid, high) {
  audioMeters.bass = bass
  audioMeters.mid = mid
  audioMeters.high = high
}
