'use client'

import { useRef, useCallback, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatTime } from '@/lib/golf/videoUtils'

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
}

type DragTarget = 'seek'

export function VideoScrubber({
  currentTime,
  duration,
  abLoop,
  onSeek,
  isPlaying,
  onTogglePlay,
  onStepFrame,
  label,
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

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragTarget.current = 'seek'
      e.currentTarget.setPointerCapture(e.pointerId)
      onSeek(getTimeFromClientX(e.clientX))
    },
    [getTimeFromClientX, onSeek],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const t = getTimeFromClientX(e.clientX)
      setHoverTime(t)
      if (!dragTarget.current) return
      onSeek(t)
    },
    [getTimeFromClientX, onSeek],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragTarget.current) return
      onSeek(getTimeFromClientX(e.clientX))
      dragTarget.current = null
    },
    [getTimeFromClientX, onSeek],
  )

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0
  const loopAPct = abLoop?.a != null && duration > 0 ? (abLoop.a / duration) * 100 : null
  const loopBPct = abLoop?.b != null && duration > 0 ? (abLoop.b / duration) * 100 : null

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
          style={{ cursor: 'pointer' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => { setHovering(false); setHoverTime(null) }}
          onPointerEnter={() => setHovering(true)}
        >
          {/* Full track background */}
          <div className="absolute inset-x-0 h-1.5 rounded-full bg-zinc-700" />

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
            style={{ width: `${pct}%` }}
          />

          {/* A-B loop markers */}
          {loopAPct !== null && (
            <div className="absolute h-4 w-0.5 bg-green-400 rounded pointer-events-none" style={{ left: `${loopAPct}%` }} />
          )}
          {loopBPct !== null && (
            <div className="absolute h-4 w-0.5 bg-yellow-400 rounded pointer-events-none" style={{ left: `${loopBPct}%` }} />
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
