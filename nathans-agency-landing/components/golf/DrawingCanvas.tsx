'use client'

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import type { DrawingState, Point, Annotation } from '@/lib/golf/annotationTypes'
import { drawInProgress } from '@/lib/golf/drawingUtils'

interface Props {
  drawingState: DrawingState
  onAnnotationComplete: (ann: Omit<Annotation, 'id' | 'source'>) => void
  onStartDrawing: (p: Point) => void
  onContinueDrawing: (p: Point) => void
  onFinishDrawing: () => Point[] | null
  onCancelDrawing: () => void
  currentTime: number
}

export const DrawingCanvas = forwardRef<HTMLCanvasElement, Props>(
  (
    {
      drawingState,
      onAnnotationComplete,
      onStartDrawing,
      onContinueDrawing,
      onFinishDrawing,
      onCancelDrawing,
      currentTime,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isPointerDown = useRef(false)
    const clickCountRef = useRef(0)

    useImperativeHandle(ref, () => canvasRef.current!, [])

    const getPoint = useCallback((e: PointerEvent): Point => {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      return {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      }
    }, [])

    // Resize handler
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

    // Redraw in-progress stroke
    useEffect(() => {
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
      if (drawingState.currentPoints.length > 0) {
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
    }, [drawingState])

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

    const onPointerDown = useCallback(
      (e: PointerEvent) => {
        if (drawingState.activeTool === 'select') return
        e.preventDefault()
        isPointerDown.current = true
        const p = getPoint(e)

        if (drawingState.activeTool === 'angle' || drawingState.activeTool === 'protractor') {
          // Multi-click tools
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
        } else if (drawingState.activeTool === 'freehand') {
          onStartDrawing(p)
        } else {
          onStartDrawing(p)
        }
      },
      [drawingState.activeTool, getPoint, onStartDrawing, onContinueDrawing, onFinishDrawing, commitAnnotation]
    )

    const onPointerMove = useCallback(
      (e: PointerEvent) => {
        if (drawingState.activeTool === 'select') return
        const p = getPoint(e)
        if (
          drawingState.activeTool === 'angle' ||
          drawingState.activeTool === 'protractor'
        ) {
          // preview arm as cursor moves
          if (drawingState.isDrawing) onContinueDrawing(p)
          return
        }
        if (isPointerDown.current && drawingState.isDrawing) {
          onContinueDrawing(p)
        }
      },
      [drawingState, getPoint, onContinueDrawing]
    )

    const onPointerUp = useCallback(
      (e: PointerEvent) => {
        if (!isPointerDown.current) return
        isPointerDown.current = false
        if (
          drawingState.activeTool === 'angle' ||
          drawingState.activeTool === 'protractor' ||
          drawingState.activeTool === 'select'
        )
          return
        const p = getPoint(e)
        onContinueDrawing(p)
        const pts = onFinishDrawing()
        if (pts && pts.length > 0) commitAnnotation(pts)
      },
      [drawingState.activeTool, getPoint, onContinueDrawing, onFinishDrawing, commitAnnotation]
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

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.addEventListener('pointerdown', onPointerDown)
      canvas.addEventListener('pointermove', onPointerMove)
      canvas.addEventListener('pointerup', onPointerUp)
      window.addEventListener('keydown', onKeyDown)
      return () => {
        canvas.removeEventListener('pointerdown', onPointerDown)
        canvas.removeEventListener('pointermove', onPointerMove)
        canvas.removeEventListener('pointerup', onPointerUp)
        window.removeEventListener('keydown', onKeyDown)
      }
    }, [onPointerDown, onPointerMove, onPointerUp, onKeyDown])

    const cursorMap: Record<string, string> = {
      select: 'default',
      line: 'crosshair',
      arrow: 'crosshair',
      plane: 'crosshair',
      circle: 'crosshair',
      rect: 'crosshair',
      freehand: 'pencil',
      angle: 'crosshair',
      protractor: 'crosshair',
    }

    return (
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none"
        style={{
          zIndex: 2,
          cursor: cursorMap[drawingState.activeTool] || 'crosshair',
          touchAction: 'none',
        }}
      />
    )
  }
)

DrawingCanvas.displayName = 'DrawingCanvas'
