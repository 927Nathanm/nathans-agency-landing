'use client'

import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react'
import type { Annotation } from '@/lib/golf/annotationTypes'
import { drawAnnotation } from '@/lib/golf/drawingUtils'

interface Props {
  annotations: Annotation[]
  currentTime?: number
  isPersistent?: boolean
}

export const AnnotationLayer = forwardRef<HTMLCanvasElement, Props>(
  ({ annotations, currentTime = 0, isPersistent = true }, ref) => {
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
      ctx.restore()
    }, [annotations, currentTime, isPersistent])

    // Redraw whenever annotations/time change
    useEffect(() => { drawAll() }, [drawAll])

    // Redraw when the canvas is resized — VideoPanel sets canvas.width/height which
    // clears it, so we need to re-render. ResizeObserver on the canvas picks up the
    // style change that VideoPanel makes alongside the pixel-size change.
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const obs = new ResizeObserver(() => drawAll())
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
