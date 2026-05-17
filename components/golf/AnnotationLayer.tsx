'use client'

import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react'
import type { Annotation } from '@/lib/golf/annotationTypes'
import { drawAnnotation, drawHandles } from '@/lib/golf/drawingUtils'

interface Props {
  annotations: Annotation[]
  currentTime?: number
  isPersistent?: boolean
  selectedId?: string | null
}

export const AnnotationLayer = forwardRef<HTMLCanvasElement, Props>(
  ({ annotations, currentTime = 0, isPersistent = true, selectedId = null }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useImperativeHandle(ref, () => canvasRef.current!, [])

    const drawAll = useCallback(() => {
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

      const visible = isPersistent
        ? annotations
        : annotations.filter(
            ann =>
              ann.frameTime === undefined ||
              Math.abs(ann.frameTime - currentTime) < 1 / 30,
          )

      for (const ann of visible) {
        drawAnnotation(ctx, ann, cssW, cssH)
      }

      // Render handles on top of the selected annotation
      const sel = selectedId ? visible.find(a => a.id === selectedId) : null
      if (sel) drawHandles(ctx, sel, cssW, cssH)

      ctx.restore()
    }, [annotations, currentTime, isPersistent, selectedId])

    useEffect(() => { drawAll() }, [drawAll])

    // Own the canvas pixel dimensions here so they're guaranteed to match the
    // CSS size on first paint. Previously VideoPanel set canvas.width/height
    // via a ResizeObserver, but on initial mount the canvas ref wasn't attached
    // yet, so the canvas kept the HTML default 300x150 — which made everything
    // drawn on it appear scaled up until the next layout change forced a
    // resize. Doing it here removes that race.
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const obs = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect
        const dpr = window.devicePixelRatio || 1
        canvas.width = width * dpr
        canvas.height = height * dpr
        drawAll()
      })
      obs.observe(canvas)
      return () => obs.disconnect()
    }, [drawAll])

    return (
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 w-full h-full"
        style={{ zIndex: 1 }}
      />
    )
  },
)

AnnotationLayer.displayName = 'AnnotationLayer'
