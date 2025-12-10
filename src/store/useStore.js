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

  // Warp State (Distortion)
  warp: {
    type: 'none', // 'none', 'polar', 'log-polar'
  },

  // Displacement State (Liquify)
  displacement: {
    amp: 0,
    freq: 10,
  },

  // Masking State (Vignette/Luma)
  masking: {
    lumaThreshold: 0,
    centerRadius: 0,
    invertLuma: false,
    feather: 0.0,
  },

  // Tiling State
  tiling: {
    type: 'none', // 'none', 'p1', 'p2', 'p4m'
    scale: 1.0,
    overlap: 0.0,
  },

  // Math Seeds (Generative)
  generator: {
    type: 'none', // 'none', 'fibonacci', 'voronoi', 'grid'
    param1: 50,
    param2: 50,
    param3: 50,
  },

  // Alchemist's Lab
  color: {
    posterize: 256,
  },
  effects: {
    edgeDetect: 0,
    invert: 0,
    solarize: 0,
    shift: 0,
  },

  // The Projectionist (Canvas Control)
  canvas: {
    width: 1920,
    height: 1080,
    aspect: 'video', // 'free', 'video', 'square', 'portrait'
    fit: 'contain',
    shape: 'rectangle', // 'rectangle', 'circle'
  },

  // The Director's Cut
  snapshots: [],
  animation: {
    isPlaying: false,
    duration: 3000,
    mode: 'loop',
    easing: 'linear',
    holdTime: 0,
  },

  // Flux State (Auto-Animation)
  flux: {
    enabled: false,
  },

  // Audio Reactivity State
  audio: {
    enabled: false,
    source: 'mic', // 'mic', 'file'
    sensitivity: 1.0, // Master Gain
    reactivity: {
      bass: 1.0, // Log-Polar / Scale
      mid: 1.0,  // Displacement
      high: 1.0, // Color / Edge
    }
  },

  // UI State
  ui: {
    helpOpen: true,
    controlsOpen: true,
    advancedMode: false,
  },

  toggleControls: (isOpen) => set((state) => ({ ui: { ...state.ui, controlsOpen: isOpen } })),

  recording: { isActive: false, progress: 0 },

  // Actions
  randomize: () => set((state) => {
    const rng = (min, max) => Math.random() * (max - min) + min
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

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
      warp: { type: warpType },
      displacement: {
        amp: Math.random() > 0.5 ? rng(0, 150) : 0,
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
      // Keep canvas and ui state as is
    }
  }),

  addSnapshot: () => set((state) => {
    const snap = {
      transforms: { ...state.transforms },
      symmetry: { ...state.symmetry },
      warp: { ...state.warp },
      displacement: { ...state.displacement },
      tiling: { ...state.tiling },
      masking: { ...state.masking },
      color: { ...state.color },
      effects: { ...state.effects },
      generator: { ...state.generator },
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

  resetState: () => set((state) => ({
    transforms: { x: 0, y: 0, scale: 1, rotation: 0 },
    symmetry: { enabled: false, slices: 6 },
    warp: { type: 'none' },
    displacement: { amp: 0, freq: 10 },
    masking: { lumaThreshold: 0, centerRadius: 0, invertLuma: false, feather: 0.0 },
    recording: { isActive: false, progress: 0 },
    tiling: { type: 'none', scale: 1.0, overlap: 0.0 },
    generator: { type: 'none', param1: 50, param2: 50, param3: 50 },
    color: { posterize: 256 },
    effects: { edgeDetect: 0, invert: 0, solarize: 0, shift: 0 },
    flux: { enabled: false },
    animation: { ...state.animation, isPlaying: false, duration: 3000, mode: 'loop', easing: 'linear', holdTime: 0 }
  })),

  setFlux: (key, value) => set((state) => ({
    flux: { ...state.flux, [key]: value }
  })),

  setAudio: (key, value) => set((state) => {
    // Handle nested reactivity updates if key is 'reactivity' (or we can flatten, but let's keep it simple)
    // Actually, let's allow partial updates: setAudio('reactivity', { ...state.audio.reactivity, bass: val })
    return { audio: { ...state.audio, [key]: value } }
  }),

  // UI & Export
  triggerExport: (req) => set((state) => ({
    ui: { ...state.ui, exportRequest: req }
  })),

  toggleHelp: (val) => set((state) => ({
    ui: { ...state.ui, helpOpen: val !== undefined ? val : !state.ui.helpOpen }
  }))
}))
