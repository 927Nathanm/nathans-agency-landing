'use client'

import { useRef, useState, useCallback } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { VideoPanel, type VideoPanelHandle } from './VideoPanel'
import { VideoControls } from './VideoControls'
import { VideoScrubber } from './VideoScrubber'
import { DrawingToolbar } from './DrawingToolbar'
import { ClubPathToolbar } from './ClubPathToolbar'
import { AIChatPanel } from './AIChatPanel'
import { useVideoSync } from '@/hooks/golf/useVideoSync'
import { useDrawing } from '@/hooks/golf/useDrawing'
import { useAnnotations } from '@/hooks/golf/useAnnotations'
import { useFrameCapture } from '@/hooks/golf/useFrameCapture'
import { useAIAnalysis } from '@/hooks/golf/useAIAnalysis'
import { useClubPath } from '@/hooks/golf/useClubPath'
import type { Annotation, Point } from '@/lib/golf/annotationTypes'
import { Layers, Columns2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

export function GolfAnalyzer() {
  const [video1Url, setVideo1Url] = useState<string | null>(null)
  const [video2Url, setVideo2Url] = useState<string | null>(null)
  const [overlayOpacity, setOverlayOpacity] = useState(50)
  const [showOverlay, setShowOverlay] = useState(false)
  const [mode, setMode] = useState<'dual' | 'single'>('dual')

  const urlRef1 = useRef<string | null>(null)
  const urlRef2 = useRef<string | null>(null)

  const panel1Ref = useRef<VideoPanelHandle>(null)
  const panel2Ref = useRef<VideoPanelHandle>(null)

  const sync = useVideoSync()
  const drawing = useDrawing()
  const annotations = useAnnotations()
  const clubPath = useClubPath()

  const annotationCanvas1 = panel1Ref.current?.annotationCanvasRef ?? { current: null }
  const annotationCanvas2 = panel2Ref.current?.annotationCanvasRef ?? { current: null }

  const { captureFrames } = useFrameCapture(
    sync.videoRef1,
    sync.videoRef2,
    annotationCanvas1,
    annotationCanvas2
  )

  const ai = useAIAnalysis(sync.currentTime)

  const handleFileSelected = useCallback((file: File, slot: 1 | 2) => {
    if (!file.name) return
    if (slot === 1) {
      if (urlRef1.current) URL.revokeObjectURL(urlRef1.current)
      const url = URL.createObjectURL(file)
      urlRef1.current = url
      setVideo1Url(url)
    } else {
      if (urlRef2.current) URL.revokeObjectURL(urlRef2.current)
      const url = URL.createObjectURL(file)
      urlRef2.current = url
      setVideo2Url(url)
      if (mode === 'single') setMode('dual')
    }
  }, [mode])

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
    [drawing.drawingState.targetVideo, annotations]
  )

  const handleClubPathClick = useCallback(
    (p: Point, time: number, slot: 1 | 2) => {
      clubPath.addPoint(p, time, slot)
    },
    [clubPath]
  )

  const handleSendMessage = useCallback(
    async (text: string, withFrames: boolean) => {
      const frames = withFrames ? captureFrames(video2Url ? [1, 2] : [1]) : {}
      await ai.sendMessage(text, frames)
    },
    [captureFrames, video2Url, ai]
  )

  const handleApplyAnnotations = useCallback(() => {
    if (ai.pendingAnnotations.length === 0) return
    annotations.addAIAnnotations(ai.pendingAnnotations, 1)
    ai.clearPendingAnnotations()
  }, [ai, annotations])

  // When club path is tracking, disable drawing tool
  const effectiveDrawingState = clubPath.isTracking
    ? { ...drawing.drawingState, activeTool: 'select' as const }
    : drawing.drawingState

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-bold text-lg tracking-tight">⛳ SwingIQ</span>
          <span className="text-zinc-600 text-sm">AI Golf Analyzer</span>
        </div>
        <div className="flex items-center gap-2">
          {video1Url && video2Url && (
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
                label="Video 1 — Current Swing"
              />
              {mode === 'dual' && (
                <VideoPanel
                  ref={panel2Ref}
                  slot={2}
                  videoRef={sync.videoRef2 as React.RefObject<HTMLVideoElement | null>}
                  objectUrl={video2Url}
                  isMirrored={sync.isMirrored[1]}
                  annotations={annotations.annotations2}
                  currentTime={sync.currentTime}
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
                  label="Video 2 — Reference Swing"
                />
              )}
            </div>

            {/* Scrubber */}
            <VideoScrubber
              currentTime={sync.currentTime}
              duration={sync.duration}
              abLoop={sync.abLoop}
              onSeek={sync.seek}
            />

            {/* Playback controls */}
            <VideoControls
              isPlaying={sync.isPlaying}
              playbackRate={sync.playbackRate}
              isMirrored={sync.isMirrored}
              abLoop={sync.abLoop}
              hasVideo1={!!video1Url}
              hasVideo2={!!video2Url}
              onTogglePlay={sync.togglePlay}
              onStepFrame={sync.stepFrame}
              onSetSpeed={sync.setPlaybackRate}
              onToggleMirror={sync.toggleMirror}
              onSetLoopPoint={sync.setLoopPoint}
              onClearLoop={sync.clearLoop}
            />

            {/* Club path tracker */}
            <ClubPathToolbar
              isTracking={clubPath.isTracking}
              pathColor={clubPath.pathColor}
              strokeWidth={clubPath.strokeWidth}
              hasPath1={clubPath.path1.points.length > 0}
              hasPath2={clubPath.path2.points.length > 0}
              path1Visible={clubPath.path1.visible}
              path2Visible={clubPath.path2.visible}
              hasVideo1={!!video1Url}
              hasVideo2={!!video2Url}
              traceProgress={clubPath.traceProgress}
              onToggleTracking={clubPath.toggleTracking}
              onMotionTrace={(slot) => {
                const video = slot === 1 ? sync.videoRef1.current : sync.videoRef2.current
                if (video) clubPath.motionTrace(video, slot)
              }}
              onAITrace={(slot) => {
                const video = slot === 1 ? sync.videoRef1.current : sync.videoRef2.current
                if (video) clubPath.aiTrace(video, slot)
              }}
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
    </div>
  )
}
