import { NextRequest, NextResponse } from 'next/server'
import { anthropic, CHAT_SYSTEM } from '@/lib/ai'
import Anthropic from '@anthropic-ai/sdk'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatBody {
  messages: ChatMessage[]
  context?: {
    activeOutages: number
    areas: { name: string; status: string; reportCount: number }[]
  }
}

// POST /api/chat  — streaming response
export async function POST(req: NextRequest) {
  try {
    const body: ChatBody = await req.json()
    const { messages, context } = body

    if (!messages?.length) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    // Build context block for the system prompt
    const contextBlock = context
      ? `\n\nCurrent app data (use this to answer location-specific questions):
Active outages: ${context.activeOutages}
Area statuses:
${context.areas.map(a => `- ${a.name}: ${a.status} (${a.reportCount} reports)`).join('\n')}`
      : ''

    // Stream the response back to the client
    const stream = await anthropic.messages.stream({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: CHAT_SYSTEM + contextBlock,
      messages: messages as Anthropic.MessageParam[],
    })

    // Return a ReadableStream so the frontend can consume chunks progressively
    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
        controller.close()
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
      },
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error'
    console.error('[chat]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
