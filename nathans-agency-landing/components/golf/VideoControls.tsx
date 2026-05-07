'use client'

import {
  Play, Pause, SkipBack, SkipForward, FlipHorizontal,
  Repeat, X, ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const SPEEDS = [0.05, 0.1, 0.25, 0.5, 0.75, 1.0]

interface Props {
  isPlaying: boolean
  playbackRate: number
  isMirrored: [boolean, boolean]
  abLoop: { a: number | null; b: number | null }
  hasVideo1: boolean
  hasVideo2: boolean
  onTogglePlay: () => void
  onStepFrame: (dir: 1 | -1) => void
  onSetSpeed: (rate: number) => void
  onToggleMirror: (slot: 1 | 2) => void
  onSetLoopPoint: (pt: 'a' | 'b') => void
  onClearLoop: () => void
}

export function VideoControls({
  isPlaying,
  playbackRate,
  isMirrored,
  abLoop,
  hasVideo1,
  hasVideo2,
  onTogglePlay,
  onStepFrame,
  onSetSpeed,
  onToggleMirror,
  onSetLoopPoint,
  onClearLoop,
}: Props) {
  const hasAny = hasVideo1 || hasVideo2

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap px-2 py-2 bg-zinc-900 rounded-lg border border-zinc-800">
      {/* Step back */}
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-zinc-300"
        disabled={!hasAny}
        onClick={() => onStepFrame(-1)}
        title="Previous frame"
      >
        <SkipBack className="h-4 w-4" />
      </Button>

      {/* Play/Pause */}
      <Button
        size="icon"
        variant="ghost"
        className="h-10 w-10 text-white bg-zinc-700 hover:bg-zinc-600 rounded-full"
        disabled={!hasAny}
        onClick={onTogglePlay}
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </Button>

      {/* Step forward */}
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-zinc-300"
        disabled={!hasAny}
        onClick={() => onStepFrame(1)}
        title="Next frame"
      >
        <SkipForward className="h-4 w-4" />
      </Button>

      {/* Speed selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 border-zinc-700 bg-zinc-800 text-zinc-300 text-xs"
            disabled={!hasAny}
          >
            {playbackRate}x <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
          {SPEEDS.map(s => (
            <DropdownMenuItem
              key={s}
              className={`text-zinc-300 cursor-pointer ${playbackRate === s ? 'text-green-400' : ''}`}
              onClick={() => onSetSpeed(s)}
            >
              {s}x
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mirror controls */}
      <div className="flex items-center gap-1 ml-1">
        <Button
          size="sm"
          variant={isMirrored[0] ? 'secondary' : 'ghost'}
          className="h-8 px-2 text-xs text-zinc-300"
          disabled={!hasVideo1}
          onClick={() => onToggleMirror(1)}
          title="Flip video 1"
        >
          <FlipHorizontal className="h-3 w-3 mr-1" /> V1
        </Button>
        {hasVideo2 && (
          <Button
            size="sm"
            variant={isMirrored[1] ? 'secondary' : 'ghost'}
            className="h-8 px-2 text-xs text-zinc-300"
            disabled={!hasVideo2}
            onClick={() => onToggleMirror(2)}
            title="Flip video 2"
          >
            <FlipHorizontal className="h-3 w-3 mr-1" /> V2
          </Button>
        )}
      </div>

      {/* A-B Loop */}
      <div className="flex items-center gap-1 ml-1">
        <Button
          size="sm"
          variant={abLoop.a !== null ? 'secondary' : 'ghost'}
          className="h-8 px-2 text-xs text-zinc-300"
          disabled={!hasAny}
          onClick={() => onSetLoopPoint('a')}
          title="Set loop start"
        >
          <Repeat className="h-3 w-3 mr-1" />A
        </Button>
        <Button
          size="sm"
          variant={abLoop.b !== null ? 'secondary' : 'ghost'}
          className="h-8 px-2 text-xs text-zinc-300"
          disabled={!hasAny}
          onClick={() => onSetLoopPoint('b')}
          title="Set loop end"
        >
          B
        </Button>
        {(abLoop.a !== null || abLoop.b !== null) && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-zinc-500 hover:text-red-400"
            onClick={onClearLoop}
            title="Clear loop"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
