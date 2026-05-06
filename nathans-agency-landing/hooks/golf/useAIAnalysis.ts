'use client'

import { useState, useCallback } from 'react'
import type { AIState, ChatMessage, Annotation, AIAnnotationSuggestion } from '@/lib/golf/annotationTypes'

function parseAnnotations(text: string, currentTime: number): Annotation[] {
  const match = text.match(/```annotations\n([\s\S]*?)\n```/)
  if (!match) return []
  try {
    const data = JSON.parse(match[1])
    const shapes = data.shapes ?? []
    return shapes.map((s: AIAnnotationSuggestion & { tool: string }) => ({
      id: crypto.randomUUID(),
      tool: s.tool as Annotation['tool'],
      points: (s.points ?? []).map((p: number[]) => ({ x: p[0], y: p[1] })),
      style: {
        color: s.color ?? '#00ff00',
        strokeWidth: s.strokeWidth ?? 2,
        opacity: 0.9,
      },
      label: s.label,
      frameTime: currentTime,
      source: 'ai' as const,
    }))
  } catch {
    return []
  }
}

function stripAnnotationBlock(text: string): string {
  return text.replace(/```annotations\n[\s\S]*?\n```/g, '').trim()
}

export function useAIAnalysis(currentTime: number) {
  const [state, setState] = useState<AIState>({
    messages: [],
    isLoading: false,
    error: null,
    pendingAnnotations: [],
  })

  const sendMessage = useCallback(
    async (
      text: string,
      frames?: { frame1?: string; frame2?: string }
    ) => {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        timestamp: new Date(),
        hasFrames: !!(frames?.frame1 || frames?.frame2),
      }

      setState(s => ({
        ...s,
        isLoading: true,
        error: null,
        messages: [...s.messages, userMessage],
      }))

      const assistantId = crypto.randomUUID()
      setState(s => ({
        ...s,
        messages: [
          ...s.messages,
          { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
        ],
      }))

      try {
        const payload = {
          messages: [...state.messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          frame1: frames?.frame1,
          frame2: frames?.frame2,
          frameTime: currentTime,
        }

        const res = await fetch('/api/golf-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) throw new Error(`API error: ${res.status}`)

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'text') {
                accumulated += parsed.text
                setState(s => ({
                  ...s,
                  messages: s.messages.map(m =>
                    m.id === assistantId
                      ? { ...m, content: stripAnnotationBlock(accumulated) }
                      : m
                  ),
                }))
              }
            } catch {
              // partial JSON chunk — skip
            }
          }
        }

        // Parse annotations from complete response
        const annotations = parseAnnotations(accumulated, currentTime)
        setState(s => ({
          ...s,
          isLoading: false,
          pendingAnnotations: annotations.length > 0 ? annotations : s.pendingAnnotations,
        }))
      } catch (err) {
        setState(s => ({
          ...s,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Analysis failed',
          messages: s.messages.filter(m => m.id !== assistantId),
        }))
      }
    },
    [state.messages, currentTime]
  )

  const clearPendingAnnotations = useCallback(() => {
    setState(s => ({ ...s, pendingAnnotations: [] }))
  }, [])

  const clearMessages = useCallback(() => {
    setState(s => ({ ...s, messages: [], error: null }))
  }, [])

  return {
    ...state,
    sendMessage,
    clearPendingAnnotations,
    clearMessages,
  }
}
