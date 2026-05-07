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
  color: '#ffff00',
  strokeWidth: 3,
  visible: true,
}

// Seek video to exact time and wait for frame to be ready
function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('seek timeout')), 4000)
    const handler = () => {
      clearTimeout(timeout)
      video.removeEventListener('seeked', handler)
      resolve()
    }
    video.addEventListener('seeked', handler)
    video.currentTime = time
  })
}

// Find the cell with the highest concentrated motion density
function findMaxMotionCell(
  prev: Uint8ClampedArray,
  curr: Uint8ClampedArray,
  width: number,
  height: number,
  cellSize: number
): { x: number; y: number; score: number } | null {
  const cellsX = Math.floor(width / cellSize)
  const cellsY = Math.floor(height / cellSize)

  let maxScore = 0
  let bestCX = 0
  let bestCY = 0

  for (let cy = 0; cy < cellsY; cy++) {
    for (let cx = 0; cx < cellsX; cx++) {
      let score = 0
      for (let py = cy * cellSize; py < (cy + 1) * cellSize; py++) {
        for (let px = cx * cellSize; px < (cx + 1) * cellSize; px++) {
          const i = (py * width + px) * 4
          score +=
            Math.abs(curr[i] - prev[i]) +
            Math.abs(curr[i + 1] - prev[i + 1]) +
            Math.abs(curr[i + 2] - prev[i + 2])
        }
      }
      // Score per pixel — gives higher weight to concentrated motion (club head)
      // vs distributed motion (body), since club head moves faster in smaller area
      const density = score / (cellSize * cellSize)
      if (density > maxScore) {
        maxScore = density
        bestCX = cx
        bestCY = cy
      }
    }
  }

  if (maxScore < 25) return null // below noise threshold

  return {
    x: ((bestCX + 0.5) * cellSize) / width,
    y: ((bestCY + 0.5) * cellSize) / height,
    score: maxScore,
  }
}

// Remove outliers: points that are > 2 standard deviations from the running path
function filterOutliers(points: ClubPathPoint[]): ClubPathPoint[] {
  if (points.length < 4) return points

  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length
  const stdX = Math.sqrt(xs.map(x => (x - meanX) ** 2).reduce((a, b) => a + b, 0) / xs.length)
  const stdY = Math.sqrt(ys.map(y => (y - meanY) ** 2).reduce((a, b) => a + b, 0) / ys.length)

  return points.filter(
    p =>
      Math.abs(p.x - meanX) <= stdX * 2.2 &&
      Math.abs(p.y - meanY) <= stdY * 2.2
  )
}

export function useClubPath() {
  const [isTracking, setIsTracking] = useState(false)
  const [path1, setPath1] = useState<ClubPathData>({ ...EMPTY_PATH })
  const [path2, setPath2] = useState<ClubPathData>({ ...EMPTY_PATH })
  const [pathColor, setPathColor] = useState('#ffff00')
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

  // Motion-based trace — fast, no API calls, uses canvas pixel differencing
  const motionTrace = useCallback(
    async (video: HTMLVideoElement, slot: 1 | 2, frameCount = 80) => {
      if (!video || video.duration === 0) return

      const setter = slot === 1 ? setPath1 : setPath2
      const duration = video.duration
      const wasPlaying = !video.paused
      video.pause()

      // Trim first/last 2% to avoid setup/static frames
      const start = duration * 0.02
      const end = duration * 0.98
      const times = Array.from(
        { length: frameCount },
        (_, i) => start + ((end - start) / (frameCount - 1)) * i
      )

      // Small canvas for performance — 480px wide
      const W = 480
      const H = Math.round((video.videoHeight / video.videoWidth) * W) || 270
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!

      let prevData: Uint8ClampedArray | null = null
      const collected: ClubPathPoint[] = []

      setTraceProgress({ current: 0, total: frameCount, status: 'running', message: 'Starting motion analysis...' })

      for (let i = 0; i < times.length; i++) {
        try {
          await seekTo(video, times[i])
          ctx.drawImage(video, 0, 0, W, H)
          const frame = ctx.getImageData(0, 0, W, H)
          const curr = frame.data

          if (prevData) {
            const hit = findMaxMotionCell(prevData, curr, W, H, 12)
            if (hit) {
              collected.push({ time: times[i], x: hit.x, y: hit.y })
              // Live update
              const filtered = filterOutliers([...collected])
              setter(prev => ({
                ...prev,
                points: filtered.sort((a, b) => a.time - b.time),
                color: pathColor,
                strokeWidth,
              }))
            }
          }

          prevData = new Uint8ClampedArray(curr)
        } catch {
          // skip failed seeks
        }

        setTraceProgress({
          current: i + 1,
          total: frameCount,
          status: 'running',
          message: `Analyzing motion... ${i + 1}/${frameCount} frames`,
        })
      }

      // Final filter pass
      const final = filterOutliers(collected).sort((a, b) => a.time - b.time)
      setter(prev => ({ ...prev, points: final, color: pathColor, strokeWidth }))

      if (wasPlaying) video.play()

      setTraceProgress({
        current: frameCount,
        total: frameCount,
        status: 'done',
        message: `Done — ${final.length} points traced`,
      })
      setTimeout(() => setTraceProgress(p => ({ ...p, status: 'idle', message: '' })), 3000)
    },
    [pathColor, strokeWidth]
  )

  // AI-assisted trace — more accurate but slower (uses Claude vision)
  const aiTrace = useCallback(
    async (video: HTMLVideoElement, slot: 1 | 2, sampleCount = 24) => {
      if (!video || video.duration === 0) return

      const setter = slot === 1 ? setPath1 : setPath2
      const duration = video.duration
      const wasPlaying = !video.paused
      video.pause()

      const start = duration * 0.05
      const end = duration * 0.95
      const times = Array.from(
        { length: sampleCount },
        (_, i) => start + ((end - start) / (sampleCount - 1)) * i
      )

      const W = 960
      const H = Math.round((video.videoHeight / video.videoWidth) * W) || 540
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!

      const collected: ClubPathPoint[] = []
      setTraceProgress({ current: 0, total: sampleCount, status: 'running', message: 'AI detecting club head...' })

      for (let i = 0; i < times.length; i++) {
        try {
          await seekTo(video, times[i])
          ctx.drawImage(video, 0, 0, W, H)
          const frame = stripDataUrlPrefix(canvas.toDataURL('image/jpeg', 0.82))

          const res = await fetch('/api/golf-trace', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ frame, frameTime: times[i] }),
          })
          const data = await res.json()

          if (data.x !== null && data.y !== null && data.confidence !== 'none') {
            collected.push({ time: times[i], x: data.x, y: data.y })
            setter(prev => ({
              ...prev,
              points: [...collected].sort((a, b) => a.time - b.time),
              color: pathColor,
              strokeWidth,
            }))
          }
        } catch {
          // skip
        }

        setTraceProgress({
          current: i + 1,
          total: sampleCount,
          status: 'running',
          message: `AI analyzing frame ${i + 1}/${sampleCount}...`,
        })
      }

      if (wasPlaying) video.play()

      setTraceProgress({
        current: sampleCount,
        total: sampleCount,
        status: 'done',
        message: `AI done — ${collected.length}/${sampleCount} frames detected`,
      })
      setTimeout(() => setTraceProgress(p => ({ ...p, status: 'idle', message: '' })), 3000)
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
    motionTrace,
    aiTrace,
    clearPath,
    toggleVisible,
    updateColor,
    updateStrokeWidth,
  }
}
