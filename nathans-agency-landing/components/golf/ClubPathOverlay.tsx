'use client'

import { useEffect, useRef } from 'react'
import type { ClubPathData, ClubPathPoint } from '@/hooks/golf/useClubPath'

interface Props {
  pathData: ClubPathData
}

function catmullRom(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  tension = 0.5
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
  ctx.stroke()
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

    if (!pathData.visible || pathData.points.length < 2) {
      // Draw dots for single points
      if (pathData.visible && pathData.points.length === 1) {
        ctx.save()
        ctx.scale(dpr, dpr)
        ctx.fillStyle = pathData.color
        ctx.globalAlpha = 0.9
        ctx.beginPath()
        ctx.arc(
          pathData.points[0].x * cssW,
          pathData.points[0].y * cssH,
          5, 0, Math.PI * 2
        )
        ctx.fill()
        ctx.restore()
      }
      return
    }

    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.strokeStyle = pathData.color
    ctx.lineWidth = pathData.strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = 0.85

    const sorted = [...pathData.points].sort((a, b) => a.time - b.time)

    // Find the lowest point (roughly = impact zone)
    let lowestIdx = 0
    let lowestY = -Infinity
    sorted.forEach((p, i) => {
      if (p.y > lowestY) { lowestY = p.y; lowestIdx = i }
    })

    const backswing = sorted.slice(0, lowestIdx + 1)
    const downswing = sorted.slice(lowestIdx)

    // Draw backswing (lighter / dashed)
    if (backswing.length >= 2) {
      ctx.setLineDash([6, 4])
      ctx.globalAlpha = 0.55
      ctx.strokeStyle = pathData.color
      const bsPts: [number, number][] = backswing.map(p => [p.x * cssW, p.y * cssH])
      catmullRom(ctx, bsPts)
    }

    // Draw downswing / through-swing (solid, bright)
    if (downswing.length >= 2) {
      ctx.setLineDash([])
      ctx.globalAlpha = 0.9
      ctx.strokeStyle = pathData.color
      const dsPts: [number, number][] = downswing.map(p => [p.x * cssW, p.y * cssH])
      catmullRom(ctx, dsPts)
    }

    // Draw dots at each marked point
    ctx.setLineDash([])
    ctx.globalAlpha = 1
    sorted.forEach((p, i) => {
      const isImpact = i === lowestIdx
      ctx.beginPath()
      ctx.fillStyle = isImpact ? '#ffffff' : pathData.color
      ctx.arc(p.x * cssW, p.y * cssH, isImpact ? 6 : 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1
      ctx.stroke()
    })

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
      const size = 10
      ctx.fillStyle = pathData.color
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(ax - size * Math.cos(angle - Math.PI / 6), ay - size * Math.sin(angle - Math.PI / 6))
      ctx.lineTo(ax - size * Math.cos(angle + Math.PI / 6), ay - size * Math.sin(angle + Math.PI / 6))
      ctx.closePath()
      ctx.fill()
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
