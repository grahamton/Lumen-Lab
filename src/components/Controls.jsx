import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { Upload, RefreshCw, Hexagon, Waves, Zap, EyeOff, Infinity, Grid, Palette, Activity, Dices, Camera, Play, Pause, Trash2, Save, ChevronDown, ChevronRight, Move } from 'lucide-react'

export function Controls() {
  const { transforms, setTransform, resetTransforms, setImage, symmetry, setSymmetry, warp, setWarp, displacement, setDisplacement, masking, setMasking, feedback, setFeedback, recording, setRecording, tiling, setTiling, color, setColor, effects, setEffects, snapshots, addSnapshot, deleteSnapshot, loadSnapshot, animation, setAnimation, randomize } = useStore()

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => setImage(img)
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="fixed top-4 right-4 w-80 bg-neutral-800/90 backdrop-blur-md p-4 rounded-xl border border-neutral-700 shadow-2xl text-sm font-sans select-none z-50 max-h-[90vh] overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-neutral-200">Controls</h2>
        <div className="flex gap-2">
          {/* Image Upload Button (Small) */}
          <label className="p-1 hover:bg-neutral-700 rounded-md transition-colors text-neutral-400 hover:text-white cursor-pointer" title="Upload Image">
            <Upload size={14} />
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>

          <div className="w-[1px] h-4 bg-neutral-700 mx-1 self-center"></div>

          <button onClick={randomize} className="p-1 hover:bg-neutral-700 rounded-md transition-colors text-purple-400 hover:text-purple-300" title="Randomize (Chaos Button)">
            <Dices size={18} />
          </button>
          <button onClick={resetTransforms} className="p-1 hover:bg-neutral-700 rounded-md transition-colors text-neutral-400 hover:text-white" title="Reset">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-1">

        {/* Section 1: Affine Transforms */}
        <Section title="Affine Transforms" icon={<Move size={14} />} defaultOpen={true}>
          <ControlGroup label="Translation X" value={transforms.x} min={-500} max={500} onChange={(v) => setTransform('x', v)} tooltip="Move the image horizontally." />
          <ControlGroup label="Translation Y" value={transforms.y} min={-500} max={500} onChange={(v) => setTransform('y', v)} tooltip="Move the image vertically." />
          <ControlGroup label="Scale" value={transforms.scale} min={0.1} max={3} step={0.01} onChange={(v) => setTransform('scale', v)} tooltip="Zoom in or out." />
          <ControlGroup label="Rotation" value={Math.round(transforms.rotation * (180 / Math.PI))} min={0} max={360} onChange={(v) => setTransform('rotation', v * (Math.PI / 180))} tooltip="Rotate the image (0-360 degrees)." />
        </Section>

        {/* Section 2: Mandala (Symmetry) */}
        <Section title="Mandala" icon={<Hexagon size={14} />}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-400">Enable</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={symmetry.enabled} onChange={(e) => setSymmetry('enabled', e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-neutral-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
            </label>
          </div>
          {symmetry.enabled && (
            <ControlGroup label="Points" value={symmetry.slices} min={2} max={32} step={2} onChange={(v) => setSymmetry('slices', v)} tooltip="Number of kaleidoscope wedges." />
          )}
        </Section>

        {/* Section 3: Pattern (Tiling) */}
        <Section title="Pattern" icon={<Grid size={14} />}>
          <div className="flex gap-1 mb-2">
            {['none', 'p1', 'p2', 'p4m'].map((type) => {
              const labels = { 'none': 'Off', 'p1': 'Grid', 'p2': 'Spin', 'p4m': 'Mirror' }
              return (
                <button
                  key={type}
                  onClick={() => setTiling('type', type)}
                  className={`text-xs px-2 py-1 rounded capitalize transition-colors flex-1 ${tiling.type === type
                    ? 'bg-cyan-600 text-white'
                    : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                    }`}
                >
                  {labels[type]}
                </button>
              )
            })}
          </div>
          {tiling.type !== 'none' && (
            <>
              <ControlGroup label="Tile Scale" value={tiling.scale} min={0.1} max={2.0} step={0.01} onChange={(v) => setTiling('scale', v)} tooltip="Size of the repeating pattern." />
              <ControlGroup label="Overlap" value={tiling.overlap} min={0} max={0.5} step={0.01} onChange={(v) => setTiling('overlap', v)} tooltip="Draw tiles larger than the grid to overlap them." />
            </>
          )}
        </Section>

        {/* Section 4: Distortion */}
        <Section title="Distortion" icon={<Waves size={14} />}>
          <div className="flex gap-2 mb-4">
            {['none', 'polar', 'log-polar'].map((type) => (
              <button
                key={type}
                onClick={() => setWarp('type', type)}
                className={`text-xs px-2 py-1 rounded capitalize transition-colors flex-1 ${warp.type === type
                  ? 'bg-cyan-600 text-white'
                  : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                  }`}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="border-t border-neutral-700 pt-3">
            <h4 className="text-xs font-bold text-neutral-500 mb-2 uppercase">Displacement</h4>
            <ControlGroup label="Flow Strength" value={displacement.amp} min={0} max={100} onChange={(v) => setDisplacement('amp', v)} tooltip="Amount of liquid distortion." />
            <ControlGroup label="Frequency" value={displacement.freq} min={1} max={50} onChange={(v) => setDisplacement('freq', v)} tooltip="Density of the ripples." />
          </div>
        </Section>

        {/* Section 5: Masks & Edges */}
        <Section title="Masks & Edges" icon={<EyeOff size={14} />}>
          <ControlGroup label="Edge Softness" value={masking.feather} min={0} max={0.5} step={0.01} onChange={(v) => setMasking('feather', v)} tooltip="Softness of the image/tile edges." />
          <ControlGroup label="Video Echo" value={feedback.amount} min={0} max={99} onChange={(v) => setFeedback('amount', v)} tooltip="Trails (Feedback)." />

          <div className="border-t border-neutral-700 pt-3 mt-3">
            <ControlGroup label="Center Radius" value={masking.centerRadius} min={0} max={100} onChange={(v) => setMasking('centerRadius', v)} tooltip="Freeze center (Radius %)." />
            <ControlGroup label="Luma Key" value={masking.lumaThreshold} min={0} max={100} onChange={(v) => setMasking('lumaThreshold', v)} tooltip="Freeze based on brightness." />
            <label className="flex items-center gap-2 text-xs text-neutral-400 mt-2 cursor-pointer hover:text-white transition-colors">
              <input type="checkbox" checked={masking.invertLuma} onChange={(e) => setMasking('invertLuma', e.target.checked)} className="rounded bg-neutral-600 border-neutral-500 text-cyan-500 focus:ring-0" />
              <span>Invert Luma Key</span>
            </label>
          </div>
        </Section>

        {/* Section 6: Alchemy */}
        <Section title="Alchemy" icon={<Palette size={14} />}>
          <ControlGroup label="Posterize" value={color.posterize} min={2} max={32} step={1} onChange={(v) => setColor('posterize', v)} tooltip="Reduce color palette." />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-neutral-400 flex items-center gap-2">
              <Activity size={12} /> Neon Edges
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={effects.edgeDetect} onChange={(e) => setEffects('edgeDetect', e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-neutral-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </Section>

        {/* Section 7: Visualizer */}
        <Section title="Visualizer" icon={<Camera size={14} />}>
          <div className="flex gap-2 mb-3">
            <button
              onClick={addSnapshot}
              className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white rounded p-2 text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Save size={14} /> Snapshot
            </button>
            <button
              onClick={() => setAnimation('isPlaying', !animation.isPlaying)}
              className={`flex-1 rounded p-2 text-xs flex items-center justify-center gap-2 transition-colors ${animation.isPlaying ? 'bg-green-600 text-white' : 'bg-neutral-700 hover:bg-neutral-600 text-white'}`}
            >
              {animation.isPlaying ? <Pause size={14} /> : <Play size={14} />}
              {animation.isPlaying ? 'Stop' : 'Play'}
            </button>
          </div>

          {snapshots.length > 0 && (
            <div className="space-y-2 mb-3 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
              {snapshots.map((snap, idx) => (
                <div key={snap.id} className="flex items-center justify-between bg-neutral-900/50 p-2 rounded text-xs group">
                  <span
                    onClick={() => loadSnapshot(snap)}
                    className="cursor-pointer hover:text-cyan-400 transition-colors truncate w-full"
                  >
                    Snapshot {idx + 1}
                  </span>
                  <button onClick={() => deleteSnapshot(idx)} className="text-neutral-500 hover:text-red-400 pl-2">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <ControlGroup label="Morph Speed (ms)" value={animation.duration} min={500} max={10000} step={100} onChange={(v) => setAnimation('duration', v)} tooltip="Time to transition between snapshots." />
          <div className="flex items-center justify-between mt-2 text-xs text-neutral-400">
            <span>Mode</span>
            <div className="flex bg-neutral-700 rounded p-0.5">
              {['loop', 'pingpong'].map(m => (
                <button
                  key={m}
                  onClick={() => setAnimation('mode', m)}
                  className={`px-2 py-0.5 rounded capitalize transition-colors ${animation.mode === m ? 'bg-cyan-600 text-white' : 'hover:text-white'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </Section>

      </div>
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
