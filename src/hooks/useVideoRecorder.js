/* eslint-disable react-hooks/immutability */
import { useEffect, useRef, useState } from 'react'

export function useVideoRecorder(gl) {
  const mediaRecorderRef = useRef(null)
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

  const startRecording = () => {
    if (!gl || !gl.domElement) return

    const stream = gl.domElement.captureStream(60) // 60 FPS
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9' // High quality format
    })

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
      URL.revokeObjectURL(url)
      chunksRef.current = [] // Reset chunks
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
