import React, { useRef, useMemo, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { useShallow } from 'zustand/shallow'
import { CONTROLS } from '../../config/uiConfig'

// fractal generator exists in engine but has no UI params yet
const GENERATORS = ['fibonacci', 'voronoi', 'grid', 'liquid', 'plasma']
const GEN_LABELS = {
  fibonacci: 'FIBONACCI', voronoi: 'VORONOI', grid: 'GRID',
  liquid: 'LIQUID', plasma: 'PLASMA',
}

const KnobSlider = React.memo(function KnobSlider({ label, section, param, value, onChange }) {
  const cfg = CONTROLS[section]?.[param]
  if (!cfg) return null
  const pct = Math.max(0, Math.min(1, (value - cfg.min) / (cfg.max - cfg.min)))
  const fillDeg = pct * 270
  const gradientStyle = useMemo(() => ({
    background: `conic-gradient(#22d3ee 0deg ${fillDeg}deg, #262626 ${fillDeg}deg 270deg)`,
    transform: 'rotate(-135deg)',
  }), [fillDeg])

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-11 h-11">
        <div
          className="w-full h-full rounded-full border-2 border-neutral-700"
          style={gradientStyle}
        />
        <div className="absolute inset-1.5 rounded-full bg-neutral-900" />
        <input
          type="range"
          min={cfg.min}
          max={cfg.max}
          step={cfg.step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
      </div>
      <span className="text-[8px] text-neutral-500 tracking-widest">{label}</span>
      <span className="text-[8px] text-cyan-400 tabular-nums">
        {typeof value === 'number' ? value.toFixed(2) : value}
      </span>
    </div>
  )
})

export function TopStrip() {
  const fileRef = useRef(null)
  const {
    generatorType, generatorParam3, transformsScale, colorHue,
    image, setGenerator, setTransform, setColor, setImage, resetForUpload
  } = useStore(
    useShallow((state) => ({
      generatorType:   state.generator.type,
      generatorParam3: state.generator.param3,
      transformsScale: state.transforms.scale,
      colorHue:        state.color.hue,
      image:           state.image,
      setGenerator:    state.setGenerator,
      setTransform:    state.setTransform,
      setColor:        state.setColor,
      setImage:        state.setImage,
      resetForUpload:  state.resetForUpload,
    }))
  )

  const imageActive = generatorType === 'none' && image != null
  const rawName = image?.src?.split('/').pop() ?? ''
  const imageLabel = rawName.length > 8 ? rawName.slice(0, 8) + '…' : rawName || 'IMAGE'

  const handleScaleChange  = useCallback((v) => setTransform('scale', v),  [setTransform])
  const handleParam3Change = useCallback((v) => setGenerator('param3', v), [setGenerator])
  const handleHueChange    = useCallback((v) => setColor('hue', v),        [setColor])

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    if (file.type.startsWith('video/')) {
      const vid = document.createElement('video')
      vid.src = url
      vid.loop = true
      vid.muted = true
      vid.playsInline = true
      vid.addEventListener('loadeddata', () => { URL.revokeObjectURL(url); resetForUpload(); setImage(vid) }, { once: true })
      vid.load()
    } else {
      const img = new Image()
      img.src = url
      img.addEventListener('load', () => { URL.revokeObjectURL(url); resetForUpload(); setImage(img) }, { once: true })
    }
  }

  return (
    <div className="px-3 pt-3 pb-2 border-b border-neutral-800 bg-neutral-900/20 shrink-0">
      <p className="text-[8px] text-cyan-400 tracking-[3px] mb-2">GENERATOR</p>
      <div className="grid grid-cols-3 gap-1 mb-3">
        {GENERATORS.map((g) => (
          <button
            key={g}
            onClick={() => setGenerator('type', g)}
            aria-pressed={generatorType === g}
            className={`py-1.5 rounded text-[8px] tracking-wider border transition-colors ${
              generatorType === g
                ? 'bg-cyan-950 border-cyan-400 text-cyan-400'
                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
            }`}
          >
            {GEN_LABELS[g]}
          </button>
        ))}
        <button
          onClick={() => fileRef.current?.click()}
          className={`py-1.5 rounded text-[8px] tracking-wider border truncate transition-colors ${
            imageActive
              ? 'bg-cyan-950 border-cyan-400 text-cyan-400'
              : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
          }`}
        >
          {imageActive ? imageLabel.toUpperCase() : 'IMAGE'}
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <KnobSlider
          label="SCALE"
          section="transforms"
          param="scale"
          value={transformsScale}
          onChange={handleScaleChange}
        />
        <KnobSlider
          label="SPEED"
          section="generator"
          param="param3"
          value={generatorParam3}
          onChange={handleParam3Change}
        />
        <KnobSlider
          label="HUE"
          section="color"
          param="hue"
          value={colorHue}
          onChange={handleHueChange}
        />
      </div>
    </div>
  )
}
