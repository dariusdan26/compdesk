'use client'

import { useState } from 'react'

interface LineItem { id: number; description: string; quantity: string; unit: string; estimatedCost: string | null }
interface Requisition {
  id: number
  title: string
  department: string
  urgency: string
  justification: string
  status: string
  adminNote: string | null
  lineItems: LineItem[]
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

const URGENCY_STYLES: Record<string, { bg: string; color: string }> = {
  Low:      { bg: '#F1F5F9', color: '#475569' },
  Medium:   { bg: '#FEF9C3', color: '#CA8A04' },
  High:     { bg: '#FFEDD5', color: '#EA580C' },
  Critical: { bg: '#FEE2E2', color: '#DC2626' },
}

const STATUS_OPTIONS = ['open', 'approved', 'ordered', 'received', 'rejected']
const STATUS_LABELS: Record<string, string> = { open: 'Open', approved: 'Approved', ordered: 'Ordered', received: 'Received', rejected: 'Rejected' }
const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  open:     { bg: '#FEF9C3', color: '#CA8A04' },
  approved: { bg: '#D1FAE5', color: '#059669' },
  ordered:  { bg: '#DCEAF7', color: '#3D6B9B' },
  received: { bg: '#D1FAE5', color: '#064E3B' },
  rejected: { bg: '#FEE2E2', color: '#DC2626' },
}

function Badge({ label, style }: { label: string; style: { bg: string; color: string } }) {
  return (
    <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px', background: style.bg, color: style.color, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

export default function RequisitionAdmin({ initialRequisitions }: { initialRequisitions: Requisition[] }) {
  const [requisitions, setRequisitions] = useState<Requisition[]>(initialRequisitions)
  const [reviewing, setReviewing] = useState<Requisition | null>(null)
  const [deleting, setDeleting] = useState<Requisition | null>(null)
  const [saving, setSaving] = useState(false)
  const [reviewForm, setReviewForm] = useState({ status: '', adminNote: '' })
  const [filterStatus, setFilterStatus] = useState('all')

  function openReview(req: Requisition) {
    setReviewing(req)
    setReviewForm({ status: req.status, adminNote: req.adminNote ?? '' })
  }

  async function handleSave() {
    if (!reviewing) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/requisitions/${reviewing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewForm),
      })
      const updated = await res.json()
      if (res.ok) {
        setRequisitions(prev => prev.map(r => r.id === updated.id ? updated : r))
        setReviewing(null)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    await fetch(`/api/admin/requisitions/${deleting.id}`, { method: 'DELETE' })
    setRequisitions(prev => prev.filter(r => r.id !== deleting.id))
    setDeleting(null)
  }

  const filtered = filterStatus === 'all' ? requisitions : requisitions.filter(r => r.status === filterStatus)
  const openCount = requisitions.filter(r => r.status === 'open').length

  const selectStyle = { padding: '0.375rem 0.625rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1B3A5C', marginBottom: '2px' }}>Purchase Requisitions</h1>
          <p style={{ color: '#6B7A8D', fontSize: '0.875rem' }}>{openCount} open · {requisitions.length} total</p>
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#fff', borderRadius: '1rem', border: '1px solid #D0DCE8' }}>
          <p style={{ color: '#6B7A8D' }}>No requisitions match this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(req => {
            const ss = STATUS_STYLES[req.status] ?? STATUS_STYLES.open
            const us = URGENCY_STYLES[req.urgency] ?? URGENCY_STYLES.Medium
            const ds = DEPT_COLORS[req.department] ?? DEPT_COLORS.General
            return (
              <div key={req.id} style={{ background: '#fff', borderRadius: '0.875rem', padding: '1rem 1.25rem', border: '1px solid #D0DCE8' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Badge label={req.department} style={ds} />
                    <Badge label={req.urgency} style={us} />
                    <Badge label={STATUS_LABELS[req.status] ?? req.status} style={ss} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#B0BAC5', flexShrink: 0 }}>{new Date(req.createdAt).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: '0.9375rem', color: '#1B3A5C', fontWeight: 600, marginBottom: '0.125rem' }}>{req.title}</p>
                <p style={{ fontSize: '0.8125rem', color: '#6B7A8D', marginBottom: '0.75rem' }}>
                  {req.lineItems.length} line item{req.lineItems.length === 1 ? '' : 's'} · by {req.user.name}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => openReview(req)}
                    style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600, background: '#3D6B9B', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#2A5080')} onMouseLeave={e => (e.currentTarget.style.background = '#3D6B9B')}>
                    Review
                  </button>
                  <button onClick={() => setDeleting(req)}
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
          <div style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '42rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: '1px solid #D0DCE8' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEF3F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <h2 style={{ fontWeight: 700, color: '#1B3A5C', fontSize: '1.0625rem' }}>{reviewing.title}</h2>
              <button onClick={() => setReviewing(null)} style={{ color: '#8B939E', background: 'none', border: 'none', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')} onMouseLeave={e => (e.currentTarget.style.color = '#8B939E')}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.6 }}>{reviewing.justification}</p>
              <div style={{ border: '1px solid #D0DCE8', borderRadius: '0.625rem', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#EEF3F9' }}>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#6B7A8D', fontWeight: 600, fontSize: '0.75rem' }}>Description</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#6B7A8D', fontWeight: 600, fontSize: '0.75rem' }}>Qty</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#6B7A8D', fontWeight: 600, fontSize: '0.75rem' }}>Unit</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#6B7A8D', fontWeight: 600, fontSize: '0.75rem' }}>Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewing.lineItems.map((item, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #EEF3F9' }}>
                        <td style={{ padding: '0.625rem 0.75rem', color: '#1B3A5C' }}>{item.description}</td>
                        <td style={{ padding: '0.625rem 0.75rem', color: '#1B3A5C', textAlign: 'right' }}>{item.quantity}</td>
                        <td style={{ padding: '0.625rem 0.75rem', color: '#6B7A8D' }}>{item.unit}</td>
                        <td style={{ padding: '0.625rem 0.75rem', color: '#6B7A8D', textAlign: 'right' }}>{item.estimatedCost || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem' }}>Status</label>
                <select value={reviewForm.status} onChange={e => setReviewForm(f => ({ ...f, status: e.target.value }))} style={{ ...selectStyle, width: '100%' }}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem' }}>Admin Note</label>
                <textarea value={reviewForm.adminNote} onChange={e => setReviewForm(f => ({ ...f, adminNote: e.target.value }))} placeholder="Add BC PO number, approval notes, or rejection reason..." rows={3}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
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
            <h3 style={{ fontWeight: 700, color: '#1B3A5C', marginBottom: '0.625rem' }}>Delete Requisition?</h3>
            <p style={{ fontSize: '0.875rem', color: '#6B7A8D', marginBottom: '1.25rem' }}><strong>{deleting.title}</strong> and all its line items will be permanently deleted.</p>
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
