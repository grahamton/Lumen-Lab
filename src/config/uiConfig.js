export const CONTROLS = {
  transforms: {
    scale:    { min: 0.1,  max: 5,    step: 0.01,  label: 'Zoom' },
    // Radians, like the shader, presets and randomize.
    rotation: { min: -3.14, max: 3.14, step: 0.01,  label: 'Rotation' },
    x:        { min: -100, max: 100,  step: 1,     label: 'Position X' },
    y:        { min: -100, max: 100,  step: 1,     label: 'Position Y' },
  },
  generator: {
    param1: { min: 0, max: 100, step: 1, label: 'Complexity' },
    param2: { min: 0, max: 100, step: 1, label: 'Detail' },
    param3: { min: 0, max: 100, step: 1, label: 'Pattern Speed' },
  },
  displacement: {
    amp:  { min: 0, max: 200, step: 1,   label: 'Wobble' },
    freq: { min: 1, max: 50,  step: 0.5, label: 'Wobble Size' },
  },
  effects: {
    bloom:               { min: 0, max: 3,   step: 0.1,  label: 'Glow' },
    chromaticAberration: { min: 0, max: 1,   step: 0.01, label: 'Color Split' },
    noise:               { min: 0, max: 1,   step: 0.01, label: 'Film Grain' },
  },
  color: {
    hue:       { min: -1.0, max: 1.0, step: 0.01, label: 'Color Shift' },
    sat:       { min: 0,    max: 2.0, step: 0.05, label: 'Saturation' },
    light:     { min: 0,    max: 2.0, step: 0.05, label: 'Brightness' },
    // The top of the range (and anything above it, e.g. presets' 256) means off.
    posterize: { min: 2,    max: 33,  step: 1,    label: 'Fewer Colors' },
  },
  symmetry: {
    slices: { min: 2,   max: 32,  step: 1,    label: 'Mirror Slices' },
    offset: { min: -1,  max: 1,   step: 0.01, label: 'Center Offset' },
  },
  flux: {
    amount: { min: 0, max: 1, step: 0.01, label: 'Wander Amount' },
  },
  animation: {
    speed: { min: 20, max: 200, step: 1, label: 'Animation Speed' },
  },
  audio: {
    sensitivity: { min: 0, max: 3, step: 0.05, label: 'Music Sensitivity' },
  },
}
