import React, { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import {
  Zap, Sliders, Layers, Move, Hexagon, Waves, Activity, FolderOpen,
  RefreshCw, Dices, ChevronDown, ChevronRight, Download, Save, Trash2, HelpCircle,
  Camera, Play, Pause, PanelLeftClose
} from 'lucide-react'

function ControlGroup({ label, value, min, max, step = 1, onChange, children }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">{label}</label>
        <span className="text-[10px] text-neutral-500 font-mono">{Number(value).toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
      />
      {children}
    </div>
  )
}

export function Controls() {
  const store = useStore()
  const {
    ui, toggleControls, // UI State
    setImage,
    transforms, setTransform,
    symmetry, setSymmetry,
    warp, setWarp,
    displacement, setDisplacement,
    tiling, setTiling,
    masking,
    color, setColor,
    effects, setEffects,
    snapshots, addSnapshot, deleteSnapshot, loadSnapshot,
    animation, setAnimation,
    toggleHelp
  } = useStore()

  // Global Hotkeys
  useEffect(() => {
    const handleKeyDown = (e) => {
      // TAB to toggle UI
      if (e.key === 'Tab') {
        e.preventDefault() // Prevent focus trapping or other default tab behavior
        toggleControls(!ui.controlsOpen)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [ui.controlsOpen, toggleControls])

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
      console.error(err)
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
        console.error(err)
        alert("Failed to load project file.")
      }
    }
    reader.readAsText(file)
  }

  const handleExportPrint = () => {
    const { width, height } = store.canvas
    // Trigger WebGL Export via State
    store.triggerExport({
      width: 3840, // 4K default for "High Res"
      height: 3840 * (height / width),
      filename: `LumenLab_HighRes_${Date.now()}.png`
    })
  }

  // Minimized View
  if (!ui.controlsOpen) {
    return (
      <div className="absolute top-4 left-4 z-50">
        <button
          onClick={() => toggleControls(true)}
          className="bg-black/50 hover:bg-black/80 text-white p-2 rounded-lg border border-white/10 backdrop-blur-md transition-all shadow-xl group"
          title="Show Controls (TAB)"
        >
          <ChevronRight size={20} className="group-hover:scale-110 transition-transform" />
        </button>
      </div>
    )
  }

  return (
    <div className="absolute top-0 left-0 h-full w-80 bg-neutral-900/95 backdrop-blur-md border-r border-neutral-800 flex flex-col z-50 transition-transform duration-300 ease-in-out shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-black/20">
        <div className="flex items-center gap-2">
          <Zap className="text-cyan-400 fill-cyan-400/20" size={20} />
          <h1 className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">Lumen Lab</h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => toggleHelp(true)} className="p-1.5 text-neutral-400 hover:text-white rounded-md hover:bg-neutral-800 transition-colors" title="Help">
            <HelpCircle size={18} />
          </button>
          <div className="w-px h-4 bg-neutral-800 mx-1"></div>
          <button onClick={() => toggleControls(false)} className="p-1.5 text-neutral-400 hover:text-white rounded-md hover:bg-neutral-800 transition-colors" title="Hide Controls (TAB)">
            <PanelLeftClose size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">

        {/* 1. Source */}
        <Section
          title="Source (Input)"
          icon={<Activity size={14} />}
          defaultOpen={true}
          tooltip="Input Configuration. Toggle between uploading your own Image or using the Math Generator (Fibonacci, Voronoi, Grid) to create procedural patterns. Use specific tuning sliders for each generator type."
        >
          <div className="flex gap-2 mb-3 bg-neutral-800 p-1 rounded-lg">
            <button onClick={() => store.setGenerator('type', 'none')} className={`text-xs flex-1 py-1.5 rounded-md transition-all font-medium ${store.generator.type === 'none' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}>Image</button>
            <button onClick={() => store.setGenerator('type', 'fibonacci')} className={`text-xs flex-1 py-1.5 rounded-md transition-all font-medium ${store.generator.type !== 'none' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}>Math (Gen)</button>
          </div>
          {store.generator.type === 'none' ? (
            <div className="space-y-2">
              <div className="relative group">
                <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none" />
                <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-[10px] text-neutral-400 file:mr-2 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-neutral-800 file:text-cyan-500 hover:file:bg-neutral-700 cursor-pointer" />
              </div>
              <button onClick={loadDemoImage} className="text-xs w-full py-1.5 text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1 justify-center"><Zap size={10} /> Load Demo Image</button>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-1 mb-3">
                {['fibonacci', 'voronoi', 'grid'].map(t => (
                  <button key={t} onClick={() => store.setGenerator('type', t)} className={`text-[10px] py-2 rounded capitalize border transition-all ${store.generator.type === t ? 'bg-cyan-900/30 text-cyan-200 border-cyan-800' : 'bg-neutral-800 text-neutral-500 border-transparent hover:border-neutral-700'}`}>{t}</button>
                ))}
              </div>
              <div className="bg-neutral-800/30 p-2 rounded border border-neutral-800 space-y-2">
                <div className="flex items-center gap-2 text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-1"><Sliders size={10} /> Tuning</div>
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

        {/* 2. Canvas */}
        <Section
          title="Canvas (Output)"
          icon={<Move size={14} />}
          defaultOpen={true}
          tooltip="Output Settings. Control the Aspect Ratio (16:9 for video, 9:16 for mobile, 1:1 for social). Enable Portal Mode to switch between a standard Rectangle or a Circular mask."
        >
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="text-neutral-400">Portal Mode</span>
            <div className="flex bg-neutral-800 rounded p-0.5">
              <button onClick={() => store.setCanvas('shape', 'rectangle')} className={`px-3 py-1 rounded transition-colors ${store.canvas.shape !== 'circle' ? 'bg-neutral-600 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>Rect</button>
              <button onClick={() => store.setCanvas('shape', 'circle')} className={`px-3 py-1 rounded transition-colors ${store.canvas.shape === 'circle' ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(8,145,178,0.5)]' : 'text-neutral-500 hover:text-neutral-300'}`}>Circle</button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1 mb-2">
            {[{ id: 'video', label: '16:9' }, { id: 'portrait', label: '9:16' }, { id: 'square', label: '1:1' }, { id: 'free', label: 'Full' }].map((opt) => (
              <button key={opt.id} onClick={() => {
                const { setCanvas } = useStore.getState()
                setCanvas('aspect', opt.id)
                if (opt.id === 'video') { setCanvas('width', 1920); setCanvas('height', 1080) }
                if (opt.id === 'portrait') { setCanvas('width', 1080); setCanvas('height', 1920) }
                if (opt.id === 'square') { setCanvas('width', 1080); setCanvas('height', 1080) }
                if (opt.id === 'free') { setCanvas('width', window.innerWidth); setCanvas('height', window.innerHeight) }
              }} className={`text-[10px] py-1 rounded transition-colors ${store.canvas.aspect === opt.id ? 'bg-neutral-700 text-white' : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'}`}>{opt.label}</button>
            ))}
          </div>
        </Section>

        {/* 3. Geometry */}
        <Section
          title="Geometry"
          icon={<Hexagon size={14} />}
          tooltip="Spatial Transforms. Scale and Rotate the canvas. Enable Kaleidoscope for symmetrical mandala effects, or use Tiling to repeat the pattern in Grid, Spin, or Mirror modes."
        >
          <ControlGroup label="Scale" value={transforms.scale} min={0.1} max={3} step={0.01} onChange={(v) => setTransform('scale', v)} />
          <ControlGroup label="Rotation" value={Math.round(transforms.rotation * (180 / Math.PI))} min={0} max={360} onChange={(v) => setTransform('rotation', v * (Math.PI / 180))} />
          <div className="border-t border-neutral-800 my-2 pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-400">Kaleidoscope</span>
            </div>
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
                  <button key={type} onClick={() => setTiling('type', type)} className={`text-[10px] py-1 px-2 rounded capitalize transition-colors flex-1 ${tiling.type === type ? 'bg-cyan-700 text-white' : 'bg-neutral-800 text-neutral-500'}`}>{labels[type]}</button>
                )
              })}
            </div>
            {tiling.type !== 'none' && (
              <ControlGroup label="Grid Scale" value={tiling.scale} min={0.1} max={2.0} step={0.01} onChange={(v) => setTiling('scale', v)} />
            )}
          </div>
        </Section>

        {/* 4. Effects Rack */}
        <Section
          title="Effects Rack"
          icon={<Waves size={14} />}
          tooltip="Post-Processing. Apply Distortion (Tunnel/Vortex) and Liquefy (Fluid simulation). Use Alchemy tools to invert colors, detect edges (Neon), solarize, or RGB shift."
        >
          <div className="mb-2">
            <span className="text-[10px] uppercase font-bold text-neutral-600 mb-1 block">Distortion</span>
            <div className="flex gap-1 mb-2">
              {[{ id: 'none', label: 'None' }, { id: 'polar', label: 'Tunnel' }, { id: 'log-polar', label: 'Vortex' }].map((opt) => (
                <button key={opt.id} onClick={() => setWarp('type', opt.id)} className={`text-[10px] py-1 px-2 rounded capitalize flex-1 ${warp.type === opt.id ? 'bg-purple-600 text-white' : 'bg-neutral-800 text-neutral-500'}`}>{opt.label}</button>
              ))}
            </div>
          </div>
          <ControlGroup
            label="Liquefy Amp"
            value={Math.round(Math.sqrt(displacement.amp / 200) * 100)} // Inverse map for display
            min={0}
            max={100}
            onChange={(v) => {
              // Quadratic curve: 0-100 input -> 0-200 output
              // Low values give very small amp. High values ramp up.
              const curved = (v / 100) * (v / 100) * 200;
              setDisplacement('amp', curved);
            }}
          />
          <ControlGroup
            label="Liquefy Freq"
            value={Math.round(Math.sqrt(displacement.freq / 100) * 100)}
            min={0}
            max={100}
            onChange={(v) => {
              // Quadratic curve: 0-100 input -> 0-100 output
              const curved = (v / 100) * (v / 100) * 100;
              setDisplacement('freq', curved);
            }}
          />

          <div className="border-t border-neutral-800 my-2 pt-2">
            <span className="text-[10px] uppercase font-bold text-neutral-500 mb-2 block flex items-center gap-1"><Zap size={10} /> Alchemy</span>
            <ControlGroup label="Invert" value={effects.invert} min={0} max={100} onChange={(v) => setEffects('invert', v)} />
            <ControlGroup label="Neon Edge" value={effects.edgeDetect} min={0} max={100} onChange={(v) => setEffects('edgeDetect', v)} />
            <ControlGroup label="Solarize" value={effects.solarize} min={0} max={100} onChange={(v) => setEffects('solarize', v)} />
            <ControlGroup label="RGB Shift" value={effects.shift} min={0} max={100} onChange={(v) => setEffects('shift', v)} />
            <div className="mt-2">
              <ControlGroup label={`Posterize (Levels: ${color.posterize < 256 ? color.posterize : 'Off'})`} value={color.posterize} min={2} max={256} onChange={(v) => setColor('posterize', v)} />
            </div>
          </div>
        </Section>

        {/* 5. Visualizer */}
        <Section
          title="Visualizer"
          icon={<FolderOpen size={14} />}
          tooltip="Animation Engine. Flux enables automatic time-based animation. Use Snapshots to save states and morph between them in a loop based on your timing settings."
        >
          <div className="flex gap-2 mb-3">
            <button
              onClick={addSnapshot}
              className="bg-cyan-900/50 hover:bg-cyan-800 text-cyan-200 border border-cyan-700/50 py-2 px-3 rounded text-xs flex-1 flex items-center justify-center gap-2"
            >
              <Camera size={14} /> Snapshot
            </button>
            <button
              onClick={() => store.setFlux('enabled', !store.flux.enabled)}
              className={`py-2 px-3 rounded text-xs flex-1 flex items-center justify-center gap-2 border ${store.flux.enabled
                ? 'bg-purple-900/50 text-purple-200 border-purple-700/50 hover:bg-purple-800'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700'
                }`}
            >
              <Activity size={14} /> Flux
            </button>
            <button
              onClick={() => setAnimation('isPlaying', !animation.isPlaying)}
              className={`py-2 px-3 rounded text-xs flex-1 flex items-center justify-center gap-2 border ${animation.isPlaying
                ? 'bg-red-900/50 text-red-200 border-red-700/50 hover:bg-red-800'
                : 'bg-green-900/50 text-green-200 border-green-700/50 hover:bg-green-800'
                }`}
            >
              {animation.isPlaying ? <Pause size={14} /> : <Play size={14} />}
              {animation.isPlaying ? 'Stop' : 'Play'}
            </button>
          </div>

          {snapshots.length > 0 && (
            <div className="mb-3 space-y-1 max-h-32 overflow-y-auto custom-scrollbar bg-black/20 rounded p-1">
              {snapshots.map((snap, idx) => (
                <div key={snap.id} className="flex items-center justify-between bg-neutral-900/80 p-2 rounded text-xs group hover:bg-neutral-800 transition-colors cursor-pointer border border-transparent hover:border-neutral-600">
                  <span onClick={() => loadSnapshot(snap)} className="truncate w-full hover:text-cyan-400">Snapshot {idx + 1}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteSnapshot(idx) }} className="text-neutral-600 hover:text-red-400 pl-2"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-neutral-800/50 p-2 rounded-lg">
            <ControlGroup label="Morph Speed (ms)" value={animation.duration} min={500} max={10000} step={100} onChange={(v) => setAnimation('duration', v)} />
            <ControlGroup label="Hold Time (ms)" value={animation.holdTime || 0} min={0} max={5000} step={100} onChange={(v) => setAnimation('holdTime', v)} />

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-neutral-400">Easing</span>
                <select value={animation.easing || 'linear'} onChange={(e) => setAnimation('easing', e.target.value)} className="bg-neutral-900 border border-neutral-700 text-xs rounded p-1 text-neutral-300 outline-none">
                  <option value="linear">Linear</option>
                  <option value="easeInOut">Smooth</option>
                  <option value="elastic">Elastic</option>
                  <option value="bounce">Bounce</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-neutral-400">Loop Mode</span>
                <select value={animation.mode} onChange={(e) => setAnimation('mode', e.target.value)} className="bg-neutral-900 border border-neutral-700 text-xs rounded p-1 text-neutral-300 outline-none">
                  <option value="loop">Loop</option>
                  <option value="pingpong">Ping Pong</option>
                </select>
              </div>
            </div>
          </div>
        </Section>

        {/* 6. Project & Export */}
        <Section
          title="Project & Export"
          icon={<FolderOpen size={14} />}
          tooltip="File Management. Save your current setup to a JSON file or Load a previous one. Export high-res PNGs for printing or sharing."
        >
          <div className="flex gap-2 mb-2">
            <button onClick={handleSaveProject} className="flex-1 bg-neutral-800 hover:bg-neutral-700 py-2 rounded text-xs flex items-center justify-center gap-2 text-neutral-300"><Save size={12} /> Save</button>
            <label className="flex-1 bg-neutral-800 hover:bg-neutral-700 py-2 rounded text-xs flex items-center justify-center gap-2 cursor-pointer text-neutral-300"><FolderOpen size={12} /> Load <input type="file" accept=".json" onChange={handleLoadProject} className="hidden" /></label>
          </div>
          <button onClick={handleExportPrint} className="w-full bg-neutral-100 hover:bg-white text-black py-2 rounded text-xs flex items-center justify-center gap-2 font-bold shadow-lg shadow-white/10"><Download size={14} /> Export 4K Image</button>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, icon, children, defaultOpen = false, tooltip }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className="border border-neutral-700 rounded-lg bg-neutral-800/50 relative"> {/* Removed overflow-hidden */}
      <div className={`flex items-center justify-between p-3 bg-neutral-900/30 transition-all ${isOpen ? 'rounded-t-lg' : 'rounded-lg'}`}>
        <button onClick={() => setIsOpen(!isOpen)} className="flex-1 flex items-center gap-2 text-xs font-bold text-neutral-300 hover:text-white transition-colors text-left">
          {icon} <span>{title}</span>
        </button>
        <div className="flex items-center gap-2">
          {tooltip && (
            <div className="group relative flex items-center">
              <HelpCircle size={12} className="text-neutral-600 hover:text-neutral-400 cursor-help" />
              {/* Tooltip: Increased z-index, width, and removed pointer-events-none conditionally if needed, but keeping it simple */}
              <div className="absolute right-0 top-6 w-64 p-3 bg-neutral-950 border border-neutral-700 rounded-lg text-xs leading-relaxed text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] shadow-2xl backdrop-blur-md">
                {tooltip}
                <div className="absolute top-0 right-1.5 -translate-y-1/2 w-2 h-2 bg-neutral-950 border-t border-l border-neutral-700 rotate-45"></div>
              </div>
            </div>
          )}
          <button onClick={() => setIsOpen(!isOpen)} className="text-neutral-500 hover:text-white transition-colors">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="p-3 pt-0 border-t border-neutral-700/50 bg-black/20 rounded-b-lg">
          <div className="pt-3 space-y-3">{children}</div>
        </div>
      )}
    </div>
  )
}
