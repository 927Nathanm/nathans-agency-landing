'use client'

import { useRef, useCallback, useState } from 'react'
import { formatTime } from '@/lib/golf/videoUtils'

interface Props {
  currentTime: number
  duration: number
  abLoop: { a: number | null; b: number | null }
  onSeek: (time: number) => void
}

export function VideoScrubber({ currentTime, duration, abLoop, onSeek }: Props) {
  const barRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const [hovering, setHovering] = useState(false)

  const getTimeFromClientX = useCallback(
    (clientX: number): number => {
      const bar = barRef.current
      if (!bar || duration === 0) return 0
      const rect = bar.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      return ratio * duration
    },
    [duration]
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      isDragging.current = true
      onSeek(getTimeFromClientX(e.clientX))
    },
    [getTimeFromClientX, onSeek]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return
      onSeek(getTimeFromClientX(e.clientX))
    },
    [getTimeFromClientX, onSeek]
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return
      isDragging.current = false
      onSeek(getTimeFromClientX(e.clientX))
    },
    [getTimeFromClientX, onSeek]
  )

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0
  const loopAPct = abLoop.a !== null && duration > 0 ? (abLoop.a / duration) * 100 : null
  const loopBPct = abLoop.b !== null && duration > 0 ? (abLoop.b / duration) * 100 : null

  return (
    <div className="flex items-center gap-3 px-2 select-none">
      <span className="text-xs font-mono text-zinc-400 w-16 shrink-0">
        {formatTime(currentTime)}
      </span>

      <div
        ref={barRef}
        className="relative flex-1 h-8 flex items-center cursor-pointer"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setHovering(false)}
        onPointerEnter={() => setHovering(true)}
      >
        {/* Track background */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-zinc-700" />

        {/* A-B loop region */}
        {loopAPct !== null && loopBPct !== null && (
          <div
            className="absolute h-1.5 bg-green-500/40 rounded"
            style={{ left: `${loopAPct}%`, width: `${Math.max(0, loopBPct - loopAPct)}%` }}
          />
        )}

        {/* Progress fill */}
        <div
          className="absolute h-1.5 bg-green-500 rounded-full pointer-events-none"
          style={{ width: `${pct}%` }}
        />

        {/* Loop markers */}
        {loopAPct !== null && (
          <div className="absolute h-4 w-0.5 bg-green-400 rounded pointer-events-none"
            style={{ left: `${loopAPct}%` }} />
        )}
        {loopBPct !== null && (
          <div className="absolute h-4 w-0.5 bg-yellow-400 rounded pointer-events-none"
            style={{ left: `${loopBPct}%` }} />
        )}

        {/* Playhead thumb */}
        <div
          className="absolute h-4 w-4 rounded-full bg-white shadow-lg -translate-x-1/2 transition-transform pointer-events-none"
          style={{
            left: `${pct}%`,
            transform: `translateX(-50%) scale(${hovering || isDragging.current ? 1.3 : 1})`,
          }}
        />
      </div>

      <span className="text-xs font-mono text-zinc-500 w-16 shrink-0 text-right">
        {formatTime(duration)}
      </span>
    </div>
  )
}
