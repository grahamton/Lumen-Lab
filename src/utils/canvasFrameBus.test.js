import { describe, expect, it, vi } from 'vitest'
import { publishCanvasFrame, subscribeCanvasFrames } from './canvasFrameBus'

describe('canvasFrameBus', () => {
  it('notifies only listeners of the published canvas', () => {
    const a = {}
    const b = {}
    const onA = vi.fn()
    const onB = vi.fn()
    subscribeCanvasFrames(a, onA)
    subscribeCanvasFrames(b, onB)

    publishCanvasFrame(a)

    expect(onA).toHaveBeenCalledWith(a)
    expect(onB).not.toHaveBeenCalled()
  })

  it('stops notifying after unsubscribe', () => {
    const canvas = {}
    const listener = vi.fn()
    const unsubscribe = subscribeCanvasFrames(canvas, listener)

    unsubscribe()
    publishCanvasFrame(canvas)

    expect(listener).not.toHaveBeenCalled()
  })
})
