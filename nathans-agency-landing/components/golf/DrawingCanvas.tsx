'use client'

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import type { DrawingState, Point, Annotation } from '@/lib/golf/annotationTypes'
import { drawInProgress } from '@/lib/golf/drawingUtils'

const ERASE_THRESHOLD = 0.06 // normalized distance to count as "hit"

interface Props {
  drawingState: DrawingState
  clubPathActive: boolean
  annotations: Annotation[]
  onAnnotationComplete: (ann: Omit<Annotation, 'id' | 'source'>) => void
  onEraseAnnotation: (id: string) => void
  onStartDrawing: (p: Point) => void
  onContinueDrawing: (p: Point) => void
  onFinishDrawing: () => Point[] | null
  onCancelDrawing: () => void
  onClubPathClick: (p: Point) => void
  currentTime: number
}

export const DrawingCanvas = forwardRef<HTMLCanvasElement, Props>(
  (
    {
      drawingState,
      clubPathActive,
      annotations,
      onAnnotationComplete,
      onEraseAnnotation,
      onStartDrawing,
      onContinueDrawing,
      onFinishDrawing,
      onCancelDrawing,
      onClubPathClick,
      currentTime,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isPointerDown = useRef(false)
    const clickCountRef = useRef(0)
    const hoverRef = useRef<{ x: number; y: number } | null>(null)

    useImperativeHandle(ref, () => canvasRef.current!, [])

    const getPoint = useCallback((e: PointerEvent): Point => {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      return {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      }
    }, [])

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

    const drawHoverCrosshair = (
      ctx: CanvasRenderingContext2D, x: number, y: number, color: string,
    ) => {
      const r = 10
      ctx.save()
      ctx.globalAlpha = 0.85
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.shadowBlur = 8
      ctx.shadowColor = color
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x - r - 4, y); ctx.lineTo(x + r + 4, y)
      ctx.moveTo(x, y - r - 4); ctx.lineTo(x, y + r + 4)
      ctx.stroke()
      ctx.restore()
    }

    const redrawCanvas = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const dpr = window.devicePixelRatio || 1
      const cssW = canvas.width / dpr
      const cssH = canvas.height / dpr
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.scale(dpr, dpr)

      if (clubPathActive) {
        const h = hoverRef.current
        if (h) drawHoverCrosshair(ctx, h.x * cssW, h.y * cssH, '#ffff00')
      } else if (drawingState.activeTool === 'angle') {
        // Render any committed clicks first
        if (drawingState.currentPoints.length > 0) {
          drawInProgress(
            ctx, 'angle', drawingState.currentPoints,
            { color: drawingState.color, strokeWidth: drawingState.strokeWidth, opacity: 0.9 },
            cssW, cssH,
          )
        }
        // Hover preview: dashed line from last placed click to cursor
        const h = hoverRef.current
        if (h && drawingState.isDrawing && drawingState.currentPoints.length > 0) {
          const last = drawingState.currentPoints[drawingState.currentPoints.length - 1]
          ctx.save()
          ctx.setLineDash([5, 5])
          ctx.globalAlpha = 0.55
          ctx.strokeStyle = drawingState.color
          ctx.lineWidth = drawingState.strokeWidth
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(last.x * cssW, last.y * cssH)
          ctx.lineTo(h.x * cssW, h.y * cssH)
          ctx.stroke()
          ctx.restore()
        }
        if (h) drawHoverCrosshair(ctx, h.x * cssW, h.y * cssH, drawingState.color)
      } else if (drawingState.currentPoints.length > 0) {
        drawInProgress(
          ctx,
          drawingState.activeTool,
          drawingState.currentPoints,
          { color: drawingState.color, strokeWidth: drawingState.strokeWidth, opacity: 0.9 },
          cssW,
          cssH
        )
      }
      ctx.restore()
    }, [drawingState, clubPathActive])

    useEffect(() => { redrawCanvas() }, [redrawCanvas])

    const commitAnnotation = useCallback(
      (points: Point[]) => {
        if (points.length === 0) return
        onAnnotationComplete({
          tool: drawingState.activeTool,
          points,
          style: {
            color: drawingState.color,
            strokeWidth: drawingState.strokeWidth,
            opacity: 0.9,
          },
          frameTime: drawingState.isPersistent ? undefined : currentTime,
        })
      },
      [drawingState, currentTime, onAnnotationComplete]
    )

    const findAnnotationAt = useCallback((p: Point): string | null => {
      let bestId: string | null = null
      let bestDist = ERASE_THRESHOLD
      for (const ann of annotations) {
        for (const pt of ann.points) {
          const d = Math.hypot(p.x - pt.x, p.y - pt.y)
          if (d < bestDist) { bestDist = d; bestId = ann.id }
        }
      }
      return bestId
    }, [annotations])

    const eraseAt = useCallback(
      (p: Point) => {
        const id = findAnnotationAt(p)
        if (id) onEraseAnnotation(id)
      },
      [findAnnotationAt, onEraseAnnotation]
    )

    const onPointerDown = useCallback(
      (e: PointerEvent) => {
        e.preventDefault()
        const p = getPoint(e)

        // Club path tracking mode — just record the click
        if (clubPathActive) {
          onClubPathClick(p)
          return
        }

        if (drawingState.activeTool === 'eraser') {
          isPointerDown.current = true
          eraseAt(p)
          return
        }

        isPointerDown.current = true

        if (drawingState.activeTool === 'angle') {
          clickCountRef.current += 1
          if (clickCountRef.current === 1) {
            onStartDrawing(p)
          } else if (clickCountRef.current === 2) {
            onContinueDrawing(p)
          } else {
            onContinueDrawing(p)
            const pts = onFinishDrawing()
            if (pts) commitAnnotation(pts)
            clickCountRef.current = 0
          }
        } else {
          onStartDrawing(p)
        }
      },
      [clubPathActive, drawingState.activeTool, getPoint, onStartDrawing, onContinueDrawing, onFinishDrawing, commitAnnotation, onClubPathClick, eraseAt]
    )

    const onPointerMove = useCallback(
      (e: PointerEvent) => {
        if (clubPathActive) {
          hoverRef.current = getPoint(e)
          redrawCanvas()
          return
        }
        if (drawingState.activeTool === 'angle') {
          // Track hover separately — DON'T call onContinueDrawing during move
          // (that was corrupting the points array between clicks).
          hoverRef.current = getPoint(e)
          redrawCanvas()
          return
        }
        if (drawingState.activeTool === 'eraser') {
          if (isPointerDown.current) eraseAt(getPoint(e))
          return
        }
        if (isPointerDown.current && drawingState.isDrawing) {
          onContinueDrawing(getPoint(e))
        }
      },
      [clubPathActive, drawingState, getPoint, onContinueDrawing, eraseAt, redrawCanvas]
    )

    const onPointerUp = useCallback(
      (e: PointerEvent) => {
        if (!isPointerDown.current) return
        isPointerDown.current = false
        if (
          clubPathActive ||
          drawingState.activeTool === 'angle' ||
          drawingState.activeTool === 'eraser'
        ) return
        const p = getPoint(e)
        onContinueDrawing(p)
        const pts = onFinishDrawing()
        if (pts && pts.length > 0) commitAnnotation(pts)
      },
      [clubPathActive, drawingState.activeTool, getPoint, onContinueDrawing, onFinishDrawing, commitAnnotation]
    )

    const onKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCancelDrawing()
          clickCountRef.current = 0
        }
      },
      [onCancelDrawing]
    )

    const onPointerLeave = useCallback(() => {
      if (clubPathActive || drawingState.activeTool === 'angle') {
        hoverRef.current = null
        redrawCanvas()
      }
    }, [clubPathActive, drawingState.activeTool, redrawCanvas])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.addEventListener('pointerdown', onPointerDown)
      canvas.addEventListener('pointermove', onPointerMove)
      canvas.addEventListener('pointerup', onPointerUp)
      canvas.addEventListener('pointerleave', onPointerLeave)
      window.addEventListener('keydown', onKeyDown)
      return () => {
        canvas.removeEventListener('pointerdown', onPointerDown)
        canvas.removeEventListener('pointermove', onPointerMove)
        canvas.removeEventListener('pointerup', onPointerUp)
        canvas.removeEventListener('pointerleave', onPointerLeave)
        window.removeEventListener('keydown', onKeyDown)
      }
    }, [onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onKeyDown])

    const passThrough = !clubPathActive && drawingState.activeTool === 'select'
    const cursor = clubPathActive
      ? 'crosshair'
      : drawingState.activeTool === 'select'
      ? 'default'
      : drawingState.activeTool === 'eraser'
      ? 'cell'
      : drawingState.activeTool === 'freehand'
      ? 'cell'
      : 'crosshair'

    return (
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none"
        style={{
          zIndex: 2,
          cursor,
          touchAction: 'none',
          pointerEvents: passThrough ? 'none' : 'auto',
        }}
      />
    )
  }
)

DrawingCanvas.displayName = 'DrawingCanvas'
