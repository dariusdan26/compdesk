'use client'

import { useState } from 'react'

interface Issue {
  id: number
  description: string
  category: string
  urgency: string
  status: string
  aiResponse: string | null
  resolution: string | null
  createdAt: string
  user: { name: string }
}

const STATUS_OPTIONS = ['open', 'investigating', 'resolved', 'closed']

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  open:          { bg: '#FEE2E2', color: '#DC2626', label: 'Open' },
  investigating: { bg: '#FEF9C3', color: '#CA8A04', label: 'Investigating' },
  resolved:      { bg: '#D1FAE5', color: '#059669', label: 'Resolved' },
  closed:        { bg: '#F1F5F9', color: '#475569', label: 'Closed' },
}

const URGENCY_STYLES: Record<string, { bg: string; color: string }> = {
  Low:      { bg: '#F1F5F9', color: '#475569' },
  Medium:   { bg: '#FEF9C3', color: '#CA8A04' },
  High:     { bg: '#FFEDD5', color: '#EA580C' },
  Critical: { bg: '#FEE2E2', color: '#DC2626' },
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
    <span style={{
      fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px',
      borderRadius: '9999px', background: style.bg, color: style.color, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

export default function IssueAdmin({ initialIssues }: { initialIssues: Issue[] }) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues)
  const [viewing, setViewing] = useState<Issue | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterUrgency, setFilterUrgency] = useState('all')
  const [editStatus, setEditStatus] = useState('')
  const [editResolution, setEditResolution] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function openIssue(issue: Issue) {
    setViewing(issue)
    setEditStatus(issue.status)
    setEditResolution(issue.resolution ?? '')
  }

  async function handleSave() {
    if (!viewing) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/issues/${viewing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: editStatus, resolution: editResolution || null }),
      })
      if (!res.ok) return
      const updated = await res.json()
      setIssues(prev => prev.map(i => i.id === updated.id ? updated : i))
      setViewing(updated)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!viewing || !confirm('Delete this issue report? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/issues/${viewing.id}`, { method: 'DELETE' })
      if (!res.ok) return
      setIssues(prev => prev.filter(i => i.id !== viewing.id))
      setViewing(null)
    } finally {
      setDeleting(false)
    }
  }

  const filtered = issues.filter(i => {
    if (filterStatus !== 'all' && i.status !== filterStatus) return false
    if (filterUrgency !== 'all' && i.urgency !== filterUrgency) return false
    return true
  })

  const openCount = issues.filter(i => i.status === 'open').length
  const criticalCount = issues.filter(i => i.urgency === 'Critical' && i.status === 'open').length

  const selectStyle = {
    padding: '0.4375rem 0.75rem', borderRadius: '0.5rem',
    border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.8125rem',
    background: '#fff', cursor: 'pointer',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1B3A5C', marginBottom: '4px' }}>Issue Reports</h1>
          <p style={{ color: '#6B7A8D', fontSize: '0.875rem' }}>
            {issues.length} total
            {openCount > 0 && <span style={{ color: '#DC2626', fontWeight: 600 }}> · {openCount} open</span>}
            {criticalCount > 0 && <span style={{ color: '#DC2626', fontWeight: 700 }}> · {criticalCount} critical</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_STYLES[s].label}</option>)}
          </select>
          <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)} style={selectStyle}>
            <option value="all">All Urgencies</option>
            {['Low', 'Medium', 'High', 'Critical'].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Issue list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '1rem', border: '1px solid #D0DCE8', color: '#6B7A8D', fontSize: '0.9375rem' }}>
          No issue reports match the current filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {filtered.map(issue => {
            const ss = STATUS_STYLES[issue.status] ?? STATUS_STYLES.open
            const us = URGENCY_STYLES[issue.urgency] ?? URGENCY_STYLES.Medium
            const ds = DEPT_COLORS[issue.category] ?? DEPT_COLORS.General
            return (
              <button
                key={issue.id}
                onClick={() => openIssue(issue)}
                style={{
                  background: '#fff', borderRadius: '0.875rem', padding: '1rem 1.25rem',
                  border: `1px solid ${issue.status === 'open' && issue.urgency === 'Critical' ? '#FECACA' : '#D0DCE8'}`,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(27,58,92,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem', alignItems: 'center' }}>
                      <Badge label={issue.category} style={ds} />
                      <Badge label={issue.urgency} style={us} />
                      <Badge label={ss.label} style={ss} />
                      <span style={{ fontSize: '0.75rem', color: '#6B7A8D' }}>— {issue.user.name}</span>
                    </div>
                    <p style={{
                      fontSize: '0.875rem', color: '#1B3A5C', margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {issue.description}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#B0BAC5', flexShrink: 0 }}>
                    {new Date(issue.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Detail / edit modal */}
      {viewing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '42rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: '1px solid #D0DCE8' }}>
            {/* Modal header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEF3F9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge label={viewing.category} style={DEPT_COLORS[viewing.category] ?? DEPT_COLORS.General} />
                <Badge label={viewing.urgency} style={URGENCY_STYLES[viewing.urgency] ?? URGENCY_STYLES.Medium} />
                <span style={{ fontSize: '0.8125rem', color: '#6B7A8D' }}>— {viewing.user.name}</span>
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

            {/* Modal body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Issue Description</p>
                <p style={{ fontSize: '0.9375rem', color: '#1B3A5C', lineHeight: 1.6, margin: 0 }}>{viewing.description}</p>
              </div>

              {viewing.aiResponse && (
                <div style={{ padding: '1rem', borderRadius: '0.75rem', background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem' }}>
                    <svg width="14" height="14" fill="none" stroke="#059669" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>AI Triage Response</p>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#166534', lineHeight: 1.7, margin: 0 }}>{viewing.aiResponse}</p>
                </div>
              )}

              {/* Status update */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem' }}>Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff' }}
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_STYLES[s].label}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem' }}>Resolution Note</label>
                <textarea
                  value={editResolution}
                  onChange={e => setEditResolution(e.target.value)}
                  placeholder="Describe how the issue was resolved or what action was taken..."
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <p style={{ fontSize: '0.75rem', color: '#B0BAC5', margin: 0 }}>
                Reported {new Date(viewing.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Modal footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #EEF3F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#B91C1C')}
                onMouseLeave={e => (e.currentTarget.style.color = '#DC2626')}
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
