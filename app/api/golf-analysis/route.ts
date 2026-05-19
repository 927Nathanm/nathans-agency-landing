import { NextRequest } from 'next/server'
import { GOLF_SYSTEM_PROMPT } from '@/lib/golf/golfSystemPrompt'
import { downsampleSeries, type FrameMeasurements } from '@/lib/golf/poseMeasurements'
import { generateGolfResponse } from '@/lib/golf/builtInAnalysis'

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

interface PhaseHint {
  /** Index into measurements series; matches keypoint history on the client. */
  p1Frame: number | null
}

interface ReqBody {
  messages: ChatMsg[]
  context?: {
    currentTime?: number
    fps?: number
    cameraAngle?: string
    measurements1?: FrameMeasurements[]
    measurements2?: FrameMeasurements[]
    phases1?: PhaseHint
    phases2?: PhaseHint
    hasClubPath1?: boolean
    hasClubPath2?: boolean
  }
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'

const TOOLS = [
  {
    name: 'markSwingPlane',
    description:
      "Draw the user's swing plane on Video 1. Call this when the user asks " +
      'to mark, draw, show, or visualize their swing plane. The system computes ' +
      "the geometry from the user's address-position pose and their traced " +
      'club path — you do not provide any coordinates. This tool only works ' +
      'if pose detection is enabled on Video 1 AND a club path has been traced ' +
      "on Video 1; otherwise the system will tell the user what's missing.",
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'markHandPath',
    description:
      "Draw the trace of the user's hand path across the swing on Video 1. " +
      'Call this when the user asks to mark, draw, show, trace, or visualize ' +
      'their hand path, hands, or hand arc. The system pulls hand positions from ' +
      'the recorded pose measurement series and draws the polyline. Only requires ' +
      'pose detection enabled on Video 1 with enough recorded frames — no club ' +
      'path tracing needed. Pass `hand: "lead"` (default) for the lead hand, ' +
      '`hand: "trail"` for the trail hand.',
    input_schema: {
      type: 'object' as const,
      properties: {
        hand: {
          type: 'string' as const,
          enum: ['lead', 'trail'],
          description: 'Which hand to trace. Lead is the most useful for path/over-the-top analysis.',
        },
      },
      required: [],
    },
  },
]

const MEASUREMENT_ADDENDUM = `

## INPUT FORMAT
You will receive a JSON block in the user's message tagged <swing-data> containing
pose-derived measurements over time and phase indices. Coordinates are normalized
in units of shoulder-width unless suffixed "X"/"Y" with "Hand" or "head", which
are in image space (0..1). Angles are in degrees.

Rules:
- "measurements1" is the user's current swing; "measurements2" (when present) is
  a reference swing for comparison.
- Each entry has "t" in seconds. Null fields mean the landmark wasn't measurable
  on that frame — never guess at them.
- "phases1.p1Frame" / "phases2.p1Frame" is the index of the address frame, or null.
- The data is 2D from a single camera. Cannot reliably measure: true shoulder
  rotation, depth-axis motion, club-face angle, swing-plane angle. Don't fabricate
  numbers for these.
- Cite real numbers from the data when making claims. "At t=0.8s your spine
  tilt was 32°" is better than "your spine tilt looks high."
- If measurements are empty, ask the user to enable Pose V1 and play through the swing.
`

function formatSwingData(ctx: ReqBody['context']): string {
  if (!ctx) return ''
  const m1 = downsampleSeries(ctx.measurements1 ?? [], 60)
  const m2 = downsampleSeries(ctx.measurements2 ?? [], 60)
  const payload = {
    currentTime: ctx.currentTime,
    fps: ctx.fps,
    cameraAngle: ctx.cameraAngle ?? 'unknown',
    phases1: ctx.phases1,
    phases2: ctx.phases2,
    hasClubPath1: ctx.hasClubPath1 ?? false,
    hasClubPath2: ctx.hasClubPath2 ?? false,
    measurements1: m1,
    measurements2: m2.length > 0 ? m2 : undefined,
  }
  return `\n\n<swing-data>\n${JSON.stringify(payload)}\n</swing-data>`
}

// -------- Fallback: no API key. Stream the built-in response. ----------------
function buildFallbackStream(body: ReqBody): Response {
  const encoder = new TextEncoder()
  const text = generateGolfResponse({
    messages: body.messages ?? [],
    hasFrame1: (body.context?.measurements1?.length ?? 0) > 0,
    hasFrame2: (body.context?.measurements2?.length ?? 0) > 0,
    frameTime: body.context?.currentTime,
  })

  const stream = new ReadableStream({
    async start(controller) {
      const words = text.split(' ')
      for (const word of words) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'text', text: word + ' ' })}\n\n`),
        )
        await new Promise(r => setTimeout(r, 8))
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
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

export async function POST(req: NextRequest) {
  let body: ReqBody
  try {
    body = (await req.json()) as ReqBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // No key → fallback to built-in response so the app still works in dev.
    return buildFallbackStream(body)
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

  // Attach swing-data JSON to the most recent user message.
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
        system: GOLF_SYSTEM_PROMPT + MEASUREMENT_ADDENDUM,
        tools: TOOLS,
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
    const errText = await upstream.text().catch(() => '')
    return new Response(
      JSON.stringify({ error: `Anthropic API error ${upstream.status}: ${errText.slice(0, 500)}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Translate Anthropic's SSE event stream into our client's simpler protocol:
  //   { type: 'text', text: '...' }          — incremental text deltas
  //   { type: 'tool_call', name, input }     — a tool the model wants to use
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  // Per-content-block scratch state. We accumulate any tool input_json_delta
  // pieces here and emit a single tool_call event at content_block_stop.
  type BlockState =
    | { type: 'text' }
    | { type: 'tool_use'; name: string; rawInput: string }
  const blocks = new Map<number, BlockState>()

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

              if (evt.type === 'content_block_start') {
                const idx: number = evt.index
                const cb = evt.content_block
                if (cb?.type === 'tool_use') {
                  blocks.set(idx, { type: 'tool_use', name: cb.name, rawInput: '' })
                } else {
                  blocks.set(idx, { type: 'text' })
                }
              } else if (evt.type === 'content_block_delta') {
                const idx: number = evt.index
                const block = blocks.get(idx)
                if (!block) continue
                if (block.type === 'text' && evt.delta?.type === 'text_delta') {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: 'text', text: evt.delta.text })}\n\n`,
                    ),
                  )
                } else if (block.type === 'tool_use' && evt.delta?.type === 'input_json_delta') {
                  block.rawInput += evt.delta.partial_json ?? ''
                }
              } else if (evt.type === 'content_block_stop') {
                const idx: number = evt.index
                const block = blocks.get(idx)
                if (block?.type === 'tool_use') {
                  let input: unknown = {}
                  if (block.rawInput) {
                    try { input = JSON.parse(block.rawInput) } catch { input = {} }
                  }
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: 'tool_call', name: block.name, input })}\n\n`,
                    ),
                  )
                }
                blocks.delete(idx)
              }
            } catch {
              // malformed event — skip
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
