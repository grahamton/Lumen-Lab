export const presets = [
  {
    name: "Neon Cortex",
    state: {
      transforms: { x: 0, y: 0, scale: 0.8, rotation: 0.78 },
      symmetry: { enabled: true, slices: 6 },
      warp: { type: 'polar' },
      displacement: { amp: 40, freq: 20 },
      tiling: { type: 'p4m', scale: 1.0 },
      color: { posterize: 8 },
      effects: { edgeDetect: 50, invert: 100, solarize: 0, shift: 50, bloom: 0.4, chromaticAberration: 0.2, noise: 0 },
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
      tiling: { type: 'none', scale: 1.0 },
      color: { posterize: 256 },
      effects: { edgeDetect: 50, invert: 0, solarize: 100, shift: 100, bloom: 0.8, chromaticAberration: 0.5, noise: 0.1 },
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
      tiling: { type: 'p2', scale: 0.8 },
      color: { posterize: 256 },
      effects: { edgeDetect: 0, invert: 0, solarize: 50, shift: 10, bloom: 0.2, chromaticAberration: 0, noise: 0 },
      generator: { type: 'liquid', param1: 30, param2: 60, param3: 50 }
    }
  },
  {
    name: "Retro VHS",
    state: {
      transforms: { x: 0, y: 0, scale: 1.1, rotation: 0 },
      symmetry: { enabled: false, slices: 6 },
      warp: { type: 'none' },
      displacement: { amp: 10, freq: 50 },
      tiling: { type: 'none', scale: 1.0 },
      color: { posterize: 256 },
      effects: { edgeDetect: 0, invert: 0, solarize: 0, shift: 20, bloom: 0.2, chromaticAberration: 0.6, noise: 0.25 },
      generator: { type: 'plasma', param1: 20, param2: 80, param3: 50 }
    }
  },
  {
    name: "Kaleido Bloom",
    state: {
      transforms: { x: 0, y: 0, scale: 0.5, rotation: 0 },
      symmetry: { enabled: true, slices: 12 },
      warp: { type: 'none' },
      displacement: { amp: 20, freq: 10 },
      tiling: { type: 'p4m', scale: 1.0 },
      color: { posterize: 256 },
      effects: { edgeDetect: 0, invert: 0, solarize: 0, shift: 10, bloom: 0.9, chromaticAberration: 0.1, noise: 0 },
      generator: { type: 'voronoi', param1: 60, param2: 50, param3: 50 }
    }
  },
  {
    name: "Deep Sea",
    state: {
      transforms: { x: 0, y: 0, scale: 1.0, rotation: 0 },
      symmetry: { enabled: false, slices: 6 },
      warp: { type: 'none' },
      displacement: { amp: 80, freq: 5 },
      tiling: { type: 'none', scale: 1.0 },
      color: { posterize: 256 },
      effects: { edgeDetect: 10, invert: 100, solarize: 20, shift: 30, bloom: 0.3, chromaticAberration: 0.1, noise: 0.05 },
      generator: { type: 'liquid', param1: 20, param2: 20, param3: 50 }
    }
  },
  {
    name: "Rorschach Test",
    state: {
      transforms: { x: 0, y: 0, scale: 0.8, rotation: 1.57 },
      symmetry: { enabled: true, slices: 2 },
      warp: { type: 'none' },
      displacement: { amp: 50, freq: 20 },
      tiling: { type: 'none', scale: 1.0 },
      color: { posterize: 2 },
      effects: { edgeDetect: 0, invert: 0, solarize: 0, shift: 0, bloom: 0, chromaticAberration: 0, noise: 0.1 },
      generator: { type: 'plasma', param1: 50, param2: 10, param3: 50 }
    }
  },
  {
    name: "Dream Vapour",
    state: {
      transforms: { x: 0, y: 0, scale: 1.0, rotation: 0 },
      symmetry: { enabled: false, slices: 6 },
      warp: { type: 'none' },
      displacement: { amp: 30, freq: 10 },
      tiling: { type: 'p1', scale: 0.5 },
      color: { posterize: 256 },
      effects: { edgeDetect: 20, invert: 50, solarize: 50, shift: 80, bloom: 0.6, chromaticAberration: 0.3, noise: 0.05 },
      generator: { type: 'liquid', param1: 60, param2: 10, param3: 50 }
    }
  },
  {
    name: "Glitch Art",
    state: {
      transforms: { x: 0, y: 0, scale: 1.0, rotation: 0 },
      symmetry: { enabled: false, slices: 6 },
      warp: { type: 'none' },
      displacement: { amp: 0, freq: 10 },
      tiling: { type: 'p2', scale: 1.0 },
      color: { posterize: 4 },
      effects: { edgeDetect: 50, invert: 0, solarize: 80, shift: 100, bloom: 0, chromaticAberration: 0.7, noise: 0.5 },
      generator: { type: 'grid', param1: 90, param2: 50, param3: 50 }
    }
  },
  {
    name: "Portal Tunnel",
    state: {
      transforms: { x: 0, y: 0, scale: 2.5, rotation: 0 },
      symmetry: { enabled: false, slices: 6 },
      warp: { type: 'polar' },
      displacement: { amp: 20, freq: 30 },
      tiling: { type: 'none', scale: 1.0 },
      color: { posterize: 256 },
      effects: { edgeDetect: 30, invert: 0, solarize: 0, shift: 40, bloom: 0.5, chromaticAberration: 0.4, noise: 0 },
      generator: { type: 'voronoi', param1: 80, param2: 20, param3: 50 }
    }
  }
]
