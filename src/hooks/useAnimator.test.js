import { describe, it, expect } from 'vitest'
import { interpolateState } from './useAnimator'

const base = {
  transforms: { x: 0, y: 0, scale: 1, rotation: 0 },
  symmetry: { enabled: false, type: 'radial', slices: 6, offset: 0 },
  warp: { type: 'none' },
  displacement: { amp: 0, freq: 10 },
  tiling: { type: 'none', scale: 1 },
  color: { posterize: 256, hue: 0, sat: 1, light: 1 },
  effects: { edgeDetect: 0, invert: 0, solarize: 0, shift: 0, bloom: 0, chromaticAberration: 0, noise: 0 },
  generator: { type: 'none', param1: 50, param2: 50, param3: 50 },
}

describe('interpolateState', () => {
  it('switches symmetry enabled and type toward target', () => {
    const s1 = { ...base, symmetry: { enabled: false, type: 'radial', slices: 6, offset: 0 } }
    const s2 = { ...base, symmetry: { enabled: true, type: 'mirrorX', slices: 4, offset: 0.2 } }
    const mid = interpolateState(s1, s2, 0.6)
    expect(mid.symmetry.enabled).toBe(true)
    expect(mid.symmetry.type).toBe('mirrorX')
    expect(mid.symmetry.slices).toBe(5) // lerp 6 -> 4 at t=0.6
    expect(mid.symmetry.offset).toBeCloseTo(0.12, 2)
  })

  it('propagates generator type to target and lerps params', () => {
    const s1 = { ...base, generator: { type: 'voronoi', param1: 10, param2: 20, param3: 30 } }
    const s2 = { ...base, generator: { type: 'plasma', param1: 90, param2: 40, param3: 60 } }
    const mid = interpolateState(s1, s2, 0.75)
    expect(mid.generator.type).toBe('plasma')
    expect(mid.generator.param1).toBeCloseTo(70, 1)
    expect(mid.generator.param2).toBeCloseTo(35, 1)
    expect(mid.generator.param3).toBeCloseTo(52.5, 1)
  })



  it('lerps full color channels', () => {
    const s1 = { ...base, color: { posterize: 32, hue: 0, sat: 1, light: 1 } }
    const s2 = { ...base, color: { posterize: 8, hue: 0.5, sat: 1.5, light: 0.5 } }
    const mid = interpolateState(s1, s2, 0.5)
    expect(mid.color.posterize).toBeCloseTo(20, 1)
    expect(mid.color.hue).toBeCloseTo(0.25, 2)
    expect(mid.color.sat).toBeCloseTo(1.25, 2)
    expect(mid.color.light).toBeCloseTo(0.75, 2)
  })

  it('moves warp/tiling types toward target', () => {
    const s1 = { ...base, warp: { type: 'none' }, tiling: { type: 'p1', scale: 1 } }
    const s2 = { ...base, warp: { type: 'polar' }, tiling: { type: 'p4m', scale: 2 } }
    const mid = interpolateState(s1, s2, 0.7)
    expect(mid.warp.type).toBe('polar')
    expect(mid.tiling.type).toBe('p4m')
    expect(mid.tiling.scale).toBeCloseTo(1.7, 2)
  })
})
