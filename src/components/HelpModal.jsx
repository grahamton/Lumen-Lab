import { useStore } from '../store/useStore'
import { X, MousePointer, Layers, Activity, Zap, Play, Image as ImageIcon, Box, Monitor, Gamepad as GamepadIcon } from 'lucide-react'

export function HelpModal() {
  const { ui, toggleHelp } = useStore()

  if (!ui.helpOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-700 w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="text-cyan-400 fill-cyan-400/20" /> Lumen Lab
            </h2>
            <p className="text-neutral-400 text-sm mt-1">Real-time Visual Synthesizer</p>
          </div>
          <button
            onClick={() => toggleHelp(false)}
            className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

          {/* Section 1: Concept */}
          <section>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Activity size={18} className="text-purple-400" /> 1. The Source
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Card title="Image Input" icon={<ImageIcon size={16} />}>
                Upload any image to start. High-contrast or colorful images work best. Use <strong>Load Demo</strong> for a quick start.
              </Card>
              <Card title="Math Generators" icon={<Zap size={16} />}>
                Create procedural patterns from scratch:
                <ul className="list-disc list-inside mt-2 text-neutral-400">
                  <li><strong>Fibonacci:</strong> Spiral phyllotaxis patterns. Control density/zoom.</li>
                  <li><strong>Voronoi:</strong> Cellular organic noise. Control cell count/size.</li>
                  <li><strong>Grid:</strong> Geometric lines. Control spacing/thickness.</li>
                </ul>
              </Card>
            </div>
          </section>

          {/* Section 2: Projection & Export */}
          <section>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Monitor size={18} className="text-blue-400" /> 2. Projection & Export
            </h3>
            <div className="bg-blue-900/30 border border-blue-800 p-3 rounded-lg mb-3">
              <strong className="text-blue-200 block text-xs uppercase tracking-wider mb-1">Pro Tip: Projector Mode</strong>
              <p className="text-sm text-neutral-300">
                Press <strong className="text-white">F11</strong> to go Fullscreen. Lumen Lab is designed for live visuals—connect a projector, set your Canvas to <strong>16:9</strong>, and perform live!
              </p>
            </div>
            <ul className="list-disc list-inside text-sm text-neutral-300 space-y-1 ml-1">
              <li><strong className="text-white">Virtual Canvas:</strong> Set aspect ratio to 16:9 for standard projectors.</li>
              <li><strong className="text-white">4K Export:</strong> Downloads high-res PNG for printing.</li>
            </ul>
          </section>

          {/* Section 3: Geometry & Canvas */}
          <section>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Box size={18} className="text-cyan-400" /> 3. Space & Shape
            </h3>
            <div className="bg-neutral-800/30 p-4 rounded-xl border border-neutral-800 space-y-4">
              <div>
                <strong className="text-white block mb-1">Canvas & Portal Mode</strong>
                <p className="text-sm text-neutral-400">
                  Set your aspect ratio (16:9, 1:1, etc.). Enable <strong>Portal Mode (Circle)</strong> to instantly mask your output into a perfect circle—great for logos or focused visuals.
                </p>
              </div>
              <div>
                <strong className="text-white block mb-1">Geometry</strong>
                <p className="text-sm text-neutral-400">
                  <strong>Scale</strong> and <strong>Rotate</strong> the canvas. Use <strong>Kaleidoscope</strong> (Symmetry) to mirror pixels into mandalas, or <strong>Tiling</strong> (Grid, Spin, Mirror) for infinite repeating patterns.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Effects Rack */}
          <section>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Layers size={18} className="text-pink-400" /> 3. The Effects Rack
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Card title="Distortion & Liquefy" icon={<Activity size={16} />}>
                Bend space with <strong>Tunnel</strong> (Polar) or <strong>Vortex</strong> (Log-Polar). Use <strong>Liquefy</strong> sliders to add fluid-like waviness (Amp/Freq).
              </Card>
              <Card title="Alchemy" icon={<Zap size={16} />}>
                Post-processing color effects:
                <ul className="list-disc list-inside mt-2 text-neutral-400">
                  <li><strong>Invert/Neon:</strong> Create dark mode or glowing edges.</li>
                  <li><strong>Solarize:</strong> Trippy luminance inversion.</li>
                  <li><strong>RGB Shift:</strong> Chromatic aberration.</li>
                  <li><strong>Posterize:</strong> Reduce color bands for a retro look.</li>
                </ul>
              </Card>
            </div>
          </section>

          {/* Section 4: MIDI Control */}
          <section>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Zap size={18} className="text-yellow-400" /> 4. MIDI Control
            </h3>
            <div className="bg-neutral-800/30 p-4 rounded-xl border border-neutral-800 space-y-3">
              <p className="text-sm text-neutral-300">
                Connect any MIDI controller and map knobs, faders, or buttons to almost any parameter in Lumen Lab.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-900/50 p-2 rounded border border-neutral-700">
                  <strong className="text-cyan-400 block text-xs uppercase mb-1">Learn Mode</strong>
                  <p className="text-xs text-neutral-400">
                    Open <strong>Settings</strong> → <strong>MIDI Control</strong> and toggle <strong>Learn Mode</strong>. Click any slider, then move a knob on your controller to map it instantly.
                  </p>
                </div>
                <div className="bg-neutral-900/50 p-2 rounded border border-neutral-700">
                  <strong className="text-green-400 block text-xs uppercase mb-1">Live Performance</strong>
                  <p className="text-xs text-neutral-400">
                    Mappings are saved automatically. Use MIDI to control effects intensity, generator speed, or switch presets without touching the mouse.
                  </p>
                </div>
              </div>
            </div>
            {/* Gamepad & Hotkeys Info */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="bg-neutral-800/30 p-4 rounded-xl border border-neutral-800 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase tracking-wider">
                  <GamepadIcon size={16} /> Gamepad
                </div>
                <p className="text-xs text-neutral-400">
                  <strong>L-Stick:</strong> Pan • <strong>R-Stick:</strong> Zoom<br />
                  <strong>Triggers:</strong> Distort • <strong>Buttons:</strong> A/B/X/Y
                </p>
              </div>
              <div className="bg-neutral-800/30 p-4 rounded-xl border border-neutral-800 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-neutral-300 font-bold text-sm uppercase tracking-wider">
                  <Monitor size={16} /> Keyboard
                </div>
                <p className="text-xs text-neutral-400">
                  <strong>TAB:</strong> Hide UI • <strong>F:</strong> Fullscreen<br />
                  <strong>S:</strong> Snapshot • <strong>R:</strong> Record
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Time & Motion */}
          <section>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              {/* <Play size={18} className="text-green-400" /> */} 5. Flux & Visualizer
            </h3>
            <div className="bg-neutral-800/30 p-4 rounded-xl border border-neutral-800">
              <p className="text-sm text-neutral-300 mb-2">
                <strong>Flux</strong> is the heartbeat of Lumen Lab. Toggle it ON to enable auto-animation for Math Generators, Liquefy ripples, and Phase shifts.
              </p>
              <p className="text-sm text-neutral-400">
                Use the <strong>Visualizer</strong> to take <strong className="text-white">Snapshots</strong> of your settings. The app will morph between them in a loop based on your timing settings (Duration, Hold, Mode).
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 text-center">
          <button
            onClick={() => toggleHelp(false)}
            className="bg-neutral-100 hover:bg-white text-black px-8 py-2 rounded-full font-bold text-sm transition-transform hover:scale-105"
          >
            Got it, let's create!
          </button>
        </div>
      </div>
    </div>
  )
}

function Card({ title, icon, children }) {
  return (
    <div className="bg-neutral-800/40 p-4 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
      <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm">{icon} {title}</h4>
      <div className="text-xs text-neutral-400 leading-relaxed">
        {children}
      </div>
    </div>
  )
}
