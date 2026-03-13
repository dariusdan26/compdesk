'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

function HexIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M12 2L21.39 7.5V16.5L12 22L2.61 16.5V7.5L12 2Z" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Invalid username or password.')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #0F2440 0%, #1B3A5C 50%, #2A5080 100%)' }}>
      {/* Subtle hex background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        {[...Array(12)].map((_, i) => (
          <HexIcon
            key={i}
            className="absolute text-white"
            style={{
              width: `${60 + (i % 3) * 40}px`,
              top: `${(i * 17 + 5) % 90}%`,
              left: `${(i * 23 + 3) % 95}%`,
              transform: `rotate(${i * 15}deg)`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="w-full relative z-10" style={{ maxWidth: '32rem' }}>
        {/* Logo / Brand */}
        <div className="mb-10 text-center">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
            <HexIcon style={{ width: '3.5rem', height: '3.5rem', color: '#5B84B1' }} />
            <span style={{ fontSize: '2.25rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.025em' }}>CompDesk</span>
          </div>
          <p style={{ fontSize: '1rem', color: '#8BAFD4' }}>Sign in to your account</p>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl shadow-2xl border"
          style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(91,132,177,0.3)', backdropFilter: 'blur(12px)', padding: '2.25rem' }}
        >
          <div style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="username" style={{ display: 'block', fontSize: '1rem', fontWeight: 500, marginBottom: '8px', color: '#C5D8EF' }}>
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full rounded-lg placeholder-[#6B8BA8] text-white focus:outline-none focus:ring-2 transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(91,132,177,0.4)', '--tw-ring-color': '#3D6B9B', padding: '0.8125rem 1rem', fontSize: '1rem' } as React.CSSProperties}
              placeholder="Enter your username"
            />
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label htmlFor="password" style={{ display: 'block', fontSize: '1rem', fontWeight: 500, marginBottom: '8px', color: '#C5D8EF' }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg placeholder-[#6B8BA8] text-white focus:outline-none focus:ring-2 transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(91,132,177,0.4)', '--tw-ring-color': '#3D6B9B', padding: '0.8125rem 1rem', fontSize: '1rem' } as React.CSSProperties}
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div style={{ marginBottom: '1.25rem', padding: '0.8125rem 1rem', borderRadius: '0.5rem', fontSize: '0.9375rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#FCA5A5' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold rounded-lg transition-all text-white disabled:opacity-50"
            style={{ background: loading ? '#2A5080' : '#3D6B9B', padding: '0.9375rem 1rem', fontSize: '1.0625rem' }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#2A5080' }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#3D6B9B' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center mt-6" style={{ color: '#5B7A9A', fontSize: '0.875rem' }}>
          Contact your administrator if you need access.
        </p>
      </div>
    </div>
  )
}
