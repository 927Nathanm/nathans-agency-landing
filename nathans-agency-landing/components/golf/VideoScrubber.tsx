'use client'

import { useRef, useCallback } from 'react'
import { formatTime } from '@/lib/golf/videoUtils'

interface Props {
  currentTime: number
  duration: number
  abLoop: { a: number | null; b: number | null }
  onSeek: (time: number) => void
}

export function VideoScrubber({ currentTime, duration, abLoop, onSeek }: Props) {
  const barRef = useRef<HTMLDivElement>(null)

  const getTimeFromEvent = useCallback(
    (e: React.MouseEvent | React.PointerEvent): number => {
      const bar = barRef.current
      if (!bar || duration === 0) return 0
      const rect = bar.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      return ratio * duration
    },
    [duration]
  )

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0
  const loopAPct = abLoop.a !== null && duration > 0 ? (abLoop.a / duration) * 100 : null
  const loopBPct = abLoop.b !== null && duration > 0 ? (abLoop.b / duration) * 100 : null

  return (
    <div className="flex items-center gap-3 px-2">
      <span className="text-xs font-mono text-zinc-400 w-16 shrink-0">
        {formatTime(currentTime)}
      </span>

      <div
        ref={barRef}
        className="relative flex-1 h-6 flex items-center cursor-pointer group"
        onClick={e => onSeek(getTimeFromEvent(e))}
      >
        {/* Track */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-zinc-700" />

        {/* A-B loop region */}
        {loopAPct !== null && loopBPct !== null && (
          <div
            className="absolute h-1.5 bg-green-500/40 rounded"
            style={{ left: `${loopAPct}%`, width: `${loopBPct - loopAPct}%` }}
          />
        )}

        {/* Progress */}
        <div
          className="absolute h-1.5 bg-green-500 rounded-full"
          style={{ width: `${pct}%` }}
        />

        {/* Loop markers */}
        {loopAPct !== null && (
          <div
            className="absolute h-4 w-0.5 bg-green-400 rounded"
            style={{ left: `${loopAPct}%` }}
          />
        )}
        {loopBPct !== null && (
          <div
            className="absolute h-4 w-0.5 bg-yellow-400 rounded"
            style={{ left: `${loopBPct}%` }}
          />
        )}

        {/* Playhead */}
        <div
          className="absolute h-4 w-4 rounded-full bg-white shadow-md -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${pct}%` }}
        />
      </div>

      <span className="text-xs font-mono text-zinc-500 w-16 shrink-0 text-right">
        {formatTime(duration)}
      </span>
    </div>
  )
}
