import { NextRequest } from 'next/server'
import { GOLF_SYSTEM_PROMPT } from '@/lib/golf/golfSystemPrompt'
import { downsampleSeries, type FrameMeasurements } from '@/lib/golf/poseMeasurements'

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

interface ReqBody {
  messages: ChatMsg[]
  context?: {
    currentTime?: number
    fps?: number
    cameraAngle?: string
    measurements1?: FrameMeasurements[]
    measurements2?: FrameMeasurements[]
  }
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'

const MEASUREMENT_SYSTEM_ADDENDUM = `

## INPUT FORMAT
You will receive a JSON block in the user's message tagged <swing-data> containing
pose-derived measurements over time for one or two swings. All coordinates are
normalized: positions are in units of shoulder-width (so 0.5 ≈ half a shoulder-width
from the spine center). Angles are in degrees.

Key rules when reasoning over this data:
- "measurements1" is the user's current swing; "measurements2" (when present) is
  a reference swing for comparison.
- Each entry is one detected frame with timestamp "t" in seconds.
- Treat null values as "not measurable on that frame" — don't guess at them.
- Be specific: cite actual numbers and timestamps from the data rather than
  generic advice. "At t=0.8s your spine tilt was 32°, but earlier in the
  takeaway it was 18° — you've lost posture" is the kind of analysis to aim for.
- The data is 2D from a single camera. Be honest about what you cannot determine:
  true shoulder rotation, depth-axis motion, club-face angle, and swing plane
  cannot be measured reliably from this data. Don't fabricate numbers for them.
- If the cameraAngle is "unknown" or measurements are sparse/empty, say so and
  ask the user to enable pose detection and play through the swing.
`

function formatSwingData(ctx: ReqBody['context']): string {
  if (!ctx) return ''
  const m1 = downsampleSeries(ctx.measurements1 ?? [], 60)
  const m2 = downsampleSeries(ctx.measurements2 ?? [], 60)
  const payload = {
    currentTime: ctx.currentTime,
    fps: ctx.fps,
    cameraAngle: ctx.cameraAngle ?? 'unknown',
    measurements1: m1,
    measurements2: m2.length > 0 ? m2 : undefined,
  }
  return `\n\n<swing-data>\n${JSON.stringify(payload)}\n</swing-data>`
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error:
          'ANTHROPIC_API_KEY is not configured on the server. Add it to .env.local to enable AI analysis.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  let body: ReqBody
  try {
    body = (await req.json()) as ReqBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const messages = (body.messages ?? []).filter(
    m => m.role === 'user' || m.role === 'assistant',
  )
  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: 'No messages provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Attach the swing-data JSON to the most recent user message so the model
  // sees it as part of the conversational turn it's responding to.
  const lastUserIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return i
    }
    return -1
  })()
  if (lastUserIdx >= 0) {
    messages[lastUserIdx] = {
      ...messages[lastUserIdx],
      content: messages[lastUserIdx].content + formatSwingData(body.context),
    }
  }

  let upstream: Response
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        temperature: 0.2,
        system: GOLF_SYSTEM_PROMPT + MEASUREMENT_SYSTEM_ADDENDUM,
        messages,
        stream: true,
      }),
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Upstream request failed: ${(err as Error).message}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '')
    return new Response(
      JSON.stringify({ error: `Anthropic API error ${upstream.status}: ${text.slice(0, 500)}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Translate Anthropic's SSE event stream into our client's simpler
  // `{type:'text', text:...}` SSE format.
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader()
      let buffer = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (!data) continue
            try {
              const evt = JSON.parse(data)
              if (
                evt.type === 'content_block_delta' &&
                evt.delta?.type === 'text_delta' &&
                typeof evt.delta.text === 'string'
              ) {
                const chunk = JSON.stringify({ type: 'text', text: evt.delta.text })
                controller.enqueue(encoder.encode(`data: ${chunk}\n\n`))
              }
            } catch {
              // ignore malformed event
            }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'text', text: `\n\n[stream error: ${(err as Error).message}]` })}\n\n`,
          ),
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
