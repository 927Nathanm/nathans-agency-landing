import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const buildPrompt = (hint: { x: number; y: number } | null) => `You are analyzing a golf swing video frame. Your ONLY task is to locate the golf club head.

Look carefully for the club head - it is typically:
- A small metallic/dark circular or rectangular shape at the end of the shaft
- Often near the bottom of the frame during address/impact, higher during backswing/follow-through
- May appear blurry/motion-blurred if the swing is fast — look for a blur streak, not just a sharp shape
- Could be a driver (large round head), iron (smaller blade), or wedge${hint ? `
- HINT: In the previous frame the club head was at approximately (${hint.x.toFixed(2)}, ${hint.y.toFixed(2)}) — check nearby first` : ''}

Return ONLY a raw JSON object with NO markdown, no explanation, no code blocks:
{"x": 0.XX, "y": 0.YY, "confidence": "high"|"medium"|"low"}

Where x and y are normalized coordinates (0.0 = left/top, 1.0 = right/bottom).
If you genuinely cannot find the club head, return: {"x": null, "y": null, "confidence": "none"}`

export async function POST(req: NextRequest) {
  try {
    const { frame, frameTime, hint } = await req.json() as { frame: string; frameTime: number; hint?: { x: number; y: number } | null }

    if (!frame) {
      return Response.json({ error: 'No frame provided' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: frame },
            },
            {
              type: 'text',
              text: buildPrompt(hint ?? null),
            },
          ],
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    let parsed: { x: number | null; y: number | null; confidence: string }
    try {
      // Strip any accidental markdown fences
      const clean = raw.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      return Response.json({ x: null, y: null, confidence: 'none', frameTime })
    }

    return Response.json({ ...parsed, frameTime })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Detection failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
