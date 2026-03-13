'use client'

import { useState } from 'react'

interface ChangeRequest {
  id: number
  description: string
  reason: string
  category: string
  urgency: string
  status: string
  adminNote: string | null
  createdAt: string
  user: { name: string }
}

const CATEGORIES = [
  'All', 'General', 'Production', 'Quality', 'Safety',
  'Warehouse', 'Maintenance', 'Administration', 'Business Central',
]

const STATUSES = ['open', 'under_review', 'approved', 'rejected']

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

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  open:         { bg: '#FEF9C3', color: '#CA8A04', label: 'Open' },
  under_review: { bg: '#DCEAF7', color: '#3D6B9B', label: 'Under Review' },
  approved:     { bg: '#D1FAE5', color: '#059669', label: 'Approved' },
  rejected:     { bg: '#FEE2E2', color: '#DC2626', label: 'Rejected' },
}

const URGENCY_STYLES: Record<string, { bg: string; color: string }> = {
  Low:      { bg: '#F1F5F9', color: '#475569' },
  Medium:   { bg: '#FEF9C3', color: '#CA8A04' },
  High:     { bg: '#FFEDD5', color: '#EA580C' },
  Critical: { bg: '#FEE2E2', color: '#DC2626' },
}

function Badge({ label, style }: { label: string; style: { bg: string; color: string } }) {
  return (
    <span style={{
      fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px',
      borderRadius: '9999px', background: style.bg, color: style.color,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

export default function ChangeRequestAdmin({ initialRequests }: { initialRequests: ChangeRequest[] }) {
  const [requests, setRequests] = useState<ChangeRequest[]>(initialRequests)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('All')
  const [viewing, setViewing] = useState<ChangeRequest | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [editNote, setEditNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  function openReview(req: ChangeRequest) {
    setViewing(req)
    setEditStatus(req.status)
    setEditNote(req.adminNote ?? '')
  }

  async function handleSave() {
    if (!viewing) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/change-requests/${viewing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: editStatus, adminNote: editNote }),
      })
      const data = await res.json()
      setRequests(prev => prev.map(r => r.id === viewing.id ? data : r))
      setViewing(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this change request? This cannot be undone.')) return
    setDeletingId(id)
    await fetch(`/api/admin/change-requests/${id}`, { method: 'DELETE' })
    setRequests(prev => prev.filter(r => r.id !== id))
    setDeletingId(null)
    if (viewing?.id === id) setViewing(null)
  }

  const filtered = requests.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    if (filterCategory !== 'All' && r.category !== filterCategory) return false
    return true
  })

  const openCount = requests.filter(r => r.status === 'open').length

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1B3A5C', marginBottom: '2px' }}>Change Requests</h1>
          <p style={{ color: '#6B7A8D', fontSize: '0.875rem' }}>
            {requests.length} total{openCount > 0 ? ` · ${openCount} open` : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '0.4375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff' }}
        >
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_STYLES[s].label}</option>)}
        </select>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          style={{ padding: '0.4375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff' }}
        >
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        {(filterStatus !== 'all' || filterCategory !== 'All') && (
          <button
            onClick={() => { setFilterStatus('all'); setFilterCategory('All') }}
            style={{ padding: '0.4375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#6B7A8D', fontSize: '0.875rem', background: '#fff', cursor: 'pointer' }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#fff', borderRadius: '1rem', border: '1px solid #D0DCE8' }}>
          <p style={{ color: '#6B7A8D', fontSize: '0.9375rem' }}>No change requests match the current filters.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {filtered.map(req => {
            const ss = STATUS_STYLES[req.status] ?? STATUS_STYLES.open
            const us = URGENCY_STYLES[req.urgency] ?? URGENCY_STYLES.Medium
            const ds = DEPT_COLORS[req.category] ?? DEPT_COLORS.General
            return (
              <div
                key={req.id}
                style={{ background: '#fff', borderRadius: '0.875rem', padding: '1rem 1.25rem', border: '1px solid #D0DCE8', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                    <Badge label={req.category} style={ds} />
                    <Badge label={req.urgency} style={us} />
                    <Badge label={ss.label} style={ss} />
                    <span style={{ fontSize: '0.75rem', color: '#8B939E' }}>{req.user.name}</span>
                    <span style={{ fontSize: '0.75rem', color: '#B0BAC5', marginLeft: 'auto' }}>
                      {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#1B3A5C', fontWeight: 500, marginBottom: '0.25rem',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  } as React.CSSProperties}>
                    {req.description}
                  </p>
                  {req.adminNote && (
                    <p style={{ fontSize: '0.75rem', color: '#6B7A8D', marginTop: '0.25rem' }}>Note: {req.adminNote}</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.625rem', flexShrink: 0, alignItems: 'center' }}>
                  <button
                    onClick={() => openReview(req)}
                    style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#3D6B9B', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#3D6B9B')}
                  >
                    Review
                  </button>
                  <button
                    onClick={() => handleDelete(req.id)}
                    disabled={deletingId === req.id}
                    style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: deletingId === req.id ? 0.5 : 1 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#991B1B')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#DC2626')}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Review modal */}
      {viewing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '42rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: '1px solid #D0DCE8' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEF3F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <Badge label={viewing.category} style={DEPT_COLORS[viewing.category] ?? DEPT_COLORS.General} />
                <Badge label={viewing.urgency} style={URGENCY_STYLES[viewing.urgency] ?? URGENCY_STYLES.Medium} />
                <span style={{ fontSize: '0.8125rem', color: '#6B7A8D' }}>by {viewing.user.name}</span>
              </div>
              <button onClick={() => setViewing(null)} style={{ color: '#8B939E', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
                onMouseLeave={e => (e.currentTarget.style.color = '#8B939E')}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Proposed Change</p>
                <p style={{ fontSize: '0.9375rem', color: '#1B3A5C', lineHeight: 1.6 }}>{viewing.description}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Reason</p>
                <p style={{ fontSize: '0.9375rem', color: '#374151', lineHeight: 1.6 }}>{viewing.reason}</p>
              </div>

              {/* Admin controls */}
              <div style={{ borderTop: '1px solid #EEF3F9', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem' }}>Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff' }}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_STYLES[s].label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem' }}>Admin Note <span style={{ fontWeight: 400, color: '#8B939E' }}>(optional)</span></label>
                  <textarea
                    value={editNote}
                    onChange={e => setEditNote(e.target.value)}
                    placeholder="Add a note for the requester..."
                    rows={3}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #EEF3F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <button
                onClick={() => handleDelete(viewing.id)}
                disabled={deletingId === viewing.id}
                style={{ fontSize: '0.875rem', fontWeight: 500, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', opacity: deletingId === viewing.id ? 0.5 : 1 }}
              >
                Delete
              </button>
              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <button onClick={() => setViewing(null)}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#6B7A8D', background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#6B7A8D')}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, background: '#3D6B9B', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
                  onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = '#2A5080' }}
                  onMouseLeave={e => (e.currentTarget.style.background = '#3D6B9B')}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
