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

  // Feedback State (Phase 4)
  feedback: {
    amount: 0, // 0-100% (0.0 - 0.95)
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

  // Phase 6: Alchemist's Lab
  color: {
    posterize: 256, // 2-256 (256 = off)
  },
  effects: {
    edgeDetect: false,
    edgeStrength: 1.0,
  },

  // Actions
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

  setFeedback: (key, value) => set((state) => ({
    feedback: { ...state.feedback, [key]: value }
  })),

  setRecording: (key, value) => set((state) => ({
    recording: { ...state.recording, [key]: value }
  })),

  setTiling: (key, value) => set((state) => ({
    tiling: { ...state.tiling, [key]: value }
  })),

  setColor: (key, value) => set((state) => ({
    color: { ...state.color, [key]: value }
  })),

  setEffects: (key, value) => set((state) => ({
    effects: { ...state.effects, [key]: value }
  })),

  resetTransforms: () => set({
    transforms: { x: 0, y: 0, scale: 1, rotation: 0 },
    symmetry: { enabled: false, slices: 6 },
    warp: { type: 'none' },
    displacement: { amp: 0, freq: 10 },
    masking: { lumaThreshold: 0, centerRadius: 0, invertLuma: false, feather: 0.0 },
    feedback: { amount: 0 },
    recording: { isActive: false, progress: 0 },
    tiling: { type: 'none', scale: 1.0, overlap: 0.0 },
    color: { posterize: 256 },
    effects: { edgeDetect: false, edgeStrength: 1.0 }
  })
}))
