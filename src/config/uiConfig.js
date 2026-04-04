export const CONTROLS = {
  transforms: {
    scale:    { min: 0.1,  max: 5,    step: 0.01,  label: 'Scale' },
    rotation: { min: -180, max: 180,  step: 1,     label: 'Rotation' },
    x:        { min: -100, max: 100,  step: 1,     label: 'Position X' },
    y:        { min: -100, max: 100,  step: 1,     label: 'Position Y' },
  },
  generator: {
    param1: { min: 0, max: 100, step: 1, label: 'Complexity' },
    param2: { min: 0, max: 100, step: 1, label: 'Detail' },
    param3: { min: 0, max: 100, step: 1, label: 'Speed' },
  },
  displacement: {
    amp:  { min: 0, max: 200, step: 1,   label: 'Warp Amount' },
    freq: { min: 1, max: 50,  step: 0.5, label: 'Warp Frequency' },
  },
  effects: {
    bloom:               { min: 0, max: 3,   step: 0.1,  label: 'Bloom' },
    chromaticAberration: { min: 0, max: 1,   step: 0.01, label: 'Chromatic AB' },
    noise:               { min: 0, max: 1,   step: 0.01, label: 'Grain' },
  },
  color: {
    hue:       { min: -1.0, max: 1.0, step: 0.01, label: 'Hue' },
    sat:       { min: 0,    max: 2.0, step: 0.05, label: 'Saturation' },
    light:     { min: 0,    max: 2.0, step: 0.05, label: 'Brightness' },
    posterize: { min: 2,    max: 32,  step: 1,    label: 'Posterize' },
  },
  symmetry: {
    slices: { min: 2,   max: 32,  step: 1,    label: 'Slices' },
    offset: { min: -1,  max: 1,   step: 0.01, label: 'Center Offset' },
  },
  flux: {
    amount: { min: 0, max: 1, step: 0.01, label: 'Intensity' },
  },
  animation: {
    speed: { min: 20, max: 200, step: 1, label: 'Speed' },
  },
  audio: {
    sensitivity: { min: 0, max: 3, step: 0.05, label: 'Sensitivity' },
  },
}
