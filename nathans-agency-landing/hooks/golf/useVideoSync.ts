'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { clamp, detectFps } from '@/lib/golf/videoUtils'

export function useVideoSync() {
  const videoRef1 = useRef<HTMLVideoElement>(null)
  const videoRef2 = useRef<HTMLVideoElement>(null)
  const rafRef = useRef<number>(0)
  const isPlayingRef = useRef(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRateState] = useState(1)
  const [isMirrored, setIsMirrored] = useState<[boolean, boolean]>([false, false])
  const [abLoop, setAbLoop] = useState<{ a: number | null; b: number | null }>({ a: null, b: null })
  const [fps, setFps] = useState(60)

  const syncLoop = useCallback(() => {
    const v1 = videoRef1.current
    const v2 = videoRef2.current
    if (!v1) return

    const masterTime = v1.currentTime

    if (v2 && Math.abs(v2.currentTime - masterTime) > 0.016) {
      v2.currentTime = masterTime
    }

    // A-B loop
    if (abLoop.a !== null && abLoop.b !== null && masterTime >= abLoop.b) {
      v1.currentTime = abLoop.a
      if (v2) v2.currentTime = abLoop.a
    }

    setCurrentTime(masterTime)
    rafRef.current = requestAnimationFrame(syncLoop)
  }, [abLoop])

  const play = useCallback(() => {
    const v1 = videoRef1.current
    const v2 = videoRef2.current
    if (!v1) return
    v1.play().catch(() => {})
    if (v2) v2.play().catch(() => {})
    isPlayingRef.current = true
    setIsPlaying(true)
    rafRef.current = requestAnimationFrame(syncLoop)
  }, [syncLoop])

  const pause = useCallback(() => {
    videoRef1.current?.pause()
    videoRef2.current?.pause()
    isPlayingRef.current = false
    setIsPlaying(false)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) pause()
    else play()
  }, [play, pause])

  const seek = useCallback((time: number) => {
    const v1 = videoRef1.current
    const v2 = videoRef2.current
    const clamped = clamp(time, 0, duration)
    if (v1) v1.currentTime = clamped
    if (v2) v2.currentTime = clamped
    setCurrentTime(clamped)
  }, [duration])

  // Default to half-frame at min 60fps for micro-step granularity (~8ms).
  // factor=1 → tiny micro-step, factor=2 → exactly one frame, factor=20 → ~10 frame jump.
  const stepFrame = useCallback(
    (direction: 1 | -1, factor: number = 1) => {
      const effectiveFps = Math.max(fps, 60)
      const baseStep = 0.5 / effectiveFps // half-frame at the higher of detected fps or 60
      seek(currentTime + direction * baseStep * factor)
    },
    [fps, currentTime, seek],
  )

  const setPlaybackRate = useCallback((rate: number) => {
    if (videoRef1.current) videoRef1.current.playbackRate = rate
    if (videoRef2.current) videoRef2.current.playbackRate = rate
    setPlaybackRateState(rate)
  }, [])

  const toggleMirror = useCallback((slot: 1 | 2) => {
    setIsMirrored(prev =>
      slot === 1 ? [!prev[0], prev[1]] : [prev[0], !prev[1]]
    )
  }, [])

  const setLoopPoint = useCallback((point: 'a' | 'b') => {
    setAbLoop(prev => ({ ...prev, [point]: currentTime }))
  }, [currentTime])

  const clearLoop = useCallback(() => {
    setAbLoop({ a: null, b: null })
  }, [])

  const onVideoLoaded = useCallback(
    async (slot: 1 | 2) => {
      const video = slot === 1 ? videoRef1.current : videoRef2.current
      if (!video) return
      setDuration(prev => Math.max(prev, video.duration))
      const detectedFps = await detectFps(video)
      setFps(detectedFps)
    },
    []
  )

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return {
    videoRef1,
    videoRef2,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    isMirrored,
    abLoop,
    fps,
    play,
    pause,
    togglePlay,
    seek,
    stepFrame,
    setPlaybackRate,
    toggleMirror,
    setLoopPoint,
    clearLoop,
    onVideoLoaded,
  }
}
