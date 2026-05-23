'use client'

import { useState, useRef, useEffect } from 'react'
import { AREAS } from '@/app/data/areas'

interface Message {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

interface Props {
  onClose: () => void
}

const QUICK_PROMPTS = [
  'Why is Velachery down?',
  'When will power return?',
  'Which areas are affected?',
  'Recent outage history?',
]

export default function ChatBot({ onClose }: Props) {
  const [messages, setMessages]   = useState<Message[]>([
    {
      role: 'assistant',
      content: 'வணக்கம்! I\'m your "Where is My Power?" assistant 🤖\nAsk me about outages, ETAs, or anything power-related in Tamil Nadu. நான் தமிழிலும் பேசுவேன்!',
    },
  ])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const bottomRef                 = useRef<HTMLDivElement>(null)
  const inputRef                  = useRef<HTMLInputElement>(null)
  const abortRef                  = useRef<AbortController | null>(null)

  // Build live context from AREAS
  const activeOutages = AREAS.filter(a => a.status === 'outage' || a.status === 'rain').length
  const context = {
    activeOutages,
    areas: AREAS.map(a => ({ name: a.name, status: a.status, reportCount: a.reportCount })),
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', content: trimmed }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)

    // Placeholder assistant message we'll stream into
    const assistantIdx = history.length
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          context,
          messages: history
            .filter(m => !m.streaming)
            .map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assembled = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assembled += decoder.decode(value, { stream: true })
        const snap = assembled
        setMessages(prev => {
          const next = [...prev]
          next[assistantIdx] = { role: 'assistant', content: snap, streaming: true }
          return next
        })
      }

      // Mark streaming done
      setMessages(prev => {
        const next = [...prev]
        next[assistantIdx] = { role: 'assistant', content: assembled }
        return next
      })
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setMessages(prev => {
        const next = [...prev]
        next[assistantIdx] = {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
        }
        return next
      })
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2100,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      {/* Scrim */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
      }} />

      {/* Chat sheet */}
      <div
        style={{
          position: 'relative', zIndex: 1,
          background: 'var(--bg2)',
          borderRadius: '20px 20px 0 0',
          border: '1px solid var(--border2)',
          borderBottom: 'none',
          display: 'flex', flexDirection: 'column',
          maxHeight: '82dvh',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle + header */}
        <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border2)', margin: '0 auto 14px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(245,158,11,.15)', border: '1px solid rgba(245,158,11,.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>🤖</div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>Where is My Power? AI</p>
                <p style={{ fontSize: 11, color: 'var(--restored)', fontWeight: 600 }}>● Online · {activeOutages} active outage{activeOutages !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 20, lineHeight: 1, padding: 4 }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Message thread */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '0 14px 8px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-end', gap: 8,
              }}
            >
              {msg.role === 'assistant' && (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(245,158,11,.15)', border: '1px solid rgba(245,158,11,.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}>🤖</div>
              )}
              <div style={{
                maxWidth: '78%',
                background: msg.role === 'user'
                  ? 'var(--primary)'
                  : 'var(--card2)',
                color: msg.role === 'user' ? '#000' : 'var(--text)',
                borderRadius: msg.role === 'user'
                  ? '18px 18px 4px 18px'
                  : '18px 18px 18px 4px',
                padding: '10px 13px',
                fontSize: 13.5, lineHeight: 1.55,
                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                fontWeight: msg.role === 'user' ? 600 : 400,
              }}>
                {msg.content || (msg.streaming ? (
                  <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
                    {[0, 1, 2].map(d => (
                      <span key={d} style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: 'var(--text3)',
                        animation: 'chatPulse 1.2s ease-in-out infinite',
                        animationDelay: `${d * 0.2}s`,
                        display: 'block',
                      }} />
                    ))}
                  </span>
                ) : '')}
                {msg.role === 'assistant' && msg.streaming && msg.content && (
                  <span style={{ display: 'inline-block', width: 2, height: 13, background: 'var(--primary)', marginLeft: 2, animation: 'caretBlink .7s step-end infinite', verticalAlign: 'text-bottom' }} />
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts (show only before first user message) */}
        {messages.filter(m => m.role === 'user').length === 0 && (
          <div style={{
            padding: '0 14px 10px',
            display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0,
          }}>
            {QUICK_PROMPTS.map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                style={{
                  flexShrink: 0,
                  background: 'var(--card2)', border: '1px solid var(--border2)',
                  borderRadius: 20, padding: '6px 12px',
                  fontSize: 12, color: 'var(--text2)', cursor: 'pointer',
                  whiteSpace: 'nowrap', fontWeight: 500,
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div style={{
          padding: '8px 12px 12px',
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0,
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything… (Tamil or English)"
            disabled={loading}
            style={{
              flex: 1, background: 'var(--card2)',
              border: '1px solid var(--border2)',
              borderRadius: 24, padding: '10px 16px',
              fontSize: 14, color: 'var(--text)',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            style={{
              width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
              background: input.trim() && !loading ? 'var(--primary)' : 'var(--card2)',
              border: '1px solid var(--border2)',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, transition: 'background .15s',
            }}
          >
            {loading ? (
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--text3)', borderTopColor: 'var(--primary)', animation: 'spin .7s linear infinite' }} />
            ) : '↑'}
          </button>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes chatPulse {
          0%, 80%, 100% { opacity: .25; transform: scale(.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes caretBlink {
          from, to { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
