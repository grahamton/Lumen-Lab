// TSL port of the visualizer shader. Compiles to WGSL on WebGPU and GLSL on the
// WebGL2 fallback backend, so one source drives both renderers.
import {
  Fn,
  If,
  PI,
  TWO_PI,
  abs,
  atan,
  clamp,
  cos,
  dot,
  float,
  floor,
  fract,
  length,
  log,
  max,
  min,
  mix,
  mod,
  positionGeometry,
  select,
  sin,
  smoothstep,
  sqrt,
  step,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'
import { MeshBasicNodeMaterial, Texture, Vector2, Vector3, Vector4 } from 'three/webgpu'

const LUMA = vec3(0.299, 0.587, 0.114)

// --- NOISE & MATH HELPERS ---

const random = Fn(([st]) => fract(sin(dot(st, vec2(12.9898, 78.233))).mul(43758.5453123)))
  .setLayout({ name: 'llRandom', type: 'float', inputs: [{ name: 'st', type: 'vec2' }] })

const permute = (x) => mod(x.mul(34.0).add(1.0).mul(x), 289.0)

const rgb2hsb = Fn(([c]) => {
  const K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0)
  const p = mix(vec4(c.b, c.g, K.w, K.z), vec4(c.g, c.b, K.x, K.y), step(c.b, c.g))
  const q = mix(vec4(p.x, p.y, p.w, c.r), vec4(c.r, p.y, p.z, p.x), step(p.x, c.r))
  const d = q.x.sub(min(q.w, q.y))
  const e = float(1.0e-10)
  return vec3(
    abs(q.z.add(q.w.sub(q.y).div(d.mul(6.0).add(e)))),
    d.div(q.x.add(e)),
    q.x,
  )
}).setLayout({ name: 'llRgb2hsb', type: 'vec3', inputs: [{ name: 'c', type: 'vec3' }] })

const hsb2rgb = Fn(([c]) => {
  const p = abs(fract(vec3(c.x).add(vec3(1.0, 2.0 / 3.0, 1.0 / 3.0))).mul(6.0).sub(3.0))
  return c.z.mul(mix(vec3(1.0), clamp(p.sub(1.0), 0.0, 1.0), c.y))
}).setLayout({ name: 'llHsb2rgb', type: 'vec3', inputs: [{ name: 'c', type: 'vec3' }] })

// 2D simplex noise (Ashima Arts), same constants as the original GLSL.
const snoise = Fn(([v]) => {
  const C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439)
  const i0 = floor(v.add(dot(v, vec2(C.y))))
  const x0 = v.sub(i0).add(dot(i0, vec2(C.x)))
  const i1 = select(x0.x.greaterThan(x0.y), vec2(1.0, 0.0), vec2(0.0, 1.0))
  const x12 = vec4(x0.add(vec2(C.x)).sub(i1), x0.add(vec2(C.z)))
  const i = mod(i0, 289.0)
  const p = permute(
    permute(vec3(i.y).add(vec3(0.0, i1.y, 1.0)))
      .add(vec3(i.x))
      .add(vec3(0.0, i1.x, 1.0)),
  )
  const m0 = max(vec3(0.5).sub(vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw))), 0.0)
  const m2 = m0.mul(m0)
  const m4 = m2.mul(m2)
  const x = fract(p.mul(C.w)).mul(2.0).sub(1.0)
  const h = abs(x).sub(0.5)
  const ox = floor(x.add(0.5))
  const a0 = x.sub(ox)
  const m = m4.mul(float(1.79284291400159).sub(a0.mul(a0).add(h.mul(h)).mul(0.85373472095314)))
  const g = vec3(
    a0.x.mul(x0.x).add(h.x.mul(x0.y)),
    a0.yz.mul(x12.xz).add(h.yz.mul(x12.yw)),
  )
  return dot(m, g).mul(130.0)
}).setLayout({ name: 'llSnoise', type: 'float', inputs: [{ name: 'v', type: 'vec2' }] })

const fbm = Fn(([st0]) => {
  const value = float(0.0).toVar()
  const amplitude = float(0.5).toVar()
  const st = vec2(st0).toVar()
  for (let octave = 0; octave < 6; octave++) {
    value.addAssign(amplitude.mul(snoise(st)))
    st.mulAssign(2.0)
    amplitude.mulAssign(0.5)
  }
  return value
}).setLayout({ name: 'llFbm', type: 'float', inputs: [{ name: 'st', type: 'vec2' }] })

/**
 * Builds the visualizer material. The returned `uniforms` object mirrors the
 * old ShaderMaterial uniform map: every entry exposes a mutable `.value`.
 */
export function createVisualizerMaterial() {
  const placeholder = new Texture()

  const uniforms = {
    uTexture: texture(placeholder),
    uResolution: uniform(new Vector2(1, 1)),
    uAspect: uniform(1.0),
    uImageAspect: uniform(1.0),
    uShape: uniform(0.0),
    uTime: uniform(0.0),
    uGenTime: uniform(0.0),
    uTransforms: uniform(new Vector4(0, 0, 1, 0)),
    uSymEnabled: uniform(0.0),
    uSymSlices: uniform(6.0),
    uSymType: uniform(0.0),
    uSymOffset: uniform(0.0),
    uWarpType: uniform(0.0),
    uDisplacement: uniform(new Vector2(0, 10)),
    uTilingType: uniform(0.0),
    uTilingScale: uniform(1.0),
    uTilingOverlap: uniform(0.0),
    uPosterize: uniform(256.0),
    uColorHSL: uniform(new Vector3(0, 1, 1)),
    uEffects: uniform(new Vector4(0, 0, 0, 0)),
    uEdgeQuality: uniform(1.0),
    uGenType: uniform(0.0),
    uGenParams: uniform(new Vector3(50, 50, 50)),
  }

  const {
    uTexture, uResolution, uAspect, uImageAspect, uShape, uGenTime, uTransforms,
    uSymEnabled, uSymSlices, uSymType, uSymOffset, uWarpType, uDisplacement,
    uTilingType, uTilingScale, uTilingOverlap, uPosterize, uColorHSL, uEffects,
    uEdgeQuality, uGenType, uGenParams,
  } = uniforms

  // --- GENERATORS ---

  const fibonacciSpiral = Fn(([p]) => {
    const center = p.sub(0.5)
    const r = length(center).mul(uGenParams.y)
    const theta = atan(center.y, center.x).add(uGenTime.mul(0.1))
    const spiral = sin(log(r.add(0.0001)).mul(10.0).add(theta.mul(uGenParams.x)))
    return vec3(smoothstep(-0.2, 0.2, spiral))
  }).setLayout({ name: 'llFibonacci', type: 'vec3', inputs: [{ name: 'p', type: 'vec2' }] })

  const voronoi = Fn(([p]) => {
    const st = p.mul(uGenParams.x).mul(0.1).add(1.0)
    const iSt = floor(st)
    const fSt = fract(st)
    const minDist = float(1.0).toVar()
    for (let y = -1; y <= 1; y++) {
      for (let x = -1; x <= 1; x++) {
        const neighbor = vec2(x, y)
        const point = sin(uGenTime.mul(0.5).add(vec2(random(iSt.add(neighbor))).mul(6.2831))).mul(0.5).add(0.5)
        minDist.assign(min(minDist, length(neighbor.add(point).sub(fSt))))
      }
    }
    return vec3(smoothstep(0.0, uGenParams.y.mul(0.01).add(0.1), minDist))
  }).setLayout({ name: 'llVoronoi', type: 'vec3', inputs: [{ name: 'p', type: 'vec2' }] })

  const basicGrid = Fn(([p]) => {
    const st = p.mul(uGenParams.x).mul(0.2)
    const thick = uGenParams.y.mul(0.005)
    const soft = uGenParams.z.mul(0.002).add(0.001)
    const grid = abs(fract(st.sub(0.5)).sub(0.5))
    const lineX = smoothstep(thick.sub(soft), thick.add(soft), grid.x)
    const lineY = smoothstep(thick.sub(soft), thick.add(soft), grid.y)
    return vec3(float(1.0).sub(min(lineX, lineY)))
  }).setLayout({ name: 'llGrid', type: 'vec3', inputs: [{ name: 'p', type: 'vec2' }] })

  const liquid = Fn(([p]) => {
    const st = p.mul(uGenParams.x).mul(0.05)
    const n = snoise(st.add(uGenTime.mul(uGenParams.y).mul(0.002)))
      .add(snoise(st.mul(2.0).sub(uGenTime.mul(0.2))).mul(0.5))
    const val = smoothstep(0.2, 0.8, n.add(0.5))
    return vec3(
      val.mul(sin(uGenTime.add(n))),
      val.mul(cos(uGenTime.add(n))),
      val,
    )
  }).setLayout({ name: 'llLiquid', type: 'vec3', inputs: [{ name: 'p', type: 'vec2' }] })

  const plasma = Fn(([p]) => {
    const st = p.mul(uGenParams.x).mul(0.1)
    const c = st.add(vec2(sin(uGenTime), cos(uGenTime)))
    const v = sin(st.x.add(uGenTime.mul(0.5)))
      .add(sin(st.y.add(uGenTime).div(2.0)))
      .add(sin(st.x.add(st.y).add(uGenTime).div(2.0)))
      .add(sin(length(c).mul(uGenParams.y.mul(0.1))))
      .div(4.0)
    const phase = v.mul(PI).add(uGenTime)
    return vec3(
      sin(phase).mul(0.5).add(0.5),
      sin(phase.add(2.0)).mul(0.5).add(0.5),
      sin(phase.add(4.0)).mul(0.5).add(0.5),
    )
  }).setLayout({ name: 'llPlasma', type: 'vec3', inputs: [{ name: 'p', type: 'vec2' }] })

  const fractalNoise = Fn(([p]) => {
    const st = p.mul(uGenParams.x).mul(0.05)
    const speed = uGenTime.mul(uGenParams.z.mul(0.1))
    const q = vec2(fbm(st), fbm(st.add(vec2(1.0))))
    const r = vec2(
      fbm(st.add(q).add(vec2(1.7, 9.2)).add(speed.mul(0.15))),
      fbm(st.add(q).add(vec2(8.3, 2.8)).add(speed.mul(0.126))),
    )
    const f = fbm(st.add(r))
    // Function-form mix(): TSL's chained `.mix()` takes (t, a, b), not (a, b, t).
    const base = mix(vec3(0.101961, 0.619608, 0.666667), vec3(0.666667, 0.666667, 0.498039), clamp(f.mul(f).mul(4.0), 0.0, 1.0))
    const deep = mix(base, vec3(0.0, 0.0, 0.164706), clamp(length(q), 0.0, 1.0))
    const color = mix(deep, vec3(0.666667, 1.0, 1.0), clamp(abs(r.x), 0.0, 1.0))
    return color.mul(uGenParams.y.mul(0.02).add(0.5))
  }).setLayout({ name: 'llFractal', type: 'vec3', inputs: [{ name: 'p', type: 'vec2' }] })

  // --- CONTENT FETCHER ---

  const getContent = Fn(([p]) => {
    const result = vec4(0.0).toVar()
    If(uGenType.greaterThan(0.5), () => {
      const gen = vec3(0.0).toVar()
      If(uGenType.lessThan(1.5), () => { gen.assign(fibonacciSpiral(p)) })
        .ElseIf(uGenType.lessThan(2.5), () => { gen.assign(voronoi(p)) })
        .ElseIf(uGenType.lessThan(3.5), () => { gen.assign(basicGrid(p)) })
        .ElseIf(uGenType.lessThan(4.5), () => { gen.assign(liquid(p)) })
        .ElseIf(uGenType.lessThan(5.5), () => { gen.assign(plasma(p)) })
        .Else(() => { gen.assign(fractalNoise(p)) })
      result.assign(vec4(gen, 1.0))
    }).ElseIf(
      p.x.greaterThanEqual(0.0).and(p.x.lessThanEqual(1.0)).and(p.y.greaterThanEqual(0.0)).and(p.y.lessThanEqual(1.0)),
      () => { result.assign(uTexture.sample(p)) },
    )
    return result
  }).setLayout({ name: 'llGetContent', type: 'vec4', inputs: [{ name: 'p', type: 'vec2' }] })

  const lumaAt = (coord, offset) => dot(getContent(coord.add(offset)).rgb, LUMA)

  // --- MAIN ---

  const visualizer = Fn(() => {
    const vUv = uv()
    const st = vec2(vUv).toVar()

    // 1. Tiling
    If(uTilingType.greaterThan(0.5), () => {
      // Branchless on purpose: per-component select() here miscompiled
      // (mirrored columns collapsed to stripes).
      const tileUV = st.mul(uTilingScale)
      const wrapped = fract(tileUV)
      const mirrored = mix(wrapped, wrapped.oneMinus(), mod(floor(tileUV), 2.0))
      const tiled = mix(wrapped, mirrored, step(2.5, uTilingType))
      st.assign(mix(tiled, vUv, clamp(uTilingOverlap, 0.0, 1.0)))
    })

    // 2. Centered, aspect-corrected coordinates
    const coord = vec2(st.x.sub(0.5).mul(uAspect), st.y.sub(0.5)).toVar()

    // 3. Displacement
    If(uDisplacement.x.greaterThan(0.0), () => {
      const freq = uDisplacement.y.mul(10.0)
      const amp = uDisplacement.x.mul(0.001)
      coord.x.addAssign(sin(coord.y.mul(freq)).mul(amp))
      coord.y.addAssign(cos(coord.x.mul(freq)).mul(amp))
    })

    // 4. Symmetry
    If(uSymEnabled.greaterThan(0.5), () => {
      If(uSymType.lessThan(0.5), () => {
        const slice = TWO_PI.div(uSymSlices)
        const radius = length(coord)
        const angle = abs(mod(atan(coord.y, coord.x), slice).sub(slice.mul(0.5)))
        coord.assign(vec2(cos(angle).mul(radius), sin(angle).mul(radius)))
      }).ElseIf(uSymType.lessThan(1.5), () => {
        coord.x.assign(abs(coord.x.sub(uSymOffset)).add(uSymOffset))
      }).Else(() => {
        coord.y.assign(abs(coord.y.sub(uSymOffset)).add(uSymOffset))
      })
    })

    // 5. Warp
    If(uWarpType.greaterThan(0.5), () => {
      const r = length(coord)
      const a = atan(coord.y, coord.x).div(TWO_PI).add(0.5)
      coord.assign(vec2(a, mix(r, log(r.add(0.0001)), step(1.5, uWarpType))))
    })

    // 6. Transform (inverse rotate, scale, translate)
    const s = sin(uTransforms.w.negate())
    const c = cos(uTransforms.w.negate())
    coord.assign(vec2(c.mul(coord.x).add(s.mul(coord.y)), s.negate().mul(coord.x).add(c.mul(coord.y))))
    coord.divAssign(uTransforms.z)
    coord.subAssign(vec2(uTransforms.x, uTransforms.y.negate()).mul(0.001))

    // Image fit: contain
    If(uAspect.greaterThan(uImageAspect), () => {
      coord.x.divAssign(uImageAspect)
    }).Else(() => {
      coord.x.divAssign(uAspect)
      coord.y.mulAssign(uAspect.div(uImageAspect))
    })
    coord.addAssign(0.5)

    // 7. Base content
    const texColor = getContent(coord).toVar()

    // HSL grading (additive saturation so grayscale generators pick up color)
    const hsb = rgb2hsb(texColor.rgb)
    const color = hsb2rgb(vec3(
      fract(hsb.x.add(uColorHSL.x)),
      clamp(hsb.y.add(uColorHSL.y.sub(1.0)), 0.0, 1.0),
      clamp(hsb.z.mul(uColorHSL.z), 0.0, 1.0),
    )).toVar()

    // 8. Effects
    If(uEffects.w.greaterThan(0.0), () => {
      const shift = uEffects.w.mul(0.01)
      color.assign(vec3(
        getContent(coord.sub(vec2(shift, 0.0))).r,
        color.g,
        getContent(coord.add(vec2(shift, 0.0))).b,
      ))
    })

    If(uEffects.x.greaterThan(0.0), () => {
      const texel = vec2(1.0).div(uResolution)
      const edge = float(0.0).toVar()
      If(uEdgeQuality.greaterThan(0.5), () => {
        // Full Sobel (9 taps)
        const tl = lumaAt(coord, texel.mul(vec2(-1.0, 1.0)))
        const t = lumaAt(coord, texel.mul(vec2(0.0, 1.0)))
        const tr = lumaAt(coord, texel.mul(vec2(1.0, 1.0)))
        const l = lumaAt(coord, texel.mul(vec2(-1.0, 0.0)))
        const r = lumaAt(coord, texel.mul(vec2(1.0, 0.0)))
        const bl = lumaAt(coord, texel.mul(vec2(-1.0, -1.0)))
        const b = lumaAt(coord, texel.mul(vec2(0.0, -1.0)))
        const br = lumaAt(coord, texel.mul(vec2(1.0, -1.0)))
        const gx = tl.negate().sub(l.mul(2.0)).sub(bl).add(tr).add(r.mul(2.0)).add(br)
        const gy = tl.negate().sub(t.mul(2.0)).sub(tr).add(bl).add(b.mul(2.0)).add(br)
        edge.assign(clamp(sqrt(gx.mul(gx).add(gy.mul(gy))), 0.0, 1.0))
      }).Else(() => {
        // Fast Laplacian (5 taps)
        const center = lumaAt(coord, vec2(0.0))
        const n = lumaAt(coord, texel.mul(vec2(0.0, 1.0)))
        const so = lumaAt(coord, texel.mul(vec2(0.0, -1.0)))
        const e = lumaAt(coord, texel.mul(vec2(1.0, 0.0)))
        const w = lumaAt(coord, texel.mul(vec2(-1.0, 0.0)))
        edge.assign(clamp(abs(center.mul(4.0).sub(n).sub(so).sub(e).sub(w)), 0.0, 1.0))
      })
      color.assign(mix(color, vec3(edge), clamp(uEffects.x.mul(0.01), 0.0, 1.0)))
    })

    If(uEffects.y.greaterThan(0.0), () => {
      color.assign(mix(color, color.oneMinus(), uEffects.y.mul(0.01)))
    })

    If(uEffects.z.greaterThan(0.0), () => {
      const luma = dot(color, LUMA)
      const sol = select(luma.greaterThan(0.5), color.oneMinus(), color)
      color.assign(mix(color, sol, uEffects.z.mul(0.01)))
    })

    If(uPosterize.lessThan(255.0), () => {
      color.assign(floor(color.mul(uPosterize)).div(uPosterize))
    })

    // 9. Circle mask
    const alpha = texColor.a.toVar()
    If(uShape.greaterThan(0.5), () => {
      const dist = length(vec2(vUv.x.sub(0.5).mul(uAspect), vUv.y.sub(0.5)))
      alpha.mulAssign(smoothstep(0.495, 0.505, dist).oneMinus())
    })

    return vec4(color, alpha)
  })

  const material = new MeshBasicNodeMaterial()
  material.vertexNode = vec4(positionGeometry.xy, 0.0, 1.0)
  material.fragmentNode = visualizer()
  material.transparent = true
  material.depthWrite = false
  material.depthTest = false

  return { material, uniforms, placeholder }
}
