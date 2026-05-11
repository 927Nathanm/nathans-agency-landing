'use client'

import { useRef, useCallback, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatTime } from '@/lib/golf/videoUtils'
import type { CropRange } from '@/hooks/golf/useVideoSync'

interface Props {
  currentTime: number
  duration: number
  abLoop?: { a: number | null; b: number | null }
  onSeek: (time: number) => void
  // Per-video controls (optional — shown when provided)
  isPlaying?: boolean
  onTogglePlay?: () => void
  onStepFrame?: (dir: 1 | -1) => void
  label?: string
  // Crop
  crop?: CropRange
  onSetCrop?: (point: 'start' | 'end', time: number) => void
  onClearCrop?: () => void
}

type DragTarget = 'seek' | 'crop-start' | 'crop-end'

export function VideoScrubber({
  currentTime,
  duration,
  abLoop,
  onSeek,
  isPlaying,
  onTogglePlay,
  onStepFrame,
  label,
  crop,
  onSetCrop,
  onClearCrop,
}: Props) {
  const barRef = useRef<HTMLDivElement>(null)
  const dragTarget = useRef<DragTarget | null>(null)
  const [hovering, setHovering] = useState(false)
  const [hoverTime, setHoverTime] = useState<number | null>(null)

  const getTimeFromClientX = useCallback(
    (clientX: number): number => {
      const bar = barRef.current
      if (!bar || duration === 0) return 0
      const rect = bar.getBoundingClientRect()
      return Math.max(0, Math.min(duration, ((clientX - rect.left) / rect.width) * duration))
    },
    [duration],
  )

  // Detect whether clientX is near a crop handle (within 8px)
  const nearCropHandle = useCallback(
    (clientX: number): 'crop-start' | 'crop-end' | null => {
      const bar = barRef.current
      if (!bar || !crop || !onSetCrop || duration === 0) return null
      const rect = bar.getBoundingClientRect()
      const pxPerSec = rect.width / duration
      const startPx = rect.left + crop.start * pxPerSec
      const endPx = rect.left + (crop.end ?? duration) * pxPerSec
      if (Math.abs(clientX - startPx) < 8) return 'crop-start'
      if (Math.abs(clientX - endPx) < 8) return 'crop-end'
      return null
    },
    [crop, duration, onSetCrop],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const handle = nearCropHandle(e.clientX)
      dragTarget.current = handle ?? 'seek'
      e.currentTarget.setPointerCapture(e.pointerId)
      const t = getTimeFromClientX(e.clientX)
      if (handle === 'crop-start') onSetCrop?.('start', t)
      else if (handle === 'crop-end') onSetCrop?.('end', t)
      else onSeek(t)
    },
    [nearCropHandle, getTimeFromClientX, onSeek, onSetCrop],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const t = getTimeFromClientX(e.clientX)
      setHoverTime(t)
      if (!dragTarget.current) return
      if (dragTarget.current === 'seek') onSeek(t)
      else if (dragTarget.current === 'crop-start') onSetCrop?.('start', t)
      else if (dragTarget.current === 'crop-end') onSetCrop?.('end', t)
    },
    [getTimeFromClientX, onSeek, onSetCrop],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragTarget.current) return
      const t = getTimeFromClientX(e.clientX)
      if (dragTarget.current === 'seek') onSeek(t)
      else if (dragTarget.current === 'crop-start') onSetCrop?.('start', t)
      else if (dragTarget.current === 'crop-end') onSetCrop?.('end', t)
      dragTarget.current = null
    },
    [getTimeFromClientX, onSeek, onSetCrop],
  )

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0
  const loopAPct = abLoop?.a != null && duration > 0 ? (abLoop.a / duration) * 100 : null
  const loopBPct = abLoop?.b != null && duration > 0 ? (abLoop.b / duration) * 100 : null
  const cropStartPct = crop && duration > 0 ? (crop.start / duration) * 100 : 0
  const cropEndPct = crop && duration > 0 ? ((crop.end ?? duration) / duration) * 100 : 100
  const hasCrop = crop && (crop.start > 0 || crop.end !== null)

  const cursor = nearCropHandle(0) ? 'ew-resize' : 'pointer'

  return (
    <div className="flex flex-col gap-1 select-none">
      {/* Label + mini controls row */}
      {(label || onTogglePlay) && (
        <div className="flex items-center gap-1 px-1">
          {label && (
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex-1">
              {label}
            </span>
          )}
          {onTogglePlay && (
            <div className="flex items-center gap-0.5">
              {onStepFrame && (
                <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-400" onClick={() => onStepFrame(-1)} title="Previous frame">
                  <SkipBack className="h-3 w-3" />
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-7 w-7 text-white bg-zinc-700 hover:bg-zinc-600 rounded-full" onClick={onTogglePlay}>
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </Button>
              {onStepFrame && (
                <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-400" onClick={() => onStepFrame(1)} title="Next frame">
                  <SkipForward className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
          {hasCrop && onClearCrop && (
            <button
              className="flex items-center gap-0.5 text-xs text-amber-400 hover:text-amber-200 ml-1"
              onClick={onClearCrop}
              title="Clear crop"
            >
              <X className="h-3 w-3" /> crop
            </button>
          )}
        </div>
      )}

      {/* Scrubber row */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs font-mono text-zinc-400 w-14 shrink-0 tabular-nums">
          {formatTime(currentTime)}
        </span>

        <div
          ref={barRef}
          className="relative flex-1 h-7 flex items-center"
          style={{ cursor }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => { setHovering(false); setHoverTime(null) }}
          onPointerEnter={() => setHovering(true)}
        >
          {/* Full track background */}
          <div className="absolute inset-x-0 h-1.5 rounded-full bg-zinc-700" />

          {/* Crop dimmed regions (before cropStart and after cropEnd) */}
          {crop && (
            <>
              {crop.start > 0 && (
                <div
                  className="absolute h-1.5 bg-zinc-900/80 rounded-l-full pointer-events-none"
                  style={{ left: 0, width: `${cropStartPct}%` }}
                />
              )}
              {crop.end !== null && crop.end < duration && (
                <div
                  className="absolute h-1.5 bg-zinc-900/80 rounded-r-full pointer-events-none"
                  style={{ left: `${cropEndPct}%`, right: 0 }}
                />
              )}
              {/* Active crop region highlight */}
              <div
                className="absolute h-1.5 bg-amber-500/20 pointer-events-none"
                style={{ left: `${cropStartPct}%`, width: `${cropEndPct - cropStartPct}%` }}
              />
            </>
          )}

          {/* A-B loop region */}
          {loopAPct !== null && loopBPct !== null && (
            <div
              className="absolute h-1.5 bg-green-500/40 rounded pointer-events-none"
              style={{ left: `${loopAPct}%`, width: `${Math.max(0, loopBPct - loopAPct)}%` }}
            />
          )}

          {/* Progress fill */}
          <div
            className="absolute h-1.5 bg-green-500 rounded-full pointer-events-none"
            style={{ left: `${cropStartPct}%`, width: `${Math.max(0, pct - cropStartPct)}%` }}
          />

          {/* A-B loop markers */}
          {loopAPct !== null && (
            <div className="absolute h-4 w-0.5 bg-green-400 rounded pointer-events-none" style={{ left: `${loopAPct}%` }} />
          )}
          {loopBPct !== null && (
            <div className="absolute h-4 w-0.5 bg-yellow-400 rounded pointer-events-none" style={{ left: `${loopBPct}%` }} />
          )}

          {/* Crop handles */}
          {crop && onSetCrop && (
            <>
              {/* Start handle — left-pointing bracket */}
              <div
                className="absolute z-10 flex items-center justify-center cursor-ew-resize"
                style={{ left: `${cropStartPct}%`, transform: 'translateX(-50%)' }}
                title="Drag to set crop start"
              >
                <div className="h-5 w-1 bg-amber-400 rounded-sm shadow-lg" />
                <div className="absolute top-0 h-full w-3 -left-1" /> {/* wider hit zone */}
              </div>
              {/* End handle */}
              <div
                className="absolute z-10 flex items-center justify-center cursor-ew-resize"
                style={{ left: `${cropEndPct}%`, transform: 'translateX(-50%)' }}
                title="Drag to set crop end"
              >
                <div className="h-5 w-1 bg-amber-400 rounded-sm shadow-lg" />
                <div className="absolute top-0 h-full w-3 -left-1" />
              </div>
            </>
          )}

          {/* Hover time tooltip */}
          {hovering && hoverTime !== null && (
            <div
              className="absolute -top-6 text-xs bg-zinc-800 text-zinc-200 px-1.5 py-0.5 rounded pointer-events-none"
              style={{ left: `${(hoverTime / duration) * 100}%`, transform: 'translateX(-50%)' }}
            >
              {formatTime(hoverTime)}
            </div>
          )}

          {/* Playhead thumb */}
          <div
            className="absolute h-4 w-4 rounded-full bg-white shadow-lg pointer-events-none"
            style={{
              left: `${pct}%`,
              transform: `translateX(-50%) scale(${hovering || dragTarget.current === 'seek' ? 1.3 : 1})`,
              transition: 'transform 0.1s',
            }}
          />
        </div>

        <span className="text-xs font-mono text-zinc-500 w-14 shrink-0 text-right tabular-nums">
          {formatTime(duration)}
        </span>

        {/* Loop duration badge */}
        {abLoop?.a != null && abLoop?.b != null && (
          <span className="text-xs font-mono text-green-400 shrink-0 px-2 py-0.5 rounded bg-green-950/40 border border-green-800/40">
            {Math.abs(abLoop.b - abLoop.a).toFixed(2)}s
          </span>
        )}
      </div>
    </div>
  )
}
