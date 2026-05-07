'use client'

import { useEffect, useRef } from 'react'
import type { ClubPathData, ClubPathPoint } from '@/hooks/golf/useClubPath'

interface Props {
  pathData: ClubPathData
}

// Catmull-Rom spline through points
function splinePath(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  tension = 0.4
) {
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

// Draw a glowing neon line — multiple passes like Swing Profile
function drawNeonLine(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  color: string,
  baseWidth: number,
  alpha: number
) {
  if (pts.length < 2) return

  // Pass 1: wide outer glow
  ctx.save()
  ctx.globalAlpha = alpha * 0.12
  ctx.strokeStyle = color
  ctx.lineWidth = baseWidth * 6
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowBlur = 0
  splinePath(ctx, pts)
  ctx.stroke()
  ctx.restore()

  // Pass 2: mid glow
  ctx.save()
  ctx.globalAlpha = alpha * 0.25
  ctx.strokeStyle = color
  ctx.lineWidth = baseWidth * 3.5
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowBlur = baseWidth * 4
  ctx.shadowColor = color
  splinePath(ctx, pts)
  ctx.stroke()
  ctx.restore()

  // Pass 3: bright core
  ctx.save()
  ctx.globalAlpha = alpha * 0.9
  ctx.strokeStyle = color
  ctx.lineWidth = baseWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowBlur = baseWidth * 3
  ctx.shadowColor = color
  splinePath(ctx, pts)
  ctx.stroke()
  ctx.restore()

  // Pass 4: white hot center (super thin)
  ctx.save()
  ctx.globalAlpha = alpha * 0.6
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = Math.max(1, baseWidth * 0.35)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowBlur = baseWidth * 2
  ctx.shadowColor = '#ffffff'
  splinePath(ctx, pts)
  ctx.stroke()
  ctx.restore()
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  isImpact: boolean
) {
  ctx.save()
  ctx.globalAlpha = 0.95
  ctx.shadowBlur = r * 4
  ctx.shadowColor = isImpact ? '#ffffff' : color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = isImpact ? '#ffffff' : color
  ctx.fill()
  if (isImpact) {
    ctx.globalAlpha = 0.5
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
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
    if (!visible || points.length === 0) return

    ctx.save()
    ctx.scale(dpr, dpr)

    const sorted = [...points].sort((a, b) => a.time - b.time)

    // Find the lowest Y point as approximate impact zone
    let impactIdx = 0
    let maxY = -Infinity
    sorted.forEach((p, i) => { if (p.y > maxY) { maxY = p.y; impactIdx = i } })

    const backswing = sorted.slice(0, impactIdx + 1)
    const throughSwing = sorted.slice(impactIdx)

    const toPx = (pts: ClubPathPoint[]): [number, number][] =>
      pts.map(p => [p.x * cssW, p.y * cssH])

    // Draw backswing slightly dimmer and dashed-ish
    if (backswing.length >= 2) {
      drawNeonLine(ctx, toPx(backswing), color, strokeWidth, 0.55)
    }

    // Draw through-swing bright and solid
    if (throughSwing.length >= 2) {
      drawNeonLine(ctx, toPx(throughSwing), color, strokeWidth, 0.95)
    }

    // Draw dots at each detected position
    if (sorted.length > 0) {
      const dotR = Math.max(2.5, strokeWidth * 0.7)
      sorted.forEach((p, i) => {
        drawDot(ctx, p.x * cssW, p.y * cssH, dotR, color, i === impactIdx)
      })
    }

    // Arrow at end of path
    if (sorted.length >= 2) {
      const last = sorted[sorted.length - 1]
      const prev = sorted[sorted.length - 2]
      const angle = Math.atan2(
        (last.y - prev.y) * cssH,
        (last.x - prev.x) * cssW
      )
      const ax = last.x * cssW
      const ay = last.y * cssH
      const arrowSize = strokeWidth * 3.5
      ctx.save()
      ctx.globalAlpha = 0.9
      ctx.fillStyle = color
      ctx.shadowBlur = 8
      ctx.shadowColor = color
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(
        ax - arrowSize * Math.cos(angle - Math.PI / 5),
        ay - arrowSize * Math.sin(angle - Math.PI / 5)
      )
      ctx.lineTo(
        ax - arrowSize * Math.cos(angle + Math.PI / 5),
        ay - arrowSize * Math.sin(angle + Math.PI / 5)
      )
      ctx.closePath()
      ctx.fill()
      ctx.restore()
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
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
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
