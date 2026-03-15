'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/app/components/PageHeader'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

function HexIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M12 2L21.39 7.5V16.5L12 22L2.61 16.5V7.5L12 2Z" />
    </svg>
  )
}

export default function KnowledgePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const question = input.trim()
    if (!question || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: question }])
    setLoading(true)

    try {
      const res = await fetch('/api/knowledge/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', text: data.answer ?? 'No response received.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Something went wrong. Check your connection and try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#EEF3F9' }}>
      <PageHeader title="Knowledge Base" />

      {isEmpty ? (
        /* ── Empty state: prominent centered search ── */
        <div className="flex-1 flex flex-col items-center px-4 pt-10 sm:pt-0 sm:justify-center pb-8">
          <div style={{ width: '100%', maxWidth: '46rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '2.5rem' }}>

            {/* Hex icon */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: '#DCEAF7' }}>
              <svg className="w-8 h-8" style={{ color: '#3D6B9B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            {/* Title + subtitle */}
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: '#1B3A5C' }}>Ask a question</h1>
              <p className="text-base max-w-md mx-auto leading-relaxed" style={{ color: '#6B7A8D' }}>
                Ask about resin types, mix ratios, fiberglass specs, foam grades, panel types, or any process or product question.
              </p>
            </div>

            {/* Prominent search bar */}
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask about a product, process, or spec..."
                  className="flex-1 bg-white rounded-xl text-base placeholder-[#8BAFD4] focus:outline-none focus:ring-2 transition-all shadow-sm"
                  style={{ border: '1px solid #C5D8EF', color: '#1B3A5C', '--tw-ring-color': '#3D6B9B', padding: '1.125rem 1.375rem', fontSize: '1rem' } as React.CSSProperties}
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="font-semibold rounded-xl text-base transition-all shrink-0 shadow-sm text-white disabled:opacity-40"
                  style={{ background: '#3D6B9B', padding: '1.125rem 2rem' }}
                  onMouseEnter={e => { if (input.trim()) (e.currentTarget as HTMLButtonElement).style.background = '#2A5080' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#3D6B9B' }}
                >
                  Ask
                </button>
              </div>
            </form>

            {/* Example chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
              {[
                'What is CEM 200?',
                'Gel time for vinyl ester?',
                'Fiberglass weight specs?',
                'Mix ratio for epoxy resin?',
              ].map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setInput(q)}
                  className="px-3.5 py-1.5 bg-white rounded-full text-sm transition-all shadow-sm"
                  style={{ border: '1px solid #C5D8EF', color: '#3D6B9B' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#3D6B9B'
                    ;(e.currentTarget as HTMLButtonElement).style.color = '#1B3A5C'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#C5D8EF'
                    ;(e.currentTarget as HTMLButtonElement).style.color = '#3D6B9B'
                  }}
                >
                  {q}
                </button>
              ))}
            </div>

          </div>
        </div>
      ) : (
        /* ── Chat state: messages + input in a centered column ── */
        <div className="flex-1 flex flex-col items-center px-4 py-6">
          <div className="w-full max-w-3xl flex flex-col gap-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mr-2 mt-0.5 shrink-0" style={{ background: '#3D6B9B' }}>
                    <HexIcon className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div
                  className="max-w-[85%] rounded-xl whitespace-pre-wrap leading-relaxed"
                  style={
                    msg.role === 'user'
                      ? { background: '#1B3A5C', color: '#fff', borderRadius: '12px 4px 12px 12px', padding: '0.75rem 1.25rem', fontSize: '1rem' }
                      : { background: '#fff', color: '#1B3A5C', border: '1px solid #D0DCE8', borderRadius: '4px 12px 12px 12px', padding: '0.75rem 1rem', fontSize: '0.9375rem' }
                  }
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center mr-2 mt-0.5 shrink-0" style={{ background: '#3D6B9B' }}>
                  <HexIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: '#fff', border: '1px solid #D0DCE8' }}>
                  <svg className="animate-spin" style={{ width: '1.125rem', height: '1.125rem', color: '#3D6B9B', flexShrink: 0 }} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span style={{ fontSize: '0.9375rem', color: '#6B7A8D' }}>Generating response...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />

            {/* Input — sits directly below messages */}
            <form onSubmit={handleSubmit} className="flex gap-3 mt-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask a follow-up question..."
                disabled={loading}
                className="flex-1 rounded-xl focus:outline-none focus:ring-2 transition-all disabled:opacity-50"
                style={{ background: '#fff', border: '1px solid #C5D8EF', color: '#1B3A5C', '--tw-ring-color': '#3D6B9B', padding: '1rem 1.25rem', fontSize: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } as React.CSSProperties}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="font-semibold rounded-xl transition-all shrink-0 text-white disabled:opacity-40"
                style={{ background: '#3D6B9B', padding: '1rem 1.75rem', fontSize: '1rem' }}
                onMouseEnter={e => { if (!loading && input.trim()) (e.currentTarget as HTMLButtonElement).style.background = '#2A5080' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#3D6B9B' }}
              >
                Ask
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
