'use client'

import { useState, useCallback, useRef } from 'react'
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
  points: [], color: '#ffff00', strokeWidth: 4, visible: true,
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('seek timeout')), 5000)
    const handler = () => { clearTimeout(timeout); video.removeEventListener('seeked', handler); resolve() }
    video.addEventListener('seeked', handler)
    video.currentTime = time
  })
}

// ---------------------------------------------------------------------------
// Inline 2D Kalman filter — constant-velocity model.
// Bridges frames where the club head is motion-blurred (invisible to diff).
// ---------------------------------------------------------------------------
class Kalman2D {
  x: number; y: number
  vx: number; vy: number
  pv: number // position variance

  constructor(x: number, y: number) {
    this.x = x; this.y = y
    this.vx = 0; this.vy = 0
    this.pv = 1e6 // high initial uncertainty
  }

  predict(dt = 1) {
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.pv += 150 // process noise — allows velocity to change
    return { x: this.x, y: this.y }
  }

  update(mx: number, my: number, noise = 400) {
    const K = this.pv / (this.pv + noise)
    const dx = mx - this.x
    const dy = my - this.y
    // Blend velocity towards the new measurement direction
    this.vx = this.vx * 0.55 + dx * K * 0.45
    this.vy = this.vy * 0.55 + dy * K * 0.45
    this.x += K * dx
    this.y += K * dy
    this.pv *= (1 - K)
  }
}

// ---------------------------------------------------------------------------
// Frame differencing — find moving pixels near a predicted point.
// Weighted by motion strength × proximity so the fast-moving club head wins
// over the slower-moving golfer body even when both are in the search window.
// ---------------------------------------------------------------------------
function findMotionNear(
  prev: Uint8ClampedArray,
  curr: Uint8ClampedArray,
  W: number, H: number,
  cx: number, cy: number,
  searchR: number,
  threshold = 20,
): { x: number; y: number; strength: number } | null {
  const x0 = Math.max(0, (cx - searchR) | 0)
  const y0 = Math.max(0, (cy - searchR) | 0)
  const x1 = Math.min(W - 1, (cx + searchR) | 0)
  const y1 = Math.min(H - 1, (cy + searchR) | 0)

  let swx = 0, swy = 0, sw = 0, maxDiff = 0

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * W + x) * 4
      const diff = (
        Math.abs(curr[i]   - prev[i])   +
        Math.abs(curr[i+1] - prev[i+1]) +
        Math.abs(curr[i+2] - prev[i+2])
      ) / 3

      if (diff > threshold) {
        const dist = Math.hypot(x - cx, y - cy)
        // Weight: fast-moving objects get quadratic bonus; proximity scales by 0.04/px
        const w = diff * diff / (1 + dist * 0.04)
        swx += x * w; swy += y * w; sw += w
        if (diff > maxDiff) maxDiff = diff
      }
    }
  }

  // Require enough weighted evidence to commit
  const minWeight = searchR * threshold * 4
  if (sw < minWeight) return null
  return { x: swx / sw, y: swy / sw, strength: maxDiff }
}

// Exponential moving average smoother — two passes for extra smoothness
function smoothPoints(pts: ClubPathPoint[]): ClubPathPoint[] {
  if (pts.length <= 2) return pts
  const pass = (arr: ClubPathPoint[], alpha: number) => {
    const out = [arr[0]]
    for (let i = 1; i < arr.length; i++) {
      out.push({
        time: arr[i].time,
        x: alpha * arr[i].x + (1 - alpha) * out[i - 1].x,
        y: alpha * arr[i].y + (1 - alpha) * out[i - 1].y,
      })
    }
    return out
  }
  // Forward pass then backward pass — removes phase lag
  const fwd = pass(pts, 0.4)
  return pass([...fwd].reverse(), 0.4).reverse()
}

// Drop points that jump more than 12% of frame width
function filterJumps(pts: ClubPathPoint[]): ClubPathPoint[] {
  if (pts.length < 3) return pts
  const out: ClubPathPoint[] = [pts[0]]
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = out[out.length - 1]
    const p = pts[i]
    const next = pts[i + 1]
    if (Math.hypot(p.x - prev.x, p.y - prev.y) < 0.12 ||
        Math.hypot(p.x - next.x, p.y - next.y) < 0.12) {
      out.push(p)
    }
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
  const seedRef1 = useRef<{ time: number; x: number; y: number } | null>(null)
  const seedRef2 = useRef<{ time: number; x: number; y: number } | null>(null)
  const [hasSeed1, setHasSeed1] = useState(false)
  const [hasSeed2, setHasSeed2] = useState(false)

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

  // ---------------------------------------------------------------------------
  // Seeded frame-differencing trace with Kalman filter.
  //
  // User clicks on the club head → we note that pixel position.
  // We then scan 110 frames in chronological order, diffing consecutive frames
  // to find moving pixels.  Near the predicted club position (from Kalman), the
  // fastest-moving blob is the club head.  When the club is fully motion-blurred
  // (no visible edges) the Kalman constant-velocity model extrapolates the arc.
  // ---------------------------------------------------------------------------
  const seedAndTrack = useCallback(
    async (video: HTMLVideoElement, seedTime: number, seedX: number, seedY: number, slot: 1 | 2) => {
      if (!video || video.duration === 0) return

      const seedObj = { time: seedTime, x: seedX, y: seedY }
      if (slot === 1) { seedRef1.current = seedObj; setHasSeed1(true) }
      else { seedRef2.current = seedObj; setHasSeed2(true) }

      const setter = slot === 1 ? setPath1 : setPath2
      const duration = video.duration
      const wasPlaying = !video.paused
      video.pause()

      const W = 480
      const H = Math.round((video.videoHeight / video.videoWidth) * W) || 270
      const canvas = document.createElement('canvas')
      canvas.width = W; canvas.height = H
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!

      const FRAMES = 110
      const start = duration * 0.01
      const end = duration * 0.99
      const allTimes = Array.from({ length: FRAMES }, (_, i) =>
        start + ((end - start) / (FRAMES - 1)) * i
      ).sort((a, b) => a - b)

      // Find the index closest to the seed time to split passes
      const seedIdx = allTimes.reduce((best, t, i) =>
        Math.abs(t - seedTime) < Math.abs(allTimes[best] - seedTime) ? i : best, 0)

      const beforeTimes = allTimes.slice(0, seedIdx + 1)   // ends at ~seedTime
      const afterTimes  = allTimes.slice(seedIdx)           // starts at ~seedTime

      const TOTAL = beforeTimes.length + afterTimes.length
      setTraceProgress({ current: 0, total: TOTAL, status: 'running', message: 'Seeding tracker...' })

      const seedPxX = seedX * W
      const seedPxY = seedY * H

      const collected: ClubPathPoint[] = [{ time: seedTime, x: seedX, y: seedY }]

      // ---- Forward pass: seedTime → end ----
      const kfFwd = new Kalman2D(seedPxX, seedPxY)

      await seekTo(video, afterTimes[0])
      ctx.drawImage(video, 0, 0, W, H)
      let prevData = new Uint8ClampedArray(ctx.getImageData(0, 0, W, H).data)

      for (let i = 1; i < afterTimes.length; i++) {
        const t = afterTimes[i]
        try {
          await seekTo(video, t)
          ctx.drawImage(video, 0, 0, W, H)
          const currData = new Uint8ClampedArray(ctx.getImageData(0, 0, W, H).data)

          const speed = Math.hypot(kfFwd.vx, kfFwd.vy)
          const searchR = Math.min(130, 45 + speed * 2.5)
          const pred = kfFwd.predict()
          const motion = findMotionNear(prevData, currData, W, H, pred.x, pred.y, searchR)

          if (motion) {
            kfFwd.update(motion.x, motion.y)
            collected.push({ time: t, x: kfFwd.x / W, y: kfFwd.y / H })
          } else {
            // Blurred frame — trust Kalman prediction
            collected.push({ time: t, x: pred.x / W, y: pred.y / H })
          }

          prevData = currData
        } catch { /* skip bad seek */ }

        setTraceProgress(p => ({ ...p, current: p.current + 1, message: `Tracking forward... ${i}/${afterTimes.length - 1}` }))
      }

      // ---- Backward pass: seedTime → start ----
      const kfBwd = new Kalman2D(seedPxX, seedPxY)

      await seekTo(video, beforeTimes[beforeTimes.length - 1])
      ctx.drawImage(video, 0, 0, W, H)
      prevData = new Uint8ClampedArray(ctx.getImageData(0, 0, W, H).data)

      for (let i = beforeTimes.length - 2; i >= 0; i--) {
        const t = beforeTimes[i]
        try {
          await seekTo(video, t)
          ctx.drawImage(video, 0, 0, W, H)
          const currData = new Uint8ClampedArray(ctx.getImageData(0, 0, W, H).data)

          const speed = Math.hypot(kfBwd.vx, kfBwd.vy)
          const searchR = Math.min(130, 45 + speed * 2.5)
          const pred = kfBwd.predict()
          const motion = findMotionNear(prevData, currData, W, H, pred.x, pred.y, searchR)

          if (motion) {
            kfBwd.update(motion.x, motion.y)
            collected.push({ time: t, x: kfBwd.x / W, y: kfBwd.y / H })
          } else {
            collected.push({ time: t, x: pred.x / W, y: pred.y / H })
          }

          prevData = currData
        } catch { /* skip */ }

        setTraceProgress(p => ({ ...p, current: p.current + 1, message: `Tracking backward... ${beforeTimes.length - 1 - i}/${beforeTimes.length - 1}` }))
      }

      const sorted = collected.sort((a, b) => a.time - b.time)
      const final = smoothPoints(filterJumps(sorted))
      setter(prev => ({ ...prev, points: final, color: pathColor, strokeWidth }))

      if (wasPlaying) video.play()
      setTraceProgress({ current: TOTAL, total: TOTAL, status: 'done', message: `Done — ${final.length} points tracked` })
      setTimeout(() => setTraceProgress(p => ({ ...p, status: 'idle', message: '' })), 4000)
    },
    [pathColor, strokeWidth]
  )

  // ---------------------------------------------------------------------------
  // AI trace — Claude vision, 36 frames.
  // Sends previous detection coordinate as context to bias the search.
  // ---------------------------------------------------------------------------
  const aiTrace = useCallback(async (video: HTMLVideoElement, slot: 1 | 2, sampleCount = 36) => {
    if (!video || video.duration === 0) return

    const setter = slot === 1 ? setPath1 : setPath2
    const duration = video.duration
    const wasPlaying = !video.paused
    video.pause()

    const start = duration * 0.04
    const end = duration * 0.96
    const times = Array.from({ length: sampleCount }, (_, i) =>
      start + ((end - start) / (sampleCount - 1)) * i
    )

    const W = 960
    const H = Math.round((video.videoHeight / video.videoWidth) * W) || 540
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')!

    const collected: ClubPathPoint[] = []
    setTraceProgress({ current: 0, total: sampleCount, status: 'running', message: 'AI detecting club head...' })
    let lastDetected: { x: number; y: number } | null = null

    for (let i = 0; i < times.length; i++) {
      try {
        await seekTo(video, times[i])
        ctx.drawImage(video, 0, 0, W, H)
        const frame = stripDataUrlPrefix(canvas.toDataURL('image/jpeg', 0.82))

        const res: Response = await fetch('/api/golf-trace', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frame, frameTime: times[i], hint: lastDetected }),
        })
        const data: { x: number | null; y: number | null; confidence: string } = await res.json()

        if (data.x !== null && data.y !== null && data.confidence !== 'none') {
          collected.push({ time: times[i], x: data.x, y: data.y })
          lastDetected = { x: data.x, y: data.y }
          setter(prev => ({ ...prev, points: [...collected].sort((a, b) => a.time - b.time), color: pathColor, strokeWidth }))
        }
      } catch { /* skip */ }

      setTraceProgress({ current: i + 1, total: sampleCount, status: 'running', message: `AI frame ${i + 1}/${sampleCount}...` })
    }

    if (wasPlaying) video.play()
    setTraceProgress({ current: sampleCount, total: sampleCount, status: 'done', message: `AI done — ${collected.length}/${sampleCount} detected` })
    setTimeout(() => setTraceProgress(p => ({ ...p, status: 'idle', message: '' })), 4000)
  }, [pathColor, strokeWidth])

  // Fit a smooth cubic spline through the manually placed points by interpolating
  // 60 evenly-spaced positions. Makes a rough click path look like a professional arc.
  const smoothPath = useCallback((slot: 1 | 2 | 'both') => {
    const interpolate = (pts: ClubPathPoint[]): ClubPathPoint[] => {
      if (pts.length < 3) return pts
      const sorted = [...pts].sort((a, b) => a.time - b.time)
      const N = Math.max(60, sorted.length * 3)
      const out: ClubPathPoint[] = []
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1)
        // Find surrounding segment
        const fi = t * (sorted.length - 1)
        const lo = Math.min(Math.floor(fi), sorted.length - 2)
        const hi = lo + 1
        const u = fi - lo
        // Catmull-Rom control points
        const p0 = sorted[Math.max(0, lo - 1)]
        const p1 = sorted[lo]
        const p2 = sorted[hi]
        const p3 = sorted[Math.min(sorted.length - 1, hi + 1)]
        // Catmull-Rom formula
        const x = 0.5 * (
          (2 * p1.x) +
          (-p0.x + p2.x) * u +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u * u +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u * u * u
        )
        const y = 0.5 * (
          (2 * p1.y) +
          (-p0.y + p2.y) * u +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u * u +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u * u * u
        )
        const time = p1.time + (p2.time - p1.time) * u
        out.push({ time, x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) })
      }
      return out
    }
    if (slot === 1 || slot === 'both') setPath1(p => ({ ...p, points: interpolate(p.points) }))
    if (slot === 2 || slot === 'both') setPath2(p => ({ ...p, points: interpolate(p.points) }))
  }, [])

  const clearPath = useCallback((slot: 1 | 2 | 'both') => {
    if (slot === 1 || slot === 'both') { setPath1(p => ({ ...p, points: [] })); seedRef1.current = null; setHasSeed1(false) }
    if (slot === 2 || slot === 'both') { setPath2(p => ({ ...p, points: [] })); seedRef2.current = null; setHasSeed2(false) }
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
    isTracking, path1, path2, pathColor, strokeWidth,
    toggleTracking, addPoint,
    smoothPath, clearPath, toggleVisible, updateColor, updateStrokeWidth,
  }
}
