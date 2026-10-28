import { useRef, useEffect, useState } from 'react'
import { useStore } from '../store/useStore'

export function useAudioAnalyzer(enabled, source = 'mic', fileUrl = null) {
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceNodeRef = useRef(null)
  const dataArrayRef = useRef(null)
  const audioElementRef = useRef(null)
  const streamRef = useRef(null)
  const [isReady, setIsReady] = useState(false)

  const teardownAudio = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect()
      sourceNodeRef.current = null
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect()
      analyserRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current = null
    }

    // Stopping the tracks releases the mic (and the OS "in use" indicator).
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    dataArrayRef.current = null
  }

  useEffect(() => {
    if (!enabled) {
      teardownAudio()
      return
    }

    let disposed = false

    const initAudio = async () => {
      setIsReady(false)
      let ctx = null

      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        ctx = new AudioContext()
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512 // 256 bins
        analyser.smoothingTimeConstant = 0.8

        let sourceNode;

        if (source === 'mic') {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          if (disposed) {
            stream.getTracks().forEach((track) => track.stop())
            ctx.close()
            return
          }
          streamRef.current = stream
          sourceNode = ctx.createMediaStreamSource(stream)
        } else if (source === 'file') {
          if (!fileUrl) {
            console.warn("Audio file source selected but no fileUrl provided.")
            ctx.close()
            return
          }
          const audioEl = new Audio(fileUrl)
          audioEl.loop = true
          audioEl.crossOrigin = 'anonymous'
          // Autoplay can be blocked; play best-effort
          audioEl.play().catch(() => {
            console.warn("Audio autoplay blocked; user interaction may be required.")
          })
          sourceNode = ctx.createMediaElementSource(audioEl)
          audioElementRef.current = audioEl
        } else {
          console.warn("Unknown audio source:", source)
          ctx.close()
          return
        }

        if (disposed) {
          ctx.close()
          return
        }

        sourceNode.connect(analyser)
        // A file should be heard as well as analysed. Never route the mic to the
        // speakers: that's a feedback loop.
        if (source === 'file') analyser.connect(ctx.destination)

        // Restored sessions can create the context before any user gesture, which
        // leaves it suspended (silent analyser); resume on the first interaction.
        if (ctx.state === 'suspended') {
          const resume = () => ctx.state === 'suspended' && ctx.resume().catch(() => {})
          window.addEventListener('pointerdown', resume, { once: true })
          window.addEventListener('keydown', resume, { once: true })
        }

        audioContextRef.current = ctx
        analyserRef.current = analyser
        sourceNodeRef.current = sourceNode
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)
        setIsReady(true)

      } catch (err) {
        ctx?.close()
        console.error("Audio Init Error:", err)
        // Turn the toggle back off so the UI matches reality, and say why.
        const store = useStore.getState()
        store.setAudio('enabled', false)
        store.notify(err?.name === 'NotAllowedError'
          ? 'Microphone access was blocked · allow it to react to music'
          : 'Could not start audio input')
      }
    }

    initAudio()

    return () => {
      disposed = true
      teardownAudio()
    }
  }, [enabled, source, fileUrl])

  const getFrequencyData = () => {
    if (!analyserRef.current || !dataArrayRef.current) return { low: 0, mid: 0, high: 0 }

    analyserRef.current.getByteFrequencyData(dataArrayRef.current)

    // Skip full bin iteration when signal is below noise floor.
    // Sample every 16th bin — fast O(n/16) check before the full O(n) pass.
    const NOISE_FLOOR = 5
    const binCount = analyserRef.current.frequencyBinCount
    let hasSignal = false
    for (let i = 0; i < binCount; i += 16) {
      if (dataArrayRef.current[i] > NOISE_FLOOR) { hasSignal = true; break }
    }
    if (!hasSignal) return { low: 0, mid: 0, high: 0 }

    // Simple 3-band Split
    const lowBound = Math.floor(binCount * 0.1) // 0-10%
    const midBound = Math.floor(binCount * 0.4) // 10-40%
    // High is rest

    let lowSum = 0, midSum = 0, highSum = 0

    for (let i = 0; i < binCount; i++) {
      const val = dataArrayRef.current[i]
      if (i < lowBound) lowSum += val
      else if (i < midBound) midSum += val
      else highSum += val
    }

    // Normalize (0-255 approx average)
    const low = lowSum / lowBound
    const mid = midSum / (midBound - lowBound)
    const high = highSum / (binCount - midBound)

    return { low, mid, high }
  }

  return { isReady: enabled && isReady, getFrequencyData }
}
