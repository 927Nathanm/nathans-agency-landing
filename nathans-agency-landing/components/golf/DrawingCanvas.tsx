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

    // Draw crosshair + in-progress stroke
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
        // Draw hover crosshair so user can see exactly where they're clicking
        const h = hoverRef.current
        if (h) {
          const px = h.x * cssW
          const py = h.y * cssH
          const r = 10
          ctx.save()
          ctx.globalAlpha = 0.85
          ctx.strokeStyle = '#ffff00'
          ctx.lineWidth = 1.5
          ctx.shadowBlur = 8
          ctx.shadowColor = '#ffff00'
          ctx.beginPath()
          ctx.arc(px, py, r, 0, Math.PI * 2)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(px - r - 4, py); ctx.lineTo(px + r + 4, py)
          ctx.moveTo(px, py - r - 4); ctx.lineTo(px, py + r + 4)
          ctx.stroke()
          ctx.restore()
        }
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

    const eraseAt = useCallback(
      (p: Point) => {
        let bestId: string | null = null
        let bestDist = ERASE_THRESHOLD
        for (const ann of annotations) {
          for (const pt of ann.points) {
            const d = Math.hypot(p.x - pt.x, p.y - pt.y)
            if (d < bestDist) { bestDist = d; bestId = ann.id }
          }
        }
        if (bestId) onEraseAnnotation(bestId)
      },
      [annotations, onEraseAnnotation]
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

        if (drawingState.activeTool === 'angle' || drawingState.activeTool === 'protractor') {
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
        if (drawingState.activeTool === 'eraser') {
          if (isPointerDown.current) eraseAt(getPoint(e))
          return
        }
        const p = getPoint(e)
        if (drawingState.activeTool === 'angle' || drawingState.activeTool === 'protractor') {
          if (drawingState.isDrawing) onContinueDrawing(p)
          return
        }
        if (isPointerDown.current && drawingState.isDrawing) {
          onContinueDrawing(p)
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
          drawingState.activeTool === 'protractor' ||
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
      if (clubPathActive) { hoverRef.current = null; redrawCanvas() }
    }, [clubPathActive, redrawCanvas])

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

    const cursor = clubPathActive
      ? 'crosshair'
      : drawingState.activeTool === 'eraser'
      ? 'cell'
      : drawingState.activeTool === 'freehand'
      ? 'cell'
      : 'crosshair'

    return (
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none"
        style={{ zIndex: 2, cursor, touchAction: 'none' }}
      />
    )
  }
)

DrawingCanvas.displayName = 'DrawingCanvas'
