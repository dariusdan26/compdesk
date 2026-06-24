'use client'

import { useCallback, useEffect } from 'react'

export interface ViewerDoc {
  id: number
  title: string
  manufacturer?: string | null
  filename: string
}

/**
 * Full-screen in-app document viewer.
 *
 * The vaults are used inside CompDesk installed as a standalone PWA on the
 * production floor. In standalone mode there is no browser chrome, so opening
 * a file with target="_blank" strands the user on the file with no way back
 * short of force-quitting the app. This overlay renders the file in an iframe
 * with its own "Back to vault" control instead.
 *
 * @param fileUrl  endpoint that streams the file (e.g. /api/sds/123/file)
 */
export function DocViewer({
  doc,
  fileUrl,
  onClose,
}: {
  doc: ViewerDoc
  fileUrl: string
  onClose: () => void
}) {
  // On open we push a throwaway history entry so the device/browser back
  // gesture closes the viewer (returning to the vault) instead of leaving the
  // standalone PWA. Both close paths — the on-screen Back button / Escape and
  // the device back gesture — go through that same history entry: the button
  // calls history.back(), which fires popstate, which unmounts. Keeping the
  // single popstate path means the cleanup never has to call history.back()
  // itself, so React StrictMode's double-mount in dev can't self-close it.
  const close = useCallback(() => {
    window.history.back()
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') window.history.back()
    }
    function onPop() {
      onClose()
    }

    window.history.pushState({ docViewer: true }, '')
    window.addEventListener('keydown', onKey)
    window.addEventListener('popstate', onPop)

    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('popstate', onPop)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: '#525659', display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Header bar */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: 'calc(0.75rem + env(safe-area-inset-top)) 1rem 0.75rem',
        background: '#1B3A5C', color: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}>
        <button
          onClick={close}
          aria-label="Back to vault"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            background: 'rgba(255,255,255,0.12)', color: '#fff', border: 'none',
            borderRadius: '0.5rem', padding: '0.5rem 0.875rem',
            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </button>

        <p style={{
          flex: 1, minWidth: 0, fontSize: '0.9375rem', fontWeight: 600,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {doc.title}
        </p>

        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open in new tab"
          title="Open in new tab"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#C8D6E5', flexShrink: 0, padding: '0.375rem',
          }}
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* File */}
      <iframe
        src={fileUrl}
        title={doc.title}
        style={{ flex: 1, width: '100%', border: 'none', background: '#525659' }}
      />
    </div>
  )
}
