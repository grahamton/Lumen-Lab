// Lets DOM consumers copy a renderer's canvas right after each frame renders.
// WebGPU canvases (and WebGL2 without preserveDrawingBuffer) are only readable
// in the same task as the render, so a separate rAF loop would read blanks.
const listeners = new Map()

export function subscribeCanvasFrames(canvas, listener) {
  if (!listeners.has(canvas)) listeners.set(canvas, new Set())
  listeners.get(canvas).add(listener)
  return () => {
    const set = listeners.get(canvas)
    if (!set) return
    set.delete(listener)
    if (set.size === 0) listeners.delete(canvas)
  }
}

export function publishCanvasFrame(canvas) {
  listeners.get(canvas)?.forEach((listener) => listener(canvas))
}
