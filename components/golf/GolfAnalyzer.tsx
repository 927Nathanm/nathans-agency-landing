'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { VideoPanel, type VideoPanelHandle } from './VideoPanel'
import { VideoControls } from './VideoControls'
import { VideoScrubber } from './VideoScrubber'
import { DrawingToolbar } from './DrawingToolbar'
import { ClubPathToolbar } from './ClubPathToolbar'
import { AIChatPanel } from './AIChatPanel'
import { HelpModal } from './HelpModal'
import { useVideoSync } from '@/hooks/golf/useVideoSync'
import { useDrawing } from '@/hooks/golf/useDrawing'
import { useAnnotations } from '@/hooks/golf/useAnnotations'
import { useAIAnalysis } from '@/hooks/golf/useAIAnalysis'
import { useClubPath } from '@/hooks/golf/useClubPath'
import { captureVideoFrame } from '@/lib/golf/videoUtils'
import type { Annotation, Point } from '@/lib/golf/annotationTypes'
import { usePoseDetection } from '@/hooks/golf/usePoseDetection'
import { useSwingMeasurements } from '@/hooks/golf/useSwingMeasurements'
import { useSwingPhases } from '@/hooks/golf/useSwingPhases'
import { buildSwingPlaneAnnotation, buildHandPathAnnotation } from '@/lib/golf/aiAnnotations'
import type { ToolHandlers, ToolHandlerResult } from '@/hooks/golf/useAIAnalysis'
import { Layers, Columns2, Camera, HelpCircle, Link2, Link2Off, RefreshCw, PersonStanding, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

const STORAGE_KEY = 'swingiq-annotations-v1'

export function GolfAnalyzer() {
  const [video1Url, setVideo1Url] = useState<string | null>(null)
  const [video2Url, setVideo2Url] = useState<string | null>(null)
  const [overlayOpacity, setOverlayOpacity] = useState(50)
  const [showOverlay, setShowOverlay] = useState(false)
  const [mode, setMode] = useState<'dual' | 'single'>('dual')
  const [helpOpen, setHelpOpen] = useState(false)

  const urlRef1 = useRef<string | null>(null)
  const urlRef2 = useRef<string | null>(null)

  const panel1Ref = useRef<VideoPanelHandle>(null)
  const panel2Ref = useRef<VideoPanelHandle>(null)

  const sync = useVideoSync()
  const pose1 = usePoseDetection()
  const pose2 = usePoseDetection()
  const drawing = useDrawing()
  const annotations = useAnnotations()
  const clubPath = useClubPath()

  const swing1 = useSwingMeasurements(pose1)
  const swing2 = useSwingMeasurements(pose2)
  const phases1 = useSwingPhases(swing1)
  const phases2 = useSwingPhases(swing2)

  // Tool handlers: the LLM emits a tool_use; this code computes the geometry
  // from local pose + club-path state and returns an Annotation to render.
  const toolHandlers: ToolHandlers = {
    markSwingPlane: (): ToolHandlerResult => {
      const { p1Frame } = phases1.detect()
      if (p1Frame === null) {
        return { ok: false, error: 'No pose frames recorded yet. Enable Pose V1 and play through your swing first.' }
      }
      const poseFrame = swing1.getKeypointsAt(p1Frame)
      if (!poseFrame) {
        return { ok: false, error: 'No pose keypoints available at the detected address frame.' }
      }
      const firstClubPoint = clubPath.path1.points[0]
      const v = sync.videoRef1.current
      const dims = v && v.videoWidth > 0
        ? { width: v.videoWidth, height: v.videoHeight }
        : { width: 1920, height: 1080 }
      const ann = buildSwingPlaneAnnotation({
        poseFrame,
        clubPathFirstPoint: firstClubPoint ? { x: firstClubPoint.x, y: firstClubPoint.y } : undefined,
        videoDims: dims,
      })
      if (!ann) {
        return { ok: false, error: 'Could not compute swing plane — hands or feet weren\'t detected clearly at address.' }
      }
      return { ok: true, annotation: ann }
    },
    markHandPath: (input): ToolHandlerResult => {
      const series = swing1.getSeries()
      if (series.length < 5) {
        return { ok: false, error: 'Not enough pose frames recorded yet. Enable Pose V1 and play through your swing.' }
      }
      const handArg = (input as { hand?: 'lead' | 'trail' } | undefined)?.hand
      const ann = buildHandPathAnnotation({ series, hand: handArg })
      if (!ann) {
        return { ok: false, error: 'Hand wasn\'t measurable in enough frames to draw a path. Check that the body is visible throughout the swing.' }
      }
      return { ok: true, annotation: ann }
    },
  }

  const ai = useAIAnalysis(sync.currentTime, toolHandlers)

  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const { a1, a2 } = JSON.parse(raw) as { a1: Annotation[]; a2: Annotation[] }
        if (a1 && a2) annotations.restoreAll(a1, a2)
      }
    } catch { /* corrupt or quota */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!restoredRef.current) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          a1: annotations.annotations1,
          a2: annotations.annotations2,
        }))
      } catch { /* ignore */ }
    }, 350)
    return () => clearTimeout(t)
  }, [annotations.annotations1, annotations.annotations2])

  const handleSnapshot = useCallback(() => {
    const video = sync.videoRef1.current
    const annCanvas = panel1Ref.current?.annotationCanvasRef.current
    if (!video) return
    const dataUrl = captureVideoFrame(video, annCanvas, 0.95)
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `swing-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.jpg`
    a.click()
  }, [sync.videoRef1])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        setHelpOpen(o => !o)
        e.preventDefault()
      } else if (e.key === 'Escape' && helpOpen) {
        setHelpOpen(false)
      } else if ((e.key === 's' || e.key === 'S') && !e.metaKey && !e.ctrlKey) {
        handleSnapshot()
      } else if (e.key === ' ') {
        sync.togglePlay()
        e.preventDefault()
      } else if (e.key === 'ArrowLeft') {
        sync.stepFrame(-1, e.shiftKey ? 20 : e.altKey ? 2 : 1)
        e.preventDefault()
      } else if (e.key === 'ArrowRight') {
        sync.stepFrame(1, e.shiftKey ? 20 : e.altKey ? 2 : 1)
        e.preventDefault()
      } else if (e.key === 'a' || e.key === 'A') {
        sync.setLoopPoint('a')
      } else if (e.key === 'b' || e.key === 'B') {
        sync.setLoopPoint('b')
      } else if (e.key === 'l' || e.key === 'L') {
        sync.clearLoop()
      } else if (e.key === 'm' || e.key === 'M') {
        sync.toggleMirror(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [helpOpen, handleSnapshot, sync])

  // Pose detection loops — run at ~10 fps so detection doesn't block playback
  useEffect(() => {
    if (!pose1.enabled) return
    let rafId: number
    const loop = () => {
      pose1.detect(sync.videoRef1.current)
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [pose1.enabled, pose1.detect, sync.videoRef1])

  useEffect(() => {
    if (!pose2.enabled) return
    let rafId: number
    const loop = () => {
      pose2.detect(sync.videoRef2.current)
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [pose2.enabled, pose2.detect, sync.videoRef2])

  const handleFileSelected = useCallback((file: File, slot: 1 | 2) => {
    if (!file.name) return
    if (slot === 1) {
      if (urlRef1.current) URL.revokeObjectURL(urlRef1.current)
      const url = URL.createObjectURL(file)
      urlRef1.current = url
      setVideo1Url(url)
      pose1.clearMeasurements()
    } else {
      if (urlRef2.current) URL.revokeObjectURL(urlRef2.current)
      const url = URL.createObjectURL(file)
      urlRef2.current = url
      setVideo2Url(url)
      setMode('dual')
      drawing.setTargetVideo('both')
      pose2.clearMeasurements()
    }
  }, [drawing, pose1.clearMeasurements, pose2.clearMeasurements])

  const handleAnnotationComplete = useCallback(
    (ann: Omit<Annotation, 'id' | 'source'>, slot: 1 | 2) => {
      const full: Annotation = { ...ann, id: crypto.randomUUID(), source: 'user' }
      const target = drawing.drawingState.targetVideo
      if (target === 'both') {
        annotations.addAnnotationToSlot(full, 1)
        annotations.addAnnotationToSlot(full, 2)
      } else {
        annotations.addAnnotationToSlot(full, slot)
      }
    },
    [drawing.drawingState.targetVideo, annotations.addAnnotationToSlot]
  )

  const handleClubPathClick = useCallback(
    (p: Point, time: number, slot: 1 | 2) => {
      clubPath.addPoint(p, time, slot)
    },
    [clubPath.addPoint]
  )

  const handleEraseAnnotation = useCallback(
    (id: string, slot: 1 | 2) => {
      annotations.removeAnnotationFromSlot(id, slot)
    },
    [annotations.removeAnnotationFromSlot]
  )

  const handleSelectAnnotation = useCallback(
    (id: string | null, slot: 1 | 2) => annotations.selectAnnotation(id, slot),
    [annotations.selectAnnotation],
  )

  const handleUpdateAnnotationPoint = useCallback(
    (id: string, slot: 1 | 2, idx: number, p: Point) =>
      annotations.updateAnnotationPoint(id, slot, idx, p),
    [annotations.updateAnnotationPoint],
  )

  const handleMoveAnnotation = useCallback(
    (id: string, slot: 1 | 2, dx: number, dy: number) =>
      annotations.moveAnnotation(id, slot, dx, dy),
    [annotations.moveAnnotation],
  )

  const handleSendMessage = useCallback(
    async (text: string, includeSwingData: boolean) => {
      if (!includeSwingData) {
        await ai.sendMessage(text)
        return
      }
      const measurements1 = pose1.getMeasurements()
      const measurements2 = video2Url ? pose2.getMeasurements() : []
      const p1 = phases1.detect()
      const p2 = video2Url ? phases2.detect() : { p1Frame: null }
      await ai.sendMessage(text, {
        measurements1,
        measurements2,
        fps: sync.fps,
        cameraAngle: 'unknown',
        phases1: { p1Frame: p1.p1Frame },
        phases2: { p1Frame: p2.p1Frame },
        hasClubPath1: clubPath.path1.points.length > 0,
        hasClubPath2: clubPath.path2.points.length > 0,
      })
    },
    [
      video2Url,
      ai.sendMessage,
      pose1.getMeasurements,
      pose2.getMeasurements,
      phases1.detect,
      phases2.detect,
      clubPath.path1.points.length,
      clubPath.path2.points.length,
      sync.fps,
    ],
  )

  const handleApplyAnnotations = useCallback(() => {
    if (ai.pendingAnnotations.length === 0) return
    annotations.addAIAnnotations(ai.pendingAnnotations, 1)
    ai.clearPendingAnnotations()
  }, [ai.pendingAnnotations, annotations.addAIAnnotations, ai.clearPendingAnnotations])

  const effectiveDrawingState = clubPath.isTracking
    ? { ...drawing.drawingState, activeTool: 'select' as const }
    : drawing.drawingState

  const isIndependent = sync.syncMode === 'independent'

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-bold text-lg tracking-tight">⛳ SwingIQ</span>
          <span className="text-zinc-600 text-sm">AI Golf Analyzer</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {video1Url && video2Url && (
            <>
              {/* Sync / Independent toggle */}
              <Button
                size="sm"
                variant={isIndependent ? 'secondary' : 'ghost'}
                className={`h-8 gap-1.5 text-xs ${isIndependent ? 'bg-blue-800/50 text-blue-200' : 'text-zinc-400 hover:text-white'}`}
                onClick={sync.toggleSyncMode}
                title={isIndependent ? 'Switch to sync mode (both videos play together)' : 'Switch to independent mode (control videos separately)'}
              >
                {isIndependent ? <Link2Off className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                {isIndependent ? 'Independent' : 'Sync'}
              </Button>

              {/* Re-sync button (independent mode only) */}
              {isIndependent && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 text-xs text-amber-400 hover:text-amber-200"
                  onClick={sync.syncV2ToV1}
                  title="Snap V2 playhead to match V1"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Re-sync V2→V1
                </Button>
              )}

              {/* Overlay */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={showOverlay ? 'secondary' : 'ghost'}
                  className={`h-8 gap-1.5 text-xs ${showOverlay ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
                  onClick={() => setShowOverlay(v => !v)}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Overlay
                </Button>
                {showOverlay && (
                  <div className="flex items-center gap-2 w-32">
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      value={[overlayOpacity]}
                      onValueChange={([v]) => setOverlayOpacity(v)}
                      className="flex-1"
                    />
                    <span className="text-xs text-zinc-400 w-8 text-right">{overlayOpacity}%</span>
                  </div>
                )}
              </div>
            </>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 text-xs text-zinc-400 hover:text-white"
            onClick={() => setMode(m => m === 'dual' ? 'single' : 'dual')}
          >
            <Columns2 className="h-3.5 w-3.5" />
            {mode === 'dual' ? 'Single view' : 'Dual view'}
          </Button>

          {video1Url && (
            <Button
              size="sm"
              variant={pose1.enabled ? 'secondary' : 'ghost'}
              className={`h-8 gap-1.5 text-xs ${pose1.enabled ? 'bg-green-700 text-white' : 'text-zinc-400 hover:text-white'}`}
              onClick={pose1.toggle}
              title="Toggle pose skeleton on Video 1"
            >
              {pose1.loading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <PersonStanding className="h-3.5 w-3.5" />}
              Pose V1
            </Button>
          )}
          {video1Url && video2Url && (
            <Button
              size="sm"
              variant={pose2.enabled ? 'secondary' : 'ghost'}
              className={`h-8 gap-1.5 text-xs ${pose2.enabled ? 'bg-green-700 text-white' : 'text-zinc-400 hover:text-white'}`}
              onClick={pose2.toggle}
              title="Toggle pose skeleton on Video 2"
            >
              {pose2.loading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <PersonStanding className="h-3.5 w-3.5" />}
              Pose V2
            </Button>
          )}
          {video1Url && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs text-zinc-400 hover:text-white"
              onClick={handleSnapshot}
              title="Download snapshot (S)"
            >
              <Camera className="h-3.5 w-3.5" />
              Snapshot
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 text-xs text-zinc-400 hover:text-white"
            onClick={() => setHelpOpen(true)}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Help
          </Button>
        </div>
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
        {/* Video Area */}
        <ResizablePanel defaultSize={72} minSize={50}>
          <div className="flex flex-col h-full p-2 gap-2">
            {/* Videos */}
            <div className={`flex-1 min-h-0 grid gap-2 ${mode === 'dual' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <VideoPanel
                ref={panel1Ref}
                slot={1}
                videoRef={sync.videoRef1 as React.RefObject<HTMLVideoElement | null>}
                objectUrl={video1Url}
                isMirrored={sync.isMirrored[0]}
                annotations={annotations.annotations1}
                currentTime={sync.currentTime}
                drawingState={effectiveDrawingState}
                isPersistent={drawing.drawingState.isPersistent}
                clubPathActive={clubPath.isTracking}
                clubPathData={clubPath.path1}
                onFileSelected={handleFileSelected}
                onAnnotationComplete={handleAnnotationComplete}
                onStartDrawing={drawing.startDrawing}
                onContinueDrawing={drawing.continueDrawing}
                onFinishDrawing={drawing.finishDrawing}
                onCancelDrawing={drawing.cancelDrawing}
                onVideoLoaded={sync.onVideoLoaded}
                onClubPathClick={(p, time, slot) => handleClubPathClick(p, time, slot)}
                onEraseAnnotation={handleEraseAnnotation}
                selectedAnnotationId={annotations.selectedId1}
                onSelectAnnotation={handleSelectAnnotation}
                onUpdateAnnotationPoint={handleUpdateAnnotationPoint}
                onMoveAnnotation={handleMoveAnnotation}
                poseKeypoints={pose1.keypoints}
                label="Video 1 — Current Swing"
                isIndependent={isIndependent}
                isPlaying={sync.isPlaying}
                onTogglePlay={sync.togglePlay}
              />
              {mode === 'dual' && (
                <VideoPanel
                  ref={panel2Ref}
                  slot={2}
                  videoRef={sync.videoRef2 as React.RefObject<HTMLVideoElement | null>}
                  objectUrl={video2Url}
                  isMirrored={sync.isMirrored[1]}
                  annotations={annotations.annotations2}
                  currentTime={isIndependent ? sync.currentTime2 : sync.currentTime}
                  drawingState={effectiveDrawingState}
                  isPersistent={drawing.drawingState.isPersistent}
                  clubPathActive={clubPath.isTracking}
                  clubPathData={clubPath.path2}
                  onFileSelected={handleFileSelected}
                  onAnnotationComplete={handleAnnotationComplete}
                  onStartDrawing={drawing.startDrawing}
                  onContinueDrawing={drawing.continueDrawing}
                  onFinishDrawing={drawing.finishDrawing}
                  onCancelDrawing={drawing.cancelDrawing}
                  onVideoLoaded={sync.onVideoLoaded}
                  onClubPathClick={(p, time, slot) => handleClubPathClick(p, time, slot)}
                  onEraseAnnotation={handleEraseAnnotation}
                  selectedAnnotationId={annotations.selectedId2}
                  onSelectAnnotation={handleSelectAnnotation}
                  onUpdateAnnotationPoint={handleUpdateAnnotationPoint}
                  onMoveAnnotation={handleMoveAnnotation}
                  poseKeypoints={pose2.keypoints}
                  label="Video 2 — Reference Swing"
                  isIndependent={isIndependent}
                  isPlaying={isIndependent ? sync.isPlaying2 : sync.isPlaying}
                  onTogglePlay={isIndependent ? sync.togglePlay2 : sync.togglePlay}
                />
              )}
            </div>

            {/* Scrubbers — one shared in sync mode, two independent scrubbers otherwise */}
            {isIndependent && mode === 'dual' ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 px-2 py-1.5">
                  <VideoScrubber
                    currentTime={sync.currentTime}
                    duration={sync.duration}
                    abLoop={sync.abLoop}
                    onSeek={sync.seek}
                    label="V1"
                    isPlaying={sync.isPlaying}
                    onTogglePlay={sync.togglePlay}
                    onStepFrame={sync.stepFrame}
                  />
                </div>
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 px-2 py-1.5">
                  <VideoScrubber
                    currentTime={sync.currentTime2}
                    duration={sync.duration2 || sync.duration}
                    onSeek={sync.seek2}
                    label="V2"
                    isPlaying={sync.isPlaying2}
                    onTogglePlay={sync.togglePlay2}
                    onStepFrame={sync.stepFrame2}
                  />
                </div>
              </div>
            ) : (
              <VideoScrubber
                currentTime={sync.currentTime}
                duration={sync.duration}
                abLoop={sync.abLoop}
                onSeek={sync.seek}
              />
            )}

            {/* Playback controls */}
            <VideoControls
              isPlaying={sync.isPlaying}
              playbackRate={sync.playbackRate}
              isMirrored={sync.isMirrored}
              abLoop={sync.abLoop}
              crop1={sync.crop1}
              crop2={sync.crop2}
              currentTime={sync.currentTime}
              currentTime2={sync.currentTime2}
              hasVideo1={!!video1Url}
              hasVideo2={!!video2Url}
              onTogglePlay={sync.togglePlay}
              onStepFrame={sync.stepFrame}
              onSetSpeed={sync.setPlaybackRate}
              onToggleMirror={sync.toggleMirror}
              onSetLoopPoint={sync.setLoopPoint}
              onClearLoop={sync.clearLoop}
              onSetCropPoint={(slot, point, time) => {
                if (slot === 1) sync.setCropPoint1(point, time)
                else sync.setCropPoint2(point, time)
              }}
              onClearCrop={(slot) => {
                if (slot === 1) sync.clearCrop1()
                else sync.clearCrop2()
              }}
            />

            {/* Club path tracker */}
            <ClubPathToolbar
              isTracking={clubPath.isTracking}
              pathColor={clubPath.pathColor}
              strokeWidth={clubPath.strokeWidth}
              pointCount1={clubPath.path1.points.length}
              pointCount2={clubPath.path2.points.length}
              path1Visible={clubPath.path1.visible}
              path2Visible={clubPath.path2.visible}
              hasVideo1={!!video1Url}
              hasVideo2={!!video2Url}
              onToggleTracking={clubPath.toggleTracking}
              onSmoothPath={clubPath.smoothPath}
              onUpdateColor={clubPath.updateColor}
              onUpdateStrokeWidth={clubPath.updateStrokeWidth}
              onClearPath={clubPath.clearPath}
              onToggleVisible={clubPath.toggleVisible}
            />

            {/* Drawing toolbar */}
            <DrawingToolbar
              activeTool={drawing.drawingState.activeTool}
              color={drawing.drawingState.color}
              strokeWidth={drawing.drawingState.strokeWidth}
              targetVideo={drawing.drawingState.targetVideo}
              canUndo={annotations.canUndo}
              canRedo={annotations.canRedo}
              disabled={clubPath.isTracking}
              onSetTool={drawing.setTool}
              onSetColor={drawing.setColor}
              onSetStrokeWidth={drawing.setStrokeWidth}
              onSetTarget={drawing.setTargetVideo}
              onUndo={annotations.undo}
              onRedo={annotations.redo}
              onClear={annotations.clearSlot}
              hasVideo2={!!video2Url}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-zinc-800" />

        {/* AI Panel */}
        <ResizablePanel defaultSize={28} minSize={22} maxSize={45}>
          <div className="h-full p-2">
            <AIChatPanel
              messages={ai.messages}
              isLoading={ai.isLoading}
              error={ai.error}
              pendingAnnotations={ai.pendingAnnotations}
              hasVideo1={!!video1Url}
              hasVideo2={!!video2Url}
              onSendMessage={handleSendMessage}
              onApplyAnnotations={handleApplyAnnotations}
              onDismissAnnotations={ai.clearPendingAnnotations}
              onClearChat={ai.clearMessages}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
