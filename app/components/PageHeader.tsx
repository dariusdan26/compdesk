'use client'

import Link from 'next/link'

export function PageHeader({ title }: { title: string }) {
  return (
    <header style={{ background: '#1B3A5C', borderBottom: '1px solid #2E5478', flexShrink: 0 }}>
      <div
        className="flex items-center"
        style={{ maxWidth: '72rem', margin: '0 auto', padding: '0.875rem 1rem' }}
      >
        {/* Back arrow */}
        <Link
          href="/dashboard"
          className="text-[#6B8BA8] hover:text-white transition-colors flex items-center flex-shrink-0"
          style={{ marginRight: '0.75rem' }}
        >
          <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        {/* Logo — hex icon always visible; "CompDesk" text only on sm+ */}
        <div className="flex items-center flex-shrink-0" style={{ gap: '0.625rem' }}>
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-7 h-7 sm:w-9 sm:h-9 flex-shrink-0"
            style={{ color: '#5B84B1' }}
          >
            <path d="M12 2L21.39 7.5V16.5L12 22L2.61 16.5V7.5L12 2Z" />
          </svg>
          <span
            className="hidden sm:inline font-bold text-white"
            style={{ fontSize: '1.5rem', letterSpacing: '-0.025em' }}
          >
            CompDesk
          </span>
        </div>

        {/* Separator — hidden on mobile */}
        <span className="hidden sm:inline" style={{ color: '#3D6B9B', fontSize: '1.125rem', margin: '0 0.875rem' }}>/</span>

        {/* Page title */}
        <span
          className="truncate text-sm sm:text-base"
          style={{ color: '#A8C4E0', marginLeft: '0.625rem' }}
          // on sm+ the margin is overridden visually by the separator's own margin
        >
          {title}
        </span>
      </div>
    </header>
  )
}
