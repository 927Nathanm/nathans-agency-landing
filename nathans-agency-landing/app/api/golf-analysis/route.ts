import { generateGolfResponse } from '@/lib/golf/builtInAnalysis'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, hasFrame1, hasFrame2, frameTime } = body

    const responseText = generateGolfResponse({
      messages: messages ?? [],
      hasFrame1: !!hasFrame1,
      hasFrame2: !!hasFrame2,
      frameTime,
    })

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const words = responseText.split(' ')
        for (const word of words) {
          const chunk = JSON.stringify({ type: 'text', text: word + ' ' })
          controller.enqueue(encoder.encode(`data: ${chunk}\n\n`))
          await new Promise(r => setTimeout(r, 12))
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
  } catch (err) {
    console.error('Golf analysis error:', err)
    return new Response(JSON.stringify({ error: 'Analysis failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
