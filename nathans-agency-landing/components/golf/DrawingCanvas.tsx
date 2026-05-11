'use client'

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import type { DrawingState, Point, Annotation } from '@/lib/golf/annotationTypes'
import { drawInProgress, hitTestAnnotation, hitTestHandle } from '@/lib/golf/drawingUtils'

const ERASE_THRESHOLD = 0.06   // normalized distance to count as a hit for erase
const HANDLE_HIT = 0.025       // ~12px on a typical video — handle drag radius
const SHAPE_HIT = 0.015        // ~7px — selection click radius near a shape

interface Props {
  drawingState: DrawingState
  clubPathActive: boolean
  annotations: Annotation[]
  selectedAnnotationId: string | null
  onAnnotationComplete: (ann: Omit<Annotation, 'id' | 'source'>) => void
  onEraseAnnotation: (id: string) => void
  onSelectAnnotation: (id: string | null) => void
  onUpdateAnnotationPoint: (id: string, pointIdx: number, p: Point) => void
  onMoveAnnotation: (id: string, dx: number, dy: number) => void
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
      selectedAnnotationId,
      onAnnotationComplete,
      onEraseAnnotation,
      onSelectAnnotation,
      onUpdateAnnotationPoint,
      onMoveAnnotation,
      onStartDrawing,
      onContinueDrawing,
      onFinishDrawing,
      onCancelDrawing,
      onClubPathClick,
      currentTime,
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isPointerDown = useRef(false)
    const clickCountRef = useRef(0)
    const hoverRef = useRef<{ x: number; y: number } | null>(null)
    // Drag state for select tool: either dragging a handle or moving the whole shape
    const dragRef = useRef<
      | { kind: 'handle'; id: string; pointIdx: number }
      | { kind: 'move'; id: string; lastX: number; lastY: number }
      | null
    >(null)

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
        if (drawingState.currentPoints.length > 0) {
          drawInProgress(
            ctx, 'angle', drawingState.currentPoints,
            { color: drawingState.color, strokeWidth: drawingState.strokeWidth, opacity: 0.9 },
            cssW, cssH,
          )
        }
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
          cssH,
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
      [drawingState, currentTime, onAnnotationComplete],
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
      [findAnnotationAt, onEraseAnnotation],
    )

    // Top-most annotation hit at point (iterate reverse — last drawn is on top)
    const findShapeAt = useCallback((p: Point): string | null => {
      for (let i = annotations.length - 1; i >= 0; i--) {
        if (hitTestAnnotation(p, annotations[i], SHAPE_HIT)) return annotations[i].id
      }
      return null
    }, [annotations])

    const onPointerDown = useCallback(
      (e: PointerEvent) => {
        e.preventDefault()
        const p = getPoint(e)
        const canvas = canvasRef.current

        // Club path tracking takes priority — every click adds a point
        if (clubPathActive) {
          onClubPathClick(p)
          return
        }

        // Select tool — handle drag, body drag, or selection change
        if (drawingState.activeTool === 'select') {
          if (selectedAnnotationId) {
            const sel = annotations.find(a => a.id === selectedAnnotationId)
            if (sel) {
              const handleIdx = hitTestHandle(p, sel, HANDLE_HIT)
              if (handleIdx !== null) {
                dragRef.current = { kind: 'handle', id: sel.id, pointIdx: handleIdx }
                canvas?.setPointerCapture(e.pointerId)
                return
              }
              if (hitTestAnnotation(p, sel, SHAPE_HIT)) {
                dragRef.current = { kind: 'move', id: sel.id, lastX: p.x, lastY: p.y }
                canvas?.setPointerCapture(e.pointerId)
                return
              }
            }
          }
          // Click on another shape selects it; click on empty deselects
          const hit = findShapeAt(p)
          onSelectAnnotation(hit)
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
      [
        clubPathActive, drawingState.activeTool, getPoint, onStartDrawing, onContinueDrawing,
        onFinishDrawing, commitAnnotation, onClubPathClick, eraseAt,
        selectedAnnotationId, annotations, findShapeAt, onSelectAnnotation,
      ],
    )

    const onPointerMove = useCallback(
      (e: PointerEvent) => {
        if (clubPathActive) {
          hoverRef.current = getPoint(e)
          redrawCanvas()
          return
        }

        // Drag interactions for select tool
        if (dragRef.current) {
          const p = getPoint(e)
          if (dragRef.current.kind === 'handle') {
            onUpdateAnnotationPoint(dragRef.current.id, dragRef.current.pointIdx, p)
          } else {
            const dx = p.x - dragRef.current.lastX
            const dy = p.y - dragRef.current.lastY
            onMoveAnnotation(dragRef.current.id, dx, dy)
            dragRef.current.lastX = p.x
            dragRef.current.lastY = p.y
          }
          return
        }

        if (drawingState.activeTool === 'angle') {
          hoverRef.current = getPoint(e)
          redrawCanvas()
          return
        }
        if (drawingState.activeTool === 'eraser') {
          if (isPointerDown.current) eraseAt(getPoint(e))
          return
        }
        if (drawingState.activeTool === 'select') {
          // No drag in progress — just update cursor by re-rendering
          return
        }
        if (isPointerDown.current && drawingState.isDrawing) {
          onContinueDrawing(getPoint(e))
        }
      },
      [
        clubPathActive, drawingState, getPoint, onContinueDrawing, eraseAt,
        redrawCanvas, onUpdateAnnotationPoint, onMoveAnnotation,
      ],
    )

    const onPointerUp = useCallback(
      (e: PointerEvent) => {
        // End any drag-in-progress for select tool
        if (dragRef.current) {
          canvasRef.current?.releasePointerCapture(e.pointerId)
          dragRef.current = null
          return
        }
        if (!isPointerDown.current) return
        isPointerDown.current = false
        if (
          clubPathActive ||
          drawingState.activeTool === 'angle' ||
          drawingState.activeTool === 'eraser' ||
          drawingState.activeTool === 'select'
        ) return
        const p = getPoint(e)
        onContinueDrawing(p)
        const pts = onFinishDrawing()
        if (pts && pts.length > 0) commitAnnotation(pts)
      },
      [clubPathActive, drawingState.activeTool, getPoint, onContinueDrawing, onFinishDrawing, commitAnnotation],
    )

    const onKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCancelDrawing()
          clickCountRef.current = 0
          if (selectedAnnotationId) onSelectAnnotation(null)
        } else if (
          drawingState.activeTool === 'select' &&
          (e.key === 'Delete' || e.key === 'Backspace') &&
          selectedAnnotationId
        ) {
          onEraseAnnotation(selectedAnnotationId)
          onSelectAnnotation(null)
        }
      },
      [onCancelDrawing, drawingState.activeTool, selectedAnnotationId, onEraseAnnotation, onSelectAnnotation],
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

    const cursor = clubPathActive
      ? 'crosshair'
      : drawingState.activeTool === 'select'
      ? (selectedAnnotationId ? 'move' : 'default')
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
  },
)

DrawingCanvas.displayName = 'DrawingCanvas'
