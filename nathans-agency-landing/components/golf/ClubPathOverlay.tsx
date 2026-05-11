'use client'

import { useEffect, useRef } from 'react'
import type { ClubPathData, ClubPathPoint } from '@/hooks/golf/useClubPath'

interface Props {
  pathData: ClubPathData
}

// Catmull-Rom spline through points
function splinePath(ctx: CanvasRenderingContext2D, pts: [number, number][], tension = 0.5) {
  if (pts.length < 2) return
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const cp1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension * 2
    const cp1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension * 2
    const cp2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension * 2
    const cp2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension * 2
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1])
  }
}

// Neon glow — 4 layered passes like professional swing analysis overlays
function drawNeonArc(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  color: string,
  baseWidth: number,
  alpha: number,
) {
  if (pts.length < 2) return

  // Wide outer glow
  ctx.save()
  ctx.globalAlpha = alpha * 0.10
  ctx.strokeStyle = color
  ctx.lineWidth = baseWidth * 7
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  splinePath(ctx, pts)
  ctx.stroke()
  ctx.restore()

  // Mid glow
  ctx.save()
  ctx.globalAlpha = alpha * 0.22
  ctx.strokeStyle = color
  ctx.lineWidth = baseWidth * 3.8
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.shadowBlur = baseWidth * 5
  ctx.shadowColor = color
  splinePath(ctx, pts)
  ctx.stroke()
  ctx.restore()

  // Bright core
  ctx.save()
  ctx.globalAlpha = alpha * 0.92
  ctx.strokeStyle = color
  ctx.lineWidth = baseWidth
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.shadowBlur = baseWidth * 3
  ctx.shadowColor = color
  splinePath(ctx, pts)
  ctx.stroke()
  ctx.restore()

  // White-hot center
  ctx.save()
  ctx.globalAlpha = alpha * 0.65
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = Math.max(1, baseWidth * 0.32)
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.shadowBlur = baseWidth * 2
  ctx.shadowColor = '#ffffff'
  splinePath(ctx, pts)
  ctx.stroke()
  ctx.restore()
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  last: [number, number],
  prev: [number, number],
  color: string,
  strokeWidth: number,
) {
  const angle = Math.atan2(last[1] - prev[1], last[0] - prev[0])
  const size = strokeWidth * 4
  ctx.save()
  ctx.globalAlpha = 0.92
  ctx.fillStyle = color
  ctx.shadowBlur = 10
  ctx.shadowColor = color
  ctx.beginPath()
  ctx.moveTo(last[0], last[1])
  ctx.lineTo(
    last[0] - size * Math.cos(angle - Math.PI / 5),
    last[1] - size * Math.sin(angle - Math.PI / 5),
  )
  ctx.lineTo(
    last[0] - size * Math.cos(angle + Math.PI / 5),
    last[1] - size * Math.sin(angle + Math.PI / 5),
  )
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawEndDot(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  r: number,
  color: string,
  bright: boolean,
) {
  ctx.save()
  ctx.globalAlpha = 0.95
  ctx.shadowBlur = r * 5
  ctx.shadowColor = bright ? '#ffffff' : color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = bright ? '#ffffff' : color
  ctx.fill()
  ctx.restore()
}

export function ClubPathOverlay({ pathData }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const cssW = canvas.width / dpr
    const cssH = canvas.height / dpr

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const { points, color, strokeWidth, visible } = pathData
    if (!visible || points.length < 2) return

    ctx.save()
    ctx.scale(dpr, dpr)

    const sorted = [...points].sort((a, b) => a.time - b.time)

    // Find the lowest Y (highest pixel Y) as approximate impact — club is at nadir
    let impactIdx = 0
    let maxY = -Infinity
    sorted.forEach((p, i) => { if (p.y > maxY) { maxY = p.y; impactIdx = i } })

    const toPx = (pts: ClubPathPoint[]): [number, number][] =>
      pts.map(p => [p.x * cssW, p.y * cssH])

    const backswingPts = toPx(sorted.slice(0, impactIdx + 1))
    const downswingPts = toPx(sorted.slice(impactIdx))

    // Backswing — dimmer so the through-swing reads as primary
    drawNeonArc(ctx, backswingPts, color, strokeWidth, 0.50)
    // Through-swing — full brightness
    drawNeonArc(ctx, downswingPts, color, strokeWidth, 0.96)

    // Start dot (address position)
    if (backswingPts.length > 0) {
      const [sx, sy] = backswingPts[0]
      drawEndDot(ctx, sx, sy, strokeWidth * 0.9, color, false)
    }

    // Impact dot (lowest point) — white hot
    if (sorted.length > 0) {
      const ip = sorted[impactIdx]
      drawEndDot(ctx, ip.x * cssW, ip.y * cssH, strokeWidth * 1.2, color, true)
    }

    // Arrow at end of follow-through
    if (downswingPts.length >= 2) {
      drawArrow(
        ctx,
        downswingPts[downswingPts.length - 1],
        downswingPts[downswingPts.length - 2],
        color,
        strokeWidth,
      )
    }

    ctx.restore()
  }, [pathData])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
    })
    obs.observe(canvas)
    return () => obs.disconnect()
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 w-full h-full"
      style={{ zIndex: 3 }}
    />
  )
}
