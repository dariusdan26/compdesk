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
}

const DEPARTMENTS = ['General', 'Production', 'Quality', 'Safety', 'Warehouse', 'Maintenance', 'Administration', 'Business Central']
const DEFECT_TYPES = ['Dimensional', 'Visual', 'Material', 'Documentation', 'Contamination', 'Other']
const SEVERITIES = ['Minor', 'Major', 'Critical']

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

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  open:         { bg: '#FEF9C3', color: '#CA8A04', label: 'Open' },
  under_review: { bg: '#DCEAF7', color: '#3D6B9B', label: 'Under Review' },
  closed:       { bg: '#D1FAE5', color: '#059669', label: 'Closed' },
}

const DISPOSITION_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: '#F1F5F9', color: '#475569', label: 'Pending' },
  accept:  { bg: '#D1FAE5', color: '#059669', label: 'Accept' },
  rework:  { bg: '#FFEDD5', color: '#EA580C', label: 'Rework' },
  reject:  { bg: '#FEE2E2', color: '#DC2626', label: 'Reject' },
  scrap:   { bg: '#FEE2E2', color: '#7F1D1D', label: 'Scrap' },
}

function Badge({ label, style }: { label: string; style: { bg: string; color: string } }) {
  return (
    <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px', background: style.bg, color: style.color, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

export default function NCRList({ initialNCRs }: { initialNCRs: NCR[] }) {
  const [ncrs, setNCRs] = useState<NCR[]>(initialNCRs)
  const [showForm, setShowForm] = useState(false)
  const [viewing, setViewing] = useState<NCR | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({ bcPoNumber: '', itemDescription: '', department: 'Production', defectType: 'Visual', severity: 'Minor', description: '' })

  async function handleSubmit() {
    if (!form.bcPoNumber.trim()) { setFormError('BC PO number is required.'); return }
    if (!form.itemDescription.trim()) { setFormError('Item description is required.'); return }
    if (!form.description.trim()) { setFormError('Please describe the non-conformance.'); return }
    setFormError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/ncrs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? 'Submission failed.'); return }
      setNCRs(prev => [data, ...prev])
      setShowForm(false)
      setForm({ bcPoNumber: '', itemDescription: '', department: 'Production', defectType: 'Visual', severity: 'Minor', description: '' })
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff', boxSizing: 'border-box' as const }
  const labelStyle = { display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem' } as React.CSSProperties

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1B3A5C', marginBottom: '2px' }}>Non-Conformance Reports</h1>
          <p style={{ color: '#6B7A8D', fontSize: '0.875rem' }}>{ncrs.length === 0 ? 'No reports submitted yet' : `${ncrs.length} report${ncrs.length === 1 ? '' : 's'}`}</p>
        </div>
        <button onClick={() => { setShowForm(true); setFormError('') }}
          style={{ padding: '0.5rem 1.125rem', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '0.625rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.background = '#B91C1C')}
          onMouseLeave={e => (e.currentTarget.style.background = '#DC2626')}
        >+ New NCR</button>
      </div>

      {ncrs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#fff', borderRadius: '1rem', border: '1px solid #D0DCE8' }}>
          <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '0.875rem', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <svg width="24" height="24" fill="none" stroke="#DC2626" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
          </div>
          <p style={{ color: '#6B7A8D', fontSize: '0.9375rem', marginBottom: '0.75rem' }}>No non-conformance reports yet.</p>
          <button onClick={() => setShowForm(true)} style={{ color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>Submit your first NCR</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {ncrs.map(ncr => {
            const ss = STATUS_STYLES[ncr.status] ?? STATUS_STYLES.open
            const sev = SEVERITY_STYLES[ncr.severity] ?? SEVERITY_STYLES.Minor
            const ds = DEPT_COLORS[ncr.department] ?? DEPT_COLORS.General
            const disp = DISPOSITION_STYLES[ncr.disposition] ?? DISPOSITION_STYLES.pending
            return (
              <button key={ncr.id} onClick={() => setViewing(ncr)}
                style={{ background: '#fff', borderRadius: '0.875rem', padding: '1rem 1.25rem', border: '1px solid #D0DCE8', cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.15s, border-color 0.15s', display: 'block', width: '100%' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(27,58,92,0.1)'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#A8C4E0' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = ''; (e.currentTarget as HTMLButtonElement).style.borderColor = '#D0DCE8' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Badge label={ncr.department} style={ds} />
                    <Badge label={ncr.severity} style={sev} />
                    <Badge label={ss.label} style={ss} />
                    <Badge label={disp.label} style={disp} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#B0BAC5', flexShrink: 0 }}>{new Date(ncr.createdAt).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#6B7A8D', marginBottom: '0.25rem' }}>PO: <span style={{ color: '#1B3A5C', fontWeight: 600 }}>{ncr.bcPoNumber}</span> · {ncr.defectType} · {ncr.itemDescription}</p>
                <p style={{ fontSize: '0.875rem', color: '#1B3A5C', fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{ncr.description}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* View modal */}
      {viewing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '38rem', maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: '1px solid #D0DCE8' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEF3F9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Badge label={viewing.department} style={DEPT_COLORS[viewing.department] ?? DEPT_COLORS.General} />
                <Badge label={viewing.severity} style={SEVERITY_STYLES[viewing.severity] ?? SEVERITY_STYLES.Minor} />
                <Badge label={(STATUS_STYLES[viewing.status] ?? STATUS_STYLES.open).label} style={STATUS_STYLES[viewing.status] ?? STATUS_STYLES.open} />
                <Badge label={(DISPOSITION_STYLES[viewing.disposition] ?? DISPOSITION_STYLES.pending).label} style={DISPOSITION_STYLES[viewing.disposition] ?? DISPOSITION_STYLES.pending} />
              </div>
              <button onClick={() => setViewing(null)} style={{ color: '#8B939E', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }} onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')} onMouseLeave={e => (e.currentTarget.style.color = '#8B939E')}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>BC PO Number</p><p style={{ fontSize: '0.9375rem', color: '#1B3A5C', fontWeight: 600 }}>{viewing.bcPoNumber}</p></div>
                <div><p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Defect Type</p><p style={{ fontSize: '0.9375rem', color: '#1B3A5C' }}>{viewing.defectType}</p></div>
              </div>
              <div><p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Item / Material</p><p style={{ fontSize: '0.9375rem', color: '#1B3A5C' }}>{viewing.itemDescription}</p></div>
              <div><p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Description of Non-Conformance</p><p style={{ fontSize: '0.9375rem', color: '#1B3A5C', lineHeight: 1.6 }}>{viewing.description}</p></div>
              {viewing.adminNote && (
                <div style={{ padding: '0.875rem 1rem', borderRadius: '0.625rem', background: '#F1F5F9', border: '1px solid #D0DCE8' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Admin Note</p>
                  <p style={{ fontSize: '0.875rem', color: '#1B3A5C', lineHeight: 1.6 }}>{viewing.adminNote}</p>
                </div>
              )}
              <p style={{ fontSize: '0.75rem', color: '#B0BAC5' }}>Submitted {new Date(viewing.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #EEF3F9', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
              <button onClick={() => setViewing(null)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#6B7A8D', background: 'none', border: 'none', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')} onMouseLeave={e => (e.currentTarget.style.color = '#6B7A8D')}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* New NCR form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '38rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: '1px solid #D0DCE8' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEF3F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <h2 style={{ fontWeight: 700, color: '#1B3A5C', fontSize: '1.0625rem' }}>New Non-Conformance Report</h2>
              <button onClick={() => setShowForm(false)} style={{ color: '#8B939E', background: 'none', border: 'none', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')} onMouseLeave={e => (e.currentTarget.style.color = '#8B939E')}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>BC PO Number</label>
                  <input value={form.bcPoNumber} onChange={e => setForm(f => ({ ...f, bcPoNumber: e.target.value }))} placeholder="e.g. PO-2024-0123" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Department</label>
                  <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} style={inputStyle}>
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Item / Material Description</label>
                <input value={form.itemDescription} onChange={e => setForm(f => ({ ...f, itemDescription: e.target.value }))} placeholder="e.g. Carbon fibre sheet 3mm" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Defect Type</label>
                  <select value={form.defectType} onChange={e => setForm(f => ({ ...f, defectType: e.target.value }))} style={inputStyle}>
                    {DEFECT_TYPES.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Severity</label>
                  <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))} style={inputStyle}>
                    {SEVERITIES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description of Non-Conformance</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe what is wrong, how it was detected, and any measurements or evidence..." rows={4} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              {formError && <p style={{ fontSize: '0.875rem', color: '#B91C1C' }}>{formError}</p>}
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #EEF3F9', display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', flexShrink: 0 }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#6B7A8D', background: 'none', border: 'none', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')} onMouseLeave={e => (e.currentTarget.style.color = '#6B7A8D')}>Cancel</button>
              <button onClick={handleSubmit} disabled={submitting}
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, background: '#DC2626', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}
                onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.background = '#B91C1C' }}
                onMouseLeave={e => (e.currentTarget.style.background = '#DC2626')}
              >{submitting ? 'Submitting...' : 'Submit NCR'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
