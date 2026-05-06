'use client'

import { Bot, User, Camera } from 'lucide-react'
import type { ChatMessage } from '@/lib/golf/annotationTypes'

interface Props {
  message: ChatMessage
  isStreaming?: boolean
}

export function AIAnalysisCard({ message, isStreaming }: Props) {
  const isAssistant = message.role === 'assistant'

  return (
    <div className={`flex gap-2 ${isAssistant ? 'items-start' : 'items-start justify-end'}`}>
      {isAssistant && (
        <div className="shrink-0 rounded-full bg-green-700 p-1.5 mt-0.5">
          <Bot className="h-3.5 w-3.5 text-white" />
        </div>
      )}

      <div
        className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
          isAssistant
            ? 'bg-zinc-800 text-zinc-200'
            : 'bg-green-800/60 text-zinc-100 ml-auto'
        }`}
      >
        {!isAssistant && message.hasFrames && (
          <div className="flex items-center gap-1 mb-1 text-xs text-green-400">
            <Camera className="h-3 w-3" /> Frame captured
          </div>
        )}

        {message.content ? (
          <div className="whitespace-pre-wrap leading-relaxed">
            {formatMessage(message.content)}
          </div>
        ) : isStreaming ? (
          <div className="flex gap-1 items-center py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : null}

        <div className="mt-1 text-right text-xs text-zinc-600">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {!isAssistant && (
        <div className="shrink-0 rounded-full bg-zinc-600 p-1.5 mt-0.5">
          <User className="h-3.5 w-3.5 text-white" />
        </div>
      )}
    </div>
  )
}

function formatMessage(text: string): React.ReactNode {
  // Bold **text** sections
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-green-300 font-semibold">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}
