'use client'

import Link from 'next/link'

export function PageHeader({ title }: { title: string }) {
  return (
    <header style={{ background: '#1B3A5C', borderBottom: '1px solid #2A4A6E', flexShrink: 0, position: 'sticky', top: 0, zIndex: 50 }}>
      <div
        style={{
          maxWidth: '72rem',
          margin: '0 auto',
          padding: '0.875rem 1rem',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Back arrow */}
        <Link
          href="/dashboard"
          style={{
            color: '#7A8FA0',
            marginRight: '0.625rem',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            textDecoration: 'none',
          }}
        >
          <svg style={{ width: '1.125rem', height: '1.125rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        {/* Logo: hex icon + CompDesk text — always visible */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ width: '1.75rem', height: '1.75rem', flexShrink: 0, color: '#6B94C0' }}
          >
            <path d="M12 2L21.39 7.5V16.5L12 22L2.61 16.5V7.5L12 2Z" />
          </svg>
          <span
            style={{
              fontWeight: 700,
              color: '#ffffff',
              fontSize: '1.125rem',
              letterSpacing: '-0.025em',
              whiteSpace: 'nowrap',
            }}
          >
            CompDesk
          </span>
        </div>

        {/* Separator */}
        <span style={{ color: '#4E7FB5', fontSize: '1rem', margin: '0 0.625rem', flexShrink: 0 }}>/</span>

        {/* Page title */}
        <span
          style={{
            color: '#A8B8CC',
            fontSize: '0.9375rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>
      </div>
    </header>
  )
}
