'use client'

import { useEffect, useRef } from 'react'
import { POSE_EDGES, type Keypoint } from '@/hooks/golf/usePoseDetection'

interface Props {
  keypoints: Keypoint[]
  // Color of skeleton — caller can tint per video slot
  color?: string
  // Skip drawing keypoints with confidence below this threshold
  minScore?: number
}

export function PoseOverlay({ keypoints, color = '#00ff88', minScore = 0.3 }: Props) {
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
    if (keypoints.length === 0) return

    ctx.save()
    ctx.scale(dpr, dpr)

    // Bones — connect keypoints with thin lines
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowBlur = 6
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
    for (const [a, b] of POSE_EDGES) {
      const ka = keypoints[a]
      const kb = keypoints[b]
      if (!ka || !kb) continue
      if (ka.score < minScore || kb.score < minScore) continue
      ctx.beginPath()
      ctx.moveTo(ka.x * cssW, ka.y * cssH)
      ctx.lineTo(kb.x * cssW, kb.y * cssH)
      ctx.stroke()
    }
    ctx.shadowBlur = 0

    // Joint dots
    for (const k of keypoints) {
      if (k.score < minScore) continue
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(k.x * cssW, k.y * cssH, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(k.x * cssW, k.y * cssH, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }, [keypoints, color, minScore])

  // Match the canvas pixel size to its CSS size so the skeleton stays sharp
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
      style={{ zIndex: 4 }}
    />
  )
}
