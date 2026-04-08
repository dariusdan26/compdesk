'use client'

import { useState } from 'react'

interface ChecklistItem { label: string; checked: boolean }
interface Checklist {
  id: number
  bcSoNumber: string
  customerName: string
  department: string
  items: string
  overallStatus: string
  notes: string | null
  photoUrls: string | null
  createdAt: string
  user: { name: string }
}

const DEPT_COLORS: Record<string, { bg: string; color: string }> = {
  Production:         { bg: '#DCEAF7', color: '#3D6B9B' },
  Quality:            { bg: '#FEF9C3', color: '#CA8A04' },
  Safety:             { bg: '#FEE2E2', color: '#DC2626' },
  Warehouse:          { bg: '#D1FAE5', color: '#059669' },
  Maintenance:        { bg: '#EDE9FE', color: '#7C3AED' },
  'Business Central': { bg: '#FFF7ED', color: '#EA580C' },
  Administration:     { bg: '#FFE4E6', color: '#E11D48' },
  General:            { bg: '#F1F5F9', color: '#475569' },
}

function Badge({ label, style }: { label: string; style: { bg: string; color: string } }) {
  return (
    <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px', background: style.bg, color: style.color, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

export default function DispatchAdmin({ initialChecklists }: { initialChecklists: Checklist[] }) {
  const [checklists, setChecklists] = useState<Checklist[]>(initialChecklists)
  const [viewing, setViewing] = useState<Checklist | null>(null)
  const [deleting, setDeleting] = useState<Checklist | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')

  async function handleDelete() {
    if (!deleting) return
    await fetch(`/api/admin/dispatch/${deleting.id}`, { method: 'DELETE' })
    setChecklists(prev => prev.filter(c => c.id !== deleting.id))
    setDeleting(null)
  }

  const filtered = filterStatus === 'all' ? checklists : checklists.filter(c => c.overallStatus === filterStatus)
  const failCount = checklists.filter(c => c.overallStatus === 'fail').length

  const selectStyle = { padding: '0.375rem 0.625rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1B3A5C', marginBottom: '2px' }}>Dispatch Checklists</h1>
          <p style={{ color: '#6B7A8D', fontSize: '0.875rem' }}>
            {failCount > 0 ? <span style={{ color: '#DC2626', fontWeight: 600 }}>{failCount} fail{failCount === 1 ? '' : 's'}</span> : null}
            {failCount > 0 ? ' · ' : ''}{checklists.length} total
          </p>
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="all">All</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#fff', borderRadius: '1rem', border: '1px solid #D0DCE8' }}>
          <p style={{ color: '#6B7A8D' }}>No checklists match this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(cl => {
            const parsed: ChecklistItem[] = JSON.parse(cl.items)
            const done = parsed.filter(i => i.checked).length
            const isPass = cl.overallStatus === 'pass'
            const ds = DEPT_COLORS[cl.department] ?? DEPT_COLORS.General
            return (
              <div key={cl.id} style={{ background: '#fff', borderRadius: '0.875rem', padding: '1rem 1.25rem', border: `1px solid ${isPass ? '#BBF7D0' : '#FECACA'}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Badge label={cl.department} style={ds} />
                    <Badge label={isPass ? '✓ Pass' : '✗ Fail'} style={{ bg: isPass ? '#D1FAE5' : '#FEE2E2', color: isPass ? '#059669' : '#DC2626' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#B0BAC5', flexShrink: 0 }}>{new Date(cl.createdAt).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: '0.9375rem', color: '#1B3A5C', fontWeight: 600, marginBottom: '0.125rem' }}>SO: {cl.bcSoNumber}</p>
                <p style={{ fontSize: '0.8125rem', color: '#6B7A8D', marginBottom: '0.75rem' }}>{cl.customerName} · {done}/{parsed.length} checks · by {cl.user.name}</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setViewing(cl)}
                    style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600, background: '#3D6B9B', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#2A5080')} onMouseLeave={e => (e.currentTarget.style.background = '#3D6B9B')}>
                    View
                  </button>
                  <button onClick={() => setDeleting(cl)}
                    style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600, background: 'none', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '0.5rem', cursor: 'pointer' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FEE2E2' }} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* View modal */}
      {viewing && (() => {
        const parsed: ChecklistItem[] = JSON.parse(viewing.items)
        const isPass = viewing.overallStatus === 'pass'
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
            <div style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '38rem', maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: '1px solid #D0DCE8' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEF3F9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexShrink: 0 }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.375rem' }}>
                    <Badge label={viewing.department} style={DEPT_COLORS[viewing.department] ?? DEPT_COLORS.General} />
                    <Badge label={isPass ? '✓ Pass' : '✗ Fail'} style={{ bg: isPass ? '#D1FAE5' : '#FEE2E2', color: isPass ? '#059669' : '#DC2626' }} />
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#1B3A5C', fontWeight: 600 }}>SO: {viewing.bcSoNumber} — {viewing.customerName}</p>
                  <p style={{ fontSize: '0.8125rem', color: '#6B7A8D' }}>Submitted by {viewing.user.name}</p>
                </div>
                <button onClick={() => setViewing(null)} style={{ color: '#8B939E', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }} onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')} onMouseLeave={e => (e.currentTarget.style.color = '#8B939E')}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {parsed.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', background: item.checked ? '#F0FDF4' : '#FFF1F2', border: `1px solid ${item.checked ? '#BBF7D0' : '#FECACA'}` }}>
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>{item.checked ? '✓' : '✗'}</span>
                    <span style={{ fontSize: '0.875rem', color: item.checked ? '#059669' : '#DC2626' }}>{item.label}</span>
                  </div>
                ))}
                {viewing.photoUrls && (() => {
                  let urls: string[] = []
                  try { urls = JSON.parse(viewing.photoUrls) } catch { urls = [] }
                  if (urls.length === 0) return null
                  return (
                    <div style={{ marginTop: '0.75rem' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Photos ({urls.length})</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem' }}>
                        {urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', aspectRatio: '1', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #D0DCE8', background: '#F1F5F9' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`Dispatch photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )
                })()}
                {viewing.notes && (
                  <div style={{ marginTop: '0.5rem', padding: '0.875rem 1rem', borderRadius: '0.625rem', background: '#F1F5F9', border: '1px solid #D0DCE8' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Notes</p>
                    <p style={{ fontSize: '0.875rem', color: '#1B3A5C' }}>{viewing.notes}</p>
                  </div>
                )}
              </div>
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #EEF3F9', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                <button onClick={() => setViewing(null)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#6B7A8D', background: 'none', border: 'none', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')} onMouseLeave={e => (e.currentTarget.style.color = '#6B7A8D')}>Close</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Delete confirm */}
      {deleting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', maxWidth: '24rem', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontWeight: 700, color: '#1B3A5C', marginBottom: '0.625rem' }}>Delete Checklist?</h3>
            <p style={{ fontSize: '0.875rem', color: '#6B7A8D', marginBottom: '1.25rem' }}>Checklist for SO <strong>{deleting.bcSoNumber}</strong> will be permanently deleted.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
              <button onClick={() => setDeleting(null)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', color: '#6B7A8D', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} style={{ padding: '0.5rem 1.125rem', fontSize: '0.875rem', fontWeight: 600, background: '#DC2626', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#B91C1C')} onMouseLeave={e => (e.currentTarget.style.background = '#DC2626')}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
