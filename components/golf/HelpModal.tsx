'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onClose: () => void
}

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Space', action: 'Play / Pause' },
  { keys: '←  →', action: 'Step backward / forward one frame' },
  { keys: '⇧ ←  ⇧ →', action: 'Jump 10 frames' },
  { keys: 'A  /  B', action: 'Set loop start / end at current frame' },
  { keys: 'L', action: 'Clear A-B loop' },
  { keys: 'M', action: 'Mirror video' },
  { keys: '1 – 5', action: 'Playback speed (0.25× / 0.5× / 1× / 1.5× / 2×)' },
  { keys: 'V', action: 'Toggle Select tool' },
  { keys: 'E', action: 'Toggle Eraser tool' },
  { keys: 'Delete', action: 'Delete selected annotation' },
  { keys: 'Esc', action: 'Cancel drawing / deselect' },
  { keys: '⌘/Ctrl Z', action: 'Undo' },
  { keys: '⌘/Ctrl ⇧ Z', action: 'Redo' },
  { keys: 'S', action: 'Take snapshot of current frame' },
  { keys: '?', action: 'Show this help' },
]

export function HelpModal({ open, onClose }: Props) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Keyboard Shortcuts</h2>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-5 grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto">
          {SHORTCUTS.map(s => (
            <div key={s.action} className="flex items-center justify-between gap-4 py-1.5 text-sm">
              <span className="text-zinc-400">{s.action}</span>
              <kbd className="font-mono text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-zinc-200 shrink-0">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-zinc-800 text-xs text-zinc-500">
          Press <kbd className="font-mono bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5">Esc</kbd> or click outside to close
        </div>
      </div>
    </div>
  )
}
