import { useEffect, useRef } from 'react'
import { X, Wand2, Sparkles, Radio, Projector } from 'lucide-react'
import { useStore } from '../store/useStore'

const KEYS = [
  ['H', 'Hide / show the panel'],
  ['F', 'Fullscreen'],
  ['B', 'Blackout the output'],
  ['S', 'Save the current look'],
  ['R', 'Start / stop recording'],
  ['P', 'Show the alignment grid'],
  ['Shift+P', 'Change the grid style'],
  ['Ctrl+Z', 'Undo (Ctrl+Shift+Z redoes)'],
  ['?', 'Open this help'],
]

export function HelpModal() {
  const helpOpen = useStore((state) => state.ui.helpOpen)
  const toggleHelp = useStore((state) => state.toggleHelp)
  const primaryRef = useRef(null)

  useEffect(() => {
    if (!helpOpen) return undefined
    primaryRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        toggleHelp(false)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [helpOpen, toggleHelp])

  if (!helpOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(event) => { if (event.target === event.currentTarget) toggleHelp(false) }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        className="bg-neutral-900 border border-neutral-700 w-full max-w-2xl max-h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-start">
          <div>
            <h2 id="help-title" className="text-xl font-bold text-white">Welcome to Lumen Lab</h2>
            <p className="text-neutral-400 text-sm mt-0.5">Mirror, bend and colour live visuals. It only takes four steps.</p>
          </div>
          <button
            onClick={() => toggleHelp(false)}
            aria-label="Close help"
            className="p-1.5 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 custom-scrollbar">
          <Step n={1} icon={<Wand2 size={16} />} title="Pick a pattern">
            Choose <b>Spiral</b>, <b>Cells</b>, <b>Grid</b>, <b>Lava</b> or <b>Plasma</b> at the top of the panel,
            or use <b>Image</b> to start from your own picture or clip. Not sure? Hit <b>Surprise Me</b>.
          </Step>
          <Step n={2} icon={<Sparkles size={16} />} title="Shape it">
            <b>Mirror</b> folds the picture into a kaleidoscope (6 slices is a snowflake, 12 or more is a mandala).
            <b> Wobble</b> and <b>Bend</b> warp space. <b>Color Shift</b>, <b>Fewer Colors</b> and <b>Flip Colors</b> repaint it,
            and <b>Glow</b>, <b>Color Split</b> and <b>Film Grain</b> add polish.
            Hover anything to see what it does, and double-click a slider to reset it.
          </Step>
          <Step n={3} icon={<Radio size={16} />} title="Perform">
            Turn on <b>Wander</b> in Motion so the look evolves by itself, or <b>React to Music</b> in Effects to pulse with your mic.
            Save looks you love with <b>S</b> and find them in Presets.
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-3">
              {KEYS.map(([key, what]) => (
                <div key={key} className="flex items-center gap-2 text-xs text-neutral-300">
                  <kbd className="min-w-[56px] text-center px-1.5 py-0.5 rounded border border-neutral-600 bg-neutral-800 text-cyan-300 font-mono text-[11px]">{key}</kbd>
                  <span>{what}</span>
                </div>
              ))}
            </div>
          </Step>
          <Step n={4} icon={<Projector size={16} />} title="Project">
            Open the <b>Output</b> section to send the picture to a projector or second screen, line it up with the
            alignment grid, and fit it to your surfaces. <b>Export PNG</b> in Presets saves a 4K still.
          </Step>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 text-center">
          <button
            ref={primaryRef}
            onClick={() => toggleHelp(false)}
            className="bg-cyan-400 hover:bg-cyan-300 text-neutral-900 px-8 py-2 rounded-full font-bold text-sm transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Let's create
          </button>
        </div>
      </div>
    </div>
  )
}

function Step({ n, icon, title, children }) {
  return (
    <section className="bg-neutral-800/40 p-4 rounded-xl border border-neutral-800">
      <h3 className="font-bold text-white mb-1.5 flex items-center gap-2 text-sm">
        <span className="w-5 h-5 rounded-full bg-cyan-400 text-neutral-900 text-[11px] flex items-center justify-center font-bold">{n}</span>
        <span className="text-cyan-400">{icon}</span>
        {title}
      </h3>
      <div className="text-[13px] text-neutral-300 leading-relaxed">{children}</div>
    </section>
  )
}
