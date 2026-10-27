import { useEffect, useRef, useState } from 'react'
import { subscribeCanvasFrames } from '../utils/canvasFrameBus'

export function useVideoRecorder(gl) {
  const mediaRecorderRef = useRef(null)
  const unsubscribeFramesRef = useRef(null)
  const chunksRef = useRef([])
  const [isRecording, setIsRecording] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [duration, setDuration] = useState(0)

  // Timer logic
  useEffect(() => {
    let interval
    if (isRecording) {
      interval = setInterval(() => {
        setDuration(Date.now() - startTime)
      }, 100)
    }
    return () => clearInterval(interval)
  }, [isRecording, startTime])

  // Stop copying frames if the canvas unmounts mid-recording.
  useEffect(() => () => unsubscribeFramesRef.current?.(), [])

  const startRecording = () => {
    if (!gl || !gl.domElement) return

    // Record a 2D mirror fed from the render loop: captureStream() on a WebGPU
    // canvas isn't reliable, and its pixels are only readable in the frame's task.
    const source = gl.domElement
    const mirror = document.createElement('canvas')
    mirror.width = source.width
    mirror.height = source.height
    const mirrorContext = mirror.getContext('2d')
    unsubscribeFramesRef.current = subscribeCanvasFrames(source, () => {
      if (mirror.width !== source.width || mirror.height !== source.height) {
        mirror.width = source.width
        mirror.height = source.height
      }
      // Clear first: drawing over the last frame would leave ghosts wherever the
      // source is transparent (circle crop, media moved off its old bounds).
      mirrorContext.clearRect(0, 0, mirror.width, mirror.height)
      mirrorContext.drawImage(source, 0, 0)
    })

    const stream = mirror.captureStream(60) // 60 FPS
    const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      .find((type) => MediaRecorder.isTypeSupported(type))
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `LumenLab_Rec_${Date.now()}.webm`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      chunksRef.current = [] // Reset chunks
      stream.getTracks().forEach((track) => track.stop())
      unsubscribeFramesRef.current?.()
      unsubscribeFramesRef.current = null
    }

    recorder.start()
    mediaRecorderRef.current = recorder
    setIsRecording(true)
    setStartTime(Date.now())
    setDuration(0)
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  return { isRecording, duration, startRecording, stopRecording }
}
