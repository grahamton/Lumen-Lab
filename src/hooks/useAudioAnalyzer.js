import { useRef, useEffect, useState } from 'react'

export function useAudioAnalyzer(enabled, source = 'mic', fileUrl = null) {
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceNodeRef = useRef(null)
  const dataArrayRef = useRef(null)
  const audioElementRef = useRef(null)
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

      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        const ctx = new AudioContext()
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512 // 256 bins
        analyser.smoothingTimeConstant = 0.8

        let sourceNode;

        if (source === 'mic') {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          sourceNode = ctx.createMediaStreamSource(stream)
        } else if (source === 'file') {
          if (!fileUrl) {
            console.warn("Audio file source selected but no fileUrl provided.")
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
          return
        }

        if (disposed) {
          ctx.close()
          return
        }

        sourceNode.connect(analyser)
        // Note: Do NOT connect to destination (speakers) for Mic, or feedback loop!

        audioContextRef.current = ctx
        analyserRef.current = analyser
        sourceNodeRef.current = sourceNode
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)
        setIsReady(true)

      } catch (err) {
        console.error("Audio Init Error:", err)
        alert("Failed to initialize audio. Check permissions?")
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

    // Simple 3-band Split
    const binCount = analyserRef.current.frequencyBinCount
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
