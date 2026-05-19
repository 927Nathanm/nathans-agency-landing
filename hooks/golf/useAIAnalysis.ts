'use client'

import { useState, useCallback, useRef } from 'react'
import type { AIState, ChatMessage, Annotation, AIAnnotationSuggestion } from '@/lib/golf/annotationTypes'
import type { FrameMeasurements } from '@/lib/golf/poseMeasurements'

export interface AnalysisContext {
  /** Pose-derived measurement time series for video 1 */
  measurements1?: FrameMeasurements[]
  /** Pose-derived measurement time series for video 2 (reference swing) */
  measurements2?: FrameMeasurements[]
  /** Frames per second of the source video, when known */
  fps?: number
  /** Camera angle, if user has selected one */
  cameraAngle?: 'face-on' | 'down-the-line' | 'behind' | 'unknown'
  /** P-position frame indices for V1 (matches FrameMeasurements series indices) */
  phases1?: { p1Frame: number | null }
  /** P-position frame indices for V2 */
  phases2?: { p1Frame: number | null }
  /** Whether a club path has been traced on V1 */
  hasClubPath1?: boolean
  /** Whether a club path has been traced on V2 */
  hasClubPath2?: boolean
}

/**
 * Tool handlers run client-side when the LLM emits a tool_use block. They
 * receive the input payload from the model (often empty for fixed-geometry
 * tools) and return either an Annotation to add as pending, a string error
 * to surface to the user, or null if there's nothing to do.
 */
export type ToolHandlerResult =
  | { ok: true; annotation: Annotation }
  | { ok: false; error: string }
  | null

export type ToolHandlers = Record<
  string,
  (input: unknown) => ToolHandlerResult
>

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

export function useAIAnalysis(currentTime: number, toolHandlers?: ToolHandlers) {
  const [state, setState] = useState<AIState>({
    messages: [],
    isLoading: false,
    error: null,
    pendingAnnotations: [],
  })

  // Stash handlers in a ref so the streaming reader always sees the latest
  // closure-captured state without forcing sendMessage to re-memoize.
  const handlersRef = useRef<ToolHandlers | undefined>(toolHandlers)
  handlersRef.current = toolHandlers

  const sendMessage = useCallback(
    async (
      text: string,
      ctx?: AnalysisContext,
    ) => {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        timestamp: new Date(),
        hasFrames: !!(ctx?.measurements1?.length || ctx?.measurements2?.length),
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
          context: {
            currentTime,
            fps: ctx?.fps,
            cameraAngle: ctx?.cameraAngle ?? 'unknown',
            measurements1: ctx?.measurements1 ?? [],
            measurements2: ctx?.measurements2 ?? [],
            phases1: ctx?.phases1,
            phases2: ctx?.phases2,
            hasClubPath1: ctx?.hasClubPath1 ?? false,
            hasClubPath2: ctx?.hasClubPath2 ?? false,
          },
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
              } else if (parsed.type === 'tool_call' && typeof parsed.name === 'string') {
                const handler = handlersRef.current?.[parsed.name]
                if (!handler) {
                  setState(s => ({
                    ...s,
                    messages: s.messages.map(m =>
                      m.id === assistantId
                        ? { ...m, content: m.content + `\n\n_[Model requested tool \`${parsed.name}\` but no handler is registered.]_` }
                        : m,
                    ),
                  }))
                  continue
                }
                const result = handler(parsed.input)
                if (result?.ok) {
                  setState(s => ({
                    ...s,
                    pendingAnnotations: [...s.pendingAnnotations, result.annotation],
                  }))
                } else if (result && result.ok === false) {
                  setState(s => ({
                    ...s,
                    messages: s.messages.map(m =>
                      m.id === assistantId
                        ? { ...m, content: m.content + `\n\n_[Could not draw: ${result.error}]_` }
                        : m,
                    ),
                  }))
                }
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
    [currentTime]
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
