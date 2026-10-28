import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'

const TOAST_MS = 1800

// One short message at a time, bottom-center over the canvas. Feedback for
// actions whose result isn't obvious on screen (shortcuts, saves, resets).
export function Toasts() {
  const toast = useStore((state) => state.toast)
  const [expiredId, setExpiredId] = useState(null)

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setExpiredId(toast.id), TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [toast])

  const visible = toast && toast.id !== expiredId ? toast : null
  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      <div
        key={visible.id}
        role="status"
        className="lumen-toast rounded-full border border-white/15 bg-neutral-950/85 px-4 py-2 text-xs font-medium tracking-wide text-white shadow-lg backdrop-blur"
      >
        {visible.message}
      </div>
    </div>
  )
}
