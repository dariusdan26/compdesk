'use client'

import { useState } from 'react'

interface LineItem { id?: number; description: string; quantity: string; unit: string; estimatedCost: string }
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
}

const DEPARTMENTS = ['General', 'Production', 'Quality', 'Safety', 'Warehouse', 'Maintenance', 'Administration', 'Business Central']
const URGENCY_LEVELS = ['Low', 'Medium', 'High', 'Critical']
const UNITS = ['ea', 'm', 'kg', 'L', 'box', 'roll', 'sheet', 'set', 'pair']

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

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  open:     { bg: '#FEF9C3', color: '#CA8A04', label: 'Open' },
  approved: { bg: '#D1FAE5', color: '#059669', label: 'Approved' },
  ordered:  { bg: '#DCEAF7', color: '#3D6B9B', label: 'Ordered' },
  received: { bg: '#D1FAE5', color: '#064E3B', label: 'Received' },
  rejected: { bg: '#FEE2E2', color: '#DC2626', label: 'Rejected' },
}

function Badge({ label, style }: { label: string; style: { bg: string; color: string } }) {
  return (
    <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px', background: style.bg, color: style.color, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

const emptyLine = (): LineItem => ({ description: '', quantity: '1', unit: 'ea', estimatedCost: '' })

export default function RequisitionList({ initialRequisitions }: { initialRequisitions: Requisition[] }) {
  const [requisitions, setRequisitions] = useState<Requisition[]>(initialRequisitions)
  const [showForm, setShowForm] = useState(false)
  const [viewing, setViewing] = useState<Requisition | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({ title: '', department: 'Production', urgency: 'Medium', justification: '' })
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLine()])

  function updateLine(i: number, field: keyof LineItem, value: string) {
    setLineItems(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  }
  function addLine() { setLineItems(prev => [...prev, emptyLine()]) }
  function removeLine(i: number) { setLineItems(prev => prev.filter((_, idx) => idx !== i)) }

  async function handleSubmit() {
    if (!form.title.trim()) { setFormError('Title is required.'); return }
    if (!form.justification.trim()) { setFormError('Justification is required.'); return }
    const validLines = lineItems.filter(l => l.description.trim())
    if (validLines.length === 0) { setFormError('At least one line item with a description is required.'); return }
    setFormError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, lineItems: validLines }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? 'Submission failed.'); return }
      setRequisitions(prev => [data, ...prev])
      setShowForm(false)
      setForm({ title: '', department: 'Production', urgency: 'Medium', justification: '' })
      setLineItems([emptyLine()])
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
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1B3A5C', marginBottom: '2px' }}>Purchase Requisitions</h1>
          <p style={{ color: '#6B7A8D', fontSize: '0.875rem' }}>{requisitions.length === 0 ? 'No requisitions submitted yet' : `${requisitions.length} requisition${requisitions.length === 1 ? '' : 's'}`}</p>
        </div>
        <button onClick={() => { setShowForm(true); setFormError('') }}
          style={{ padding: '0.5rem 1.125rem', background: '#059669', color: '#fff', border: 'none', borderRadius: '0.625rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.background = '#047857')}
          onMouseLeave={e => (e.currentTarget.style.background = '#059669')}
        >+ New Requisition</button>
      </div>

      {requisitions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#fff', borderRadius: '1rem', border: '1px solid #D0DCE8' }}>
          <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '0.875rem', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <svg width="24" height="24" fill="none" stroke="#059669" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" /></svg>
          </div>
          <p style={{ color: '#6B7A8D', fontSize: '0.9375rem', marginBottom: '0.75rem' }}>No purchase requisitions yet.</p>
          <button onClick={() => setShowForm(true)} style={{ color: '#059669', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>Submit your first requisition</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {requisitions.map(req => {
            const ss = STATUS_STYLES[req.status] ?? STATUS_STYLES.open
            const us = URGENCY_STYLES[req.urgency] ?? URGENCY_STYLES.Medium
            const ds = DEPT_COLORS[req.department] ?? DEPT_COLORS.General
            return (
              <button key={req.id} onClick={() => setViewing(req)}
                style={{ background: '#fff', borderRadius: '0.875rem', padding: '1rem 1.25rem', border: '1px solid #D0DCE8', cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.15s, border-color 0.15s', display: 'block', width: '100%' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(27,58,92,0.1)'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#A8C4E0' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = ''; (e.currentTarget as HTMLButtonElement).style.borderColor = '#D0DCE8' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Badge label={req.department} style={ds} />
                    <Badge label={req.urgency} style={us} />
                    <Badge label={ss.label} style={ss} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#B0BAC5', flexShrink: 0 }}>{new Date(req.createdAt).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: '0.9375rem', color: '#1B3A5C', fontWeight: 600, marginBottom: '0.25rem' }}>{req.title}</p>
                <p style={{ fontSize: '0.8125rem', color: '#6B7A8D' }}>{req.lineItems.length} line item{req.lineItems.length === 1 ? '' : 's'}</p>
                {req.adminNote && <p style={{ fontSize: '0.75rem', color: '#6B7A8D', marginTop: '0.375rem' }}>Admin: {req.adminNote}</p>}
              </button>
            )
          })}
        </div>
      )}

      {/* View modal */}
      {viewing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '42rem', maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: '1px solid #D0DCE8' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEF3F9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontWeight: 700, color: '#1B3A5C', fontSize: '1.0625rem', marginBottom: '0.5rem' }}>{viewing.title}</h2>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Badge label={viewing.department} style={DEPT_COLORS[viewing.department] ?? DEPT_COLORS.General} />
                  <Badge label={viewing.urgency} style={URGENCY_STYLES[viewing.urgency] ?? URGENCY_STYLES.Medium} />
                  <Badge label={(STATUS_STYLES[viewing.status] ?? STATUS_STYLES.open).label} style={STATUS_STYLES[viewing.status] ?? STATUS_STYLES.open} />
                </div>
              </div>
              <button onClick={() => setViewing(null)} style={{ color: '#8B939E', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }} onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')} onMouseLeave={e => (e.currentTarget.style.color = '#8B939E')}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Justification</p>
                <p style={{ fontSize: '0.9375rem', color: '#1B3A5C', lineHeight: 1.6 }}>{viewing.justification}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Line Items</p>
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
                      {viewing.lineItems.map((item, i) => (
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
              </div>
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

      {/* New requisition form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '44rem', maxHeight: '92vh', display: 'flex', flexDirection: 'column', border: '1px solid #D0DCE8' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEF3F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <h2 style={{ fontWeight: 700, color: '#1B3A5C', fontSize: '1.0625rem' }}>New Purchase Requisition</h2>
              <button onClick={() => setShowForm(false)} style={{ color: '#8B939E', background: 'none', border: 'none', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')} onMouseLeave={e => (e.currentTarget.style.color = '#8B939E')}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Title / Purpose</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Consumables restock — Production floor" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Department</label>
                  <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} style={inputStyle}>
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Urgency</label>
                  <select value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))} style={inputStyle}>
                    {URGENCY_LEVELS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Justification</label>
                <textarea value={form.justification} onChange={e => setForm(f => ({ ...f, justification: e.target.value }))} placeholder="Why are these items needed?" rows={2} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              {/* Line items */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Line Items</label>
                  <button onClick={addLine} style={{ fontSize: '0.8125rem', color: '#3D6B9B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')} onMouseLeave={e => (e.currentTarget.style.color = '#3D6B9B')}>
                    + Add Item
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {lineItems.map((line, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px 32px', gap: '0.5rem', alignItems: 'center' }}>
                      <input value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Description" style={inputStyle} />
                      <input value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} placeholder="Qty" style={inputStyle} />
                      <select value={line.unit} onChange={e => updateLine(i, 'unit', e.target.value)} style={inputStyle}>
                        {UNITS.map(u => <option key={u}>{u}</option>)}
                      </select>
                      <input value={line.estimatedCost} onChange={e => updateLine(i, 'estimatedCost', e.target.value)} placeholder="Est. $" style={inputStyle} />
                      <button onClick={() => removeLine(i)} disabled={lineItems.length === 1} style={{ background: 'none', border: 'none', cursor: lineItems.length === 1 ? 'not-allowed' : 'pointer', color: '#B0BAC5', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={e => { if (lineItems.length > 1) (e.currentTarget as HTMLButtonElement).style.color = '#DC2626' }} onMouseLeave={e => (e.currentTarget.style.color = '#B0BAC5')}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              {formError && <p style={{ fontSize: '0.875rem', color: '#B91C1C' }}>{formError}</p>}
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #EEF3F9', display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', flexShrink: 0 }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#6B7A8D', background: 'none', border: 'none', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')} onMouseLeave={e => (e.currentTarget.style.color = '#6B7A8D')}>Cancel</button>
              <button onClick={handleSubmit} disabled={submitting}
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, background: '#059669', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}
                onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.background = '#047857' }}
                onMouseLeave={e => (e.currentTarget.style.background = '#059669')}
              >{submitting ? 'Submitting...' : 'Submit Requisition'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
