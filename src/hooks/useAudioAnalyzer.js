import { useRef, useEffect, useState } from 'react'

export function useAudioAnalyzer(enabled, source = 'mic') {
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceNodeRef = useRef(null)
  const dataArrayRef = useRef(null)
  // We use a ref for the bands to avoid re-renders, components can poll this or we can return it.
  const bandsRef = useRef({ low: 0, mid: 0, high: 0 })
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!enabled) {
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
        setIsReady(false)
      }
      return
    }

    const initAudio = async () => {
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
        } else {
          // File logic would go here, separate handling usually.
          // For now, let's just support MIC.
          console.warn("File source not fully implemented in hook yet.")
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
      if (sourceNodeRef.current) sourceNodeRef.current.disconnect()
      if (analyserRef.current) analyserRef.current.disconnect()
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }, [enabled, source])

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

  return { isReady, getFrequencyData }
}
