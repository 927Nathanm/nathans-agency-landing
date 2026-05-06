import Anthropic from '@anthropic-ai/sdk'
import { GOLF_SYSTEM_PROMPT } from '@/lib/golf/golfSystemPrompt'
import { NextRequest } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, frame1, frame2, frameTime } = body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
      frame1?: string
      frame2?: string
      frameTime?: number
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), { status: 400 })
    }

    // Build Anthropic messages — inject frame images into the last user message
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m, i) => {
      const isLastUser = m.role === 'user' && i === messages.length - 1
      if (isLastUser && (frame1 || frame2)) {
        const content: Anthropic.ContentBlockParam[] = []
        if (frame1) {
          content.push({
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: frame1 },
          })
        }
        if (frame2) {
          content.push({
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: frame2 },
          })
        }
        const contextNote = frameTime !== undefined ? ` [Frame at ${frameTime.toFixed(2)}s]` : ''
        content.push({ type: 'text', text: m.content + contextNote })
        return { role: 'user', content }
      }
      return { role: m.role, content: m.content }
    })

    // Filter out empty assistant messages (in-progress streaming placeholders)
    const filtered = anthropicMessages.filter(m => {
      if (typeof m.content === 'string') return m.content.trim().length > 0
      return true
    })

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: GOLF_SYSTEM_PROMPT,
      messages: filtered,
    })

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const data = JSON.stringify({ type: 'text', text: chunk.delta.text })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Stream error'
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`)
          )
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
}
