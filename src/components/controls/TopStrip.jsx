import React, { useRef, useMemo, useCallback, useEffect } from 'react'
import { getEffectiveAuthoredSceneState, useStore } from '../../store/useStore'
import { useShallow } from 'zustand/shallow'
import { CONTROLS } from '../../config/uiConfig'

// fractal generator exists in engine but has no UI params yet
const GENERATORS = ['fibonacci', 'voronoi', 'grid', 'liquid', 'plasma']
const GEN_LABELS = {
  fibonacci: 'FIBONACCI', voronoi: 'VORONOI', grid: 'GRID',
  liquid: 'LIQUID', plasma: 'PLASMA',
}

function toFileUrl(filePath) {
  const normalized = filePath.replace(/\\/g, '/')
  const withLeadingSlash = /^[A-Za-z]:/.test(normalized) ? `/${normalized}` : normalized
  return encodeURI(`file://${withLeadingSlash}`)
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

const KnobSlider = React.memo(function KnobSlider({ label, section, param, value, onChange }) {
  const cfg = CONTROLS[section]?.[param]
  const pct = cfg
    ? Math.max(0, Math.min(1, (value - cfg.min) / (cfg.max - cfg.min)))
    : 0
  const fillDeg = pct * 270
  const gradientStyle = useMemo(() => ({
    background: `conic-gradient(#22d3ee 0deg ${fillDeg}deg, #262626 ${fillDeg}deg 270deg)`,
    transform: 'rotate(-135deg)',
  }), [fillDeg])
  if (!cfg) return null

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
    activeMediaId, media, mediaLibrary, image,
    addMediaAsset, setActiveMediaAsset, setGenerator, setTransform, setColor, setImage, resetForUpload
  } = useStore(
    useShallow((state) => ({
      generatorType:   getEffectiveAuthoredSceneState(state).generator.type,
      generatorParam3: getEffectiveAuthoredSceneState(state).generator.param3,
      transformsScale: getEffectiveAuthoredSceneState(state).transforms.scale,
      colorHue:        getEffectiveAuthoredSceneState(state).color.hue,
      activeMediaId:   getEffectiveAuthoredSceneState(state).activeMediaId,
      media:           getEffectiveAuthoredSceneState(state).media,
      mediaLibrary:    state.mediaLibrary,
      image:           state.image,
      addMediaAsset:   state.addMediaAsset,
      setActiveMediaAsset: state.setActiveMediaAsset,
      setGenerator:    state.setGenerator,
      setTransform:    state.setTransform,
      setColor:        state.setColor,
      setImage:        state.setImage,
      resetForUpload:  state.resetForUpload,
    }))
  )

  const imageActive = generatorType === 'none' && media != null
  const rawName = media?.name ?? image?.src?.split('/').pop() ?? ''
  const imageLabel = rawName.length > 8 ? rawName.slice(0, 8) + '…' : rawName || 'IMAGE'

  const handleScaleChange  = useCallback((v) => setTransform('scale', v),  [setTransform])
  const handleParam3Change = useCallback((v) => setGenerator('param3', v), [setGenerator])
  const handleHueChange    = useCallback((v) => setColor('hue', v),        [setColor])

  const hydrateMediaElement = useCallback((asset) => {
    if (!asset?.src || !asset?.type) {
      setImage(null)
      return
    }

    if (asset.type === 'video') {
      const vid = document.createElement('video')
      vid.loop = true
      vid.muted = true
      vid.playsInline = true
      vid.addEventListener('loadeddata', () => { setImage(vid) }, { once: true })
      vid.addEventListener('error', () => { setImage(null) }, { once: true })
      vid.src = asset.src
      vid.load()
      return
    }

    const img = new Image()
    img.addEventListener('load', () => { setImage(img) }, { once: true })
    img.addEventListener('error', () => { setImage(null) }, { once: true })
    img.src = asset.src
  }, [setImage])

  useEffect(() => {
    if (!media?.src || !media?.type || image) return
    hydrateMediaElement(media)
  }, [hydrateMediaElement, image, media])

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const runtimeUrl = typeof file.path === 'string' && file.path.length > 0
      ? toFileUrl(file.path)
      : file.type.startsWith('image/')
        ? await readFileAsDataUrl(file)
        : URL.createObjectURL(file)

    const asset = {
      id: `media-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      type: file.type.startsWith('video/') ? 'video' : 'image',
      src: runtimeUrl,
      name: file.name,
      mimeType: file.type,
      persistMode: typeof file.path === 'string' && file.path.length > 0
        ? 'file'
        : (file.type.startsWith('video/') ? 'object-url' : 'inline'),
    }

    resetForUpload()
    addMediaAsset(asset)
    e.target.value = ''
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
      {mediaLibrary?.length > 0 && (
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-[8px] tracking-[0.18em] text-neutral-500">
            <span>MEDIA BIN</span>
            <span className="text-cyan-300">{mediaLibrary.length}</span>
          </div>
          <select
            value={activeMediaId ?? ''}
            onChange={(event) => {
              const asset = mediaLibrary.find((entry) => String(entry.id) === event.target.value)
              if (!asset) return
              resetForUpload()
              setActiveMediaAsset(asset.id)
            }}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-2 text-[10px] tracking-[0.16em] text-neutral-200 outline-none focus:border-cyan-400"
          >
            {mediaLibrary.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name.toUpperCase()} · {asset.type.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      )}
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
