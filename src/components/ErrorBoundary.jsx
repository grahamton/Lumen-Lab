import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50">
          <div className="text-red-500 font-mono text-xs mb-2">Canvas Error</div>
          {this.state.error && (
            <div className="text-red-200 text-[10px] mb-4 max-w-xs text-center break-words opacity-80">
              {String(this.state.error)}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-3 py-2 bg-neutral-800 border border-neutral-700 text-neutral-200 text-[10px] font-bold uppercase rounded hover:border-cyan-600 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => {
                const confirmed = window.confirm('Hard Reset erases all saved presets, scenes, snapshots and MIDI mappings. Continue?')
                if (!confirmed) return
                localStorage.clear()
                window.location.reload()
              }}
              className="px-3 py-2 bg-red-900/30 border border-red-500/50 text-red-500 text-[10px] font-bold uppercase rounded hover:bg-red-900/50 transition-colors"
            >
              Hard Reset
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
