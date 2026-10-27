// Post-processing chain (bloom, chromatic aberration, film grain) built on
// three's RenderPipeline so it runs on both the WebGPU and WebGL2 backends.
import { RenderPipeline, Vector2 } from 'three/webgpu'
import { Fn, convertToTexture, dot, fract, mix, pass, sin, step, time, uniform, uv, vec2, vec4 } from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'

// Generators put out a lot of near-white; at 0.2 nearly every pixel bloomed and
// any glow above ~0.3 washed the frame out to white.
const BLOOM_THRESHOLD = 0.6
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

  // Only two things change the graph: whether any effect is on and whether
  // bloom is on (it adds render passes). Shift and grain stay in the graph and fall back to a no-op
  // at 0, so dialling them never recompiles shaders; three releases a program
  // as soon as nothing uses it, so every rebuild was a fresh 100-250ms compile.
  function build(useBloom, useEffects) {
    let output = sceneColor
    if (useEffects) {
      // The shift is linear, so it is applied to the scene and bloom textures
      // separately and summed. Shifting the combined vec4 needs convertToTexture
      // on a composite node, which fails to compile on the WebGL2 backend.
      output = chromaticShift(sceneColor, shiftOffset)
      if (useBloom) {
        if (!bloomNode) {
          bloomNode = bloom(sceneColor, 0.0, BLOOM_RADIUS, BLOOM_THRESHOLD)
          bloomNode.smoothWidth.value = BLOOM_SMOOTHING
        }
        output = vec4(output.rgb.add(chromaticShift(bloomNode.getTextureNode(), shiftOffset).rgb), output.a)
      }
      output = overlayGrain(output, grainOpacity)
    }
    pipeline.outputNode = output
    // Shader output is already display-ready. (The old pmndrs composer sRGB-encoded
    // it whenever any effect was on, so a touch of grain lightened the whole frame.)
    pipeline.outputColorTransform = false
    pipeline.needsUpdate = true
  }

  return {
    /** Applies effect values; rebuilds the node graph only when bloom or the effects stage toggles. */
    update({ bloom: bloomValue = 0, chromaticAberration = 0, noise = 0, aspect = 1 }) {
      // Old pmndrs offset was [ca * 0.01, ca * 0.01] in width units, pointing up;
      // pass UVs here run top-down, hence the negative y.
      const shift = chromaticAberration * 0.01
      shiftOffset.value.set(shift, -shift * aspect)
      grainOpacity.value = noise
      const useBloom = bloomValue > 0
      const useEffects = useBloom || chromaticAberration > 0 || noise > 0
      const key = `${useBloom}|${useEffects}`
      if (key !== activeKey) {
        activeKey = key
        build(useBloom, useEffects)
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
