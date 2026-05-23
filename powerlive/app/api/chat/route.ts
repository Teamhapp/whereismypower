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

function getActiveAIProvider(): 'gemini' | 'claude' | 'mock' {
  const geminiKey = process.env.GEMINI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  if (geminiKey && !geminiKey.includes('placeholder') && !geminiKey.includes('your-api')) {
    return 'gemini'
  }
  if (anthropicKey && !anthropicKey.includes('placeholder') && !anthropicKey.includes('your-api')) {
    return 'claude'
  }
  return 'mock'
}

// POST /api/chat  — streaming multi-provider response
export async function POST(req: NextRequest) {
  try {
    const body: ChatBody = await req.json()
    const { messages, context } = body

    if (!messages?.length) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    const provider = getActiveAIProvider()

    // Build context block for the system prompt
    const contextBlock = context
      ? `\n\nCurrent app data (use this to answer location-specific questions):
Active outages: ${context.activeOutages}
Area statuses:
${context.areas.map(a => `- ${a.name}: ${a.status} (${a.reportCount} reports)`).join('\n')}`
      : ''

    const fullSystemPrompt = CHAT_SYSTEM + contextBlock

    // ── A. GOOGLE GEMINI 2.5 FLASH STREAMING ──
    if (provider === 'gemini') {
      try {
        const apiKey = process.env.GEMINI_API_KEY
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}`

        // Convert messages payload to Gemini API structure
        const geminiContents = [
          { role: 'user', parts: [{ text: `System Instruction: ${fullSystemPrompt}` }] },
          ...messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          }))
        ]

        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: geminiContents })
        })

        if (res.ok && res.body) {
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          const encoder = new TextEncoder()

          const readableStream = new ReadableStream({
            async start(controller) {
              try {
                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break
                  const chunkText = decoder.decode(value)
                  
                  // Extract raw "text" fields from streamed JSON parts
                  const matches = [...chunkText.matchAll(/"text"\s*:\s*"([^"]+)"/g)]
                  for (const match of matches) {
                    const text = match[1]
                      .replace(/\\n/g, '\n')
                      .replace(/\\"/g, '"')
                      .replace(/\\t/g, '\t')
                    controller.enqueue(encoder.encode(text))
                  }
                }
              } catch (e: any) {
                console.error('[gemini-stream] error:', e.message)
              } finally {
                controller.close()
              }
            }
          })

          return new Response(readableStream, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Transfer-Encoding': 'chunked',
            }
          })
        }
      } catch { /* Fallback */ }
    }

    // ── B. ANTHROPIC CLAUDE STREAMING ──
    if (provider === 'claude') {
      try {
        const stream = await anthropic.messages.stream({
          model: 'claude-3-5-haiku-latest',
          max_tokens: 300,
          system: fullSystemPrompt,
          messages: messages as Anthropic.MessageParam[],
        })

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
      } catch { /* Fallback */ }
    }

    // ── C. OFFLINE RULE-BASED MOCK CHAT ──
    const lastMsg = messages[messages.length - 1].content.toLowerCase()
    let mockReply = 'எங்கே என் மின்சாரம் AI உதவியாளருக்கு வரவேற்கிறோம்! I can assist you with active TNEB circle updates and reports.'

    if (lastMsg.includes('outage') || lastMsg.includes('power cut') || lastMsg.includes('கரண்ட்') || lastMsg.includes('மின்சாரம்')) {
      const names = context?.areas?.map(a => a.name).join(', ') || 'Velachery, Tambaram'
      mockReply = `TNEB Grid is currently reporting ${context?.activeOutages || 2} active community outages located near: ${names}. Active restoration crews have been dispatched.`
    } else if (lastMsg.includes('scheduled') || lastMsg.includes('maintenance') || lastMsg.includes('பராமரிப்பு')) {
      mockReply = 'TANGEDCO has scheduled maintenance shutdowns across Chennai circles today. Check the "Planned Outages" tab on your dashboard for timing details.'
    } else if (lastMsg.includes('hello') || lastMsg.includes('hi') || lastMsg.includes('வணக்கம்')) {
      mockReply = 'வணக்கம்! Welcome to Where is My Power? assistant. Ask me about active outage circles, ETAs, or scheduled cuts near you.'
    }

    const encoder = new TextEncoder()
    const readableStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(mockReply))
        controller.close()
      }
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (err: any) {
    console.error('[chat-route]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
