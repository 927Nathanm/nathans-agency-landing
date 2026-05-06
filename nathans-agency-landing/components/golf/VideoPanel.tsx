'use client'

import { useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react'
import { VideoUploader } from './VideoUploader'
import { AnnotationLayer } from './AnnotationLayer'
import { DrawingCanvas } from './DrawingCanvas'
import type { Annotation, DrawingState } from '@/lib/golf/annotationTypes'

export interface VideoPanelHandle {
  annotationCanvasRef: React.RefObject<HTMLCanvasElement | null>
}

interface Props {
  slot: 1 | 2
  videoRef: React.RefObject<HTMLVideoElement | null>
  objectUrl: string | null
  isMirrored: boolean
  annotations: Annotation[]
  currentTime: number
  drawingState: DrawingState
  isPersistent: boolean
  onFileSelected: (file: File, slot: 1 | 2) => void
  onAnnotationComplete: (ann: Omit<Annotation, 'id' | 'source'>, slot: 1 | 2) => void
  onStartDrawing: (p: import('@/lib/golf/annotationTypes').Point) => void
  onContinueDrawing: (p: import('@/lib/golf/annotationTypes').Point) => void
  onFinishDrawing: () => import('@/lib/golf/annotationTypes').Point[] | null
  onCancelDrawing: () => void
  onVideoLoaded: (slot: 1 | 2) => void
  label: string
}

export const VideoPanel = forwardRef<VideoPanelHandle, Props>(
  (
    {
      slot,
      videoRef,
      objectUrl,
      isMirrored,
      annotations,
      currentTime,
      drawingState,
      isPersistent,
      onFileSelected,
      onAnnotationComplete,
      onStartDrawing,
      onContinueDrawing,
      onFinishDrawing,
      onCancelDrawing,
      onVideoLoaded,
      label,
    },
    ref
  ) => {
    const annotationCanvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => ({
      annotationCanvasRef,
    }))

    // Keep annotation canvas sized to container
    useEffect(() => {
      const container = containerRef.current
      if (!container) return
      const obs = new ResizeObserver(([entry]) => {
        const canvas = annotationCanvasRef.current
        if (!canvas) return
        const { width, height } = entry.contentRect
        const dpr = window.devicePixelRatio || 1
        canvas.width = width * dpr
        canvas.height = height * dpr
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
      })
      obs.observe(container)
      return () => obs.disconnect()
    }, [])

    const handleAnnotationComplete = useCallback(
      (ann: Omit<Annotation, 'id' | 'source'>) => {
        onAnnotationComplete(ann, slot)
      },
      [slot, onAnnotationComplete]
    )

    const isActiveSlot = drawingState.targetVideo === slot || drawingState.targetVideo === 'both'

    return (
      <div className="flex flex-col h-full gap-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {label}
          </span>
          {objectUrl && (
            <button
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              onClick={() => onFileSelected(new File([], ''), slot)}
            >
              Change
            </button>
          )}
        </div>

        <div
          ref={containerRef}
          className="relative flex-1 overflow-hidden rounded-lg bg-black"
          style={{ minHeight: 0 }}
        >
          {!objectUrl ? (
            <VideoUploader
              label={label}
              onFileSelected={f => onFileSelected(f, slot)}
            />
          ) : (
            <>
              <video
                ref={videoRef as React.RefObject<HTMLVideoElement>}
                src={objectUrl}
                className="absolute inset-0 w-full h-full object-contain"
                playsInline
                preload="auto"
                style={{
                  transform: isMirrored ? 'scaleX(-1)' : undefined,
                  zIndex: 0,
                }}
                onLoadedMetadata={() => onVideoLoaded(slot)}
              />
              <AnnotationLayer
                ref={annotationCanvasRef}
                annotations={annotations}
                currentTime={currentTime}
                isPersistent={isPersistent}
              />
              {isActiveSlot && (
                <DrawingCanvas
                  drawingState={drawingState}
                  onAnnotationComplete={handleAnnotationComplete}
                  onStartDrawing={onStartDrawing}
                  onContinueDrawing={onContinueDrawing}
                  onFinishDrawing={onFinishDrawing}
                  onCancelDrawing={onCancelDrawing}
                  currentTime={currentTime}
                />
              )}
            </>
          )}
        </div>
      </div>
    )
  }
)

VideoPanel.displayName = 'VideoPanel'
