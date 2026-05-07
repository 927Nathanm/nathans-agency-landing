'use client'

import { Eye, EyeOff, Trash2, Sparkles, Loader2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import type { TraceProgress } from '@/hooks/golf/useClubPath'

const PATH_COLORS = ['#ffff00', '#ff6600', '#ff0000', '#00ff88', '#00cfff', '#ff00ff']

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
  onAITrace: (slot: 1 | 2) => void
  onUpdateColor: (c: string) => void
  onUpdateStrokeWidth: (w: number) => void
  onClearPath: (slot: 1 | 2 | 'both') => void
  onToggleVisible: (slot: 1 | 2 | 'both') => void
}

export function ClubPathToolbar({
  isTracking, pathColor, strokeWidth,
  hasPath1, hasPath2, path1Visible, path2Visible,
  hasVideo1, hasVideo2, traceProgress,
  onToggleTracking, onAITrace,
  onUpdateColor, onUpdateStrokeWidth,
  onClearPath, onToggleVisible,
}: Props) {
  const isRunning = traceProgress.status === 'running'

  return (
    <TooltipProvider delayDuration={300}>
      <div className={`flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${isTracking ? 'bg-orange-950/40 border-orange-700/60' : 'bg-zinc-900 border-zinc-800'}`}>

        {/* Section label */}
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider shrink-0">Club Path</span>

        <div className="h-5 w-px bg-zinc-700" />

        {/* Seed tracking toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm"
              variant={isTracking ? 'default' : 'outline'}
              className={`h-8 gap-1.5 text-xs ${isTracking ? 'bg-orange-600 hover:bg-orange-500 text-white border-transparent' : 'border-orange-700/60 text-orange-300 hover:bg-orange-900/30'}`}
              onClick={onToggleTracking} disabled={isRunning}>
              {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              {isTracking ? 'Click club head →' : 'Seed Track'}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-zinc-800 text-xs max-w-64">
            {isTracking
              ? 'Click on the club head in either video. Template matching will track it through the full swing automatically.'
              : 'Activate then click the club head on any frame — the tracker locks onto it and follows it through the entire swing.'}
          </TooltipContent>
        </Tooltip>

        {/* AI trace — slower but smarter */}
        {hasVideo1 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline"
                className="h-8 gap-1.5 text-xs border-purple-700/60 text-purple-300 hover:bg-purple-900/30"
                onClick={() => onAITrace(1)} disabled={isRunning}>
                {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                AI Trace V1
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-800 text-xs max-w-56">
              Uses Claude AI vision to precisely detect club head position (slower but more accurate)
            </TooltipContent>
          </Tooltip>
        )}
        {hasVideo2 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline"
                className="h-8 gap-1.5 text-xs border-purple-700/60 text-purple-300 hover:bg-purple-900/30"
                onClick={() => onAITrace(2)} disabled={isRunning}>
                {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                AI Trace V2
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-800 text-xs max-w-56">
              Uses Claude AI vision to precisely detect club head position (slower but more accurate)
            </TooltipContent>
          </Tooltip>
        )}

        {/* Progress */}
        {isRunning && (
          <div className="flex items-center gap-2 flex-1 min-w-[120px]">
            <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-200"
                style={{ width: `${traceProgress.total > 0 ? (traceProgress.current / traceProgress.total) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-yellow-300 whitespace-nowrap shrink-0">
              {traceProgress.current}/{traceProgress.total}
            </span>
          </div>
        )}

        {traceProgress.status === 'done' && (
          <span className="text-xs text-green-400 shrink-0">{traceProgress.message}</span>
        )}

        <div className="h-5 w-px bg-zinc-700" />

        {/* Colors */}
        <div className="flex items-center gap-1">
          {PATH_COLORS.map(c => (
            <button key={c}
              className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${pathColor === c ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              onClick={() => onUpdateColor(c)} />
          ))}
        </div>

        {/* Stroke width */}
        <div className="flex items-center gap-1.5 w-20">
          <Slider min={2} max={8} step={1} value={[strokeWidth]}
            onValueChange={([v]) => onUpdateStrokeWidth(v)} />
          <span className="text-xs text-zinc-400 w-3">{strokeWidth}</span>
        </div>

        {/* Visibility + clear */}
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
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400"
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
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400"
                    onClick={() => onClearPath(2)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-600 hover:text-red-400"
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
