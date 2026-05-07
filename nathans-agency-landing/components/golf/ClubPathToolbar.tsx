'use client'

import { Footprints, Eye, EyeOff, Trash2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'

const PATH_COLORS = ['#ff6600', '#ff0000', '#00ff88', '#00cfff', '#ffff00', '#ff00ff']

interface Props {
  isTracking: boolean
  pathColor: string
  strokeWidth: number
  hasPath1: boolean
  hasPath2: boolean
  path1Visible: boolean
  path2Visible: boolean
  hasVideo2: boolean
  onToggleTracking: () => void
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
  hasVideo2,
  onToggleTracking,
  onUpdateColor,
  onUpdateStrokeWidth,
  onClearPath,
  onToggleVisible,
}: Props) {
  return (
    <TooltipProvider delayDuration={400}>
      <div className={`flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${isTracking ? 'bg-orange-950/40 border-orange-700/60' : 'bg-zinc-900 border-zinc-800'}`}>
        {/* Toggle */}
        <Button
          size="sm"
          variant={isTracking ? 'default' : 'outline'}
          className={`h-8 gap-1.5 text-xs font-semibold ${isTracking ? 'bg-orange-600 hover:bg-orange-500 text-white border-orange-500' : 'border-zinc-600 text-zinc-300 hover:text-white'}`}
          onClick={onToggleTracking}
        >
          <Footprints className="h-3.5 w-3.5" />
          {isTracking ? 'Tracking ON — click club head' : 'Club Path Tracker'}
        </Button>

        {isTracking && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-orange-400 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-800 text-xs max-w-56">
              Click on the club head at each frame position. Step through frames with ← → arrow keys or the frame buttons. The path builds automatically.
            </TooltipContent>
          </Tooltip>
        )}

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
            className="flex-1"
          />
          <span className="text-xs text-zinc-400 w-3">{strokeWidth}</span>
        </div>

        {/* Per-video controls */}
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
              {(hasPath1 || hasPath2) && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-500 hover:text-red-400"
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
