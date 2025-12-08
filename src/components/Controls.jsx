import React from 'react'
import { useStore } from '../store/useStore'
import { Upload, RefreshCw, Hexagon, Waves, Zap, EyeOff, Infinity, Circle, Square, Grid, Palette, Activity } from 'lucide-react'

export function Controls() {
  const { transforms, setTransform, resetTransforms, setImage, symmetry, setSymmetry, warp, setWarp, displacement, setDisplacement, masking, setMasking, feedback, setFeedback, recording, setRecording, tiling, setTiling, color, setColor, effects, setEffects } = useStore()

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
    <div className="fixed top-4 right-4 w-80 bg-neutral-800/90 backdrop-blur-md p-4 rounded-xl border border-neutral-700 shadow-2xl text-sm font-sans select-none z-50 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-neutral-200">Controls</h2>
        <button onClick={resetTransforms} className="p-1 hover:bg-neutral-700 rounded-md transition-colors text-neutral-400 hover:text-white" title="Reset">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Image Upload */}
      <div className="mb-6">
        <label className="flex items-center gap-2 w-full p-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg cursor-pointer transition-colors text-center justify-center text-neutral-200">
          <Upload size={16} />
          <span>Upload Image</span>
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>
      </div>

      <div className="space-y-4">
        {/* Affine Transforms */}
        <div className="pb-4 border-b border-neutral-700 space-y-4">
          <h3 className="font-semibold text-neutral-500 text-xs uppercase tracking-wider">Affine Transforms</h3>
          <ControlGroup label="Translation X" value={transforms.x} min={-500} max={500} onChange={(v) => setTransform('x', v)} tooltip="Move the image horizontally." />
          <ControlGroup label="Translation Y" value={transforms.y} min={-500} max={500} onChange={(v) => setTransform('y', v)} tooltip="Move the image vertically." />
          <ControlGroup label="Scale" value={transforms.scale} min={0.1} max={3} step={0.1} onChange={(v) => setTransform('scale', v)} tooltip="Zoom in or out." />
          <ControlGroup label="Rotation" value={Math.round(transforms.rotation * (180 / Math.PI))} min={0} max={360} onChange={(v) => setTransform('rotation', v * (Math.PI / 180))} tooltip="Rotate the image (0-360 degrees)." />
        </div>

        {/* Symmetry Controls */}
        <div className="pb-4 border-b border-neutral-700 pt-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-neutral-300 flex items-center gap-2">
              <Hexagon size={14} /> Mandala
            </h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={symmetry.enabled} onChange={(e) => setSymmetry('enabled', e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-neutral-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
            </label>
          </div>

          {symmetry.enabled && (
            <ControlGroup label="Points" value={symmetry.slices} min={2} max={32} step={2} onChange={(v) => setSymmetry('slices', v)} tooltip="Number of kaleidoscope wedges. Higher = more complexity." />
          )}
        </div>

        {/* Tiling Controls (Phase 5) */}
        <div className="pb-4 border-b border-neutral-700 pt-2">
          <h3 className="font-bold text-neutral-300 flex items-center gap-2 mb-2">
            <Grid size={14} /> Pattern
          </h3>
          <div className="flex gap-1 mb-2">
            {['none', 'p1', 'p2', 'p4m'].map((type) => {
              const labels = {
                'none': 'Off',
                'p1': 'Grid',
                'p2': 'Spin',
                'p4m': 'Mirror'
              }
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
              <ControlGroup label="Tile Scale" value={tiling.scale} min={0.1} max={2.0} step={0.1} onChange={(v) => setTiling('scale', v)} tooltip="Size of the repeating pattern." />
              <ControlGroup label="Overlap" value={tiling.overlap} min={0} max={1} step={0.05} onChange={(v) => setTiling('overlap', v)} tooltip="Draw tiles larger than the grid to overlap them." />
            </>
          )}
        </div>

        {/* Warp Controls */}
        <div className="pb-4 border-b border-neutral-700 pt-2">
          <h3 className="font-bold text-neutral-300 flex items-center gap-2 mb-2">
            <Waves size={14} /> Warping
          </h3>
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
        </div>

        {/* Displacement Controls */}
        <div className="pb-4 border-b border-neutral-700 pt-2">
          <h3 className="font-bold text-neutral-300 flex items-center gap-2 mb-2">
            <Zap size={14} /> Displacement
          </h3>
          <ControlGroup label="Flow Strength" value={displacement.amp} min={0} max={100} onChange={(v) => setDisplacement('amp', v)} tooltip="Amount of liquid distortion/melting." />
          <ControlGroup label="Frequency" value={displacement.freq} min={1} max={50} onChange={(v) => setDisplacement('freq', v)} tooltip="Density of the ripples." />
        </div>

        {/* Feedback Controls (Phase 4) */}
        <div className="pb-4 border-b border-neutral-700 pt-2">
          <h3 className="font-bold text-neutral-300 flex items-center gap-2 mb-2">
            <Infinity size={14} /> Video Echo
          </h3>
          <ControlGroup label="Feedback" value={feedback.amount} min={0} max={100} onChange={(v) => setFeedback('amount', v)} tooltip="How much of the previous frame remains. High values create trails." />
        </div>

        {/* Masking Controls (Phase 3) */}
        <div className="pt-2">
          <h3 className="font-bold text-neutral-300 flex items-center gap-2 mb-2">
            <EyeOff size={14} /> Masks & Edges
          </h3>
          <ControlGroup label="Edge Softness" value={masking.feather} min={0} max={1} step={0.05} onChange={(v) => setMasking('feather', v)} tooltip="Softness of the image/tile edges." />
          <ControlGroup label="Center Radius" value={masking.centerRadius} min={0} max={100} onChange={(v) => setMasking('centerRadius', v)} tooltip="Freeze the center of the image (Radius %)." />
          <ControlGroup label="Luma Key" value={masking.lumaThreshold} min={0} max={100} onChange={(v) => setMasking('lumaThreshold', v)} tooltip="Freeze dark/light pixels based on brightness." />

          <label className="flex items-center gap-2 text-xs text-neutral-400 mt-2 cursor-pointer hover:text-white transition-colors">
            <input type="checkbox" checked={masking.invertLuma} onChange={(e) => setMasking('invertLuma', e.target.checked)} className="rounded bg-neutral-600 border-neutral-500 text-cyan-500 focus:ring-0" />
            <span>Invert Luma Key</span>
          </label>
        </div>

        {/* Alchemy Controls (Phase 6) */}
        <div className="pt-2 border-t border-neutral-700 mt-2">
          <h3 className="font-bold text-neutral-300 flex items-center gap-2 mb-2">
            <Palette size={14} /> Alchemy
          </h3>
          <ControlGroup label="Posterize" value={color.posterize} min={2} max={32} step={1} onChange={(v) => setColor('posterize', v)} tooltip="Reduce colors for a retro/print look." />

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-neutral-400 flex items-center gap-2">
              <Activity size={12} /> Neon Edges
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={effects.edgeDetect} onChange={(e) => setEffects('edgeDetect', e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-neutral-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>

        {/* Recording Controls (Phase 4) */}
        <div className="pt-4 border-t border-neutral-700">
          <button
            onClick={() => !recording.isActive && setRecording('isActive', true)}
            disabled={recording.isActive}
            className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${recording.isActive
              ? 'bg-neutral-700 text-neutral-400 cursor-wait'
              : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/50'
              }`}
          >
            {recording.isActive ? (
              <>
                <Square size={16} className="animate-pulse" /> Recording... {recording.progress}%
              </>
            ) : (
              <>
                <Circle size={16} fill="currentColor" /> Record 3s Loop
              </>
            )}
          </button>
        </div>
      </div>
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
        <span>{value}</span>
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
