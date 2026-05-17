'use client'

import { useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react'
import { Play, Pause, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VideoUploader } from './VideoUploader'
import { AnnotationLayer } from './AnnotationLayer'
import { DrawingCanvas } from './DrawingCanvas'
import { ClubPathOverlay } from './ClubPathOverlay'
import { PoseOverlay } from './PoseOverlay'
import type { Annotation, DrawingState, Point } from '@/lib/golf/annotationTypes'
import type { ClubPathData } from '@/hooks/golf/useClubPath'
import type { Keypoint } from '@/hooks/golf/usePoseDetection'

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
  clubPathActive: boolean
  clubPathData: ClubPathData
  onFileSelected: (file: File, slot: 1 | 2) => void
  onAnnotationComplete: (ann: Omit<Annotation, 'id' | 'source'>, slot: 1 | 2) => void
  onStartDrawing: (p: Point) => void
  onContinueDrawing: (p: Point) => void
  onFinishDrawing: () => Point[] | null
  onCancelDrawing: () => void
  onVideoLoaded: (slot: 1 | 2) => void
  onClubPathClick: (p: Point, time: number, slot: 1 | 2) => void
  onEraseAnnotation: (id: string, slot: 1 | 2) => void
  selectedAnnotationId: string | null
  onSelectAnnotation: (id: string | null, slot: 1 | 2) => void
  onUpdateAnnotationPoint: (id: string, slot: 1 | 2, pointIdx: number, p: Point) => void
  onMoveAnnotation: (id: string, slot: 1 | 2, dx: number, dy: number) => void
  poseKeypoints?: Keypoint[]
  label: string
  // Independent mode: clicking the video toggles play/pause for this slot
  isIndependent?: boolean
  isPlaying?: boolean
  onTogglePlay?: () => void
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
      clubPathActive,
      clubPathData,
      onFileSelected,
      onAnnotationComplete,
      onStartDrawing,
      onContinueDrawing,
      onFinishDrawing,
      onCancelDrawing,
      onVideoLoaded,
      onClubPathClick,
      onEraseAnnotation,
      selectedAnnotationId,
      onSelectAnnotation,
      onUpdateAnnotationPoint,
      onMoveAnnotation,
      poseKeypoints,
      label,
      isIndependent,
      isPlaying,
      onTogglePlay,
    },
    ref
  ) => {
    const annotationCanvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [videoAspect, setVideoAspect] = useState<number | null>(null)
    const [hoveringVideo, setHoveringVideo] = useState(false)
    const [zoom, setZoom] = useState(1)

    useImperativeHandle(ref, () => ({
      annotationCanvasRef,
    }))

    // Detect video's natural aspect ratio so the panel can size itself to fit
    // the video (no awkward letterbox bars / squished frames in dual-view).
    useEffect(() => {
      const video = videoRef.current
      if (!video) return
      const handle = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setVideoAspect(video.videoWidth / video.videoHeight)
        }
      }
      if (video.readyState >= 1) handle()
      video.addEventListener('loadedmetadata', handle)
      return () => video.removeEventListener('loadedmetadata', handle)
    }, [videoRef, objectUrl])

    // Note: AnnotationLayer and DrawingCanvas own their own ResizeObservers
    // and pixel-dimension setup. Don't duplicate it here — the previous
    // version raced with the canvas ref attachment and left the canvas at
    // the default 300x150 on first mount.

    const handleAnnotationComplete = useCallback(
      (ann: Omit<Annotation, 'id' | 'source'>) => {
        onAnnotationComplete(ann, slot)
      },
      [slot, onAnnotationComplete]
    )

    const handleClubPathClick = useCallback(
      (p: Point) => {
        onClubPathClick(p, currentTime, slot)
      },
      [slot, currentTime, onClubPathClick]
    )

    const handleEraseAnnotation = useCallback(
      (id: string) => {
        onEraseAnnotation(id, slot)
      },
      [slot, onEraseAnnotation]
    )

    const handleSelectAnnotation = useCallback(
      (id: string | null) => onSelectAnnotation(id, slot),
      [slot, onSelectAnnotation],
    )

    const handleUpdateAnnotationPoint = useCallback(
      (id: string, idx: number, p: Point) => onUpdateAnnotationPoint(id, slot, idx, p),
      [slot, onUpdateAnnotationPoint],
    )

    const handleMoveAnnotation = useCallback(
      (id: string, dx: number, dy: number) => onMoveAnnotation(id, slot, dx, dy),
      [slot, onMoveAnnotation],
    )

    const handleFileChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) onFileSelected(file, slot)
        e.target.value = ''
      },
      [slot, onFileSelected]
    )

    const isActiveSlot = drawingState.targetVideo === slot || drawingState.targetVideo === 'both'

    return (
      <div className="flex flex-col h-full gap-1">
        <div className="flex items-center justify-between px-1 gap-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {label}
          </span>
          <div className="flex items-center gap-1">
            {objectUrl && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-zinc-400 hover:text-zinc-200"
                  onClick={() => setZoom(Math.max(1, zoom - 0.2))}
                  title="Zoom out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-zinc-400 w-8 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-zinc-400 hover:text-zinc-200"
                  onClick={() => setZoom(Math.min(3, zoom + 0.2))}
                  title="Zoom in"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
          {objectUrl && (
            <>
              <button
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                Change video
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </>
          )}
        </div>

        {/* Outer wrapper centers the inner video container which is sized to
            match the loaded video's aspect ratio — eliminates stretched/squished
            panels regardless of orientation. */}
        <div className="flex-1 min-h-0 flex items-center justify-center">
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-lg bg-black"
          style={
            objectUrl && videoAspect
              ? { aspectRatio: String(videoAspect), height: '100%', maxWidth: '100%' }
              : { width: '100%', height: '100%' }
          }
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
                  transform: `${isMirrored ? 'scaleX(-1) ' : ''}scale(${zoom})`,
                  transformOrigin: 'center',
                  zIndex: 0,
                }}
                onLoadedMetadata={() => onVideoLoaded(slot)}
              />
              <AnnotationLayer
                ref={annotationCanvasRef}
                annotations={annotations}
                currentTime={currentTime}
                isPersistent={isPersistent}
                selectedId={selectedAnnotationId}
              />
              <ClubPathOverlay pathData={clubPathData} />
              {/* Independent-mode click-to-play/pause overlay */}
              {isIndependent && onTogglePlay && !isActiveSlot && !clubPathActive && (
                <div
                  className="absolute inset-0 flex items-center justify-center group"
                  style={{ zIndex: 5, cursor: 'pointer' }}
                  onMouseEnter={() => setHoveringVideo(true)}
                  onMouseLeave={() => setHoveringVideo(false)}
                  onClick={onTogglePlay}
                >
                  <div className={`rounded-full bg-black/50 p-3 transition-opacity ${hoveringVideo ? 'opacity-80' : 'opacity-0'}`}>
                    {isPlaying
                      ? <Pause className="h-8 w-8 text-white" />
                      : <Play className="h-8 w-8 text-white" />}
                  </div>
                </div>
              )}
              {poseKeypoints && poseKeypoints.length > 0 && (
                <PoseOverlay keypoints={poseKeypoints} color={slot === 1 ? '#00ff88' : '#00cfff'} />
              )}
              {(isActiveSlot || clubPathActive) && (
                <DrawingCanvas
                  drawingState={drawingState}
                  clubPathActive={clubPathActive}
                  annotations={annotations}
                  selectedAnnotationId={selectedAnnotationId}
                  onAnnotationComplete={handleAnnotationComplete}
                  onEraseAnnotation={handleEraseAnnotation}
                  onSelectAnnotation={handleSelectAnnotation}
                  onUpdateAnnotationPoint={handleUpdateAnnotationPoint}
                  onMoveAnnotation={handleMoveAnnotation}
                  onStartDrawing={onStartDrawing}
                  onContinueDrawing={onContinueDrawing}
                  onFinishDrawing={onFinishDrawing}
                  onCancelDrawing={onCancelDrawing}
                  onClubPathClick={handleClubPathClick}
                  currentTime={currentTime}
                />
              )}
            </>
          )}
        </div>
        </div>
      </div>
    )
  }
)

VideoPanel.displayName = 'VideoPanel'
