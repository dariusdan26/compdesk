'use client'

import { useState } from 'react'

interface SOP {
  id: number
  title: string
  department: string
  version: string
  content: string
  createdAt: string
  updatedAt: string
}

const DEPT_COLORS: Record<string, { bg: string; icon: string; text: string }> = {
  Production:        { bg: '#DCEAF7', icon: '#3D6B9B', text: '#1B3A5C' },
  Quality:           { bg: '#FEF9C3', icon: '#CA8A04', text: '#713F12' },
  Safety:            { bg: '#FEE2E2', icon: '#DC2626', text: '#7F1D1D' },
  Warehouse:         { bg: '#D1FAE5', icon: '#059669', text: '#064E3B' },
  Maintenance:       { bg: '#EDE9FE', icon: '#7C3AED', text: '#3B0764' },
  'Business Central': { bg: '#FFF7ED', icon: '#EA580C', text: '#7C2D12' },
  Administration: { bg: '#FFE4E6', icon: '#E11D48', text: '#881337' },
  General:        { bg: '#F1F5F9', icon: '#475569', text: '#0F172A' },
}

const PINNED_DEPTS = [
  'Production', 'Quality', 'Safety', 'Warehouse',
  'Maintenance', 'Business Central', 'Administration', 'General',
]

function getDeptStyle(dept: string) {
  return DEPT_COLORS[dept] ?? DEPT_COLORS.General
}

function SOPIcon({ dept, size = 28 }: { dept: string; size?: number }) {
  const s = getDeptStyle(dept)
  return (
    <svg width={size} height={size} fill="none" stroke={s.icon} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function FolderIcon({ dept, size = 32 }: { dept: string; size?: number }) {
  const s = getDeptStyle(dept)
  return (
    <svg width={size} height={size} fill="none" stroke={s.icon} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  )
}

export default function SOPList({
  initialSops,
  initialAcknowledgedIds,
}: {
  initialSops: SOP[]
  initialAcknowledgedIds: number[]
}) {
  const [sops] = useState<SOP[]>(initialSops)
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<number>>(new Set(initialAcknowledgedIds))
  const [acknowledging, setAcknowledging] = useState<number | null>(null)
  const [viewingSop, setViewingSop] = useState<SOP | null>(null)
  const [view, setView] = useState<'departments' | 'sops'>('departments')
  const [selectedDept, setSelectedDept] = useState<string | null>(null)

  // Build department list: pinned + any extra from actual SOPs
  const actualDepts = Array.from(new Set(sops.map(s => s.department)))
  const allDepts = [...PINNED_DEPTS, ...actualDepts.filter(d => !PINNED_DEPTS.includes(d))].sort(
    (a, b) => PINNED_DEPTS.indexOf(a) - PINNED_DEPTS.indexOf(b) || a.localeCompare(b)
  )

  const total = sops.length
  const acknowledged = sops.filter(s => acknowledgedIds.has(s.id)).length
  const pct = total > 0 ? Math.round((acknowledged / total) * 100) : 0

  const deptSops = selectedDept ? sops.filter(s => s.department === selectedDept) : []
  const deptTotal = deptSops.length
  const deptAcked = deptSops.filter(s => acknowledgedIds.has(s.id)).length
  const deptPct = deptTotal > 0 ? Math.round((deptAcked / deptTotal) * 100) : 0

  async function handleAcknowledge(sopId: number) {
    setAcknowledging(sopId)
    try {
      await fetch('/api/sops/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sopId }),
      })
      setAcknowledgedIds(prev => new Set([...prev, sopId]))
    } finally {
      setAcknowledging(null)
    }
  }

  function openDept(dept: string) {
    setSelectedDept(dept)
    setView('sops')
  }

  function goBack() {
    setView('departments')
    setSelectedDept(null)
  }

  // ── Department folder view ──────────────────────────────────────────────────
  if (view === 'departments') {
    return (
      <div>
        {/* Header + overall progress */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
            <div>
              <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1B3A5C', marginBottom: '2px' }}>SOP Library</h1>
              <p style={{ color: '#6B7A8D', fontSize: '0.875rem' }}>
                {total === 0 ? 'No procedures published yet' : `${acknowledged} of ${total} acknowledged`}
              </p>
            </div>
            {total > 0 && (
              <span style={{ fontSize: '1.125rem', fontWeight: 700, color: pct === 100 ? '#16A34A' : '#1B3A5C' }}>{pct}%</span>
            )}
          </div>
          {total > 0 && (
            <div style={{ height: '6px', borderRadius: '9999px', background: '#D0DCE8', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '9999px', background: pct === 100 ? '#22C55E' : '#3D6B9B',
                width: `${pct}%`, transition: 'width 0.4s ease',
              }} />
            </div>
          )}
        </div>

        {/* Department folder grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '1rem',
        }}>
          {allDepts.map(dept => {
            const ds = getDeptStyle(dept)
            const dSops = sops.filter(s => s.department === dept)
            const dAcked = dSops.filter(s => acknowledgedIds.has(s.id)).length
            const allAcked = dSops.length > 0 && dAcked === dSops.length

            return (
              <button
                key={dept}
                onClick={() => openDept(dept)}
                style={{
                  background: '#fff',
                  borderRadius: '1rem',
                  padding: '1.375rem 1rem 1.125rem',
                  border: `1.5px solid ${allAcked ? '#BBF7D0' : '#D0DCE8'}`,
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.625rem',
                  transition: 'box-shadow 0.15s, border-color 0.15s, transform 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(27,58,92,0.12)'
                  ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = ''
                  ;(e.currentTarget as HTMLButtonElement).style.transform = ''
                }}
              >
                {/* Folder icon */}
                <div style={{
                  width: '3.5rem', height: '3.5rem', borderRadius: '0.75rem',
                  background: ds.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <FolderIcon dept={dept} size={30} />
                </div>

                {/* Dept name */}
                <p style={{
                  fontWeight: 600, fontSize: '0.8125rem', color: '#1B3A5C',
                  lineHeight: 1.35, textAlign: 'center',
                }}>
                  {dept}
                </p>

                {/* Count / progress */}
                {dSops.length === 0 ? (
                  <span style={{ fontSize: '0.6875rem', color: '#B0BAC5' }}>No SOPs yet</span>
                ) : allAcked ? (
                  <span style={{ fontSize: '0.6875rem', color: '#16A34A', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    All done
                  </span>
                ) : (
                  <span style={{ fontSize: '0.6875rem', color: '#8B939E' }}>
                    {dAcked} of {dSops.length} done
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── SOP card view (drill-in) ────────────────────────────────────────────────
  const ds = getDeptStyle(selectedDept!)

  return (
    <div>
      {/* Back + breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.5rem' }}>
        <button
          onClick={goBack}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            color: '#3D6B9B', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.875rem', fontWeight: 500, padding: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
          onMouseLeave={e => (e.currentTarget.style.color = '#3D6B9B')}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          SOP Library
        </button>
        <span style={{ color: '#B0BAC5', fontSize: '0.875rem' }}>/</span>
        <span style={{ fontSize: '0.875rem', color: '#1B3A5C', fontWeight: 600 }}>{selectedDept}</span>
      </div>

      {/* Dept header + progress */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{
            width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem',
            background: ds.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <FolderIcon dept={selectedDept!} size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1B3A5C', marginBottom: '2px' }}>{selectedDept}</h1>
            <p style={{ color: '#6B7A8D', fontSize: '0.875rem' }}>
              {deptTotal === 0 ? 'No procedures yet' : `${deptAcked} of ${deptTotal} acknowledged`}
            </p>
          </div>
          {deptTotal > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: '1.125rem', fontWeight: 700, color: deptPct === 100 ? '#16A34A' : '#1B3A5C' }}>
              {deptPct}%
            </span>
          )}
        </div>
        {deptTotal > 0 && (
          <div style={{ height: '6px', borderRadius: '9999px', background: '#D0DCE8', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '9999px', background: deptPct === 100 ? '#22C55E' : '#3D6B9B',
              width: `${deptPct}%`, transition: 'width 0.4s ease',
            }} />
          </div>
        )}
      </div>

      {/* Empty state */}
      {deptTotal === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{
            width: '4rem', height: '4rem', borderRadius: '1rem', background: ds.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto',
          }}>
            <FolderIcon dept={selectedDept!} size={32} />
          </div>
          <p style={{ color: '#6B7A8D', fontSize: '0.9375rem' }}>No SOPs in this department yet.</p>
        </div>
      ) : (
        // SOP card grid
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '1rem',
        }}>
          {deptSops.map(sop => {
            const isAcked = acknowledgedIds.has(sop.id)
            const sopDs = getDeptStyle(sop.department)
            return (
              <button
                key={sop.id}
                onClick={() => setViewingSop(sop)}
                style={{
                  position: 'relative',
                  background: '#fff',
                  borderRadius: '1rem',
                  padding: '1.25rem 1rem 1rem',
                  border: `1.5px solid ${isAcked ? '#BBF7D0' : '#D0DCE8'}`,
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.625rem',
                  transition: 'box-shadow 0.15s, border-color 0.15s, transform 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(27,58,92,0.12)'
                  ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = ''
                  ;(e.currentTarget as HTMLButtonElement).style.transform = ''
                }}
              >
                {/* Acknowledged badge */}
                {isAcked && (
                  <div style={{
                    position: 'absolute', top: '0.5rem', right: '0.5rem',
                    width: '1.25rem', height: '1.25rem', borderRadius: '9999px',
                    background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg style={{ width: '0.75rem', height: '0.75rem', color: '#16A34A' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                {/* Icon */}
                <div style={{
                  width: '3.5rem', height: '3.5rem', borderRadius: '0.75rem',
                  background: sopDs.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <SOPIcon dept={sop.department} size={28} />
                </div>

                {/* Title */}
                <p style={{
                  fontWeight: 600, fontSize: '0.8125rem', color: '#1B3A5C',
                  lineHeight: 1.35, textAlign: 'center',
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                } as React.CSSProperties}>
                  {sop.title}
                </p>

                {/* Version */}
                <span style={{ fontSize: '0.6875rem', color: '#8B939E' }}>v{sop.version}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* View / Acknowledge modal */}
      {viewingSop && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50,
        }}>
          <div style={{
            background: '#fff', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            width: '100%', maxWidth: '42rem', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            border: '1px solid #D0DCE8',
          }}>
            {/* Modal header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEF3F9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{
                  width: '2.75rem', height: '2.75rem', borderRadius: '0.625rem',
                  background: getDeptStyle(viewingSop.department).bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <SOPIcon dept={viewingSop.department} size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '3px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, padding: '1px 7px', borderRadius: '9999px', background: getDeptStyle(viewingSop.department).bg, color: getDeptStyle(viewingSop.department).icon }}>
                      {viewingSop.department}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#8B939E' }}>v{viewingSop.version}</span>
                    {acknowledgedIds.has(viewingSop.id) && (
                      <span style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 500 }}>✓ Acknowledged</span>
                    )}
                  </div>
                  <h2 style={{ fontWeight: 700, color: '#1B3A5C', fontSize: '1.0625rem', lineHeight: 1.3 }}>{viewingSop.title}</h2>
                </div>
              </div>
              <button onClick={() => setViewingSop(null)}
                style={{ color: '#8B939E', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
                onMouseLeave={e => (e.currentTarget.style.color = '#8B939E')}
              >
                <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.875rem', color: '#374151', lineHeight: 1.65 }}>
                {viewingSop.content}
              </pre>
            </div>

            {/* Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #EEF3F9', display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', flexShrink: 0 }}>
              <button onClick={() => setViewingSop(null)}
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#6B7A8D', background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6B7A8D')}
              >
                Close
              </button>
              {!acknowledgedIds.has(viewingSop.id) && (
                <button
                  onClick={() => { handleAcknowledge(viewingSop.id); setViewingSop(null) }}
                  disabled={acknowledging === viewingSop.id}
                  style={{
                    padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: 600,
                    background: '#1B3A5C', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#2A5080')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#1B3A5C')}
                >
                  {acknowledging === viewingSop.id ? 'Saving...' : 'Acknowledge'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
