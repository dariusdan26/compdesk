'use client'

import { useEffect, useRef, useState } from 'react'

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
}

const MAX_PHOTOS = 5

// Resize an image File to max 1600px longest side, JPEG 0.85.
// Drops EXIF as a side effect of canvas re-encoding.
async function compressImage(file: File): Promise<File> {
  const MAX = 1600
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = objectUrl
    })
    const scale = Math.min(1, MAX / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85)
    )
    if (!blob) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

const DEPARTMENTS = ['General', 'Production', 'Quality', 'Safety', 'Warehouse', 'Maintenance', 'Administration', 'Business Central']

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

const DEFAULT_ITEMS: ChecklistItem[] = [
  { label: 'Correct product / item matches Sales Order', checked: false },
  { label: 'Quantity matches Sales Order', checked: false },
  { label: 'Product labelling complete and correct', checked: false },
  { label: 'Packaging condition acceptable', checked: false },
  { label: 'Certificate of Conformance included (if required)', checked: false },
  { label: 'Dangerous goods documentation complete (if applicable)', checked: false },
  { label: 'Customer special instructions noted and actioned', checked: false },
  { label: 'Driver / carrier details confirmed', checked: false },
]

function Badge({ label, style }: { label: string; style: { bg: string; color: string } }) {
  return (
    <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px', background: style.bg, color: style.color, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

export default function DispatchList({ initialChecklists }: { initialChecklists: Checklist[] }) {
  const [checklists, setChecklists] = useState<Checklist[]>(initialChecklists)
  const [showForm, setShowForm] = useState(false)
  const [viewing, setViewing] = useState<Checklist | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({ bcSoNumber: '', customerName: '', department: 'Warehouse', notes: '' })
  const [items, setItems] = useState<ChecklistItem[]>(DEFAULT_ITEMS.map(i => ({ ...i })))
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [compressing, setCompressing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Revoke object URLs on unmount or when previews change
  useEffect(() => {
    return () => {
      photoPreviews.forEach((url) => URL.revokeObjectURL(url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleItem(i: number) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, checked: !item.checked } : item))
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    // Reset the input so the same file can be selected again after removal
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (files.length === 0) return

    const remaining = MAX_PHOTOS - photos.length
    if (remaining <= 0) return
    const toAdd = files.slice(0, remaining)

    setCompressing(true)
    try {
      const compressed: File[] = []
      for (const f of toAdd) {
        try {
          compressed.push(await compressImage(f))
        } catch (err) {
          console.error('[dispatch] compression failed:', err)
          // Fall back to the original file if compression fails
          compressed.push(f)
        }
      }
      const newPreviews = compressed.map((f) => URL.createObjectURL(f))
      setPhotos((prev) => [...prev, ...compressed])
      setPhotoPreviews((prev) => [...prev, ...newPreviews])
    } finally {
      setCompressing(false)
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviews((prev) => {
      const url = prev[index]
      if (url) URL.revokeObjectURL(url)
      return prev.filter((_, i) => i !== index)
    })
  }

  function resetForm() {
    photoPreviews.forEach((url) => URL.revokeObjectURL(url))
    setForm({ bcSoNumber: '', customerName: '', department: 'Warehouse', notes: '' })
    setItems(DEFAULT_ITEMS.map(i => ({ ...i })))
    setPhotos([])
    setPhotoPreviews([])
  }

  const allChecked = items.every(i => i.checked)
  const checkedCount = items.filter(i => i.checked).length

  async function handleSubmit() {
    if (!form.bcSoNumber.trim()) { setFormError('BC Sales Order number is required.'); return }
    if (!form.customerName.trim()) { setFormError('Customer name is required.'); return }
    if (photos.length < 1) { setFormError('At least one photo is required.'); return }
    setFormError('')
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('bcSoNumber', form.bcSoNumber)
      fd.append('customerName', form.customerName)
      fd.append('department', form.department)
      fd.append('notes', form.notes)
      fd.append('items', JSON.stringify(items))
      photos.forEach((p) => fd.append('photos', p))

      const res = await fetch('/api/dispatch', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? 'Submission failed.'); return }
      setChecklists(prev => [data, ...prev])
      setShowForm(false)
      resetForm()
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff', boxSizing: 'border-box' as const }
  const labelStyle = { display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem' } as React.CSSProperties

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1B3A5C', marginBottom: '2px' }}>Dispatch Checklists</h1>
          <p style={{ color: '#6B7A8D', fontSize: '0.875rem' }}>{checklists.length === 0 ? 'No checklists submitted yet' : `${checklists.length} checklist${checklists.length === 1 ? '' : 's'}`}</p>
        </div>
        <button onClick={() => { setShowForm(true); setFormError(''); resetForm() }}
          style={{ padding: '0.5rem 1.125rem', background: '#3D6B9B', color: '#fff', border: 'none', borderRadius: '0.625rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.background = '#2A5080')}
          onMouseLeave={e => (e.currentTarget.style.background = '#3D6B9B')}
        >+ New Checklist</button>
      </div>

      {checklists.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#fff', borderRadius: '1rem', border: '1px solid #D0DCE8' }}>
          <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '0.875rem', background: '#DCEAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <svg width="24" height="24" fill="none" stroke="#3D6B9B" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p style={{ color: '#6B7A8D', fontSize: '0.9375rem', marginBottom: '0.75rem' }}>No dispatch checklists yet.</p>
          <button onClick={() => setShowForm(true)} style={{ color: '#3D6B9B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>Start your first checklist</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {checklists.map(cl => {
            const parsed: ChecklistItem[] = JSON.parse(cl.items)
            const done = parsed.filter(i => i.checked).length
            const isPass = cl.overallStatus === 'pass'
            const ds = DEPT_COLORS[cl.department] ?? DEPT_COLORS.General
            return (
              <button key={cl.id} onClick={() => setViewing(cl)}
                style={{ background: '#fff', borderRadius: '0.875rem', padding: '1rem 1.25rem', border: `1px solid ${isPass ? '#BBF7D0' : '#FECACA'}`, cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.15s', display: 'block', width: '100%' }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(27,58,92,0.1)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.boxShadow = ''}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Badge label={cl.department} style={ds} />
                    <Badge label={isPass ? '✓ Pass' : '✗ Fail'} style={{ bg: isPass ? '#D1FAE5' : '#FEE2E2', color: isPass ? '#059669' : '#DC2626' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#B0BAC5', flexShrink: 0 }}>{new Date(cl.createdAt).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: '0.9375rem', color: '#1B3A5C', fontWeight: 600, marginBottom: '0.125rem' }}>SO: {cl.bcSoNumber}</p>
                <p style={{ fontSize: '0.8125rem', color: '#6B7A8D' }}>{cl.customerName} · {done} of {parsed.length} checks passed</p>
              </button>
            )
          })}
        </div>
      )}

      {/* View modal */}
      {viewing && (() => {
        const parsed: ChecklistItem[] = JSON.parse(viewing.items)
        const isPass = viewing.overallStatus === 'pass'
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0', zIndex: 50 }}>
            <div style={{ background: '#fff', borderRadius: '1rem 1rem 0 0', boxShadow: '0 -4px 40px rgba(0,0,0,0.18)', width: '100%', maxWidth: '38rem', maxHeight: '92dvh', display: 'flex', flexDirection: 'column', border: '1px solid #D0DCE8' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEF3F9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexShrink: 0 }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.375rem' }}>
                    <Badge label={viewing.department} style={DEPT_COLORS[viewing.department] ?? DEPT_COLORS.General} />
                    <Badge label={isPass ? '✓ Pass' : '✗ Fail'} style={{ bg: isPass ? '#D1FAE5' : '#FEE2E2', color: isPass ? '#059669' : '#DC2626' }} />
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#1B3A5C', fontWeight: 600 }}>SO: {viewing.bcSoNumber} — {viewing.customerName}</p>
                </div>
                <button onClick={() => setViewing(null)} style={{ color: '#8B939E', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }} onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')} onMouseLeave={e => (e.currentTarget.style.color = '#8B939E')}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div style={{ padding: '1.5rem', overflowY: 'auto', overscrollBehavior: 'contain', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                    <div style={{ marginTop: '0.5rem' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Photos ({urls.length})</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.5rem' }}>
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
                <p style={{ fontSize: '0.75rem', color: '#B0BAC5', marginTop: '0.5rem' }}>Submitted {new Date(viewing.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #EEF3F9', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                <button onClick={() => setViewing(null)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#6B7A8D', background: 'none', border: 'none', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')} onMouseLeave={e => (e.currentTarget.style.color = '#6B7A8D')}>Close</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* New checklist form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '38rem', maxHeight: '92vh', display: 'flex', flexDirection: 'column', border: '1px solid #D0DCE8' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEF3F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <h2 style={{ fontWeight: 700, color: '#1B3A5C', fontSize: '1.0625rem' }}>New Dispatch Checklist</h2>
              <button onClick={() => setShowForm(false)} style={{ color: '#8B939E', background: 'none', border: 'none', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')} onMouseLeave={e => (e.currentTarget.style.color = '#8B939E')}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ padding: '1.5rem', overflowY: 'auto', overscrollBehavior: 'contain', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>BC Sales Order No.</label>
                  <input value={form.bcSoNumber} onChange={e => setForm(f => ({ ...f, bcSoNumber: e.target.value }))} placeholder="e.g. SO-2024-0456" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Department</label>
                  <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} style={inputStyle}>
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Customer Name</label>
                <input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} placeholder="e.g. Acme Industries" style={inputStyle} />
              </div>

              {/* Checklist items */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Dispatch Checks</label>
                  <span style={{ fontSize: '0.8125rem', color: allChecked ? '#059669' : '#6B7A8D', fontWeight: 600 }}>{checkedCount} / {items.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {items.map((item, i) => (
                    <button key={i} onClick={() => toggleItem(i)} type="button"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: `1px solid ${item.checked ? '#BBF7D0' : '#D0DCE8'}`, background: item.checked ? '#F0FDF4' : '#FAFBFC', cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s' }}>
                      <div style={{ width: '1.125rem', height: '1.125rem', borderRadius: '0.25rem', border: `2px solid ${item.checked ? '#059669' : '#C5D8EF'}`, background: item.checked ? '#059669' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.1s' }}>
                        {item.checked && <svg width="10" height="10" fill="none" stroke="#fff" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span style={{ fontSize: '0.875rem', color: item.checked ? '#059669' : '#374151' }}>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes or exceptions..." rows={2} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              {/* Photo capture */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Photos <span style={{ color: '#DC2626' }}>*</span></label>
                  <span style={{ fontSize: '0.75rem', color: '#6B7A8D' }}>{photos.length} / {MAX_PHOTOS}</span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handlePhotoSelect}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={compressing || photos.length >= MAX_PHOTOS}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1.5px dashed #C5D8EF',
                    background: photos.length >= MAX_PHOTOS ? '#F1F5F9' : '#F8FAFC',
                    color: photos.length >= MAX_PHOTOS ? '#B0BAC5' : '#3D6B9B',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: compressing || photos.length >= MAX_PHOTOS ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (!compressing && photos.length < MAX_PHOTOS) {
                      (e.currentTarget as HTMLButtonElement).style.background = '#EEF3F9'
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#3D6B9B'
                    }
                  }}
                  onMouseLeave={e => {
                    if (photos.length < MAX_PHOTOS) {
                      (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#C5D8EF'
                    }
                  }}
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {compressing
                    ? 'Processing...'
                    : photos.length >= MAX_PHOTOS
                      ? 'Maximum reached'
                      : photos.length === 0
                        ? 'Take or upload photos'
                        : 'Add another photo'}
                </button>

                {photoPreviews.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.5rem', marginTop: '0.625rem' }}>
                    {photoPreviews.map((url, i) => (
                      <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #D0DCE8', background: '#F1F5F9' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          aria-label={`Remove photo ${i + 1}`}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.65)',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                          }}
                        >
                          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {formError && <p style={{ fontSize: '0.875rem', color: '#B91C1C' }}>{formError}</p>}
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #EEF3F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: allChecked ? '#059669' : '#EA580C' }}>
                {allChecked ? '✓ All checks passed — ready to dispatch' : `${items.length - checkedCount} check${items.length - checkedCount === 1 ? '' : 's'} remaining`}
              </span>
              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <button onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#6B7A8D', background: 'none', border: 'none', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')} onMouseLeave={e => (e.currentTarget.style.color = '#6B7A8D')}>Cancel</button>
                <button onClick={handleSubmit} disabled={submitting || compressing || photos.length === 0}
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, background: '#3D6B9B', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: (submitting || compressing || photos.length === 0) ? 'not-allowed' : 'pointer', opacity: (submitting || compressing || photos.length === 0) ? 0.6 : 1 }}
                  onMouseEnter={e => { if (!submitting && !compressing && photos.length > 0) (e.currentTarget as HTMLButtonElement).style.background = '#2A5080' }}
                  onMouseLeave={e => (e.currentTarget.style.background = '#3D6B9B')}
                >{submitting ? 'Submitting...' : 'Submit Checklist'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
