import React, { useRef, useState } from 'react'
import { CONTROLS } from '../config/uiConfig'
import { useStore } from '../store/useStore'
import { presets as builtInPresets } from '../presets'
import { CubeIcon, GridIcon, EyeIcon, SlidersIcon } from './Icons'
import { Sliders, Activity, Monitor, Download, Maximize, RefreshCw, Layers, Zap, Undo2, RotateCcw, Power, Gamepad2, Pause, StopCircle, Play, Music, Sparkles, Settings, PauseCircle, PlayCircle, BookOpen, Upload } from 'lucide-react'

// Minimal Control Components
const ControlGroup = ({ label, value, min, max, onChange, step = 1, path }) => {
  const { ui, midi, setUi } = useStore()
  const isLearning = ui.midiLearnActive
  const isSelected = ui.midiLearnId === path
  // Efficiently check if mapped (could optimize this lookup in store, but iterating ~20 keys is fine)
  const isMapped = path && Object.values(midi.mappings).includes(path)

  const handleClick = (e) => {
    if (isLearning && path) {
      e.stopPropagation()
      setUi('midiLearnId', path)
    }
  }

  return (
    <div
      className={`flex flex-col gap-1 mb-3 transition-all rounded p-1 -mx-1 ${isLearning ? 'cursor-pointer hover:bg-neutral-800' : ''} ${isSelected ? 'bg-cyan-900/40 ring-1 ring-cyan-400' : ''} ${isMapped && !isSelected ? 'border-l-2 border-cyan-500 pl-2' : ''}`}
      onClick={handleClick}
    >
      <div className="flex justify-between text-[10px] text-neutral-400 uppercase tracking-wider font-bold">
        <span className={isMapped ? "text-cyan-400" : ""}>{label} {isMapped && "•"}</span>
        <span className="text-cyan-400 font-mono">{typeof value === 'number' ? value.toFixed(step < 1 ? 2 : 0) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={isLearning}
        className={`w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-900 ${isLearning ? 'pointer-events-none opacity-50' : ''}`}
      />
    </div>
  )
}

const Toggle = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between mb-3 py-1">
    <span className="text-[11px] text-neutral-400 font-medium">{label}</span>
    <button
      onClick={() => onChange(!value)}
      className={`w-8 h-4 rounded-full transition-all relative ${value ? 'bg-cyan-900' : 'bg-neutral-800'}`}
    >
      <div
        className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transform transition-all ${
          value ? 'translate-x-4 bg-cyan-400' : 'translate-x-0 bg-neutral-500'
        }`}
      />
    </button>
  </div>
)

const TabButton = ({ icon: Icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`p-3 rounded-lg transition-all ${active ? 'bg-cyan-900/30 text-cyan-400' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'}`}
  >
    <Icon size={20} />
  </button>
)

export function Controls() {
  const store = useStore()
  const { ui, setUi } = store

  // Local UI State
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presetError, setPresetError] = useState('')

  // Handlers for File Input
  const fileInputRef = useRef(null)
  const audioFileRef = useRef(null)
  const presetImportRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    const isVideo = file.type?.startsWith('video')

    if (isVideo) {
      const video = document.createElement('video')
      video.src = url
      video.loop = true
      video.muted = true
      video.playsInline = true
      video.crossOrigin = 'anonymous'

      video.onloadeddata = async () => {
        try {
          await video.play()
        } catch (err) {
          console.warn('Autoplay blocked for video upload', err)
        }
        store.setImage(video)
        store.resetForUpload()
      }

      video.onerror = (err) => {
        console.error('Failed to load video', err)
        alert('Failed to load video. Please try another file.')
      }
    } else {
      const img = new Image()
      img.onload = () => {
        store.setImage(img)
        store.resetForUpload() // Reset modifers so user sees the raw image
      }
      img.onerror = (err) => {
        console.error('Failed to load image', err)
        alert('Failed to load image. Please try another file.')
      }
      img.src = url
    }

    e.target.value = '' // Reset input to allow re-uploading the same file
  }

  const handleSavePreset = () => {
    const name = presetName.trim()
    if (!name) {
      setPresetError('Enter a name first')
      return
    }
    store.saveUserPreset(name)
    setPresetName('')
    setPresetError('')
  }

  const exportPreset = (preset) => {
    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${preset.name.replace(/\s+/g, '_')}.lumenpreset.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePresetImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result)
        if (!parsed.state || typeof parsed.state !== 'object') {
          setPresetError('Invalid preset file')
          return
        }
        store.importUserPreset({ name: parsed.name || file.name, state: parsed.state })
        setPresetError('')
      } catch {
        setPresetError('Could not read file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Content for each Tab

  // TAB 0: SOURCE (Uploads, Generator Type, Generator Key Params)
  const generatorPresets = {
    fibonacci: [
      { name: 'Tight Spiral', param1: 140, param2: 5, param3: 40 },
      { name: 'Loose Bloom', param1: 60, param2: 20, param3: 10 },
    ],
    voronoi: [
      { name: 'Soft Cells', param1: 30, param2: 80, param3: 10 },
      { name: 'Cracked', param1: 90, param2: 20, param3: 50 },
    ],
    grid: [
      { name: 'Micro Mesh', param1: 120, param2: 5, param3: 60 },
      { name: 'Bold Lines', param1: 40, param2: 35, param3: 10 },
    ],
    liquid: [
      { name: 'Slow Drift', param1: 30, param2: 15 },
      { name: 'Fast Melt', param1: 80, param2: 70 },
    ],
    plasma: [
      { name: 'Nebula', param1: 40, param2: 20 },
      { name: 'Electric', param1: 80, param2: 80 },
    ],
    fractal: [
      { name: 'Clouds', param1: 30, param2: 40, param3: 20 },
      { name: 'Sharp Ice', param1: 90, param2: 80, param3: 60 },
    ],
  }

  const applyGeneratorPreset = (preset) => {
    Object.entries(preset).forEach(([key, val]) => store.setGenerator(key, val))
  }

  const renderSource = () => (
    <div className="space-y-6">
      {/* Media Source */}
      <div className="bg-neutral-900/50 p-3 rounded border border-neutral-800/50">
        <label className="text-xs text-neutral-500 font-bold uppercase tracking-wider block mb-2">Media Source</label>
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] uppercase font-bold rounded border border-neutral-700 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="rotate-180" size={12} /> Upload
          </button>
          <button
            onClick={store.randomize}
            className="flex-1 py-2 bg-gradient-to-r from-purple-900/40 to-cyan-900/40 hover:from-purple-900/60 hover:to-cyan-900/60 text-cyan-200 text-[10px] uppercase font-bold rounded border border-white/10 transition-colors flex items-center justify-center gap-2"
            title="Randomize Parameters"
          >
            <Zap size={12} /> Randomize
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-neutral-500 font-bold uppercase tracking-wider block">Generator Type</label>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-neutral-500 font-bold uppercase">Animate</span>
            <Toggle label="" value={store.generator.isAnimated ?? true} onChange={(v) => store.setGenerator('isAnimated', v)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {['fibonacci', 'voronoi', 'grid', 'liquid', 'plasma', 'fractal'].map(t => (
            <button
              key={t}
              onClick={() => store.setGenerator('type', t)}
              className={`text-[10px] py-2 rounded border transition-all capitalize ${store.generator.type === t ? 'bg-cyan-900/20 text-cyan-300 border-cyan-800/50' : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:border-neutral-700'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Generator Params (Context Aware) */}
      <div className="bg-neutral-900/50 p-3 rounded border border-neutral-800/50">
        <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold uppercase tracking-wider mb-4">
          <Activity size={12} /> Generator Params
        </div>

        {store.generator.type === 'fibonacci' && (
          <>
            <ControlGroup path="generator.param1" label="Density" step={1} value={store.generator.param1} min={1} max={200} onChange={(v) => store.setGenerator('param1', v)} />
            <ControlGroup path="generator.param2" label="Zoom" step={0.1} value={store.generator.param2} min={0.1} max={50} onChange={(v) => store.setGenerator('param2', v)} />
            <ControlGroup path="generator.param3" label="Speed" step={1} value={store.generator.param3} min={0} max={100} onChange={(v) => store.setGenerator('param3', v)} />
          </>
        )}
        {store.generator.type === 'voronoi' && (
          <>
            <ControlGroup path="generator.param1" label={CONTROLS.generator.param1.label} value={store.generator.param1} min={CONTROLS.generator.param1.min} max={CONTROLS.generator.param1.max} step={CONTROLS.generator.param1.step} onChange={(v) => store.setGenerator('param1', v)} />
            <ControlGroup path="generator.param2" label={CONTROLS.generator.param2.label} value={store.generator.param2} min={CONTROLS.generator.param2.min} max={CONTROLS.generator.param2.max} step={CONTROLS.generator.param2.step} onChange={(v) => store.setGenerator('param2', v)} />
            <ControlGroup path="generator.param3" label={CONTROLS.generator.param3.label} value={store.generator.param3} min={CONTROLS.generator.param3.min} max={CONTROLS.generator.param3.max} step={CONTROLS.generator.param3.step} onChange={(v) => store.setGenerator('param3', v)} />
          </>
        )}
        {store.generator.type === 'grid' && (
          <>
            <ControlGroup path="generator.param1" label="Spacing" value={store.generator.param1} min={10} max={200} onChange={(v) => store.setGenerator('param1', v)} />
            <ControlGroup path="generator.param2" label="Thickness" value={store.generator.param2} min={1} max={50} onChange={(v) => store.setGenerator('param2', v)} />
            <ControlGroup path="generator.param3" label="Softness" value={store.generator.param3} min={0} max={100} onChange={(v) => store.setGenerator('param3', v)} />
          </>
        )}
        {store.generator.type === 'liquid' && (
          <>
            <ControlGroup path="generator.param1" label="Scale" value={store.generator.param1} min={1} max={100} onChange={(v) => store.setGenerator('param1', v)} />
            <ControlGroup path="generator.param2" label="Speed" value={store.generator.param2} min={1} max={100} onChange={(v) => store.setGenerator('param2', v)} />
          </>
        )}
        {store.generator.type === 'plasma' && (
          <>
            <ControlGroup path="generator.param1" label="Frequency" value={store.generator.param1} min={1} max={100} onChange={(v) => store.setGenerator('param1', v)} />
            <ControlGroup path="generator.param2" label="Speed" value={store.generator.param2} min={1} max={100} onChange={(v) => store.setGenerator('param2', v)} />
          </>
        )}
        {store.generator.type === 'fractal' && (
          <>
            <ControlGroup path="generator.param1" label="Scale" value={store.generator.param1} min={0} max={100} onChange={(v) => store.setGenerator('param1', v)} />
            <ControlGroup path="generator.param2" label="Detail" value={store.generator.param2} min={0} max={100} onChange={(v) => store.setGenerator('param2', v)} />
            <ControlGroup path="generator.param3" label="Turbulence" value={store.generator.param3} min={0} max={100} onChange={(v) => store.setGenerator('param3', v)} />
          </>
        )}

        {/* Quick presets per generator */}
        {generatorPresets[store.generator.type] && (
          <div className="mt-4 pt-3 border-t border-neutral-800">
            <label className="text-[10px] text-neutral-500 font-bold uppercase mb-2 block">Quick Presets</label>
            <div className="grid grid-cols-2 gap-2">
              {generatorPresets[store.generator.type].map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyGeneratorPreset(p)}
                  className="py-2 text-[10px] uppercase rounded border border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-cyan-700 hover:text-cyan-200 transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preset Manager */}
      <div className="bg-neutral-900/50 p-3 rounded border border-neutral-800/50">
        <div className="flex items-center gap-2 text-xs text-violet-400 font-bold uppercase tracking-wider mb-4">
          <BookOpen size={12} /> Presets
        </div>

        {/* Built-in Presets */}
        <div className="mb-4">
          <label className="text-[10px] text-neutral-500 font-bold uppercase mb-2 block">Built-in</label>
          <div className="grid grid-cols-2 gap-1">
            {builtInPresets.map((p) => (
              <button
                key={p.name}
                onClick={() => store.loadSnapshot(p.state)}
                className="py-1.5 text-[10px] uppercase rounded border border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-violet-700 hover:text-violet-200 transition-colors truncate px-1"
                title={p.name}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Save / Import */}
        <div className="mb-3 pt-3 border-t border-neutral-800">
          <label className="text-[10px] text-neutral-500 font-bold uppercase mb-2 block">My Presets</label>
          <div className="flex gap-1 mb-1">
            <input
              type="text"
              value={presetName}
              onChange={(e) => { setPresetName(e.target.value); setPresetError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
              placeholder="Preset name…"
              className="flex-1 bg-neutral-800 text-[10px] text-neutral-300 px-2 py-1.5 rounded border border-neutral-700 outline-none focus:border-violet-500 placeholder-neutral-600"
            />
            <button
              onClick={handleSavePreset}
              className="px-2 py-1.5 bg-violet-900/40 hover:bg-violet-900/70 text-violet-300 border border-violet-800/50 rounded text-[10px] font-bold uppercase transition-colors"
              title="Save current settings as a preset"
            >
              Save
            </button>
            <button
              onClick={() => presetImportRef.current?.click()}
              className="px-2 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border border-neutral-700 rounded text-[10px] font-bold uppercase transition-colors"
              title="Import preset from JSON file"
            >
              <Upload size={12} />
            </button>
          </div>
          {presetError && <p className="text-[9px] text-red-400 mb-1">{presetError}</p>}
          <input
            ref={presetImportRef}
            type="file"
            accept=".json"
            onChange={handlePresetImport}
            className="hidden"
          />
        </div>

        {/* User Preset List */}
        {(store.userPresets || []).length === 0 ? (
          <p className="text-[9px] text-neutral-700 italic text-center py-2">No saved presets yet</p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
            {(store.userPresets || []).map((p) => (
              <div key={p.id} className="flex items-center gap-1 bg-neutral-800/50 rounded px-2 py-1">
                <button
                  onClick={() => store.loadSnapshot(p.state)}
                  className="flex-1 text-left text-[10px] text-neutral-300 hover:text-violet-300 transition-colors truncate"
                  title={`Load: ${p.name}`}
                >
                  {p.name}
                </button>
                <button
                  onClick={() => exportPreset(p)}
                  className="text-neutral-500 hover:text-cyan-400 transition-colors p-0.5"
                  title="Export as JSON"
                >
                  <Download size={11} />
                </button>
                <button
                  onClick={() => store.deleteUserPreset(p.id)}
                  className="text-neutral-600 hover:text-red-400 transition-colors p-0.5 font-bold text-[10px]"
                  title="Delete preset"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // TAB 1: GEOMETRY (Transforms, Tiling, Symmetry, Warp)
  const renderGeometry = () => (
    <div className="space-y-6">
      <div className="bg-neutral-900/50 p-3 rounded border border-neutral-800/50">
        <div className="flex items-center gap-2 text-xs text-orange-400 font-bold uppercase tracking-wider mb-4">
          <Layers size={12} /> Transforms
        </div>
        <ControlGroup path="transforms.scale" label={CONTROLS.transforms.scale.label} step={CONTROLS.transforms.scale.step} value={store.transforms.scale} min={CONTROLS.transforms.scale.min} max={CONTROLS.transforms.scale.max} onChange={(v) => store.setTransform('scale', v)} />
        <ControlGroup path="transforms.rotation" label={CONTROLS.transforms.rotation.label} step={CONTROLS.transforms.rotation.step} value={store.transforms.rotation} min={CONTROLS.transforms.rotation.min} max={CONTROLS.transforms.rotation.max} onChange={(v) => store.setTransform('rotation', v)} />
        <ControlGroup path="transforms.x" label={CONTROLS.transforms.x.label} step={CONTROLS.transforms.x.step} value={store.transforms.x} min={CONTROLS.transforms.x.min} max={CONTROLS.transforms.x.max} onChange={(v) => store.setTransform('x', v)} />
        <ControlGroup path="transforms.y" label={CONTROLS.transforms.y.label} step={CONTROLS.transforms.y.step} value={store.transforms.y} min={CONTROLS.transforms.y.min} max={CONTROLS.transforms.y.max} onChange={(v) => store.setTransform('y', v)} />
      </div>

      <div className="bg-neutral-900/50 p-3 rounded border border-neutral-800/50">
        <div className="flex items-center gap-2 text-xs text-purple-400 font-bold uppercase tracking-wider mb-4">
          <GridIcon size={12} /> Tiling
        </div>
        <div className="flex gap-2 mb-2">
          {[
            { label: 'None', type: 'none', scale: 1 },
            { label: 'Grid', type: 'p1', scale: 1 },
            { label: 'Spin', type: 'p2', scale: 0.8 },
            { label: 'Mirror', type: 'p4m', scale: 1.2 },
          ].map(p => (
            <button
              key={p.label}
              onClick={() => { store.setTiling('type', p.type); store.setTiling('scale', p.scale) }}
              className={`flex-1 py-1 text-[10px] uppercase rounded border ${store.tiling.type === p.type ? 'bg-purple-900/30 text-purple-300 border-purple-800' : 'bg-neutral-800 text-neutral-500 border-neutral-800'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mb-4">
          <div className="flex gap-1 mb-2">
            {['none', 'p1', 'p2', 'p4m'].map(m => (
              <button
                key={m}
                onClick={() => store.setTiling('type', m)}
                className={`flex-1 py-1 text-[10px] uppercase rounded border ${store.tiling.type === m ? 'bg-purple-900/30 text-purple-300 border-purple-800' : 'bg-neutral-800 text-neutral-500 border-neutral-800'}`}
              >
                {m}
              </button>
            ))}
          </div>
          <ControlGroup path="tiling.scale" label="Tile Scale" step={0.1} value={store.tiling.scale} min={0.1} max={5.0} onChange={(v) => store.setTiling('scale', v)} />
        </div>
      </div>

      <div className="bg-neutral-900/50 p-3 rounded border border-neutral-800/50">
        <div className="flex items-center gap-2 text-xs text-rose-400 font-bold uppercase tracking-wider mb-4">
          <RefreshCw size={12} /> Symmetry & Distortion
        </div>
        <div className="flex gap-2 mb-2">
          {[
            { label: 'Off', enabled: false, type: 'radial', slices: 6 },
            { label: 'Radial 6', enabled: true, type: 'radial', slices: 6 },
            { label: 'Mirror X', enabled: true, type: 'mirrorX', slices: store.symmetry.slices },
            { label: 'Mirror Y', enabled: true, type: 'mirrorY', slices: store.symmetry.slices },
          ].map(p => (
            <button
              key={p.label}
              onClick={() => {
                store.setSymmetry('enabled', p.enabled)
                store.setSymmetry('type', p.type)
                if (p.slices) store.setSymmetry('slices', p.slices)
              }}
              className={`flex-1 py-1 text-[9px] uppercase rounded border ${store.symmetry.enabled === p.enabled && store.symmetry.type === p.type ? 'bg-rose-900/30 text-rose-300 border-rose-800' : 'bg-neutral-800 text-neutral-500 border-neutral-800'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Toggle label="Enable Symmetry" value={store.symmetry.enabled} onChange={(v) => store.setSymmetry('enabled', v)} />

        {store.symmetry.enabled && (
          <div className="mb-2">
            <div className="flex gap-1 mb-2">
              {['radial', 'mirrorX', 'mirrorY'].map(t => (
                <button
                  key={t}
                  onClick={() => store.setSymmetry('type', t)}
                  className={`flex-1 py-1 text-[9px] uppercase rounded border ${store.symmetry.type === t ? 'bg-rose-900/30 text-rose-300 border-rose-800' : 'bg-neutral-800 text-neutral-500 border-neutral-800'}`}
                >
                  {t.replace('mirror', 'Mirror ')}
                </button>
              ))}
            </div>
            {store.symmetry.type === 'radial' && (
              <ControlGroup path="symmetry.slices" label={CONTROLS.symmetry.slices.label} value={store.symmetry.slices} min={CONTROLS.symmetry.slices.min} max={CONTROLS.symmetry.slices.max} step={CONTROLS.symmetry.slices.step} onChange={(v) => store.setSymmetry('slices', v)} />
            )}
          </div>
        )}

        {/* Liquify / Displacement */}
        <div className="mt-4 pt-4 border-t border-neutral-800">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] text-neutral-500 font-bold uppercase">Liquify</label>
          </div>
          <ControlGroup path="displacement.amp" label={CONTROLS.displacement.amp.label} value={store.displacement.amp} min={CONTROLS.displacement.amp.min} max={CONTROLS.displacement.amp.max} step={CONTROLS.displacement.amp.step} onChange={(v) => store.setDisplacement('amp', v)} />
          <ControlGroup path="displacement.freq" label={CONTROLS.displacement.freq.label} value={store.displacement.freq} min={CONTROLS.displacement.freq.min} max={CONTROLS.displacement.freq.max} step={CONTROLS.displacement.freq.step} onChange={(v) => store.setDisplacement('freq', v)} />
        </div>

        {/* Warp */}
        <div className="mt-4 pt-4 border-t border-neutral-800">
          <label className="text-[10px] text-neutral-500 font-bold uppercase mb-2 block">Warp Type</label>
          <div className="flex gap-2 mb-2">
            {[
              { label: 'None', type: 'none' },
              { label: 'Polar', type: 'polar' },
              { label: 'Log Polar', type: 'log-polar' },
            ].map(p => (
              <button
                key={p.type}
                onClick={() => store.setWarp('type', p.type)}
                className={`flex-1 py-1 text-[10px] uppercase rounded border ${store.warp.type === p.type ? 'bg-rose-900/30 text-rose-300 border-rose-800' : 'bg-neutral-800 text-neutral-500 border-transparent'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 mb-2">
            {['none', 'polar', 'log-polar'].map(w => (
              <button
                key={w}
                onClick={() => store.setWarp('type', w)}
                className={`flex-1 py-1 text-[10px] xs uppercase rounded border ${store.warp.type === w ? 'bg-rose-900/30 text-rose-300 border-rose-800' : 'bg-neutral-800 text-neutral-500 border-transparent'}`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // TAB 2: EFFECTS (Color, Audio, Post-Process)
  const renderEffects = () => (
    <div className="space-y-6">
      {/* Color */}
      <div className="bg-neutral-900/50 p-3 rounded border border-neutral-800/50">
        <div className="flex items-center gap-2 text-xs text-yellow-400 font-bold uppercase tracking-wider mb-4">
          <Zap size={12} /> Color Grading
        </div>

        {/* Posterize */}
        <ControlGroup path="color.posterize" label={CONTROLS.color.posterize.label} value={store.color.posterize} min={CONTROLS.color.posterize.min} max={CONTROLS.color.posterize.max} step={CONTROLS.color.posterize.step} onChange={(v) => store.setColor('posterize', v)} />

        {/* RGB Balance */}
        <div className="mt-4 pt-4 border-t border-neutral-800">
          <label className="text-[10px] text-neutral-500 font-bold uppercase mb-2 block">RGB Balance</label>
          <div className="grid grid-cols-3 gap-2">
            <ControlGroup path="color.r" label="R" value={store.color.r} min={CONTROLS.color.r.min} max={CONTROLS.color.r.max} step={CONTROLS.color.r.step} onChange={(v) => store.setColor('r', v)} />
            <ControlGroup path="color.g" label="G" value={store.color.g} min={CONTROLS.color.g.min} max={CONTROLS.color.g.max} step={CONTROLS.color.g.step} onChange={(v) => store.setColor('g', v)} />
            <ControlGroup path="color.b" label="B" value={store.color.b} min={CONTROLS.color.b.min} max={CONTROLS.color.b.max} step={CONTROLS.color.b.step} onChange={(v) => store.setColor('b', v)} />
          </div>
        </div>

        {/* HSL */}
        <div className="mt-4 pt-4 border-t border-neutral-800">
          <label className="text-[10px] text-neutral-500 font-bold uppercase mb-2 block">HSL</label>
          <ControlGroup path="color.hue" label={CONTROLS.color.hue.label} value={store.color.hue} min={CONTROLS.color.hue.min} max={CONTROLS.color.hue.max} step={CONTROLS.color.hue.step} onChange={(v) => store.setColor('hue', v)} />
          <ControlGroup path="color.sat" label={CONTROLS.color.sat.label} value={store.color.sat} min={CONTROLS.color.sat.min} max={CONTROLS.color.sat.max} step={CONTROLS.color.sat.step} onChange={(v) => store.setColor('sat', v)} />
          <ControlGroup path="color.light" label={CONTROLS.color.light.label} value={store.color.light} min={CONTROLS.color.light.min} max={CONTROLS.color.light.max} step={CONTROLS.color.light.step} onChange={(v) => store.setColor('light', v)} />
        </div>
      </div>

      {/* Audio Reactivity */}
      <div className="bg-neutral-900/50 p-3 rounded border border-neutral-800/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs text-pink-500 font-bold uppercase">
            <Activity size={12} /> Audio Reactivity
          </div>
          <Toggle label="" value={store.audio.enabled} onChange={(v) => store.setAudio('enabled', v)} />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <label className="text-[10px] text-neutral-500 font-bold uppercase">Source</label>
          <select
            value={store.audio.source}
            onChange={(e) => store.setAudio('source', e.target.value)}
            className="flex-1 bg-neutral-800 text-[10px] text-neutral-300 p-1.5 rounded border border-neutral-700 outline-none focus:border-cyan-500"
          >
            <option value="mic">Microphone</option>
            <option value="file">Audio File</option>
          </select>
        </div>
        {store.audio.source === 'file' && (
          <div className="flex flex-col gap-2 mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => audioFileRef.current?.click()}
                className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-[10px] uppercase font-bold rounded border border-neutral-700 text-neutral-300 transition-colors"
              >
                Load Audio
              </button>
              <span className="text-[10px] text-neutral-500 truncate flex-1">
                {store.audio.fileName || 'No file selected'}
              </span>
              <input
                ref={audioFileRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const url = URL.createObjectURL(file)
                    store.setAudio('fileUrl', url)
                    store.setAudio('fileName', file.name)
                  }
                }}
              />
            </div>
            {store.audio.fileUrl && (
              <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                <button
                  onClick={() => store.setAudio('enabled', !store.audio.enabled)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-800 border border-neutral-700 hover:border-cyan-700 hover:text-cyan-200 transition-all"
                >
                  {store.audio.enabled ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                  {store.audio.enabled ? 'Pause' : 'Play'}
                </button>
              </div>
            )}
          </div>
        )}
        {store.audio.enabled && (
          <ControlGroup path="audio.sensitivity" label="Sensitivity" step={0.1} value={store.audio.sensitivity} min={0.1} max={5.0} onChange={(v) => store.setAudio('sensitivity', v)} />
        )}
        {store.audio.enabled && (
          <div className="flex gap-2 mt-2">
            {['bass', 'mid', 'high'].map((band) => {
              const val = store.audio.meters?.[band] ?? 0
              return (
                <div key={band} className="flex-1">
                  <div className="text-[9px] uppercase text-neutral-500 mb-1">{band}</div>
                  <div className="h-2 w-full bg-neutral-800 rounded">
                    <div className="h-2 bg-pink-500 rounded" style={{ width: `${Math.min(val * 100, 100)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Post Processing */}
      <div className="bg-neutral-900/50 p-3 rounded border border-neutral-800/50">
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold uppercase tracking-wider mb-4">
          <Monitor size={12} /> Post Processing
        </div>
        <ControlGroup path="effects.bloom" label="Bloom" step={0.1} value={store.effects.bloom} min={0} max={3} onChange={(v) => store.setEffect('bloom', v)} />
        <ControlGroup path="effects.chromaticAberration" label="Chromatic Aberration" step={0.01} value={store.effects.chromaticAberration} min={0} max={1} onChange={(v) => store.setEffect('chromaticAberration', v)} />
        <ControlGroup path="effects.noise" label="Noise" step={0.01} value={store.effects.noise} min={0} max={1} onChange={(v) => store.setEffect('noise', v)} />
      </div>

      {/* Advanced FX & Masking */}
      <div className="bg-neutral-900/50 p-3 rounded border border-neutral-800/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs text-neutral-400 font-bold uppercase tracking-wider">
            <Sliders size={12} /> Advanced (Masking / Edge / Extra FX)
          </div>
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="text-[10px] uppercase px-2 py-1 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 hover:border-cyan-700 hover:text-cyan-200 transition-all"
          >
            {advancedOpen ? 'Hide' : 'Show'}
          </button>
        </div>

        {advancedOpen && (
          <div className="space-y-4">
            <div className="border border-neutral-800 rounded p-3 bg-black/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-neutral-500 font-bold uppercase">Masking</span>
                <Toggle label="" value={store.masking.invertLuma} onChange={(v) => store.setMasking('invertLuma', v)} />
              </div>
              <ControlGroup path="masking.lumaThreshold" label="Luma Threshold" step={1} value={store.masking.lumaThreshold} min={0} max={60} onChange={(v) => store.setMasking('lumaThreshold', v)} />
              <ControlGroup path="masking.centerRadius" label="Center Radius" step={1} value={store.masking.centerRadius} min={0} max={60} onChange={(v) => store.setMasking('centerRadius', v)} />
              <ControlGroup path="masking.feather" label="Feather" step={0.01} value={store.masking.feather} min={0} max={0.5} onChange={(v) => store.setMasking('feather', v)} />
            </div>

            <div className="border border-neutral-800 rounded p-3 bg-black/20">
              <span className="text-[10px] text-neutral-500 font-bold uppercase block mb-2">Extra FX</span>
              <ControlGroup path="effects.edgeDetect" label="Edge Detect" step={1} value={store.effects.edgeDetect} min={0} max={50} onChange={(v) => store.setEffect('edgeDetect', v)} />
              <ControlGroup path="effects.invert" label="Invert" step={1} value={store.effects.invert} min={0} max={100} onChange={(v) => store.setEffect('invert', v)} />
              <ControlGroup path="effects.solarize" label="Solarize" step={1} value={store.effects.solarize} min={0} max={100} onChange={(v) => store.setEffect('solarize', v)} />
              <ControlGroup path="effects.shift" label="RGB Shift" step={1} value={store.effects.shift} min={0} max={100} onChange={(v) => store.setEffect('shift', v)} />
            </div>

            <div className="border border-neutral-800 rounded p-3 bg-black/20">
              <span className="text-[10px] text-neutral-500 font-bold uppercase block mb-2">Tiling Overlap</span>
              <ControlGroup path="tiling.overlap" label="Overlap Blend" step={0.01} value={store.tiling.overlap} min={0} max={1} onChange={(v) => store.setTiling('overlap', v)} />
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // TAB 3: GLOBAL (Animation, Sequencer, Output)
  const renderGlobal = () => (
    <div className="space-y-6">

      {/* Motion Manager */}
      <div className="bg-neutral-900/50 p-3 rounded border border-neutral-800/50">
        <div className="flex items-center gap-2 text-xs text-indigo-400 font-bold uppercase tracking-wider mb-4">
          <Activity size={12} /> Motion Manager
        </div>

        {/* Master Controls */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setUi('globalPause', !ui.globalPause)}
            className={`flex-1 py-3 rounded text-[10px] uppercase font-bold flex flex-col items-center gap-1 transition-all ${ui.globalPause ? 'bg-cyan-500 text-black animate-pulse' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
          >
            <Pause size={16} /> {ui.globalPause ? 'FROZEN' : 'FREEZE WORLD'}
          </button>
          <button
            onClick={store.stopAllMotion}
            className="flex-1 py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded text-[10px] uppercase font-bold flex flex-col items-center gap-1 transition-all"
          >
            <StopCircle size={16} /> STOP ALL
          </button>
        </div>

        {/* Activity Status */}
        <div className="grid grid-cols-2 gap-2">

          {/* Generator Status */}
          <div className={`p-2 rounded border flex items-center justify-between ${store.generator.isAnimated ? 'bg-neutral-800 border-green-900/50 text-green-400' : 'bg-neutral-900 border-neutral-800 text-neutral-600'}`}>
            <div className="flex items-center gap-2">
              <RefreshCw size={12} className={store.generator.isAnimated ? "animate-spin" : ""} />
              <span className="text-[9px] uppercase font-bold">Generator</span>
            </div>
            <Toggle value={store.generator.isAnimated} onChange={(v) => store.setGenerator('isAnimated', v)} />
          </div>

          {/* Sequencer Status */}
          <div className={`p-2 rounded border flex items-center justify-between ${store.animation.isPlaying ? 'bg-neutral-800 border-cyan-900/50 text-cyan-400' : 'bg-neutral-900 border-neutral-800 text-neutral-600'}`}>
            <div className="flex items-center gap-2">
              <Play size={12} className={store.animation.isPlaying ? "fill-current" : ""} />
              <span className="text-[9px] uppercase font-bold">Sequencer</span>
            </div>
            <Toggle value={store.animation.isPlaying} onChange={(v) => store.setAnimation('isPlaying', v)} />
          </div>

          {/* Audio Status */}
          <div className={`p-2 rounded border flex items-center justify-between ${store.audio.enabled ? 'bg-neutral-800 border-pink-900/50 text-pink-400' : 'bg-neutral-900 border-neutral-800 text-neutral-600'}`}>
            <div className="flex items-center gap-2">
              <Music size={12} className={store.audio.enabled ? "animate-pulse" : ""} />
              <span className="text-[9px] uppercase font-bold">Audio</span>
            </div>
            <Toggle value={store.audio.enabled} onChange={(v) => store.setAudio('enabled', v)} />
          </div>

          {/* Flux Status */}
          <div className={`p-2 rounded border flex items-center justify-between ${store.flux?.enabled ? 'bg-neutral-800 border-purple-900/50 text-purple-400' : 'bg-neutral-900 border-neutral-800 text-neutral-600'}`}>
            <div className="flex items-center gap-2">
              <Sparkles size={12} className={store.flux?.enabled ? "animate-pulse" : ""} />
              <span className="text-[9px] uppercase font-bold">Flux</span>
            </div>
            <Toggle value={store.flux?.enabled || false} onChange={(v) => store.setFlux('enabled', v)} />
          </div>

        </div>

      </div>

      {/* Performance */}
      <div className="bg-neutral-900/50 p-3 rounded border border-neutral-800/50">
        <div className="flex items-center gap-2 text-xs text-green-400 font-bold uppercase tracking-wider mb-4">
          <Monitor size={12} /> Performance
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-neutral-500 font-bold uppercase">Low-res Preview</span>
          <Toggle label="" value={store.ui.lowResPreview} onChange={(v) => setUi('lowResPreview', v)} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-neutral-500 font-bold uppercase">Cap Heavy FX</span>
          <Toggle label="" value={store.ui.perfCapFx} onChange={(v) => setUi('perfCapFx', v)} />
        </div>
      </div>

      {/* Animation & Sequencer */}
      {/* Advanced Sequencer & Animation */}
      <div className="bg-neutral-900/50 p-3 rounded border border-neutral-800/50">
        <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold uppercase tracking-wider mb-4">
          <Activity size={12} /> Sequencer
        </div>

        {/* Transport Bar */}
        <div className="flex items-center justify-between mb-4 bg-black/40 p-2 rounded-lg border border-neutral-800">
          <button
            onClick={() => store.setAnimation('isPlaying', !store.animation.isPlaying)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${store.animation.isPlaying ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
          >
            {store.animation.isPlaying ? <div className="w-3 h-3 bg-black rounded-sm" /> : <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-current border-b-[6px] border-b-transparent ml-1" />}
          </button>

          <div className="flex flex-col flex-1 mx-3 gap-1">
            <div className="flex justify-between text-[9px] text-neutral-500 uppercase font-bold">
              <span>Mode</span>
              <span className="text-cyan-400">{store.animation.mode}</span>
            </div>
            <div className="flex bg-neutral-800 rounded p-0.5">
              {['loop', 'pingpong', 'once'].map(m => (
                <button
                  key={m}
                  onClick={() => store.setAnimation('mode', m)}
                  className={`flex-1 text-[8px] py-1 uppercase rounded ${store.animation.mode === m ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Strip */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] text-neutral-500 font-bold uppercase">Timeline</span>
            <div className="flex gap-2">
              <button onClick={store.addSnapshot} className="text-[9px] text-cyan-400 hover:text-cyan-300 font-bold uppercase">+ Add Step</button>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto pb-2 custom-scrollbar min-h-[40px] bg-black/20 p-1 rounded border border-neutral-800/50">
            {store.snapshots.map((snap, i) => (
              <div
                key={snap.id}
                onClick={() => {
                  store.loadSnapshot(snap)
                  store.setAnimation('activeStep', i)
                }}
                className={`relative group flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all border ${store.animation.activeStep === i ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300 scale-105 shadow-md' : 'bg-neutral-800 border-neutral-700 text-neutral-500 hover:border-neutral-500'}`}
              >
                {i + 1}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    store.deleteSnapshot(i)
                  }}
                  className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title="Delete Step"
                >
                  ×
                </button>
              </div>
            ))}
            {store.snapshots.length === 0 && <span className="text-[9px] text-neutral-700 italic w-full text-center py-2">No steps recorded</span>}
          </div>
        </div>

        {/* Transition Controls */}
        <div className="space-y-3 pt-3 border-t border-neutral-800">
          {/* Speed / Duration */}
          <ControlGroup
            path="animation.transitionTime"
            label="Transition Time (ms)"
            step={100}
            value={store.animation.transitionTime}
            min={100}
            max={10000}
            onChange={(v) => store.setAnimation('transitionTime', v)}
          />
          {store.animation.strobeSafety && store.animation.transitionTime < 500 && (
            <div className="text-[9px] text-yellow-500 font-mono bg-yellow-900/20 p-1 rounded border border-yellow-900/50 mb-2">
              ⚠ Safety Limit: Clamped to 500ms
            </div>
          )}

          {/* Easing & Safety */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[9px] text-neutral-500 font-bold uppercase block mb-1">Flow / Easing</label>
              <select
                value={store.animation.easing}
                onChange={(e) => store.setAnimation('easing', e.target.value)}
                className="w-full bg-neutral-800 text-[10px] text-neutral-300 p-1.5 rounded border border-neutral-700 outline-none focus:border-cyan-500"
              >
                <option value="linear">Linear (Robot)</option>
                <option value="easeInOut">Smooth (Natural)</option>
                <option value="bounce">Bounce</option>
                <option value="elastic">Elastic</option>
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <div className="flex items-center gap-2 p-1.5 bg-neutral-800 rounded border border-neutral-700" title="Prevents seizure-inducing speeds">
                <input
                  type="checkbox"
                  checked={store.animation.strobeSafety}
                  onChange={(e) => store.setAnimation('strobeSafety', e.target.checked)}
                  className="accent-cyan-500"
                />
                <span className="text-[9px] text-neutral-400 font-bold uppercase">Safety</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-neutral-500 font-bold uppercase bg-neutral-900 p-2 rounded border border-neutral-800">
            <span>Lock Geometry (snapshots)</span>
            <Toggle label="" value={store.ui.lockGeometry} onChange={(v) => setUi('lockGeometry', v)} />
          </div>
        </div>
      </div>

      <div className="bg-neutral-900/50 p-3 rounded border border-neutral-800/50">
        <div className="flex items-center gap-2 text-xs text-blue-400 font-bold uppercase tracking-wider mb-4">
          <Download size={12} /> Output
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={() => store.triggerExport({ width: 1920, height: 1080, filename: 'lumen_hd.png' })} className="py-2 bg-neutral-800 hover:bg-neutral-700 text-xs rounded text-neutral-300">Save 1080p</button>
          <button onClick={() => store.triggerExport({ width: 3840, height: 2160, filename: 'lumen_4k.png' })} className="py-2 bg-neutral-800 hover:bg-neutral-700 text-xs rounded text-neutral-300">Save 4K</button>
        </div>

        <div className="mb-4 pt-4 border-t border-neutral-800">
          <label className="text-[10px] text-neutral-500 font-bold uppercase mb-2 block">Projection Shape</label>
          <div className="flex gap-1">
            {['rectangle', 'circle'].map(s => (
              <button
                key={s}
                onClick={() => store.setCanvas('shape', s)}
                className={`flex-1 py-1 text-[10px] uppercase rounded border ${store.canvas.shape === s ? 'bg-blue-900/30 text-blue-300 border-blue-800' : 'bg-neutral-800 text-neutral-500 border-neutral-800'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Toggle label="Show Help on Start" value={store.ui.helpOpen} onChange={store.toggleHelp} />
        </div>
      </div>
    </div>
  )

  // Layout Styles
  const isFloating = ui.layout === 'floating'

  const containerClasses = isFloating
    ? `fixed right-4 top-4 w-72 bg-neutral-950/90 backdrop-blur rounded-xl border border-white/10 flex flex-col z-50 shadow-2xl max-h-[90vh] transition-all duration-300 ${!ui.controlsOpen ? 'translate-x-[120%] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`
    : `fixed right-0 top-0 h-full w-80 bg-neutral-950 border-l border-neutral-900 flex flex-col z-50 shadow-2xl transition-all duration-300 ${!ui.controlsOpen ? 'translate-x-full' : 'translate-x-0'}`

  return (
    <div className={containerClasses}>
      {/* Layout Toggle (Mini Header) */}
      <div className="relative flex items-center justify-between gap-1 p-2 border-b border-neutral-900/50 bg-neutral-950/50">

        {/* History / Reset Controls */}
        <div className="flex gap-1">
          <button
            onClick={store.undo}
            disabled={store.history?.length === 0}
            className={`p-1.5 rounded transition-all ${store.history?.length > 0 ? 'text-cyan-400 hover:bg-neutral-800' : 'text-neutral-700 cursor-not-allowed'}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={() => {
              store.resetParams()
            }}
            className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
            title="Reset Parameters (Soft Reset)"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Layout Switcher */}
        <div className="flex bg-neutral-900 rounded p-0.5">
          {['sidebar', 'floating'].map(l => (
            <button
              key={l}
              onClick={() => setUi('layout', l)}
              className={`px-2 py-0.5 text-[8px] uppercase tracking-wider font-bold rounded ${ui.layout === l ? 'bg-neutral-800 text-cyan-400 shadow-sm' : 'text-neutral-600 hover:text-neutral-400'}`}
            >
              {l === 'sidebar' ? 'RAIL' : 'FLOAT'}
            </button>
          ))}
        </div>

        {/* Settings Button */}
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className={`p-1.5 rounded transition-all ${settingsOpen ? 'text-cyan-400 bg-neutral-800' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
          title="Settings"
        >
          <Settings size={14} />
        </button>

        {/* Settings Popover */}
        {settingsOpen && (
          <div className="absolute top-10 right-2 w-56 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl p-3 z-50 flex flex-col gap-3">
            <h3 className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Startup Settings</h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-neutral-300">Resume Last Session</label>
                <Toggle
                  label=""
                  value={ui.resumeOnStartup !== false} // Default to true if undefined
                  onChange={(v) => setUi('resumeOnStartup', v)}
                />
              </div>
            </div>

            <div className="h-px bg-neutral-800" />

            {/* MIDI SETTINGS */}
            <h3 className="text-[10px] text-cyan-500 font-bold uppercase tracking-wider flex items-center justify-between">
              MIDI Control
              <span className={`w-2 h-2 rounded-full ${store.midi.inputs.length > 0 ? 'bg-green-500' : 'bg-neutral-600'}`} />
            </h3>

            <div className="bg-black/30 rounded p-2 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-neutral-300">Learn Mode</label>
                <Toggle
                  label=""
                  value={store.ui.midiLearnActive}
                  onChange={(v) => {
                    store.setUi('midiLearnActive', v)
                    if (v) store.setUi('midiLearnId', null) // Reset selection when entering
                  }}
                />
              </div>

              {store.ui.midiLearnActive && (
                <div className="text-[9px] text-cyan-400 bg-cyan-900/20 p-1.5 rounded border border-cyan-900/50">
                  {store.ui.midiLearnId ? (
                    <span>Waiting for MIDI...<br /><span className="text-white font-mono">{store.ui.midiLearnId}</span></span>
                  ) : (
                    <span>Click a slider to map</span>
                  )}
                </div>
              )}

              {store.midi.inputs.length === 0 ? (
                <div className="text-[9px] text-neutral-500 italic">No MIDI devices found.</div>
              ) : (
                <div className="space-y-1">
                  {store.midi.inputs.map(input => (
                    <div key={input.id} className="text-[9px] text-neutral-400 truncate" title={input.name}>
                      🎹 {input.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Mappings List */}
            {Object.keys(store.midi.mappings).length > 0 && (
              <div className="max-h-32 overflow-y-auto custom-scrollbar border-t border-neutral-800 pt-2">
                <div className="text-[9px] text-neutral-500 font-bold uppercase mb-1">Mappings</div>
                {Object.entries(store.midi.mappings).map(([key, path]) => (
                  <div key={key} className="flex justify-between items-center text-[9px] bg-neutral-800/50 p-1 rounded mb-1">
                    <span className="text-cyan-300 truncate w-24" title={path}>{path}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500 font-mono">{key.split('-')[2]}</span>
                      <button
                        onClick={() => store.clearMidiMapping(key)}
                        className="text-red-400 hover:text-red-300 w-4 h-4 flex items-center justify-center bg-neutral-800 rounded hover:bg-neutral-700"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="h-px bg-neutral-800" />

            <h3 className="text-[10px] text-red-500 font-bold uppercase tracking-wider flex items-center gap-1">
              Danger Zone
            </h3>

            <button
              onClick={() => {
                if (confirm('FACTORY RESET? This will wipe all data, presets, and history.')) {
                  store.resetAll()
                  window.location.reload()
                }
              }}
              className="w-full py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded text-[10px] uppercase font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Power size={12} /> Factory Reset
            </button>
          </div>
        )}
      </div>

      {/* Reset notice */}
      {ui.resetNotice && (
        <div className="px-3 py-2 text-[10px] bg-amber-900/30 text-amber-200 border-b border-amber-800">
          {ui.resetNotice}
        </div>
      )}

      {/* Tab Bar */}
      <div className={`flex items-center justify-around p-2 ${!isFloating && 'border-b border-neutral-900 bg-neutral-950'}`}>
        <TabButton icon={CubeIcon} active={ui.activeTab === 0} onClick={() => setUi('activeTab', 0)} />
        <TabButton icon={GridIcon} active={ui.activeTab === 1} onClick={() => setUi('activeTab', 1)} />
        <TabButton icon={Zap} active={ui.activeTab === 2} onClick={() => setUi('activeTab', 2)} />
        <TabButton icon={EyeIcon} active={ui.activeTab === 3} onClick={() => setUi('activeTab', 3)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {ui.activeTab === 0 && renderSource()}
        {ui.activeTab === 1 && renderGeometry()}
        {ui.activeTab === 2 && renderEffects()}
        {ui.activeTab === 3 && renderGlobal()}
      </div>

      {/* Footer / Logo Area */}
      <div className="p-4 border-t border-neutral-900/50 text-center flex flex-col items-center gap-1">
        <h1 className="text-xs font-bold text-neutral-600 tracking-[0.2em] uppercase">Lumen Lab <span className="text-cyan-900">v0.6</span></h1>
        {store.ui.gamepadConnected && (
          <div className="flex items-center gap-1 text-[9px] text-green-500 font-bold uppercase animate-pulse">
            <Gamepad2 size={10} /> Controller Active
          </div>
        )}
      </div>
    </div>
  )
}
