export const presets = [
  {
    name: "Neon Cortex",
    state: {
      transforms: { x: 0, y: 0, scale: 0.8, rotation: 0.78 },
      symmetry: { enabled: true, slices: 6 },
      warp: { type: 'polar' },
      displacement: { amp: 40, freq: 20 },
      masking: { lumaThreshold: 10, centerRadius: 0, invertLuma: false, feather: 0.2 },
      tiling: { type: 'p4m', scale: 1.0, overlap: 0.0 },
      color: { posterize: 8 },
      effects: { edgeDetect: 80, invert: 100, solarize: 0, shift: 50 },
      generator: { type: 'fibonacci', param1: 50, param2: 50, param3: 50 }
    }
  },
  {
    name: "Cyber Void",
    state: {
      transforms: { x: 0, y: 0, scale: 1.2, rotation: 0 },
      symmetry: { enabled: true, slices: 8 },
      warp: { type: 'log-polar' },
      displacement: { amp: 100, freq: 10 },
      masking: { lumaThreshold: 0, centerRadius: 40, invertLuma: true, feather: 0.5 },
      tiling: { type: 'none', scale: 1.0, overlap: 0.0 },
      color: { posterize: 256 },
      effects: { edgeDetect: 50, invert: 0, solarize: 100, shift: 100 },
      generator: { type: 'grid', param1: 20, param2: 80, param3: 50 }
    }
  },
  {
    name: "Liquid Gold",
    state: {
      transforms: { x: 0, y: 0, scale: 1.0, rotation: 0 },
      symmetry: { enabled: false, slices: 6 },
      warp: { type: 'none' },
      displacement: { amp: 150, freq: 5 },
      masking: { lumaThreshold: 0, centerRadius: 0, invertLuma: false, feather: 0.0 },
      tiling: { type: 'p2', scale: 0.8, overlap: 0.2 },
      color: { posterize: 256 },
      effects: { edgeDetect: 0, invert: 0, solarize: 50, shift: 10 },
      generator: { type: 'voronoi', param1: 10, param2: 40, param3: 50 }
    }
  }
]
