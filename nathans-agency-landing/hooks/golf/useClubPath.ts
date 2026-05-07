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
  strokeWidth: 4,
  visible: true,
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('seek timeout')), 5000)
    const handler = () => {
      clearTimeout(timeout)
      video.removeEventListener('seeked', handler)
      resolve()
    }
    video.addEventListener('seeked', handler)
    video.currentTime = time
  })
}

// ---------------------------------------------------------------------------
// Core detection: find the club head as the smallest, fastest-moving cluster
// ---------------------------------------------------------------------------
function detectClubHead(
  prev: Uint8ClampedArray,
  curr: Uint8ClampedArray,
  W: number,
  H: number
): { x: number; y: number; score: number } | null {
  // Work on 4×4 cell grid for speed
  const cellSize = 4
  const cW = Math.floor(W / cellSize)
  const cH = Math.floor(H / cellSize)
  const cells = new Float32Array(cW * cH)

  // Compute per-cell maximum channel difference
  for (let cy = 0; cy < cH; cy++) {
    for (let cx = 0; cx < cW; cx++) {
      let maxDiff = 0
      for (let py = cy * cellSize; py < (cy + 1) * cellSize; py++) {
        for (let px = cx * cellSize; px < (cx + 1) * cellSize; px++) {
          const i = (py * W + px) * 4
          const d = Math.max(
            Math.abs(curr[i] - prev[i]),
            Math.abs(curr[i + 1] - prev[i + 1]),
            Math.abs(curr[i + 2] - prev[i + 2])
          )
          if (d > maxDiff) maxDiff = d
        }
      }
      cells[cy * cW + cx] = maxDiff
    }
  }

  // BFS connected component labeling on cells above threshold
  const THRESH = 28
  const visited = new Uint8Array(cW * cH)
  const queue = new Int32Array(cW * cH)
  const components: { cx: number; cy: number; size: number; density: number }[] = []

  for (let start = 0; start < cells.length; start++) {
    if (cells[start] < THRESH || visited[start]) continue

    let head = 0
    let tail = 0
    queue[tail++] = start
    visited[start] = 1

    let totalScore = 0
    let sumCX = 0
    let sumCY = 0
    let count = 0

    while (head < tail) {
      const ci = queue[head++]
      const cx = ci % cW
      const cy = Math.floor(ci / cW)
      totalScore += cells[ci]
      sumCX += cx
      sumCY += cy
      count++

      // 4-connected neighbors
      if (cy > 0 && cells[ci - cW] >= THRESH && !visited[ci - cW]) { visited[ci - cW] = 1; queue[tail++] = ci - cW }
      if (cy < cH - 1 && cells[ci + cW] >= THRESH && !visited[ci + cW]) { visited[ci + cW] = 1; queue[tail++] = ci + cW }
      if (cx > 0 && cells[ci - 1] >= THRESH && !visited[ci - 1]) { visited[ci - 1] = 1; queue[tail++] = ci - 1 }
      if (cx < cW - 1 && cells[ci + 1] >= THRESH && !visited[ci + 1]) { visited[ci + 1] = 1; queue[tail++] = ci + 1 }
    }

    // Filter: club head is small (1–40 cells) but body parts are large (40+ cells)
    if (count >= 1 && count <= 40) {
      components.push({
        cx: sumCX / count,
        cy: sumCY / count,
        size: count,
        density: totalScore / count,
      })
    }
  }

  if (components.length === 0) return null

  // Score each component: high motion density + small size = club head
  // Body parts are large and slow; club head is tiny and fast
  let bestScore = 0
  let best: typeof components[0] | null = null

  for (const comp of components) {
    // density * inverse-size: prefers small, fast objects
    const score = comp.density * (6 / Math.max(1, comp.size))
    if (score > bestScore) {
      bestScore = score
      best = comp
    }
  }

  if (!best || bestScore < 8) return null

  return {
    x: ((best.cx + 0.5) * cellSize) / W,
    y: ((best.cy + 0.5) * cellSize) / H,
    score: bestScore,
  }
}

// Exponential moving average smoothing
function smoothPoints(pts: ClubPathPoint[]): ClubPathPoint[] {
  if (pts.length <= 2) return pts
  const alpha = 0.45
  const out = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    out.push({
      time: pts[i].time,
      x: alpha * pts[i].x + (1 - alpha) * out[i - 1].x,
      y: alpha * pts[i].y + (1 - alpha) * out[i - 1].y,
    })
  }
  return out
}

// Remove points that jump too far from neighbors (tracking errors)
function filterJumps(pts: ClubPathPoint[]): ClubPathPoint[] {
  if (pts.length < 3) return pts
  const out: ClubPathPoint[] = [pts[0]]
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = out[out.length - 1]
    const curr = pts[i]
    const next = pts[i + 1]
    const dPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y)
    const dNext = Math.hypot(curr.x - next.x, curr.y - next.y)
    // Keep if consistent with neighbors
    if (dPrev < 0.18 || dNext < 0.18) out.push(curr)
  }
  out.push(pts[pts.length - 1])
  return out
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useClubPath() {
  const [isTracking, setIsTracking] = useState(false)
  const [path1, setPath1] = useState<ClubPathData>({ ...EMPTY_PATH })
  const [path2, setPath2] = useState<ClubPathData>({ ...EMPTY_PATH })
  const [pathColor, setPathColor] = useState('#ffff00')
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [traceProgress, setTraceProgress] = useState<TraceProgress>({
    current: 0, total: 0, status: 'idle', message: '',
  })

  const toggleTracking = useCallback(() => setIsTracking(v => !v), [])

  const addPoint = useCallback((p: Point, time: number, slot: 1 | 2) => {
    const setter = slot === 1 ? setPath1 : setPath2
    setter(prev => ({
      ...prev,
      points: [...prev.points, { time, x: p.x, y: p.y }].sort((a, b) => a.time - b.time),
      color: pathColor,
      strokeWidth,
    }))
  }, [pathColor, strokeWidth])

  const motionTrace = useCallback(async (video: HTMLVideoElement, slot: 1 | 2, frameCount = 90) => {
    if (!video || video.duration === 0) return

    const setter = slot === 1 ? setPath1 : setPath2
    const duration = video.duration
    const wasPlaying = !video.paused
    video.pause()

    // Skip first 3% and last 3% (usually static)
    const start = duration * 0.03
    const end = duration * 0.97
    const times = Array.from({ length: frameCount }, (_, i) =>
      start + ((end - start) / (frameCount - 1)) * i
    )

    // Working resolution — small enough for perf, big enough for accuracy
    const W = 320
    const H = Math.round((video.videoHeight / video.videoWidth) * W) || 180
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    let prevData: Uint8ClampedArray | null = null
    const raw: ClubPathPoint[] = []

    setTraceProgress({ current: 0, total: frameCount, status: 'running', message: 'Starting club head detection...' })

    for (let i = 0; i < times.length; i++) {
      try {
        await seekTo(video, times[i])
        ctx.drawImage(video, 0, 0, W, H)
        const curr = ctx.getImageData(0, 0, W, H).data

        if (prevData) {
          const hit = detectClubHead(prevData, curr, W, H)
          if (hit) {
            raw.push({ time: times[i], x: hit.x, y: hit.y })

            // Live preview (unsmoothed)
            setter(prev => ({
              ...prev,
              points: [...raw],
              color: pathColor,
              strokeWidth,
            }))
          }
        }

        prevData = new Uint8ClampedArray(curr)
      } catch { /* skip bad seeks */ }

      setTraceProgress({
        current: i + 1,
        total: frameCount,
        status: 'running',
        message: `Detecting club head... ${i + 1}/${frameCount}`,
      })
    }

    // Post-processing: filter jumps → smooth
    const final = smoothPoints(filterJumps(raw.sort((a, b) => a.time - b.time)))
    setter(prev => ({ ...prev, points: final, color: pathColor, strokeWidth }))

    if (wasPlaying) video.play()

    setTraceProgress({ current: frameCount, total: frameCount, status: 'done', message: `Done — ${final.length} points` })
    setTimeout(() => setTraceProgress(p => ({ ...p, status: 'idle', message: '' })), 4000)
  }, [pathColor, strokeWidth])

  const aiTrace = useCallback(async (video: HTMLVideoElement, slot: 1 | 2, sampleCount = 24) => {
    if (!video || video.duration === 0) return

    const setter = slot === 1 ? setPath1 : setPath2
    const duration = video.duration
    const wasPlaying = !video.paused
    video.pause()

    const start = duration * 0.05
    const end = duration * 0.95
    const times = Array.from({ length: sampleCount }, (_, i) =>
      start + ((end - start) / (sampleCount - 1)) * i
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
      } catch { /* skip */ }

      setTraceProgress({
        current: i + 1,
        total: sampleCount,
        status: 'running',
        message: `AI frame ${i + 1}/${sampleCount}...`,
      })
    }

    if (wasPlaying) video.play()
    setTraceProgress({ current: sampleCount, total: sampleCount, status: 'done', message: `AI done — ${collected.length}/${sampleCount} detected` })
    setTimeout(() => setTraceProgress(p => ({ ...p, status: 'idle', message: '' })), 4000)
  }, [pathColor, strokeWidth])

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
    isTracking, path1, path2, pathColor, strokeWidth, traceProgress,
    toggleTracking, addPoint, motionTrace, aiTrace,
    clearPath, toggleVisible, updateColor, updateStrokeWidth,
  }
}
