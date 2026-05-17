'use client'

import { MousePointer, Minus, ArrowRight, Circle, Square, Pen, Triangle, GitBranch, Eraser, Undo2, Redo2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import type { DrawingTool } from '@/lib/golf/annotationTypes'

const TOOLS: { id: DrawingTool; icon: React.ReactNode; label: string }[] = [
  { id: 'select', icon: <MousePointer className="h-4 w-4" />, label: 'Select — click around without drawing' },
  { id: 'eraser', icon: <Eraser className="h-4 w-4" />, label: 'Eraser — click an annotation to remove it' },
  { id: 'line', icon: <Minus className="h-4 w-4" />, label: 'Line' },
  { id: 'arrow', icon: <ArrowRight className="h-4 w-4" />, label: 'Arrow' },
  { id: 'plane', icon: <GitBranch className="h-4 w-4" />, label: 'Swing Plane' },
  { id: 'circle', icon: <Circle className="h-4 w-4" />, label: 'Circle' },
  { id: 'rect', icon: <Square className="h-4 w-4" />, label: 'Rectangle' },
  { id: 'freehand', icon: <Pen className="h-4 w-4" />, label: 'Freehand' },
  { id: 'angle', icon: <Triangle className="h-4 w-4" />, label: 'Angle — click point 1, vertex, point 2' },
]

const COLORS = [
  '#ff0000', '#ff6600', '#ffff00', '#00ff00',
  '#00ffff', '#0099ff', '#ff00ff', '#ffffff',
]

interface Props {
  activeTool: DrawingTool
  color: string
  strokeWidth: number
  targetVideo: 1 | 2 | 'both'
  disabled?: boolean
  canUndo: boolean
  canRedo: boolean
  onSetTool: (tool: DrawingTool) => void
  onSetColor: (color: string) => void
  onSetStrokeWidth: (w: number) => void
  onSetTarget: (v: 1 | 2 | 'both') => void
  onUndo: () => void
  onRedo: () => void
  onClear: (slot: 1 | 2 | 'both') => void
  hasVideo2: boolean
}

export function DrawingToolbar({
  activeTool, color, strokeWidth, targetVideo, canUndo, canRedo,
  disabled,
  onSetTool, onSetColor, onSetStrokeWidth, onSetTarget,
  onUndo, onRedo, onClear, hasVideo2,
}: Props) {
  return (
    <TooltipProvider delayDuration={400}>
      <div className={`flex flex-wrap items-center gap-2 px-2 py-2 bg-zinc-900 rounded-lg border border-zinc-800 transition-opacity ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
        {/* Tools */}
        <div className="flex items-center gap-1">
          {TOOLS.map(t => (
            <Tooltip key={t.id}>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant={activeTool === t.id ? 'secondary' : 'ghost'}
                  className={`h-8 w-8 ${activeTool === t.id ? 'bg-green-600 text-white hover:bg-green-500' : 'text-zinc-400 hover:text-white'}`}
                  onClick={() => onSetTool(t.id)}
                >
                  {t.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-zinc-800 text-xs">
                {t.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="h-6 w-px bg-zinc-700" />

        {/* Colors */}
        <div className="flex items-center gap-1">
          {COLORS.map(c => (
            <button
              key={c}
              className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              onClick={() => onSetColor(c)}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={e => onSetColor(e.target.value)}
            className="h-6 w-6 rounded cursor-pointer border-0 bg-transparent"
            title="Custom color"
          />
        </div>

        <div className="h-6 w-px bg-zinc-700" />

        {/* Stroke width */}
        <div className="flex items-center gap-2 w-24">
          <span className="text-xs text-zinc-500">W</span>
          <Slider
            min={1}
            max={8}
            step={1}
            value={[strokeWidth]}
            onValueChange={([v]) => onSetStrokeWidth(v)}
            className="flex-1"
          />
          <span className="text-xs text-zinc-400 w-3">{strokeWidth}</span>
        </div>

        <div className="h-6 w-px bg-zinc-700" />

        {/* Target video */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-zinc-500 mr-1">Draw on:</span>
          {(['1', '2', 'both'] as const).map(v => (
            (v === '2' || v === 'both') && !hasVideo2 ? null : (
              <Button
                key={v}
                size="sm"
                variant={targetVideo === (v === 'both' ? 'both' : Number(v) as 1 | 2) ? 'secondary' : 'ghost'}
                className={`h-7 px-2 text-xs ${targetVideo === (v === 'both' ? 'both' : Number(v)) ? 'bg-green-700 text-white' : 'text-zinc-400'}`}
                onClick={() => onSetTarget(v === 'both' ? 'both' : Number(v) as 1 | 2)}
              >
                {v === 'both' ? 'Both' : `V${v}`}
              </Button>
            )
          ))}
        </div>

        <div className="h-6 w-px bg-zinc-700" />

        {/* Undo/Redo/Clear */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400" disabled={!canUndo} onClick={onUndo}>
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-800 text-xs">Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400" disabled={!canRedo} onClick={onRedo}>
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-800 text-xs">Redo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-zinc-400 hover:text-red-400"
                onClick={() => onClear(targetVideo)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-800 text-xs">Clear annotations</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
