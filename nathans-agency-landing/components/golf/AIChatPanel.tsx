'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Send, Camera, CameraOff, Sparkles, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AIAnalysisCard } from './AIAnalysisCard'
import type { ChatMessage, Annotation } from '@/lib/golf/annotationTypes'

const QUICK_PROMPTS = [
  'Analyze my full swing',
  'What\'s my biggest fault?',
  'Compare hip rotation between both videos',
  'Mark the swing plane on video 1',
  'Show me impact position differences',
  'What\'s my backswing doing wrong?',
  'Draw the club path',
  'Check my follow-through',
]

interface Props {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  pendingAnnotations: Annotation[]
  hasVideo1: boolean
  hasVideo2: boolean
  onSendMessage: (text: string, withFrames: boolean) => void
  onApplyAnnotations: () => void
  onDismissAnnotations: () => void
  onClearChat: () => void
}

export function AIChatPanel({
  messages,
  isLoading,
  error,
  pendingAnnotations,
  hasVideo1,
  hasVideo2,
  onSendMessage,
  onApplyAnnotations,
  onDismissAnnotations,
  onClearChat,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [input, setInput] = useState('')
  const [withFrames, setWithFrames] = useState(true)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || isLoading) return
    onSendMessage(text, withFrames && (hasVideo1 || hasVideo2))
    setInput('')
  }, [input, isLoading, withFrames, hasVideo1, hasVideo2, onSendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <div className="flex flex-col h-full bg-zinc-950 rounded-lg border border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-green-400" />
          <span className="text-sm font-semibold text-zinc-200">AI Swing Coach</span>
        </div>
        {messages.length > 0 && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-zinc-500 hover:text-red-400"
            onClick={onClearChat}
            title="Clear chat"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-zinc-600 text-xs py-8">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-zinc-700" />
            <p>Upload a swing video and ask me anything.</p>
            <p className="mt-1">I can analyze your mechanics, compare swings, and draw swing planes.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <AIAnalysisCard
            key={msg.id}
            message={msg}
            isStreaming={isLoading && i === messages.length - 1 && msg.role === 'assistant'}
          />
        ))}

        {error && (
          <div className="text-xs text-red-400 bg-red-900/20 rounded px-3 py-2 border border-red-900/40">
            {error}
          </div>
        )}
      </div>

      {/* Pending annotation banner */}
      {pendingAnnotations.length > 0 && (
        <div className="mx-3 mb-2 rounded-lg bg-green-900/30 border border-green-700/50 px-3 py-2">
          <p className="text-xs text-green-300 mb-2">
            AI wants to draw {pendingAnnotations.length} annotation{pendingAnnotations.length > 1 ? 's' : ''} on your video
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 text-xs bg-green-700 hover:bg-green-600 text-white gap-1"
              onClick={onApplyAnnotations}
            >
              <CheckCircle2 className="h-3 w-3" /> Apply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-zinc-400 gap-1"
              onClick={onDismissAnnotations}
            >
              <XCircle className="h-3 w-3" /> Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div className="px-3 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.slice(0, 4).map(p => (
              <button
                key={p}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-full px-2.5 py-1 transition-colors"
                onClick={() => setInput(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 border-t border-zinc-800 pt-2">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your swing..."
              rows={2}
              className="w-full resize-none rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 placeholder:text-zinc-600 px-3 py-2 pr-10 focus:outline-none focus:border-green-600"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Button
              size="icon"
              variant="ghost"
              className={`h-8 w-8 ${withFrames ? 'text-green-400' : 'text-zinc-600'}`}
              onClick={() => setWithFrames(v => !v)}
              title={withFrames ? 'Frame capture ON' : 'Frame capture OFF'}
              disabled={!hasVideo1 && !hasVideo2}
            >
              {withFrames ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              className="h-8 w-8 bg-green-700 hover:bg-green-600"
              disabled={!input.trim() || isLoading}
              onClick={handleSend}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="mt-1 text-xs text-zinc-600">
          {withFrames ? 'Current frame will be sent with your message' : 'Text only — no frame capture'}
          {' · '}Enter to send
        </p>
      </div>
    </div>
  )
}
