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
// Template matching — Sum of Absolute Differences (SAD)
// Finds where templateData appears inside a search window of frameData
// ---------------------------------------------------------------------------
function matchTemplate(
  tmpl: Uint8ClampedArray, tmplW: number, tmplH: number,
  frame: Uint8ClampedArray, frameW: number, frameH: number,
  searchCX: number, searchCY: number, searchR: number
): { x: number; y: number; confidence: number } | null {
  const x0 = Math.max(0, Math.round(searchCX - searchR))
  const y0 = Math.max(0, Math.round(searchCY - searchR))
  const x1 = Math.min(frameW - tmplW, Math.round(searchCX + searchR))
  const y1 = Math.min(frameH - tmplH, Math.round(searchCY + searchR))

  if (x1 <= x0 || y1 <= y0) return null

  let minSAD = Infinity
  let bestX = searchCX
  let bestY = searchCY
  let secondMin = Infinity

  // Step 2 pixels for speed (still accurate enough for template size 20)
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      let sad = 0
      for (let ty = 0; ty < tmplH; ty += 2) {
        for (let tx = 0; tx < tmplW; tx += 2) {
          const ti = (ty * tmplW + tx) * 4
          const fi = ((y + ty) * frameW + (x + tx)) * 4
          sad +=
            Math.abs(tmpl[ti] - frame[fi]) +
            Math.abs(tmpl[ti + 1] - frame[fi + 1]) +
            Math.abs(tmpl[ti + 2] - frame[fi + 2])
        }
      }
      if (sad < minSAD) { secondMin = minSAD; minSAD = sad; bestX = x + tmplW / 2; bestY = y + tmplH / 2 }
      else if (sad < secondMin) secondMin = sad
    }
  }

  // Confidence: ratio of second-best to best (higher = more unique match)
  const confidence = secondMin > 0 ? minSAD / secondMin : 1
  const pixelCount = (tmplW / 2) * (tmplH / 2) // sampled pixels
  const maxSAD = pixelCount * 80 // reject if average error > 80 per pixel

  if (minSAD > maxSAD) return null

  return { x: bestX, y: bestY, confidence }
}

// Smooth path with exponential moving average
function smoothPoints(pts: ClubPathPoint[]): ClubPathPoint[] {
  if (pts.length <= 2) return pts
  const alpha = 0.5
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

// Drop points that jump more than 15% of frame width from their neighbors
function filterJumps(pts: ClubPathPoint[]): ClubPathPoint[] {
  if (pts.length < 3) return pts
  const out: ClubPathPoint[] = [pts[0]]
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = out[out.length - 1]
    const p = pts[i]
    const next = pts[i + 1]
    const dPrev = Math.hypot(p.x - prev.x, p.y - prev.y)
    const dNext = Math.hypot(p.x - next.x, p.y - next.y)
    if (dPrev < 0.15 || dNext < 0.15) out.push(p)
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
  // Stores seeded template per slot so user only needs to click once
  const seedRef1 = useRef<{ time: number; x: number; y: number } | null>(null)
  const seedRef2 = useRef<{ time: number; x: number; y: number } | null>(null)
  const [hasSeed1, setHasSeed1] = useState(false)
  const [hasSeed2, setHasSeed2] = useState(false)

  const toggleTracking = useCallback(() => setIsTracking(v => !v), [])

  // Called when user manually clicks on the video while tracking is on
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
  // Seeded template-matching trace
  // User clicks on the club head → we lock onto that region and track everywhere
  // ---------------------------------------------------------------------------
  const seedAndTrack = useCallback(
    async (video: HTMLVideoElement, seedTime: number, seedX: number, seedY: number, slot: 1 | 2) => {
      if (!video || video.duration === 0) return

      // Store seed for reference
      const seedObj = { time: seedTime, x: seedX, y: seedY }
      if (slot === 1) { seedRef1.current = seedObj; setHasSeed1(true) }
      else { seedRef2.current = seedObj; setHasSeed2(true) }

      const setter = slot === 1 ? setPath1 : setPath2
      const duration = video.duration
      const wasPlaying = !video.paused
      video.pause()

      // Working resolution
      const W = 480
      const H = Math.round((video.videoHeight / video.videoWidth) * W) || 270
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!

      // Capture template around the click point
      const TMPL = 22 // template size in pixels
      const seedPxX = seedX * W
      const seedPxY = seedY * H
      const tmplX = Math.max(0, Math.round(seedPxX - TMPL / 2))
      const tmplY = Math.max(0, Math.round(seedPxY - TMPL / 2))

      await seekTo(video, seedTime)
      ctx.drawImage(video, 0, 0, W, H)
      const tmplData = ctx.getImageData(tmplX, tmplY, TMPL, TMPL).data

      // Sample 80 evenly-spaced times across the full video
      const FRAMES = 80
      const start = duration * 0.02
      const end = duration * 0.98
      const times = Array.from({ length: FRAMES }, (_, i) =>
        start + ((end - start) / (FRAMES - 1)) * i
      )

      setTraceProgress({ current: 0, total: FRAMES, status: 'running', message: 'Tracking club head from your click...' })

      const collected: ClubPathPoint[] = [{ time: seedTime, x: seedX, y: seedY }]

      // --- Forward pass (seed → end) ---
      let cx = seedPxX, cy = seedPxY, searchR = 38

      for (const t of times.filter(t => t >= seedTime).sort((a, b) => a - b)) {
        try {
          await seekTo(video, t)
          ctx.drawImage(video, 0, 0, W, H)
          const frame = ctx.getImageData(0, 0, W, H).data
          const match = matchTemplate(tmplData, TMPL, TMPL, frame, W, H, cx, cy, searchR)
          if (match) {
            collected.push({ time: t, x: match.x / W, y: match.y / H })
            // Grow search radius near impact where club moves fastest
            searchR = Math.min(90, searchR + 4)
            cx = match.x; cy = match.y
          } else {
            // Lost tracking — expand search window
            searchR = Math.min(120, searchR + 10)
          }
        } catch { /* skip */ }

        setTraceProgress(p => ({ ...p, current: p.current + 1, message: `Tracking forward... ${p.current + 1}/${FRAMES}` }))
      }

      // --- Backward pass (seed → start) ---
      cx = seedPxX; cy = seedPxY; searchR = 38

      for (const t of times.filter(t => t < seedTime).sort((a, b) => b - a)) {
        try {
          await seekTo(video, t)
          ctx.drawImage(video, 0, 0, W, H)
          const frame = ctx.getImageData(0, 0, W, H).data
          const match = matchTemplate(tmplData, TMPL, TMPL, frame, W, H, cx, cy, searchR)
          if (match) {
            collected.push({ time: t, x: match.x / W, y: match.y / H })
            searchR = Math.min(90, searchR + 4)
            cx = match.x; cy = match.y
          } else {
            searchR = Math.min(120, searchR + 10)
          }
        } catch { /* skip */ }

        setTraceProgress(p => ({ ...p, current: p.current + 1, message: `Tracking backward... ${p.current + 1}/${FRAMES}` }))
      }

      const sorted = collected.sort((a, b) => a.time - b.time)
      const final = smoothPoints(filterJumps(sorted))
      setter(prev => ({ ...prev, points: final, color: pathColor, strokeWidth }))

      if (wasPlaying) video.play()

      setTraceProgress({ current: FRAMES, total: FRAMES, status: 'done', message: `Done — ${final.length} points tracked` })
      setTimeout(() => setTraceProgress(p => ({ ...p, status: 'idle', message: '' })), 4000)
    },
    [pathColor, strokeWidth]
  )

  // ---------------------------------------------------------------------------
  // AI trace (Claude vision, 24 frames)
  // ---------------------------------------------------------------------------
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
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')!

    const collected: ClubPathPoint[] = []
    setTraceProgress({ current: 0, total: sampleCount, status: 'running', message: 'AI detecting club head...' })

    for (let i = 0; i < times.length; i++) {
      try {
        await seekTo(video, times[i])
        ctx.drawImage(video, 0, 0, W, H)
        const frame = stripDataUrlPrefix(canvas.toDataURL('image/jpeg', 0.82))

        const res = await fetch('/api/golf-trace', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frame, frameTime: times[i] }),
        })
        const data = await res.json()

        if (data.x !== null && data.y !== null && data.confidence !== 'none') {
          collected.push({ time: times[i], x: data.x, y: data.y })
          setter(prev => ({ ...prev, points: [...collected].sort((a, b) => a.time - b.time), color: pathColor, strokeWidth }))
        }
      } catch { /* skip */ }

      setTraceProgress({ current: i + 1, total: sampleCount, status: 'running', message: `AI frame ${i + 1}/${sampleCount}...` })
    }

    if (wasPlaying) video.play()
    setTraceProgress({ current: sampleCount, total: sampleCount, status: 'done', message: `AI done — ${collected.length}/${sampleCount} detected` })
    setTimeout(() => setTraceProgress(p => ({ ...p, status: 'idle', message: '' })), 4000)
  }, [pathColor, strokeWidth])

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
    isTracking, path1, path2, pathColor, strokeWidth, traceProgress,
    hasSeed1, hasSeed2,
    toggleTracking, addPoint, seedAndTrack, aiTrace,
    clearPath, toggleVisible, updateColor, updateStrokeWidth,
  }
}
