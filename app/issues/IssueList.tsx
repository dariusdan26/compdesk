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
  open:         { bg: '#FEE2E2', color: '#DC2626', label: 'Open' },
  investigating: { bg: '#FEF9C3', color: '#CA8A04', label: 'Investigating' },
  resolved:     { bg: '#D1FAE5', color: '#059669', label: 'Resolved' },
  closed:       { bg: '#F1F5F9', color: '#475569', label: 'Closed' },
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

export default function IssueList({ initialIssues }: { initialIssues: Issue[] }) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues)
  const [showForm, setShowForm] = useState(false)
  const [viewing, setViewing] = useState<Issue | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({ description: '', category: 'General', urgency: 'Medium' })

  async function handleSubmit() {
    if (!form.description.trim()) { setFormError('Please describe the issue.'); return }
    setFormError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? 'Submission failed.'); return }
      setIssues(prev => [data, ...prev])
      setViewing(data)
      setShowForm(false)
      setForm({ description: '', category: 'General', urgency: 'Medium' })
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
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1B3A5C', marginBottom: '2px' }}>Issue Reports</h1>
          <p style={{ color: '#6B7A8D', fontSize: '0.875rem' }}>
            {issues.length === 0 ? 'No issues reported yet' : `${issues.length} issue${issues.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError('') }}
          style={{
            padding: '0.5rem 1.125rem', background: '#DC2626', color: '#fff',
            border: 'none', borderRadius: '0.625rem', fontWeight: 600, fontSize: '0.875rem',
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#B91C1C')}
          onMouseLeave={e => (e.currentTarget.style.background = '#DC2626')}
        >
          + Report Issue
        </button>
      </div>

      {/* Issue cards */}
      {issues.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#fff', borderRadius: '1rem', border: '1px solid #D0DCE8' }}>
          <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '0.875rem', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <svg width="24" height="24" fill="none" stroke="#DC2626" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p style={{ color: '#6B7A8D', fontSize: '0.9375rem', marginBottom: '0.75rem' }}>No issues reported yet.</p>
          <button onClick={() => setShowForm(true)} style={{ color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
            Report an issue
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {issues.map(issue => {
            const ss = statusStyle(issue.status)
            const us = urgencyStyle(issue.urgency)
            const ds = deptStyle(issue.category)
            return (
              <button
                key={issue.id}
                onClick={() => setViewing(issue)}
                style={{
                  background: '#fff', borderRadius: '0.875rem', padding: '1rem 1.25rem',
                  border: `1px solid ${issue.status === 'open' || issue.urgency === 'Critical' ? '#FECACA' : '#D0DCE8'}`,
                  cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.15s, border-color 0.15s',
                  display: 'block', width: '100%',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(27,58,92,0.1)'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#A8C4E0'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = ''
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = issue.status === 'open' || issue.urgency === 'Critical' ? '#FECACA' : '#D0DCE8'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Badge label={issue.category} style={ds} />
                    <Badge label={issue.urgency} style={us} />
                    <Badge label={ss.label} style={ss} />
                    {issue.aiResponse && (
                      <span style={{ fontSize: '0.6875rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                        AI triage
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#B0BAC5', flexShrink: 0 }}>
                    {new Date(issue.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p style={{
                  fontSize: '0.875rem', color: '#1B3A5C', fontWeight: 500, marginBottom: '0.25rem',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                } as React.CSSProperties}>
                  {issue.description}
                </p>
                {issue.resolution && (
                  <p style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.375rem' }}>
                    ✓ {issue.resolution}
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
          <div style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '40rem', maxHeight: '88vh', display: 'flex', flexDirection: 'column', border: '1px solid #D0DCE8' }}>
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
            <div style={{ padding: '1.5rem', overflowY: 'auto', overscrollBehavior: 'contain', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Issue Description</p>
                <p style={{ fontSize: '0.9375rem', color: '#1B3A5C', lineHeight: 1.6 }}>{viewing.description}</p>
              </div>

              {viewing.aiResponse && (
                <div style={{ padding: '1rem', borderRadius: '0.75rem', background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.625rem' }}>
                    <svg width="14" height="14" fill="none" stroke="#059669" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>AI Triage Response</p>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#166534', lineHeight: 1.7, margin: 0 }}>{viewing.aiResponse}</p>
                </div>
              )}

              {viewing.resolution && (
                <div style={{ padding: '0.875rem 1rem', borderRadius: '0.625rem', background: '#F1F5F9', border: '1px solid #D0DCE8' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Resolution</p>
                  <p style={{ fontSize: '0.875rem', color: '#1B3A5C', lineHeight: 1.6, margin: 0 }}>{viewing.resolution}</p>
                </div>
              )}

              <p style={{ fontSize: '0.75rem', color: '#B0BAC5' }}>
                Reported {new Date(viewing.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
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

      {/* New issue form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '1rem 1rem 0 0', boxShadow: '0 -4px 40px rgba(0,0,0,0.18)', width: '100%', maxWidth: '38rem', maxHeight: '92dvh', display: 'flex', flexDirection: 'column', border: '1px solid #D0DCE8' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEF3F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <h2 style={{ fontWeight: 700, color: '#1B3A5C', fontSize: '1.0625rem' }}>Report an Issue</h2>
              <button onClick={() => setShowForm(false)} style={{ color: '#8B939E', background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
                onMouseLeave={e => (e.currentTarget.style.color = '#8B939E')}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div style={{ padding: '1.5rem', overflowY: 'auto', overscrollBehavior: 'contain', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
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
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem' }}>Issue Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the issue in detail — what happened, where, and when..."
                  rows={5}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ padding: '0.75rem 1rem', borderRadius: '0.625rem', background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <svg width="16" height="16" fill="none" stroke="#059669" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: '1px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <p style={{ fontSize: '0.8125rem', color: '#166534', margin: 0, lineHeight: 1.5 }}>
                  After submitting, you&apos;ll receive an AI triage response with immediate steps to take.
                </p>
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
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, background: '#DC2626', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.background = '#B91C1C' }}
                onMouseLeave={e => (e.currentTarget.style.background = '#DC2626')}
              >
                {submitting ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ animation: 'spin 1s linear infinite' }}>
                      <path strokeLinecap="round" d="M12 3a9 9 0 109 9" />
                    </svg>
                    Getting AI triage...
                  </>
                ) : 'Submit Issue'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
