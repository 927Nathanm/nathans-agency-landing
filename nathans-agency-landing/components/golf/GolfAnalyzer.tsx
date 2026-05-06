'use client'

import { useRef, useState, useCallback } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { VideoPanel, type VideoPanelHandle } from './VideoPanel'
import { VideoControls } from './VideoControls'
import { VideoScrubber } from './VideoScrubber'
import { DrawingToolbar } from './DrawingToolbar'
import { AIChatPanel } from './AIChatPanel'
import { useVideoSync } from '@/hooks/golf/useVideoSync'
import { useDrawing } from '@/hooks/golf/useDrawing'
import { useAnnotations } from '@/hooks/golf/useAnnotations'
import { useFrameCapture } from '@/hooks/golf/useFrameCapture'
import { useAIAnalysis } from '@/hooks/golf/useAIAnalysis'
import type { Annotation } from '@/lib/golf/annotationTypes'
import { Layers, Layers2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

export function GolfAnalyzer() {
  const [video1Url, setVideo1Url] = useState<string | null>(null)
  const [video2Url, setVideo2Url] = useState<string | null>(null)
  const [video1File, setVideo1File] = useState<File | null>(null)
  const [video2File, setVideo2File] = useState<File | null>(null)
  const [overlayOpacity, setOverlayOpacity] = useState(0)
  const [showOverlay, setShowOverlay] = useState(false)
  const [mode, setMode] = useState<'dual' | 'single'>('dual')

  const urlRefs = useRef<[string | null, string | null]>([null, null])

  const panel1Ref = useRef<VideoPanelHandle>(null)
  const panel2Ref = useRef<VideoPanelHandle>(null)

  const videoSync = useVideoSync()
  const drawing = useDrawing()
  const annotations = useAnnotations()

  const { captureFrames } = useFrameCapture(
    videoSync.videoRef1,
    videoSync.videoRef2,
    panel1Ref.current?.annotationCanvasRef ?? { current: null },
    panel2Ref.current?.annotationCanvasRef ?? { current: null }
  )

  const ai = useAIAnalysis(videoSync.currentTime)

  const handleFileSelected = useCallback(
    (file: File, slot: 1 | 2) => {
      if (!file.name) return // from "Change" button with empty file
      const oldUrl = urlRefs.current[slot - 1]
      if (oldUrl) URL.revokeObjectURL(oldUrl)
      const url = URL.createObjectURL(file)
      urlRefs.current[slot - 1] = url
      if (slot === 1) {
        setVideo1Url(url)
        setVideo1File(file)
      } else {
        setVideo2Url(url)
        setVideo2File(file)
        setMode('dual')
      }
    },
    []
  )

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

  const handleSendMessage = useCallback(
    async (text: string, withFrames: boolean) => {
      const frames = withFrames
        ? captureFrames(video2Url ? [1, 2] : [1])
        : {}
      await ai.sendMessage(text, frames)
    },
    [captureFrames, video2Url, ai]
  )

  const handleApplyAnnotations = useCallback(() => {
    if (ai.pendingAnnotations.length === 0) return
    // Default to video 1 unless annotations specify
    annotations.addAIAnnotations(ai.pendingAnnotations, 1)
    ai.clearPendingAnnotations()
  }, [ai, annotations])

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-bold text-lg">⛳ SwingIQ</span>
          <span className="text-zinc-500 text-sm">AI Golf Analyzer</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Overlay toggle */}
          {video1Url && video2Url && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={showOverlay ? 'secondary' : 'ghost'}
                className="h-8 gap-1 text-xs text-zinc-300"
                onClick={() => setShowOverlay(v => !v)}
              >
                <Layers className="h-3 w-3" />
                Overlay
              </Button>
              {showOverlay && (
                <div className="flex items-center gap-2 w-28">
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[overlayOpacity * 100]}
                    onValueChange={([v]) => setOverlayOpacity(v / 100)}
                  />
                  <span className="text-xs text-zinc-400 w-8">{Math.round(overlayOpacity * 100)}%</span>
                </div>
              )}
            </div>
          )}
          <Button
            size="sm"
            variant={mode === 'single' ? 'secondary' : 'ghost'}
            className="h-8 gap-1 text-xs text-zinc-300"
            onClick={() => setMode(m => m === 'dual' ? 'single' : 'dual')}
          >
            <Layers2 className="h-3 w-3" />
            {mode === 'dual' ? 'Single' : 'Dual'}
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
                videoRef={videoSync.videoRef1 as React.RefObject<HTMLVideoElement | null>}
                objectUrl={video1Url}
                isMirrored={videoSync.isMirrored[0]}
                annotations={annotations.annotations1}
                currentTime={videoSync.currentTime}
                drawingState={drawing.drawingState}
                isPersistent={drawing.drawingState.isPersistent}
                onFileSelected={handleFileSelected}
                onAnnotationComplete={handleAnnotationComplete}
                onStartDrawing={drawing.startDrawing}
                onContinueDrawing={drawing.continueDrawing}
                onFinishDrawing={drawing.finishDrawing}
                onCancelDrawing={drawing.cancelDrawing}
                onVideoLoaded={videoSync.onVideoLoaded}
                label="Video 1 — Current Swing"
              />
              {mode === 'dual' && (
                <VideoPanel
                  ref={panel2Ref}
                  slot={2}
                  videoRef={videoSync.videoRef2 as React.RefObject<HTMLVideoElement | null>}
                  objectUrl={video2Url}
                  isMirrored={videoSync.isMirrored[1]}
                  annotations={annotations.annotations2}
                  currentTime={videoSync.currentTime}
                  drawingState={drawing.drawingState}
                  isPersistent={drawing.drawingState.isPersistent}
                  onFileSelected={handleFileSelected}
                  onAnnotationComplete={handleAnnotationComplete}
                  onStartDrawing={drawing.startDrawing}
                  onContinueDrawing={drawing.continueDrawing}
                  onFinishDrawing={drawing.finishDrawing}
                  onCancelDrawing={drawing.cancelDrawing}
                  onVideoLoaded={videoSync.onVideoLoaded}
                  label="Video 2 — Reference Swing"
                />
              )}
            </div>

            {/* Scrubber */}
            <VideoScrubber
              currentTime={videoSync.currentTime}
              duration={videoSync.duration}
              abLoop={videoSync.abLoop}
              onSeek={videoSync.seek}
            />

            {/* Playback controls */}
            <VideoControls
              isPlaying={videoSync.isPlaying}
              playbackRate={videoSync.playbackRate}
              isMirrored={videoSync.isMirrored}
              abLoop={videoSync.abLoop}
              hasVideo1={!!video1Url}
              hasVideo2={!!video2Url}
              onTogglePlay={videoSync.togglePlay}
              onStepFrame={videoSync.stepFrame}
              onSetSpeed={videoSync.setPlaybackRate}
              onToggleMirror={videoSync.toggleMirror}
              onSetLoopPoint={videoSync.setLoopPoint}
              onClearLoop={videoSync.clearLoop}
            />

            {/* Drawing toolbar */}
            <DrawingToolbar
              activeTool={drawing.drawingState.activeTool}
              color={drawing.drawingState.color}
              strokeWidth={drawing.drawingState.strokeWidth}
              targetVideo={drawing.drawingState.targetVideo}
              canUndo={annotations.canUndo}
              canRedo={annotations.canRedo}
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
