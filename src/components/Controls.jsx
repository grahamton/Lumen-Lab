import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { renderCanvas } from '../core/render'
import { Upload, RefreshCw, Hexagon, Waves, Zap, EyeOff, Infinity, Grid, Palette, Activity, Dices, Camera, Play, Pause, Trash2, Save, ChevronDown, ChevronRight, Move, Download, FileJson, FolderOpen, Sun, Moon, Split, Sliders } from 'lucide-react'

export function Controls() {
  const store = useStore()
  const { transforms, setTransform, resetTransforms, setImage, symmetry, setSymmetry, warp, setWarp, displacement, setDisplacement, masking, setMasking, recording, setRecording, tiling, setTiling, color, setColor, effects, setEffects, snapshots, addSnapshot, deleteSnapshot, loadSnapshot, animation, setAnimation, randomize } = store

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      e.target.value = null
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => setImage(img)
        img.onerror = () => alert("Error loading image.")
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    } catch (err) {
      alert("Unexpected error during upload.")
    }
  }

  const loadDemoImage = () => {
    const img = new Image()
    img.crossOrigin = "Anonymous"
    img.onload = () => setImage(img)
    img.onerror = () => alert("Failed to load demo image.")
    img.src = "https://picsum.photos/1920/1080"
  }

  // --- PRO FEATURES (Save/Load/Export) ---
  const handleSaveProject = () => {
    const data = {
      version: 1,
      timestamp: Date.now(),
      state: {
        transforms, symmetry, warp, displacement, masking,
        tiling, color, effects, snapshots, generator: store.generator
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lumen-project-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLoadProject = (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = null
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (data.state) {
          useStore.setState(data.state)
        }
      } catch (err) {
        alert("Failed to load project file.")
      }
    }
    reader.readAsText(file)
  }

  const handleExportPrint = () => {
    const { width, height } = store.canvas
    const targetW = 3840
    const scale = targetW / width
    const targetH = Math.round(height * scale)

    const offCanvas = document.createElement('canvas')
    offCanvas.width = targetW
    offCanvas.height = targetH
    const ctx = offCanvas.getContext('2d')

    const exportState = {
      ...store,
      canvas: { width: targetW, height: targetH, shape: store.canvas.shape },
      transforms: {
        ...transforms,
        x: transforms.x * scale,
        y: transforms.y * scale,
      },
      displacement: {
        ...displacement,
        freq: displacement.freq / scale
      }
    }

    const dummyBack = document.createElement('canvas')
    dummyBack.width = targetW
    dummyBack.height = targetH

    try {
      renderCanvas(ctx, dummyBack, targetW, targetH, exportState)
    } catch (err) {
      alert("Export failed.")
      return
    }

    offCanvas.toBlob(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lumen-print-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }


  return (
    <div className="fixed top-4 right-4 w-80 bg-neutral-900/95 backdrop-blur-md p-4 rounded-xl border border-neutral-800 shadow-2xl text-sm font-sans select-none z-50 max-h-[90vh] overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-neutral-200 flex items-center gap-2">
          <Zap size={16} className="text-cyan-400" />
          Lumen Lab
        </h2>
        <div className="flex gap-2">
          <button onClick={randomize} className="p-1.5 hover:bg-neutral-800 rounded-md transition-colors text-purple-400 hover:text-purple-300" title="Randomize All">
            <Dices size={16} />
          </button>
          <button onClick={resetTransforms} className="p-1.5 hover:bg-neutral-800 rounded-md transition-colors text-neutral-400 hover:text-white" title="Reset All">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-1">

        {/* 1. Source: The Input Signal */}
        <Section title="Source (Input)" icon={<Activity size={14} />} defaultOpen={true}>
          <div className="flex gap-2 mb-3 bg-neutral-800 p-1 rounded-lg">
            <button
              onClick={() => store.setGenerator('type', 'none')}
              className={`text-xs flex-1 py-1.5 rounded-md transition-all font-medium ${store.generator.type === 'none' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              Image
            </button>
            <button
              onClick={() => store.setGenerator('type', 'fibonacci')}
              className={`text-xs flex-1 py-1.5 rounded-md transition-all font-medium ${store.generator.type !== 'none' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              Math (Gen)
            </button>
          </div>

          {store.generator.type === 'none' ? (
            <div className="space-y-2">
              <div className="relative group">
                <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-[10px] text-neutral-400
                      file:mr-2 file:py-2 file:px-3
                      file:rounded-md file:border-0
                      file:text-[10px] file:font-bold
                      file:bg-neutral-800 file:text-cyan-500
                      hover:file:bg-neutral-700
                      cursor-pointer"
                />
              </div>
              <button
                onClick={loadDemoImage}
                className="text-xs w-full py-1.5 text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1 justify-center"
              >
                <Zap size={10} /> Load Demo Image
              </button>
            </div>
          ) : (
            <div>
              <p className="text-[10px] text-neutral-500 mb-2 px-1">Select a procedural algorithm:</p>
              <div className="grid grid-cols-3 gap-1 mb-3">
                {['fibonacci', 'voronoi', 'grid'].map(t => (
                  <button
                    key={t}
                    onClick={() => store.setGenerator('type', t)}
                    className={`text-[10px] py-2 rounded capitalize border transition-all ${store.generator.type === t ? 'bg-cyan-900/30 text-cyan-200 border-cyan-800' : 'bg-neutral-800 text-neutral-500 border-transparent hover:border-neutral-700'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="bg-neutral-800/30 p-2 rounded border border-neutral-800 space-y-2">
                <div className="flex items-center gap-2 text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-1">
                  <Sliders size={10} /> Tuning
                </div>
                {/* Dynamic Sliders based on Type */}
                {store.generator.type === 'fibonacci' && (
                  <>
                    <ControlGroup label="Density" value={store.generator.param1} min={1} max={100} onChange={(v) => store.setGenerator('param1', v)} />
                    <ControlGroup label="Zoom" value={store.generator.param2} min={1} max={100} onChange={(v) => store.setGenerator('param2', v)} />
                  </>
                )}
                {store.generator.type === 'voronoi' && (
                  <>
                    <ControlGroup label="Cells" value={store.generator.param1} min={1} max={100} onChange={(v) => store.setGenerator('param1', v)} />
                    <ControlGroup label="Bubble Size" value={store.generator.param2} min={1} max={100} onChange={(v) => store.setGenerator('param2', v)} />
                  </>
                )}
                {store.generator.type === 'grid' && (
                  <>
                    <ControlGroup label="Spacing" value={store.generator.param1} min={1} max={100} onChange={(v) => store.setGenerator('param1', v)} />
                    <ControlGroup label="Thickness" value={store.generator.param2} min={1} max={100} onChange={(v) => store.setGenerator('param2', v)} />
                  </>
                )}
              </div>
            </div>
          )}
        </Section>

        {/* 2. Canvas: The Output Shape */}
        <Section title="Canvas (Output)" icon={<Move size={14} />} defaultOpen={true}>
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="text-neutral-400">Portal Mode</span>
            <div className="flex bg-neutral-800 rounded p-0.5">
              <button
                onClick={() => store.setCanvas('shape', 'rectangle')}
                className={`px-3 py-1 rounded transition-colors ${store.canvas.shape !== 'circle' ? 'bg-neutral-600 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                Rect
              </button>
              <button
                onClick={() => store.setCanvas('shape', 'circle')}
                className={`px-3 py-1 rounded transition-colors ${store.canvas.shape === 'circle' ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(8,145,178,0.5)]' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                Circle
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1 mb-2">
            {[
              { id: 'video', label: '16:9' },
              { id: 'portrait', label: '9:16' },
              { id: 'square', label: '1:1' },
              { id: 'free', label: 'Full' }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  const { setCanvas } = useStore.getState()
                  setCanvas('aspect', opt.id)
                  if (opt.id === 'video') { setCanvas('width', 1920); setCanvas('height', 1080) }
                  if (opt.id === 'portrait') { setCanvas('width', 1080); setCanvas('height', 1920) }
                  if (opt.id === 'square') { setCanvas('width', 1080); setCanvas('height', 1080) }
                  if (opt.id === 'free') { setCanvas('width', window.innerWidth); setCanvas('height', window.innerHeight) }
                }}
                className={`text-[10px] py-1 rounded transition-colors ${store.canvas.aspect === opt.id
                  ? 'bg-neutral-700 text-white'
                  : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Section>

        {/* 3. Transform & Geometry */}
        <Section title="Geometry" icon={<Hexagon size={14} />}>
          <ControlGroup label="Scale" value={transforms.scale} min={0.1} max={3} step={0.01} onChange={(v) => setTransform('scale', v)} />
          <ControlGroup label="Rotation" value={Math.round(transforms.rotation * (180 / Math.PI))} min={0} max={360} onChange={(v) => setTransform('rotation', v * (Math.PI / 180))} />

          <div className="border-t border-neutral-800 my-2 pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-400">Kaleidoscope</span>
            </div>
            {/* No Toggle - Just a slider. If < variable slice count? Use 'enabled' state derived logic implicitly in render or just keep enabled on?
                 User wanted toggle gone. Let's make slider min 0, where 0/1/2 = off.
                 Since store has 'enabled', let's toggle enabled based on slice count or just force enabled in slider change?
                 Simpler: Keep 'enabled' valid, but hook it to the slider? No, slider range 2-32.
                 Let's keep the slider range, but also bring back the toggle because Render needs explicit OFF often.
                 Wait, user said "Hidden behind a toggle was not great".
                 Let's make toggle prominent as a button group? Or just toggle 'enabled' to true if user slides the slider?
                 Let's do: Toggle Button Group [Off] [On] next to header.
             */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-neutral-500 uppercase">Mode</span>
              <div className="flex bg-neutral-800 rounded p-0.5">
                <button onClick={() => setSymmetry('enabled', false)} className={`px-2 py-0.5 rounded text-[10px] ${!symmetry.enabled ? 'bg-neutral-600 text-white' : 'text-neutral-500'}`}>Off</button>
                <button onClick={() => setSymmetry('enabled', true)} className={`px-2 py-0.5 rounded text-[10px] ${symmetry.enabled ? 'bg-cyan-600 text-white' : 'text-neutral-500'}`}>On</button>
              </div>
            </div>

            {symmetry.enabled && (
              <ControlGroup label="Slices" value={symmetry.slices} min={2} max={32} step={2} onChange={(v) => setSymmetry('slices', v)} />
            )}
          </div>

          <div className="border-t border-neutral-800 my-2 pt-2">
            <div className="flex gap-1 mb-2">
              {['none', 'p1', 'p2', 'p4m'].map((type) => {
                const labels = { 'none': 'Off', 'p1': 'Grid', 'p2': 'Spin', 'p4m': 'Mirror' }
                return (
                  <button
                    key={type}
                    onClick={() => setTiling('type', type)}
                    className={`text-[10px] py-1 px-2 rounded capitalize transition-colors flex-1 ${tiling.type === type ? 'bg-cyan-700 text-white' : 'bg-neutral-800 text-neutral-500'}`}
                  >
                    {labels[type]}
                  </button>
                )
              })}
            </div>
            {tiling.type !== 'none' && (
              <ControlGroup label="Grid Scale" value={tiling.scale} min={0.1} max={2.0} step={0.01} onChange={(v) => setTiling('scale', v)} />
            )}
          </div>
        </Section>

        {/* 4. Effects (Renamed & Refined) */}
        <Section title="Effects Rack" icon={<Waves size={14} />}>
          <div className="mb-2">
            <span className="text-[10px] uppercase font-bold text-neutral-600 mb-1 block">Distortion</span>
            <div className="flex gap-1 mb-2">
              {[
                { id: 'none', label: 'None' },
                { id: 'polar', label: 'Tunnel' },
                { id: 'log-polar', label: 'Vortex' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setWarp('type', opt.id)}
                  className={`text-[10px] py-1 px-2 rounded capitalize flex-1 ${warp.type === opt.id ? 'bg-purple-600 text-white' : 'bg-neutral-800 text-neutral-500'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <ControlGroup label="Liquify Intensity" value={displacement.amp} min={0} max={200} onChange={(v) => setDisplacement('amp', v)} />
          </div>

          <div className="border-t border-neutral-800 pt-2 grid grid-cols-1 gap-1">
            <span className="text-[10px] uppercase font-bold text-neutral-600 mb-1 block">Alchemy</span>
            <ControlGroup label="Invert" value={effects.invert} min={0} max={100} onChange={(v) => setEffects('invert', v)} />
            <ControlGroup label="Neon Edge" value={effects.edgeDetect} min={0} max={100} onChange={(v) => setEffects('edgeDetect', v)} />
            <ControlGroup label="Solarize" value={effects.solarize} min={0} max={100} onChange={(v) => setEffects('solarize', v)} />
            <ControlGroup label="Shift" value={effects.shift} min={0} max={100} onChange={(v) => setEffects('shift', v)} />
          </div>
        </Section>

        {/* 5. Visualizer (Restored & Highlighted) */}
        <Section title="Visualizer (Snapshots)" icon={<Camera size={14} />} defaultOpen={true}>
          <div className="flex gap-2 mb-3">
            <button
              onClick={addSnapshot}
              className="flex-1 bg-cyan-900/50 hover:bg-cyan-800 text-cyan-100 border border-cyan-800 hover:border-cyan-500 rounded p-2 text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Save size={14} /> Snapshot
            </button>
            <button
              onClick={() => setAnimation('isPlaying', !animation.isPlaying)}
              className={`flex-1 rounded p-2 text-xs flex items-center justify-center gap-2 transition-colors border ${animation.isPlaying ? 'bg-green-900/50 text-green-100 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)] animate-pulse' : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-500 hover:text-white'}`}
            >
              {animation.isPlaying ? <Pause size={14} /> : <Play size={14} />}
              {animation.isPlaying ? 'Stop' : 'Play'}
            </button>
          </div>

          {snapshots.length > 0 && (
            <div className="space-y-2 mb-3 max-h-32 overflow-y-auto pr-1 custom-scrollbar bg-black/20 p-2 rounded-lg border border-neutral-800">
              {snapshots.map((snap, idx) => (
                <div key={snap.id} className="flex items-center justify-between bg-neutral-900/80 p-2 rounded text-xs group hover:bg-neutral-800 transition-colors cursor-pointer border border-transparent hover:border-neutral-600">
                  <span
                    onClick={() => loadSnapshot(snap)}
                    className="truncate w-full hover:text-cyan-400"
                  >
                    Snapshot {idx + 1}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); deleteSnapshot(idx) }} className="text-neutral-600 hover:text-red-400 pl-2">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-neutral-800/50 p-2 rounded-lg">
            <ControlGroup label="Morph Speed (ms)" value={animation.duration} min={500} max={10000} step={100} onChange={(v) => setAnimation('duration', v)} />
            <div className="flex items-center justify-between mt-2 text-xs text-neutral-400">
              <span>Mode</span>
              <div className="flex bg-neutral-900 rounded p-0.5 border border-neutral-800">
                {['loop', 'pingpong'].map(m => (
                  <button
                    key={m}
                    onClick={() => setAnimation('mode', m)}
                    className={`px-2 py-0.5 rounded capitalize transition-colors ${animation.mode === m ? 'bg-neutral-700 text-white' : 'hover:text-white'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* 6. Project & Export */}
        <Section title="Project & Export" icon={<FolderOpen size={14} />}>
          <div className="flex gap-2 mb-2">
            <button onClick={handleSaveProject} className="flex-1 bg-neutral-800 hover:bg-neutral-700 py-2 rounded text-xs flex items-center justify-center gap-2 text-neutral-300">
              <Save size={12} /> Save
            </button>
            <label className="flex-1 bg-neutral-800 hover:bg-neutral-700 py-2 rounded text-xs flex items-center justify-center gap-2 cursor-pointer text-neutral-300">
              <FolderOpen size={12} /> Load
              <input type="file" accept=".json" onChange={handleLoadProject} className="hidden" />
            </label>
          </div>
          <button onClick={handleExportPrint} className="w-full bg-neutral-100 hover:bg-white text-black py-2 rounded text-xs flex items-center justify-center gap-2 font-bold shadow-lg shadow-white/10">
            <Download size={14} /> Export 4K Image
          </button>
        </Section>
      </div>
    </div>
  )
}

function Toggle({ label, icon, checked, onChange, color = "peer-checked:bg-cyan-600" }) {
  return (
    <div className="flex items-center justify-between bg-neutral-900/40 p-2 rounded border border-neutral-700/50">
      <span className="text-xs text-neutral-400 flex items-center gap-2">
        {icon} {label}
      </span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className={`w-7 h-4 bg-neutral-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all ${color}`}></div>
      </label>
    </div>
  )
}

function Section({ title, icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-neutral-700 rounded-lg overflow-hidden bg-neutral-800/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-xs font-bold text-neutral-300 hover:bg-neutral-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon} <span>{title}</span>
        </div>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {isOpen && (
        <div className="p-3 pt-0 border-t border-neutral-700/50 bg-black/20">
          <div className="pt-3 space-y-3">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}


function ControlGroup({ label, value, min, max, step = 1, onChange, tooltip }) {
  return (
    <div className="space-y-1 group">
      <div className="flex justify-between text-xs text-neutral-400">
        <div className="flex items-center gap-1">
          <span>{label}</span>
          {tooltip && (
            <div className="relative group/tooltip">
              <div className="cursor-help text-neutral-600 hover:text-cyan-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="16" y2="12" /><line x1="12" x2="12.01" y1="8" y2="8" /></svg>
              </div>
              <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-black/90 text-neutral-200 text-[10px] rounded border border-neutral-700 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-50">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        <span>{Number(value).toFixed(step < 0.1 ? 2 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
      />
    </div>
  )
}
