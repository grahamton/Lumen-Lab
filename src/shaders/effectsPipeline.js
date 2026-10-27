// Post-processing chain (bloom, chromatic aberration, film grain) built on
// three's RenderPipeline so it runs on both the WebGPU and WebGL2 backends.
import { RenderPipeline, Vector2 } from 'three/webgpu'
import { Fn, convertToTexture, dot, fract, mix, pass, sin, step, time, uniform, uv, vec2, vec4 } from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'

const BLOOM_THRESHOLD = 0.2
const BLOOM_SMOOTHING = 0.9
const BLOOM_RADIUS = 0.4
// Measured against the old pmndrs Bloom (intensity = bloom * 2) so saved looks
// keep roughly the same glow.
const BLOOM_GAIN = 0.45

// Red sampled toward +offset, blue toward -offset (pmndrs ChromaticAberration).
const chromaticShift = Fn(([input, offset]) => {
  const source = convertToTexture(input)
  const st = uv()
  const center = source.sample(st)
  return vec4(source.sample(st.add(offset)).r, center.g, source.sample(st.sub(offset)).b, center.a)
})

// Per-pixel, per-frame grain blended with an overlay curve.
const overlayGrain = Fn(([input, opacity]) => {
  const seed = uv().add(fract(time.mul(0.6180339)))
  const n = fract(sin(dot(seed, vec2(12.9898, 78.233))).mul(43758.5453))
  const base = input.rgb
  // Overlay blend, branchless (per-component select() in a vector miscompiles).
  const darken = base.mul(n).mul(2.0)
  const lighten = base.oneMinus().mul(n.oneMinus()).mul(2.0).oneMinus()
  const overlay = mix(darken, lighten, step(0.5, base))
  return vec4(mix(base, overlay, opacity), input.a)
})

export function createEffectsPipeline(renderer, scene, camera) {
  const pipeline = new RenderPipeline(renderer)
  const scenePass = pass(scene, camera)
  const sceneColor = scenePass.getTextureNode('output')

  const shiftOffset = uniform(new Vector2())
  const grainOpacity = uniform(0.0)

  let bloomNode = null
  let activeKey = null

  function build(useBloom, useShift, useGrain) {
    let output = sceneColor
    if (useBloom) {
      if (!bloomNode) {
        bloomNode = bloom(sceneColor, 0.0, BLOOM_RADIUS, BLOOM_THRESHOLD)
        bloomNode.smoothWidth.value = BLOOM_SMOOTHING
      }
      output = vec4(sceneColor.rgb.add(bloomNode.rgb), sceneColor.a)
    }
    if (useShift) output = chromaticShift(output, shiftOffset)
    if (useGrain) output = overlayGrain(output, grainOpacity)
    pipeline.outputNode = output
    // Reproduces the old pmndrs composer so saved looks match: raw shader output
    // with no effects, sRGB-encoded output once any effect is enabled.
    pipeline.outputColorTransform = useBloom || useShift || useGrain
    pipeline.needsUpdate = true
  }

  return {
    /** Applies effect values; rebuilds the node graph only when an effect toggles on/off. */
    update({ bloom: bloomValue = 0, chromaticAberration = 0, noise = 0, aspect = 1 }) {
      // Old pmndrs offset was [ca * 0.01, ca * 0.01] in width units, pointing up;
      // pass UVs here run top-down, hence the negative y.
      const shift = chromaticAberration * 0.01
      shiftOffset.value.set(shift, -shift * aspect)
      grainOpacity.value = noise
      const key = `${bloomValue > 0}|${chromaticAberration > 0}|${noise > 0}`
      if (key !== activeKey) {
        activeKey = key
        build(bloomValue > 0, chromaticAberration > 0, noise > 0)
      }
      if (bloomNode) bloomNode.strength.value = bloomValue * BLOOM_GAIN
    },
    render() {
      pipeline.render()
    },
    dispose() {
      bloomNode?.dispose?.()
      scenePass.dispose()
      pipeline.dispose()
    },
  }
}
