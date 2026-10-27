// Built-in looks. Notes for tuning (see src/shaders/visualizerNode.js):
// - fibonacci / voronoi / grid generate greyscale, so colour comes from effects.shift (RGB split),
//   or from color.hue + color.sat > 1 (greyscale becomes black + one vivid hue).
// - liquid / plasma are natively coloured; color.hue rotates them.
// - effects.invert strictly between ~20 and ~80 mixes to grey, so only 0 or 100 are used.
// - displacement.freq is multiplied by 10 in the shader; keep it low (1-3) for smooth flowing wobble.
// - Nothing here strobes: motion comes from slow generator time, drift and (static) grain only.
export const presets = [
  {
    name: "Neon Cortex",
    state: {
      transforms: { x: 0, y: 0, scale: 0.8, rotation: 0.78 },
      symmetry: { enabled: true, slices: 6 },
      warp: { type: 'polar' },
      displacement: { amp: 0, freq: 1 },
      tiling: { type: 'none', scale: 1.0 },
      color: { posterize: 256, hue: 0, sat: 1, light: 1 },
      effects: { edgeDetect: 0, invert: 0, solarize: 0, shift: 30, bloom: 1.2, chromaticAberration: 0.3, noise: 0 },
      generator: { type: 'fibonacci', param1: 50, param2: 50, param3: 50 }
    }
  },
  {
    name: "Cyber Void",
    state: {
      transforms: { x: 0, y: 0, scale: 1.0, rotation: 0 },
      symmetry: { enabled: true, slices: 8 },
      warp: { type: 'log-polar' },
      displacement: { amp: 0, freq: 1 },
      tiling: { type: 'none', scale: 1.0 },
      color: { posterize: 256, hue: 0.5, sat: 2, light: 1 },
      effects: { edgeDetect: 0, invert: 0, solarize: 0, shift: 0, bloom: 1.5, chromaticAberration: 0.6, noise: 0.03 },
      generator: { type: 'grid', param1: 20, param2: 20, param3: 40 }
    }
  },
  {
    name: "Liquid Gold",
    state: {
      transforms: { x: 0, y: 0, scale: 1.0, rotation: 0 },
      symmetry: { enabled: false, slices: 6 },
      warp: { type: 'none' },
      displacement: { amp: 120, freq: 2 },
      tiling: { type: 'p2', scale: 0.8 },
      color: { posterize: 256, hue: 0.4, sat: 1.2, light: 1 },
      effects: { edgeDetect: 0, invert: 0, solarize: 0, shift: 0, bloom: 1.0, chromaticAberration: 0, noise: 0 },
      generator: { type: 'liquid', param1: 30, param2: 60, param3: 50 }
    }
  },
  {
    name: "Retro VHS",
    state: {
      transforms: { x: 0, y: 0, scale: 1.1, rotation: 0 },
      symmetry: { enabled: false, slices: 6 },
      warp: { type: 'none' },
      displacement: { amp: 25, freq: 3 },
      tiling: { type: 'none', scale: 1.0 },
      color: { posterize: 12, hue: 0.3, sat: 1.2, light: 1 },
      effects: { edgeDetect: 0, invert: 0, solarize: 0, shift: 0, bloom: 0.8, chromaticAberration: 0.6, noise: 0.15 },
      generator: { type: 'plasma', param1: 20, param2: 80, param3: 50 }
    }
  },
  {
    name: "Kaleido Bloom",
    state: {
      transforms: { x: 0, y: 0, scale: 0.8, rotation: 0.3 },
      symmetry: { enabled: true, slices: 12 },
      warp: { type: 'none' },
      displacement: { amp: 0, freq: 1 },
      tiling: { type: 'p4m', scale: 1.0 },
      color: { posterize: 256, hue: 0, sat: 1.2, light: 1.6 },
      effects: { edgeDetect: 0, invert: 0, solarize: 0, shift: 25, bloom: 1.6, chromaticAberration: 0.15, noise: 0 },
      generator: { type: 'voronoi', param1: 45, param2: 100, param3: 50 }
    }
  },
  {
    name: "Deep Sea",
    state: {
      transforms: { x: 0, y: 0, scale: 1.0, rotation: 0 },
      symmetry: { enabled: false, slices: 6 },
      warp: { type: 'none' },
      displacement: { amp: 60, freq: 1.5 },
      tiling: { type: 'none', scale: 1.0 },
      color: { posterize: 256, hue: -0.1, sat: 1.4, light: 0.9 },
      effects: { edgeDetect: 0, invert: 0, solarize: 0, shift: 0, bloom: 1.5, chromaticAberration: 0.1, noise: 0.05 },
      generator: { type: 'liquid', param1: 30, param2: 20, param3: 50 }
    }
  },
  {
    name: "Rorschach Test",
    state: {
      transforms: { x: 0, y: 0, scale: 0.6, rotation: 1.57 },
      symmetry: { enabled: true, slices: 2 },
      warp: { type: 'none' },
      displacement: { amp: 150, freq: 1.5 },
      tiling: { type: 'none', scale: 1.0 },
      color: { posterize: 2, hue: 0, sat: 1, light: 1 },
      effects: { edgeDetect: 0, invert: 0, solarize: 0, shift: 0, bloom: 0, chromaticAberration: 0, noise: 0.08 },
      generator: { type: 'fibonacci', param1: 10, param2: 30, param3: 50 }
    }
  },
  {
    name: "Dream Vapour",
    state: {
      transforms: { x: 0, y: 0, scale: 1.0, rotation: 0 },
      symmetry: { enabled: false, slices: 6 },
      warp: { type: 'none' },
      displacement: { amp: 60, freq: 2 },
      tiling: { type: 'p1', scale: 0.5 },
      color: { posterize: 256, hue: 0.85, sat: 0.55, light: 1.25 },
      effects: { edgeDetect: 0, invert: 0, solarize: 0, shift: 0, bloom: 1.5, chromaticAberration: 0.2, noise: 0.03 },
      generator: { type: 'plasma', param1: 25, param2: 30, param3: 50 }
    }
  },
  {
    name: "Glitch Art",
    state: {
      transforms: { x: 0, y: 0, scale: 1.0, rotation: 0 },
      symmetry: { enabled: false, slices: 6 },
      warp: { type: 'none' },
      displacement: { amp: 60, freq: 3 },
      tiling: { type: 'p2', scale: 0.5 },
      color: { posterize: 4, hue: 0, sat: 1, light: 1 },
      effects: { edgeDetect: 0, invert: 0, solarize: 80, shift: 60, bloom: 0, chromaticAberration: 0.5, noise: 0.2 },
      generator: { type: 'grid', param1: 15, param2: 60, param3: 20 }
    }
  },
  {
    name: "Portal Tunnel",
    state: {
      transforms: { x: 0, y: 0, scale: 2.0, rotation: 0 },
      symmetry: { enabled: true, slices: 6 },
      warp: { type: 'log-polar' },
      displacement: { amp: 0, freq: 1 },
      tiling: { type: 'none', scale: 1.0 },
      color: { posterize: 256, hue: 0, sat: 1.2, light: 1.2 },
      effects: { edgeDetect: 0, invert: 0, solarize: 0, shift: 25, bloom: 1.5, chromaticAberration: 0.4, noise: 0 },
      generator: { type: 'voronoi', param1: 60, param2: 100, param3: 50 }
    }
  },
  {
    name: "Solar Flare",
    state: {
      transforms: { x: 0, y: 0, scale: 1.0, rotation: 0 },
      symmetry: { enabled: true, slices: 8 },
      warp: { type: 'none' },
      displacement: { amp: 40, freq: 1 },
      tiling: { type: 'none', scale: 1.0 },
      color: { posterize: 256, hue: 0.07, sat: 2, light: 1 },
      effects: { edgeDetect: 0, invert: 0, solarize: 0, shift: 0, bloom: 2, chromaticAberration: 0.3, noise: 0 },
      generator: { type: 'fibonacci', param1: 40, param2: 50, param3: 50 }
    }
  },
  {
    name: "Frost Spiral",
    state: {
      transforms: { x: 0, y: 0, scale: 1.0, rotation: 0 },
      symmetry: { enabled: true, slices: 8 },
      warp: { type: 'none' },
      displacement: { amp: 40, freq: 1 },
      tiling: { type: 'none', scale: 1.0 },
      color: { posterize: 256, hue: 0.07, sat: 2, light: 1 },
      effects: { edgeDetect: 0, invert: 100, solarize: 0, shift: 0, bloom: 2, chromaticAberration: 0.3, noise: 0 },
      generator: { type: 'fibonacci', param1: 40, param2: 50, param3: 50 }
    }
  },
  {
    name: "Neon Orchid",
    state: {
      transforms: { x: 0, y: 0, scale: 1.2, rotation: 0.78 },
      symmetry: { enabled: true, slices: 6 },
      warp: { type: 'log-polar' },
      displacement: { amp: 0, freq: 1 },
      tiling: { type: 'none', scale: 1.0 },
      color: { posterize: 256, hue: 0.83, sat: 2, light: 1 },
      effects: { edgeDetect: 0, invert: 0, solarize: 0, shift: 0, bloom: 2, chromaticAberration: 0.4, noise: 0 },
      generator: { type: 'fibonacci', param1: 50, param2: 50, param3: 50 }
    }
  },
  {
    name: "Prism Ripple",
    state: {
      transforms: { x: 0, y: 0, scale: 0.7, rotation: 0.2 },
      symmetry: { enabled: true, slices: 8 },
      warp: { type: 'none' },
      displacement: { amp: 0, freq: 1 },
      tiling: { type: 'none', scale: 1.0 },
      color: { posterize: 256, hue: 0, sat: 1, light: 1 },
      effects: { edgeDetect: 0, invert: 0, solarize: 0, shift: 0, bloom: 1.2, chromaticAberration: 0.2, noise: 0 },
      generator: { type: 'plasma', param1: 60, param2: 90, param3: 50 }
    }
  }
]
