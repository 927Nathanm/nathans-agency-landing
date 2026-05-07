'use client'

import { Eye, EyeOff, Trash2, Sparkles, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'

const PATH_COLORS = ['#ffff00', '#ff6600', '#ff0000', '#00ff88', '#00cfff', '#ff00ff']

interface Props {
  isTracking: boolean
  pathColor: string
  strokeWidth: number
  pointCount1: number
  pointCount2: number
  path1Visible: boolean
  path2Visible: boolean
  hasVideo1: boolean
  hasVideo2: boolean
  onToggleTracking: () => void
  onSmoothPath: (slot: 1 | 2 | 'both') => void
  onUpdateColor: (c: string) => void
  onUpdateStrokeWidth: (w: number) => void
  onClearPath: (slot: 1 | 2 | 'both') => void
  onToggleVisible: (slot: 1 | 2 | 'both') => void
}

export function ClubPathToolbar({
  isTracking, pathColor, strokeWidth,
  pointCount1, pointCount2, path1Visible, path2Visible,
  hasVideo1, hasVideo2,
  onToggleTracking, onSmoothPath,
  onUpdateColor, onUpdateStrokeWidth,
  onClearPath, onToggleVisible,
}: Props) {
  const hasPath1 = pointCount1 > 0
  const hasPath2 = pointCount2 > 0

  return (
    <TooltipProvider delayDuration={300}>
      <div className={`flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${isTracking ? 'bg-orange-950/40 border-orange-700/60' : 'bg-zinc-900 border-zinc-800'}`}>

        {/* Label */}
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider shrink-0">Club Path</span>
        <div className="h-5 w-px bg-zinc-700" />

        {/* Manual tracking toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={isTracking ? 'default' : 'outline'}
              className={`h-8 gap-1.5 text-xs ${isTracking
                ? 'bg-orange-600 hover:bg-orange-500 text-white border-transparent'
                : 'border-orange-700/50 text-orange-300 hover:bg-orange-900/30'
              }`}
              onClick={onToggleTracking}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isTracking ? 'Click club head →' : 'Track'}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-zinc-800 text-xs max-w-64">
            {isTracking
              ? 'Step through frames with ← → then click the club head to place a point. Click Track again when done.'
              : 'Activate tracking mode, then click the club head on each frame to manually build the path.'}
          </TooltipContent>
        </Tooltip>

        {/* Instruction when tracking */}
        {isTracking && (
          <span className="text-xs text-orange-300/80 italic shrink-0">
            Use ← → to step frames
          </span>
        )}

        {/* Point counts */}
        {hasPath1 && (
          <span className="text-xs text-zinc-400 shrink-0">{pointCount1} pts</span>
        )}
        {hasVideo2 && hasPath2 && (
          <span className="text-xs text-zinc-400 shrink-0">V2: {pointCount2} pts</span>
        )}

        {/* Smooth path button */}
        {(hasPath1 || hasPath2) && (
          <>
            <div className="h-5 w-px bg-zinc-700" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs border-green-700/50 text-green-300 hover:bg-green-900/30"
                  onClick={() => onSmoothPath(hasPath2 ? 'both' : 1)}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Smooth Arc
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-800 text-xs max-w-56">
                Fits a smooth Catmull-Rom spline through your clicked points — turns rough clicks into a clean arc
              </TooltipContent>
            </Tooltip>
          </>
        )}

        <div className="h-5 w-px bg-zinc-700" />

        {/* Color picker */}
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
              {(hasPath1 || hasPath2) && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-600 hover:text-red-400"
                  onClick={() => onClearPath('both')}>
                  Clear all
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  )
}
