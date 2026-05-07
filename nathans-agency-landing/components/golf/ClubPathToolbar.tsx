'use client'

import { Footprints, Eye, EyeOff, Trash2, Info, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import type { TraceProgress } from '@/hooks/golf/useClubPath'

const PATH_COLORS = ['#ff6600', '#ff0000', '#00ff88', '#00cfff', '#ffff00', '#ff00ff']

interface Props {
  isTracking: boolean
  pathColor: string
  strokeWidth: number
  hasPath1: boolean
  hasPath2: boolean
  path1Visible: boolean
  path2Visible: boolean
  hasVideo1: boolean
  hasVideo2: boolean
  traceProgress: TraceProgress
  onToggleTracking: () => void
  onAutoTrace: (slot: 1 | 2) => void
  onUpdateColor: (c: string) => void
  onUpdateStrokeWidth: (w: number) => void
  onClearPath: (slot: 1 | 2 | 'both') => void
  onToggleVisible: (slot: 1 | 2 | 'both') => void
}

export function ClubPathToolbar({
  isTracking,
  pathColor,
  strokeWidth,
  hasPath1,
  hasPath2,
  path1Visible,
  path2Visible,
  hasVideo1,
  hasVideo2,
  traceProgress,
  onToggleTracking,
  onAutoTrace,
  onUpdateColor,
  onUpdateStrokeWidth,
  onClearPath,
  onToggleVisible,
}: Props) {
  const isRunning = traceProgress.status === 'running'

  return (
    <TooltipProvider delayDuration={400}>
      <div className={`flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${isTracking ? 'bg-orange-950/40 border-orange-700/60' : 'bg-zinc-900 border-zinc-800'}`}>

        {/* Manual tracking toggle */}
        <Button
          size="sm"
          variant={isTracking ? 'default' : 'outline'}
          className={`h-8 gap-1.5 text-xs font-semibold ${isTracking ? 'bg-orange-600 hover:bg-orange-500 text-white border-orange-500' : 'border-zinc-600 text-zinc-300 hover:text-white'}`}
          onClick={onToggleTracking}
          disabled={isRunning}
        >
          <Footprints className="h-3.5 w-3.5" />
          {isTracking ? 'Click club head each frame' : 'Manual Track'}
        </Button>

        {isTracking && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-orange-400 cursor-help shrink-0" />
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-800 text-xs max-w-60">
              Step through frames with the ← → buttons, then click the club head on each frame. The path builds in real time.
            </TooltipContent>
          </Tooltip>
        )}

        <div className="h-5 w-px bg-zinc-700" />

        {/* AI Auto-trace */}
        <div className="flex items-center gap-1.5">
          {hasVideo1 && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs border-purple-700/60 text-purple-300 hover:bg-purple-900/30 hover:text-purple-200"
              onClick={() => onAutoTrace(1)}
              disabled={isRunning}
            >
              {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              AI Trace V1
            </Button>
          )}
          {hasVideo2 && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs border-purple-700/60 text-purple-300 hover:bg-purple-900/30 hover:text-purple-200"
              onClick={() => onAutoTrace(2)}
              disabled={isRunning}
            >
              {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              AI Trace V2
            </Button>
          )}
        </div>

        {/* Progress bar */}
        {isRunning && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${traceProgress.total > 0 ? (traceProgress.current / traceProgress.total) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-purple-300 whitespace-nowrap shrink-0">
              {traceProgress.current}/{traceProgress.total}
            </span>
          </div>
        )}

        {traceProgress.status === 'done' && (
          <span className="text-xs text-green-400">{traceProgress.message}</span>
        )}

        <div className="h-5 w-px bg-zinc-700" />

        {/* Colors */}
        <div className="flex items-center gap-1">
          {PATH_COLORS.map(c => (
            <button
              key={c}
              className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${pathColor === c ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              onClick={() => onUpdateColor(c)}
            />
          ))}
        </div>

        {/* Stroke width */}
        <div className="flex items-center gap-2 w-20">
          <Slider
            min={2}
            max={8}
            step={1}
            value={[strokeWidth]}
            onValueChange={([v]) => onUpdateStrokeWidth(v)}
          />
          <span className="text-xs text-zinc-400 w-3">{strokeWidth}</span>
        </div>

        {/* Per-video visibility + clear */}
        {(hasPath1 || hasPath2) && (
          <>
            <div className="h-5 w-px bg-zinc-700" />
            <div className="flex items-center gap-1">
              {hasPath1 && (
                <>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-zinc-400 hover:text-white gap-1"
                    onClick={() => onToggleVisible(1)}>
                    {path1Visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />} V1
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-zinc-500 hover:text-red-400"
                    onClick={() => onClearPath(1)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
              {hasVideo2 && hasPath2 && (
                <>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-zinc-400 hover:text-white gap-1"
                    onClick={() => onToggleVisible(2)}>
                    {path2Visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />} V2
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-zinc-500 hover:text-red-400"
                    onClick={() => onClearPath(2)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-500 hover:text-red-400"
                onClick={() => onClearPath('both')}>
                Clear all
              </Button>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  )
}
