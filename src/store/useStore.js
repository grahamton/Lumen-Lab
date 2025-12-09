import { create } from 'zustand'

export const useStore = create((set) => ({
  // Image State
  image: null,
  setImage: (img) => set({ image: img }),

  // Affine Transformation State
  transforms: {
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0, // in radians
  },

  // Symmetry State
  symmetry: {
    enabled: false,
    slices: 6,
  },

  // Warp State (Phase 2)
  warp: {
    type: 'none', // 'none', 'polar', 'log-polar'
  },

  // Displacement State (Phase 2)
  displacement: {
    amp: 0,
    freq: 10,
  },

  // Masking State (Phase 3)
  masking: {
    lumaThreshold: 0, // 0-100%
    centerRadius: 0, // 0-100%
    invertLuma: false,
    feather: 0.0, // 0.0 - 1.0 (Edge softness)
  },

  // Recording State (Phase 4)
  recording: {
    isActive: false,
    progress: 0, // 0-100%
  },

  // Tiling State (Phase 5)
  tiling: {
    type: 'none', // 'none', 'p1', 'p2', 'p4m', 'p6m'
    scale: 1.0, // 0.1 - 2.0
    overlap: 0.0, // 0.0 - 1.0 (Percentage of overlap)
  },

  // Math Seeds (Generative)
  generator: {
    type: 'none', // 'none', 'fibonacci', 'voronoi', 'grid'
    // Parameters
    param1: 50, // Count / Density
    param2: 50, // Spread / Speed
    param3: 50, // Detail / Thickness
  },

  // Phase 6: Alchemist's Lab
  color: {
    posterize: 256, // 2-256 (256 = off)
  },
  effects: {
    edgeDetect: 0, // 0-100 (Intensity)
    invert: 0,     // 0-100 (Intensity)
    solarize: 0,   // 0-100 (Intensity)
    shift: 0,      // 0-100 (Intensity)
  },

  // Phase 8: The Projectionist (Canvas Control)
  canvas: {
    width: 1920,
    height: 1080,
    aspect: 'video', // 'free', 'video', 'square', 'portrait'
    fit: 'contain',
    shape: 'rectangle', // 'rectangle', 'circle'
  },

  // Phase 7: The Director's Cut
  snapshots: [],
  animation: {
    isPlaying: false,
    duration: 3000, // ms per transition
    mode: 'loop', // 'loop', 'pingpong'
  },

  // Actions
  randomize: () => set((state) => {
    // Helper for random range
    const rng = (min, max) => Math.random() * (max - min) + min
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

    // Aesthetic Constraints
    const symmetrySlices = pick([4, 6, 8, 12, 16])
    const tilingType = Math.random() > 0.3 ? pick(['p1', 'p2', 'p4m']) : 'none'
    const warpType = Math.random() > 0.4 ? pick(['polar', 'log-polar']) : 'none'

    return {
      transforms: {
        x: rng(-100, 100),
        y: rng(-100, 100),
        scale: rng(0.5, 1.5),
        rotation: rng(0, Math.PI * 2),
      },
      symmetry: {
        enabled: Math.random() > 0.3,
        slices: symmetrySlices,
      },
      warp: {
        type: warpType,
      },
      displacement: {
        amp: Math.random() > 0.5 ? rng(0, 150) : 0, // Increased Max Amp
        freq: rng(5, 50),
      },
      tiling: {
        type: tilingType,
        scale: rng(0.5, 1.5),
        overlap: rng(0, 0.3),
      },
      masking: {
        lumaThreshold: Math.random() > 0.7 ? rng(0, 50) : 0,
        centerRadius: Math.random() > 0.7 ? rng(0, 40) : 0,
        invertLuma: Math.random() > 0.5,
        feather: rng(0, 0.4),
      },
      color: {
        posterize: Math.random() > 0.6 ? Math.floor(rng(4, 16)) : 256,
      },
      effects: {
        edgeDetect: Math.random() > 0.7 ? rng(20, 100) : 0,
        invert: Math.random() > 0.8 ? rng(20, 100) : 0,
        solarize: Math.random() > 0.8 ? rng(20, 100) : 0,
        shift: Math.random() > 0.8 ? rng(5, 50) : 0,
      },
      generator: {
        ...state.generator,
        param1: rng(10, 90),
        param2: rng(10, 90),
      },
      canvas: {
        ...state.canvas, // PROTECT CANVAS SETTINGS
      }
    }
  }),

  addSnapshot: () => set((state) => {
    // Capture current visual state
    const snap = {
      transforms: { ...state.transforms },
      symmetry: { ...state.symmetry },
      warp: { ...state.warp },
      displacement: { ...state.displacement },
      tiling: { ...state.tiling },
      masking: { ...state.masking },
      color: { ...state.color },
      effects: { ...state.effects },
      generator: { ...state.generator }, // Capture Generator State
      id: Date.now()
    }
    return { snapshots: [...state.snapshots, snap] }
  }),

  deleteSnapshot: (index) => set((state) => ({
    snapshots: state.snapshots.filter((_, i) => i !== index)
  })),

  loadSnapshot: (snap) => set({
    transforms: { ...snap.transforms },
    symmetry: { ...snap.symmetry },
    warp: { ...snap.warp },
    displacement: { ...snap.displacement },
    tiling: { ...snap.tiling },
    masking: { ...snap.masking },
    color: { ...snap.color },
    effects: { ...snap.effects },
    generator: { ...snap.generator },
  }),

  setAnimation: (key, value) => set((state) => ({
    animation: { ...state.animation, [key]: value }
  })),

  setTransform: (key, value) => set((state) => ({
    transforms: { ...state.transforms, [key]: value }
  })),

  setSymmetry: (key, value) => set((state) => ({
    symmetry: { ...state.symmetry, [key]: value }
  })),

  setWarp: (key, value) => set((state) => ({
    warp: { ...state.warp, [key]: value }
  })),

  setDisplacement: (key, value) => set((state) => ({
    displacement: { ...state.displacement, [key]: value }
  })),

  setMasking: (key, value) => set((state) => ({
    masking: { ...state.masking, [key]: value }
  })),

  // Feedback Removed (Phase 4 Deprecated)

  setRecording: (key, value) => set((state) => ({
    recording: { ...state.recording, [key]: value }
  })),

  setTiling: (key, value) => set((state) => ({
    tiling: { ...state.tiling, [key]: value }
  })),

  setGenerator: (key, value) => set((state) => ({
    generator: { ...state.generator, [key]: value }
  })),

  setColor: (key, value) => set((state) => ({
    color: { ...state.color, [key]: value }
  })),

  setEffects: (key, value) => set((state) => ({
    effects: { ...state.effects, [key]: value }
  })),

  setCanvas: (key, value) => set((state) => ({
    canvas: { ...state.canvas, [key]: value }
  })),

  resetTransforms: () => set((state) => ({
    transforms: { x: 0, y: 0, scale: 1, rotation: 0 },
    symmetry: { enabled: false, slices: 6 },
    warp: { type: 'none' },
    displacement: { amp: 0, freq: 10 },
    masking: { lumaThreshold: 0, centerRadius: 0, invertLuma: false, feather: 0.0 },
    // feedback: { amount: 0 }, // Removed
    recording: { isActive: false, progress: 0 },
    tiling: { type: 'none', scale: 1.0, overlap: 0.0 },
    generator: { type: 'none', param1: 50, param2: 50, param3: 50 },
    color: { posterize: 256 },
    effects: { edgeDetect: 0, invert: 0, solarize: 0, shift: 0 },
    canvas: { ...state.canvas, width: 1920, height: 1080, aspect: 'video', fit: 'contain', shape: 'rectangle' }
  }))
}))
