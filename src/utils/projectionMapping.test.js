import { describe, expect, it } from 'vitest'
import {
  applyProjectiveMatrix,
  computeProjectiveMatrix,
  getOutputRect,
  getProjectionTargetPoints,
  getRectPoints,
} from './projectionMapping'

function applyMatrix(matrix, x, y) {
  const w = matrix[3] * x + matrix[7] * y + matrix[15]
  return {
    x: (matrix[0] * x + matrix[4] * y + matrix[12]) / w,
    y: (matrix[1] * x + matrix[5] * y + matrix[13]) / w,
  }
}

describe('projectionMapping', () => {
  it('calculates a centered output rect for fixed aspect canvases', () => {
    expect(getOutputRect(1000, 1000, 1920, 1080, 'video')).toEqual({
      width: 1000,
      height: 562.5,
      left: 0,
      top: 218.75,
    })
  })

  it('returns identity points when no projection corners are stored', () => {
    const rect = { left: 50, top: 20, width: 300, height: 150 }
    expect(getProjectionTargetPoints(null, rect, 1280, 720)).toEqual(getRectPoints(rect))
  })

  it('solves a projective transform for an arbitrary quad', () => {
    const source = [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 400, y: 225 },
      { x: 0, y: 225 },
    ]
    const target = [
      { x: 30, y: 20 },
      { x: 460, y: 45 },
      { x: 420, y: 280 },
      { x: 10, y: 250 },
    ]

    const matrix = computeProjectiveMatrix(source, target)
    const mapped = source.map((point) => applyMatrix(matrix, point.x, point.y))

    mapped.forEach((point, index) => {
      expect(point.x).toBeCloseTo(target[index].x, 4)
      expect(point.y).toBeCloseTo(target[index].y, 4)
    })
  })

  it('applies projective matrices to arbitrary points', () => {
    const source = [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 400, y: 225 },
      { x: 0, y: 225 },
    ]
    const target = [
      { x: 50, y: 10 },
      { x: 450, y: 30 },
      { x: 390, y: 260 },
      { x: 20, y: 240 },
    ]

    const matrix = computeProjectiveMatrix(source, target)
    const mappedPoint = applyProjectiveMatrix(matrix, 200, 112.5)

    expect(mappedPoint.x).toBeGreaterThan(150)
    expect(mappedPoint.x).toBeLessThan(300)
    expect(mappedPoint.y).toBeGreaterThan(90)
    expect(mappedPoint.y).toBeLessThan(180)
  })
})
