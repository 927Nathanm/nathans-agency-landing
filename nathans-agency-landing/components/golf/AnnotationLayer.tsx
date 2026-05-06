'use client'

import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
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

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const w = canvas.width
      const h = canvas.height
      const dpr = window.devicePixelRatio || 1
      const cssW = w / dpr
      const cssH = h / dpr

      ctx.clearRect(0, 0, w, h)
      ctx.save()
      ctx.scale(dpr, dpr)

      const visible = isPersistent
        ? annotations
        : annotations.filter(
            ann =>
              ann.frameTime === undefined ||
              Math.abs(ann.frameTime - currentTime) < 1 / 30
          )

      for (const ann of visible) {
        drawAnnotation(ctx, ann, cssW, cssH)
      }
      ctx.restore()
    }, [annotations, currentTime, isPersistent])

    return (
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 w-full h-full"
        style={{ zIndex: 1 }}
      />
    )
  }
)

AnnotationLayer.displayName = 'AnnotationLayer'
