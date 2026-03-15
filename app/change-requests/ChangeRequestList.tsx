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
}

const CATEGORIES = [
  'General', 'Production', 'Quality', 'Safety',
  'Warehouse', 'Maintenance', 'Administration', 'Business Central',
]

const URGENCY_LEVELS = ['Low', 'Medium', 'High', 'Critical']

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

export default function ChangeRequestList({ initialRequests }: { initialRequests: ChangeRequest[] }) {
  const [requests, setRequests] = useState<ChangeRequest[]>(initialRequests)
  const [showForm, setShowForm] = useState(false)
  const [viewing, setViewing] = useState<ChangeRequest | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({ description: '', reason: '', category: 'General', urgency: 'Medium' })

  async function handleSubmit() {
    if (!form.description.trim()) { setFormError('Please describe the change.'); return }
    if (!form.reason.trim()) { setFormError('Please provide a reason.'); return }
    setFormError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? 'Submission failed.'); return }
      setRequests(prev => [data, ...prev])
      setShowForm(false)
      setForm({ description: '', reason: '', category: 'General', urgency: 'Medium' })
    } finally {
      setSubmitting(false)
    }
  }

  const deptStyle = (cat: string) => DEPT_COLORS[cat] ?? DEPT_COLORS.General
  const statusStyle = (s: string) => STATUS_STYLES[s] ?? STATUS_STYLES.open
  const urgencyStyle = (u: string) => URGENCY_STYLES[u] ?? URGENCY_STYLES.Medium

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1B3A5C', marginBottom: '2px' }}>Change Requests</h1>
          <p style={{ color: '#6B7A8D', fontSize: '0.875rem' }}>
            {requests.length === 0 ? 'No requests submitted yet' : `${requests.length} request${requests.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError('') }}
          style={{
            padding: '0.5rem 1.125rem', background: '#3D6B9B', color: '#fff',
            border: 'none', borderRadius: '0.625rem', fontWeight: 600, fontSize: '0.875rem',
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#2A5080')}
          onMouseLeave={e => (e.currentTarget.style.background = '#3D6B9B')}
        >
          + New Request
        </button>
      </div>

      {/* Request cards */}
      {requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#fff', borderRadius: '1rem', border: '1px solid #D0DCE8' }}>
          <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '0.875rem', background: '#DCEAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <svg width="24" height="24" fill="none" stroke="#3D6B9B" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <p style={{ color: '#6B7A8D', fontSize: '0.9375rem', marginBottom: '0.75rem' }}>No change requests yet.</p>
          <button onClick={() => setShowForm(true)} style={{ color: '#3D6B9B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
            Submit your first request
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {requests.map(req => {
            const ss = statusStyle(req.status)
            const us = urgencyStyle(req.urgency)
            const ds = deptStyle(req.category)
            return (
              <button
                key={req.id}
                onClick={() => setViewing(req)}
                style={{
                  background: '#fff', borderRadius: '0.875rem', padding: '1rem 1.25rem',
                  border: '1px solid #D0DCE8', cursor: 'pointer', textAlign: 'left',
                  transition: 'box-shadow 0.15s, border-color 0.15s',
                  display: 'block', width: '100%',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(27,58,92,0.1)'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#A8C4E0'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = ''
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#D0DCE8'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Badge label={req.category} style={ds} />
                    <Badge label={req.urgency} style={us} />
                    <Badge label={ss.label} style={ss} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#B0BAC5', flexShrink: 0 }}>
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#1B3A5C', fontWeight: 500, marginBottom: '0.25rem',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                } as React.CSSProperties}>
                  {req.description}
                </p>
                {req.adminNote && (
                  <p style={{ fontSize: '0.75rem', color: '#6B7A8D', marginTop: '0.375rem' }}>
                    Admin note: {req.adminNote}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* View modal */}
      {viewing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '1rem 1rem 0 0', boxShadow: '0 -4px 40px rgba(0,0,0,0.18)', width: '100%', maxWidth: '38rem', maxHeight: '92dvh', display: 'flex', flexDirection: 'column', border: '1px solid #D0DCE8' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEF3F9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Badge label={viewing.category} style={deptStyle(viewing.category)} />
                <Badge label={viewing.urgency} style={urgencyStyle(viewing.urgency)} />
                <Badge label={statusStyle(viewing.status).label} style={statusStyle(viewing.status)} />
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
              {viewing.adminNote && (
                <div style={{ padding: '0.875rem 1rem', borderRadius: '0.625rem', background: '#F1F5F9', border: '1px solid #D0DCE8' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Admin Note</p>
                  <p style={{ fontSize: '0.875rem', color: '#1B3A5C', lineHeight: 1.6 }}>{viewing.adminNote}</p>
                </div>
              )}
              <p style={{ fontSize: '0.75rem', color: '#B0BAC5' }}>
                Submitted {new Date(viewing.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #EEF3F9', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
              <button onClick={() => setViewing(null)}
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#6B7A8D', background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6B7A8D')}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New request form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '1rem 1rem 0 0', boxShadow: '0 -4px 40px rgba(0,0,0,0.18)', width: '100%', maxWidth: '38rem', maxHeight: '92dvh', display: 'flex', flexDirection: 'column', border: '1px solid #D0DCE8' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEF3F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <h2 style={{ fontWeight: 700, color: '#1B3A5C', fontSize: '1.0625rem' }}>New Change Request</h2>
              <button onClick={() => setShowForm(false)} style={{ color: '#8B939E', background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
                onMouseLeave={e => (e.currentTarget.style.color = '#8B939E')}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem' }}>Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff' }}
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem' }}>Urgency</label>
                  <select
                    value={form.urgency}
                    onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff' }}
                  >
                    {URGENCY_LEVELS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem' }}>Proposed Change</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the change you are proposing..."
                  rows={4}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem' }}>Reason</label>
                <textarea
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Why is this change needed? What problem does it solve?"
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              {formError && <p style={{ fontSize: '0.875rem', color: '#B91C1C' }}>{formError}</p>}
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #EEF3F9', display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', flexShrink: 0 }}>
              <button onClick={() => setShowForm(false)}
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#6B7A8D', background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6B7A8D')}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, background: '#3D6B9B', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}
                onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.background = '#2A5080' }}
                onMouseLeave={e => (e.currentTarget.style.background = '#3D6B9B')}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
