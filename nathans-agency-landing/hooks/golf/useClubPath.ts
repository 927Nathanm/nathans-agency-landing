'use client'

import { useState, useCallback } from 'react'
import type { Point } from '@/lib/golf/annotationTypes'
import { stripDataUrlPrefix } from '@/lib/golf/videoUtils'

export interface ClubPathPoint {
  time: number
  x: number
  y: number
}

export interface ClubPathData {
  points: ClubPathPoint[]
  color: string
  strokeWidth: number
  visible: boolean
}

export interface TraceProgress {
  current: number
  total: number
  status: 'idle' | 'running' | 'done' | 'error'
  message: string
}

const EMPTY_PATH: ClubPathData = {
  points: [],
  color: '#ff6600',
  strokeWidth: 3,
  visible: true,
}

async function captureFrameAtTime(
  video: HTMLVideoElement,
  time: number
): Promise<string> {
  video.currentTime = time
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('seek timeout')), 3000)
    const handler = () => {
      clearTimeout(timeout)
      video.removeEventListener('seeked', handler)
      resolve()
    }
    video.addEventListener('seeked', handler)
  })
  const canvas = document.createElement('canvas')
  canvas.width = Math.min(video.videoWidth, 960)
  canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth))
  canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height)
  return stripDataUrlPrefix(canvas.toDataURL('image/jpeg', 0.8))
}

export function useClubPath() {
  const [isTracking, setIsTracking] = useState(false)
  const [path1, setPath1] = useState<ClubPathData>({ ...EMPTY_PATH })
  const [path2, setPath2] = useState<ClubPathData>({ ...EMPTY_PATH })
  const [pathColor, setPathColor] = useState('#ff6600')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [traceProgress, setTraceProgress] = useState<TraceProgress>({
    current: 0, total: 0, status: 'idle', message: '',
  })

  const toggleTracking = useCallback(() => setIsTracking(v => !v), [])

  const addPoint = useCallback(
    (p: Point, time: number, slot: 1 | 2) => {
      const newPt: ClubPathPoint = { time, x: p.x, y: p.y }
      const setter = slot === 1 ? setPath1 : setPath2
      setter(prev => ({
        ...prev,
        points: [...prev.points, newPt].sort((a, b) => a.time - b.time),
        color: pathColor,
        strokeWidth,
      }))
    },
    [pathColor, strokeWidth]
  )

  const autoTrace = useCallback(
    async (video: HTMLVideoElement, slot: 1 | 2, sampleCount = 16) => {
      if (!video || video.duration === 0) return

      const duration = video.duration
      const wasPlaying = !video.paused
      video.pause()

      // Sample evenly across the swing, skipping first/last 5%
      const start = duration * 0.05
      const end = duration * 0.95
      const range = end - start
      const times = Array.from({ length: sampleCount }, (_, i) =>
        start + (range / (sampleCount - 1)) * i
      )

      setTraceProgress({ current: 0, total: sampleCount, status: 'running', message: 'Starting AI club head detection...' })

      const setter = slot === 1 ? setPath1 : setPath2
      const collected: ClubPathPoint[] = []

      for (let i = 0; i < times.length; i++) {
        const time = times[i]
        setTraceProgress({ current: i + 1, total: sampleCount, status: 'running', message: `Analyzing frame ${i + 1} of ${sampleCount}...` })

        try {
          const frame = await captureFrameAtTime(video, time)
          const res = await fetch('/api/golf-trace', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ frame, frameTime: time }),
          })
          const data = await res.json()

          if (data.x !== null && data.y !== null && data.confidence !== 'none') {
            collected.push({ time, x: data.x, y: data.y })
            // Update path in real time as points come in
            setter(prev => ({
              ...prev,
              points: [...collected].sort((a, b) => a.time - b.time),
              color: pathColor,
              strokeWidth,
            }))
          }
        } catch {
          // Skip failed frames
        }
      }

      if (wasPlaying) video.play()

      setTraceProgress({
        current: sampleCount,
        total: sampleCount,
        status: 'done',
        message: `Done — ${collected.length} of ${sampleCount} frames detected`,
      })

      setTimeout(() => {
        setTraceProgress(p => ({ ...p, status: 'idle', message: '' }))
      }, 3000)
    },
    [pathColor, strokeWidth]
  )

  const clearPath = useCallback((slot: 1 | 2 | 'both') => {
    if (slot === 1 || slot === 'both') setPath1(p => ({ ...p, points: [] }))
    if (slot === 2 || slot === 'both') setPath2(p => ({ ...p, points: [] }))
  }, [])

  const toggleVisible = useCallback((slot: 1 | 2 | 'both') => {
    if (slot === 1 || slot === 'both') setPath1(p => ({ ...p, visible: !p.visible }))
    if (slot === 2 || slot === 'both') setPath2(p => ({ ...p, visible: !p.visible }))
  }, [])

  const updateColor = useCallback((color: string) => {
    setPathColor(color)
    setPath1(p => ({ ...p, color }))
    setPath2(p => ({ ...p, color }))
  }, [])

  const updateStrokeWidth = useCallback((w: number) => {
    setStrokeWidth(w)
    setPath1(p => ({ ...p, strokeWidth: w }))
    setPath2(p => ({ ...p, strokeWidth: w }))
  }, [])

  return {
    isTracking,
    path1,
    path2,
    pathColor,
    strokeWidth,
    traceProgress,
    toggleTracking,
    addPoint,
    autoTrace,
    clearPath,
    toggleVisible,
    updateColor,
    updateStrokeWidth,
  }
}
