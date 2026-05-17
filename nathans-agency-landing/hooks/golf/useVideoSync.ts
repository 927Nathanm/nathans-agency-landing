'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { clamp, detectFps } from '@/lib/golf/videoUtils'

export type SyncMode = 'sync' | 'independent'

export function useVideoSync() {
  const videoRef1 = useRef<HTMLVideoElement>(null)
  const videoRef2 = useRef<HTMLVideoElement>(null)
  const rafRef = useRef<number>(0)
  const raf2Ref = useRef<number>(0)
  const isPlayingRef = useRef(false)
  const isPlaying2Ref = useRef(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isPlaying2, setIsPlaying2] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [currentTime2, setCurrentTime2] = useState(0)
  const [duration, setDuration] = useState(0)
  const [duration2, setDuration2] = useState(0)
  const [playbackRate, setPlaybackRateState] = useState(1)
  const [isMirrored, setIsMirrored] = useState<[boolean, boolean]>([false, false])
  const [abLoop, setAbLoop] = useState<{ a: number | null; b: number | null }>({ a: null, b: null })
  const [fps, setFps] = useState(60)
  const [syncMode, setSyncMode] = useState<SyncMode>('sync')

  // Refs that the RAF loops read — kept current so callbacks don't need recreating
  const syncModeRef = useRef<SyncMode>('sync')
  const abLoopRef = useRef(abLoop)
  const duration1Ref = useRef(0)
  const duration2Ref = useRef(0)

  useEffect(() => { syncModeRef.current = syncMode }, [syncMode])
  useEffect(() => { abLoopRef.current = abLoop }, [abLoop])
  useEffect(() => { duration1Ref.current = duration }, [duration])
  useEffect(() => { duration2Ref.current = duration2 }, [duration2])

  // Mutable function refs so RAF callbacks always call the latest version
  const syncLoopFnRef = useRef<() => void>(() => {})
  const syncLoop2FnRef = useRef<() => void>(() => {})

  // Update syncLoop function every render so it closes over latest state
  // The running RAF calls syncLoopFnRef.current so it always picks up fresh logic
  useEffect(() => {
    syncLoopFnRef.current = () => {
      const v1 = videoRef1.current
      if (!v1) return
      const masterTime = v1.currentTime
      const v2 = videoRef2.current
      const mode = syncModeRef.current
      const loop = abLoopRef.current

      if (mode === 'sync' && v2) {
        // Keep V2 aligned with V1
        if (Math.abs(v2.currentTime - masterTime) > 0.016) {
          v2.currentTime = masterTime
        }
        // A-B loop
        if (loop.a !== null && loop.b !== null && masterTime >= loop.b) {
          v1.currentTime = loop.a
          v2.currentTime = loop.a
        }
        setCurrentTime2(v1.currentTime)
      }

      setCurrentTime(v1.currentTime)
      rafRef.current = requestAnimationFrame(syncLoopFnRef.current)
    }
  })

  useEffect(() => {
    syncLoop2FnRef.current = () => {
      const v2 = videoRef2.current
      if (!v2) return
      setCurrentTime2(v2.currentTime)
      raf2Ref.current = requestAnimationFrame(syncLoop2FnRef.current)
    }
  })

  const play = useCallback(() => {
    const v1 = videoRef1.current
    const v2 = videoRef2.current
    if (!v1) return
    v1.play().catch(() => {})
    if (syncModeRef.current === 'sync' && v2) v2.play().catch(() => {})
    isPlayingRef.current = true
    setIsPlaying(true)
    rafRef.current = requestAnimationFrame(syncLoopFnRef.current)
  }, [])

  const pause = useCallback(() => {
    videoRef1.current?.pause()
    if (syncModeRef.current === 'sync') videoRef2.current?.pause()
    isPlayingRef.current = false
    setIsPlaying(false)
    cancelAnimationFrame(rafRef.current)
  }, [])

  const play2 = useCallback(() => {
    const v2 = videoRef2.current
    if (!v2 || syncModeRef.current === 'sync') return
    v2.play().catch(() => {})
    isPlaying2Ref.current = true
    setIsPlaying2(true)
    raf2Ref.current = requestAnimationFrame(syncLoop2FnRef.current)
  }, [])

  const pause2 = useCallback(() => {
    videoRef2.current?.pause()
    isPlaying2Ref.current = false
    setIsPlaying2(false)
    cancelAnimationFrame(raf2Ref.current)
  }, [])

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) pause()
    else play()
  }, [play, pause])

  const togglePlay2 = useCallback(() => {
    if (isPlaying2Ref.current) pause2()
    else play2()
  }, [play2, pause2])

  const seek = useCallback((time: number) => {
    const v1 = videoRef1.current
    const v2 = videoRef2.current
    const clamped = clamp(time, 0, duration1Ref.current || duration)
    if (v1) v1.currentTime = clamped
    if (syncModeRef.current === 'sync' && v2) v2.currentTime = clamped
    setCurrentTime(clamped)
    if (syncModeRef.current === 'sync') setCurrentTime2(clamped)
  }, [duration])

  const seek2 = useCallback((time: number) => {
    const v2 = videoRef2.current
    const dur = duration2Ref.current || duration2
    const clamped = clamp(time, 0, dur)
    if (v2) v2.currentTime = clamped
    setCurrentTime2(clamped)
  }, [duration2])

  const stepFrame = useCallback(
    (direction: 1 | -1, factor = 1) => {
      const step = (0.5 / Math.max(fps, 60)) * factor
      seek(currentTime + direction * step)
    },
    [fps, currentTime, seek],
  )

  const stepFrame2 = useCallback(
    (direction: 1 | -1, factor = 1) => {
      const step = (0.5 / Math.max(fps, 60)) * factor
      seek2(currentTime2 + direction * step)
    },
    [fps, currentTime2, seek2],
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

  const toggleSyncMode = useCallback(() => {
    setSyncMode(prev => {
      const next = prev === 'sync' ? 'independent' : 'sync'
      if (next === 'independent') {
        // When going independent, stop V2 from the shared loop; it keeps V1's time
        videoRef2.current?.pause()
        isPlaying2Ref.current = false
        setIsPlaying2(false)
        cancelAnimationFrame(raf2Ref.current)
        // Give V2 its own time state starting from V1's position
        const t = videoRef1.current?.currentTime ?? 0
        setCurrentTime2(t)
      } else {
        // Going back to sync: stop V2's independent loop
        videoRef2.current?.pause()
        isPlaying2Ref.current = false
        setIsPlaying2(false)
        cancelAnimationFrame(raf2Ref.current)
        // Snap V2 back to V1's time
        const t = videoRef1.current?.currentTime ?? 0
        if (videoRef2.current) videoRef2.current.currentTime = t
        setCurrentTime2(t)
      }
      return next
    })
  }, [])

  // Snap V2's playhead to V1's current position (re-sync in independent mode)
  const syncV2ToV1 = useCallback(() => {
    const t = videoRef1.current?.currentTime ?? currentTime
    if (videoRef2.current) videoRef2.current.currentTime = t
    setCurrentTime2(t)
  }, [currentTime])


  const onVideoLoaded = useCallback(async (slot: 1 | 2) => {
    const video = slot === 1 ? videoRef1.current : videoRef2.current
    if (!video) return
    if (slot === 1) {
      setDuration(video.duration)
      duration1Ref.current = video.duration
    } else {
      setDuration2(video.duration)
      duration2Ref.current = video.duration
      // In sync mode the shared scrubber covers both videos
      setDuration(prev => Math.max(prev, video.duration))
    }
    const detectedFps = await detectFps(video)
    setFps(detectedFps)
  }, [])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      cancelAnimationFrame(raf2Ref.current)
    }
  }, [])

  return {
    videoRef1,
    videoRef2,
    isPlaying,
    isPlaying2,
    currentTime,
    currentTime2,
    duration,
    duration2,
    playbackRate,
    isMirrored,
    abLoop,
    fps,
    syncMode,
    play,
    pause,
    play2,
    pause2,
    togglePlay,
    togglePlay2,
    seek,
    seek2,
    stepFrame,
    stepFrame2,
    setPlaybackRate,
    toggleMirror,
    setLoopPoint,
    clearLoop,
    toggleSyncMode,
    syncV2ToV1,
    onVideoLoaded,
  }
}
