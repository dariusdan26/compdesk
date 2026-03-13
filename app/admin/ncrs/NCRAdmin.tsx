'use client'

import { useState } from 'react'

interface NCR {
  id: number
  bcPoNumber: string
  itemDescription: string
  department: string
  defectType: string
  severity: string
  description: string
  disposition: string
  status: string
  adminNote: string | null
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

const SEVERITY_STYLES: Record<string, { bg: string; color: string }> = {
  Minor:    { bg: '#F1F5F9', color: '#475569' },
  Major:    { bg: '#FFEDD5', color: '#EA580C' },
  Critical: { bg: '#FEE2E2', color: '#DC2626' },
}

const STATUS_OPTIONS = ['open', 'under_review', 'closed']
const STATUS_LABELS: Record<string, string> = { open: 'Open', under_review: 'Under Review', closed: 'Closed' }
const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  open:         { bg: '#FEF9C3', color: '#CA8A04' },
  under_review: { bg: '#DCEAF7', color: '#3D6B9B' },
  closed:       { bg: '#D1FAE5', color: '#059669' },
}

const DISPOSITION_OPTIONS = ['pending', 'accept', 'rework', 'reject', 'scrap']
const DISPOSITION_LABELS: Record<string, string> = { pending: 'Pending', accept: 'Accept', rework: 'Rework', reject: 'Reject', scrap: 'Scrap' }
const DISPOSITION_STYLES: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#F1F5F9', color: '#475569' },
  accept:  { bg: '#D1FAE5', color: '#059669' },
  rework:  { bg: '#FFEDD5', color: '#EA580C' },
  reject:  { bg: '#FEE2E2', color: '#DC2626' },
  scrap:   { bg: '#FEE2E2', color: '#7F1D1D' },
}

function Badge({ label, style }: { label: string; style: { bg: string; color: string } }) {
  return (
    <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px', background: style.bg, color: style.color, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

export default function NCRAdmin({ initialNCRs }: { initialNCRs: NCR[] }) {
  const [ncrs, setNCRs] = useState<NCR[]>(initialNCRs)
  const [reviewing, setReviewing] = useState<NCR | null>(null)
  const [deleting, setDeleting] = useState<NCR | null>(null)
  const [saving, setSaving] = useState(false)
  const [reviewForm, setReviewForm] = useState({ status: '', disposition: '', adminNote: '' })
  const [filterStatus, setFilterStatus] = useState('all')

  function openReview(ncr: NCR) {
    setReviewing(ncr)
    setReviewForm({ status: ncr.status, disposition: ncr.disposition, adminNote: ncr.adminNote ?? '' })
  }

  async function handleSave() {
    if (!reviewing) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/ncrs/${reviewing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewForm),
      })
      const updated = await res.json()
      if (res.ok) {
        setNCRs(prev => prev.map(n => n.id === updated.id ? updated : n))
        setReviewing(null)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    await fetch(`/api/admin/ncrs/${deleting.id}`, { method: 'DELETE' })
    setNCRs(prev => prev.filter(n => n.id !== deleting.id))
    setDeleting(null)
  }

  const filtered = filterStatus === 'all' ? ncrs : ncrs.filter(n => n.status === filterStatus)
  const openCount = ncrs.filter(n => n.status === 'open').length

  const selectStyle = { padding: '0.375rem 0.625rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff' }
  const textareaStyle = { width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff', resize: 'vertical' as const, fontFamily: 'inherit', boxSizing: 'border-box' as const }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1B3A5C', marginBottom: '2px' }}>Non-Conformance Reports</h1>
          <p style={{ color: '#6B7A8D', fontSize: '0.875rem' }}>{openCount} open · {ncrs.length} total</p>
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#fff', borderRadius: '1rem', border: '1px solid #D0DCE8' }}>
          <p style={{ color: '#6B7A8D' }}>No NCRs match this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(ncr => {
            const ss = STATUS_STYLES[ncr.status] ?? STATUS_STYLES.open
            const sev = SEVERITY_STYLES[ncr.severity] ?? SEVERITY_STYLES.Minor
            const ds = DEPT_COLORS[ncr.department] ?? DEPT_COLORS.General
            const disp = DISPOSITION_STYLES[ncr.disposition] ?? DISPOSITION_STYLES.pending
            return (
              <div key={ncr.id} style={{ background: '#fff', borderRadius: '0.875rem', padding: '1rem 1.25rem', border: '1px solid #D0DCE8' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.625rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Badge label={ncr.department} style={ds} />
                    <Badge label={ncr.severity} style={sev} />
                    <Badge label={STATUS_LABELS[ncr.status] ?? ncr.status} style={ss} />
                    <Badge label={DISPOSITION_LABELS[ncr.disposition] ?? ncr.disposition} style={disp} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#B0BAC5', flexShrink: 0 }}>{new Date(ncr.createdAt).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#6B7A8D', marginBottom: '0.25rem' }}>
                  PO: <span style={{ color: '#1B3A5C', fontWeight: 600 }}>{ncr.bcPoNumber}</span> · {ncr.defectType} · {ncr.itemDescription} · by {ncr.user.name}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{ncr.description}</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => openReview(ncr)}
                    style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600, background: '#3D6B9B', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#2A5080')} onMouseLeave={e => (e.currentTarget.style.background = '#3D6B9B')}>
                    Review
                  </button>
                  <button onClick={() => setDeleting(ncr)}
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

      {/* Review modal */}
      {reviewing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '38rem', maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: '1px solid #D0DCE8' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEF3F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <h2 style={{ fontWeight: 700, color: '#1B3A5C', fontSize: '1.0625rem' }}>Review NCR</h2>
              <button onClick={() => setReviewing(null)} style={{ color: '#8B939E', background: 'none', border: 'none', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')} onMouseLeave={e => (e.currentTarget.style.color = '#8B939E')}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '0.875rem 1rem', background: '#F8FAFC', borderRadius: '0.625rem', border: '1px solid #D0DCE8', fontSize: '0.875rem', color: '#374151', lineHeight: 1.6 }}>
                <p style={{ fontWeight: 600, color: '#1B3A5C', marginBottom: '0.25rem' }}>PO: {reviewing.bcPoNumber} — {reviewing.itemDescription}</p>
                <p>{reviewing.description}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem' }}>Status</label>
                  <select value={reviewForm.status} onChange={e => setReviewForm(f => ({ ...f, status: e.target.value }))} style={{ ...selectStyle, width: '100%' }}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem' }}>Disposition</label>
                  <select value={reviewForm.disposition} onChange={e => setReviewForm(f => ({ ...f, disposition: e.target.value }))} style={{ ...selectStyle, width: '100%' }}>
                    {DISPOSITION_OPTIONS.map(d => <option key={d} value={d}>{DISPOSITION_LABELS[d]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem' }}>Admin Note</label>
                <textarea value={reviewForm.adminNote} onChange={e => setReviewForm(f => ({ ...f, adminNote: e.target.value }))} placeholder="Add corrective action notes, BC reference numbers, etc." rows={3} style={textareaStyle} />
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #EEF3F9', display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', flexShrink: 0 }}>
              <button onClick={() => setReviewing(null)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#6B7A8D', background: 'none', border: 'none', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')} onMouseLeave={e => (e.currentTarget.style.color = '#6B7A8D')}>Cancel</button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, background: '#3D6B9B', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
                onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = '#2A5080' }} onMouseLeave={e => (e.currentTarget.style.background = '#3D6B9B')}
              >{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', maxWidth: '24rem', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontWeight: 700, color: '#1B3A5C', marginBottom: '0.625rem' }}>Delete NCR?</h3>
            <p style={{ fontSize: '0.875rem', color: '#6B7A8D', marginBottom: '1.25rem' }}>This NCR for PO <strong>{deleting.bcPoNumber}</strong> will be permanently deleted.</p>
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
