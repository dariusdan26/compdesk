'use client'

import { useState, useRef } from 'react'

interface SOP {
  id: number
  title: string
  department: string
  version: string
  content: string
  createdAt: string
  updatedAt: string
}

const DEPARTMENTS = [
  'General',
  'Production',
  'Quality',
  'Safety',
  'Warehouse',
  'Maintenance',
  'Administration',
  'Business Central',
]

const PINNED_DEPTS = [
  'Production', 'Quality', 'Safety', 'Warehouse',
  'Maintenance', 'Business Central', 'Administration', 'General',
]

const DEPT_COLORS: Record<string, { bg: string; icon: string }> = {
  Production:        { bg: '#E0E4E9', icon: '#4E7FB5' },
  Quality:           { bg: '#FEF9C3', icon: '#CA8A04' },
  Safety:            { bg: '#FEE2E2', icon: '#DC2626' },
  Warehouse:         { bg: '#D1FAE5', icon: '#059669' },
  Maintenance:       { bg: '#EDE9FE', icon: '#7C3AED' },
  'Business Central': { bg: '#FFF7ED', icon: '#EA580C' },
  Administration:    { bg: '#FFE4E6', icon: '#E11D48' },
  General:           { bg: '#F2F3F5', icon: '#475569' },
}

function getDeptStyle(dept: string) {
  return DEPT_COLORS[dept] ?? DEPT_COLORS.General
}

function FolderIcon({ dept, size = 28 }: { dept: string; size?: number }) {
  const s = getDeptStyle(dept)
  return (
    <svg width={size} height={size} fill="none" stroke={s.icon} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  )
}

export default function SOPAdmin({ initialSops }: { initialSops: SOP[] }) {
  const [sops, setSops] = useState<SOP[]>(initialSops)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SOP | null>(null)
  const [form, setForm] = useState({ title: '', department: DEPARTMENTS[0], version: '1.0', content: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [folderProgress, setFolderProgress] = useState<{ current: number; total: number } | null>(null)
  const [view, setView] = useState<'departments' | 'sops'>('departments')
  const [selectedDept, setSelectedDept] = useState<string | null>(null)
  const [movingIds, setMovingIds] = useState<Set<number>>(new Set())
  const [movingAll, setMovingAll] = useState(false)
  const [moveAllTarget, setMoveAllTarget] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  // Build department list: pinned + any extra from actual SOPs
  const actualDepts = Array.from(new Set(sops.map(s => s.department)))
  const allDepts = [
    ...PINNED_DEPTS,
    ...actualDepts.filter(d => !PINNED_DEPTS.includes(d)).sort(),
  ]

  function openNew() {
    setEditing(null)
    setForm({ title: '', department: selectedDept ?? DEPARTMENTS[0], version: '1.0', content: '' })
    setUploadError('')
    setShowForm(true)
  }

  function openEdit(sop: SOP) {
    setEditing(sop)
    setForm({ title: sop.title, department: sop.department, version: sop.version, content: sop.content })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setUploadError('')
  }

  function openDept(dept: string) {
    setSelectedDept(dept)
    setView('sops')
  }

  function goBack() {
    setView('departments')
    setSelectedDept(null)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/admin/sops/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setUploadError(data.error ?? 'Upload failed.')
      } else {
        setEditing(null)
        setForm(f => ({ ...f, title: data.suggestedTitle, content: data.text, department: selectedDept ?? f.department }))
        setUploadError('')
        setShowForm(true)
      }
    } catch {
      setUploadError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleFolderUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter(f =>
      /\.(pdf|docx|txt)$/i.test(f.name)
    )
    if (files.length === 0) return

    setFolderProgress({ current: 0, total: files.length })
    setUploadError('')
    const errors: string[] = []
    const dept = selectedDept ?? 'General'

    for (let i = 0; i < files.length; i++) {
      setFolderProgress({ current: i + 1, total: files.length })
      const file = files[i]

      try {
        const formData = new FormData()
        formData.append('file', file)
        const parseRes = await fetch('/api/admin/sops/upload', { method: 'POST', body: formData })
        const parseData = await parseRes.json()
        if (!parseRes.ok) { errors.push(`${file.name}: ${parseData.error ?? 'parse failed'}`); continue }

        const createRes = await fetch('/api/admin/sops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: parseData.suggestedTitle, department: dept, version: '1.0', content: parseData.text }),
        })
        const sop = await createRes.json()
        if (!createRes.ok) { errors.push(`${file.name}: failed to save`); continue }
        setSops(prev => [...prev, sop])
      } catch {
        errors.push(`${file.name}: unexpected error`)
      }
    }

    setFolderProgress(null)
    if (folderInputRef.current) folderInputRef.current.value = ''
    if (errors.length > 0) setUploadError(errors.join('\n'))
  }

  async function handleSave() {
    if (!form.title.trim()) { setUploadError('Please enter a title.'); return }
    if (!form.content.trim()) { setUploadError('Content cannot be empty.'); return }
    setUploadError('')
    setSaving(true)

    const url = editing ? `/api/admin/sops/${editing.id}` : '/api/admin/sops'
    const method = editing ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    if (editing) {
      setSops(prev => prev.map(s => s.id === editing.id ? data : s))
    } else {
      setSops(prev => [...prev, data])
    }

    setSaving(false)
    closeForm()
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this SOP? This cannot be undone.')) return
    setDeletingId(id)
    await fetch(`/api/admin/sops/${id}`, { method: 'DELETE' })
    setSops(prev => prev.filter(s => s.id !== id))
    setDeletingId(null)
  }

  async function handleMoveSop(id: number, newDept: string) {
    setMovingIds(prev => new Set([...prev, id]))
    const sop = sops.find(s => s.id === id)!
    const res = await fetch(`/api/admin/sops/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: sop.title, department: newDept, version: sop.version, content: sop.content }),
    })
    const data = await res.json()
    setSops(prev => prev.map(s => s.id === id ? data : s))
    setMovingIds(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  async function handleMoveAll(targetDept: string) {
    const toMove = sops.filter(s => s.department === selectedDept)
    setMovingAll(true)
    for (const sop of toMove) {
      const res = await fetch(`/api/admin/sops/${sop.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: sop.title, department: targetDept, version: sop.version, content: sop.content }),
      })
      const data = await res.json()
      setSops(prev => prev.map(s => s.id === sop.id ? data : s))
    }
    setMovingAll(false)
    setMoveAllTarget('')
  }

  const deptSops = selectedDept ? sops.filter(s => s.department === selectedDept) : []
  const isBusy = uploading || !!folderProgress

  // ── Action buttons (reused in both views) ──────────────────────────────────
  const ActionButtons = (
    <div className="flex items-center gap-2">
      <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" />
      <input ref={folderInputRef} type="file" accept=".pdf,.docx,.txt" {...{ webkitdirectory: '', multiple: true }} onChange={handleFolderUpload} className="hidden" />

      <button
        onClick={() => folderInputRef.current?.click()}
        disabled={isBusy}
        className="px-4 py-2 bg-white font-semibold rounded-lg text-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
        style={{ border: '1px solid #C8CDD3', color: '#4E7FB5' }}
        onMouseEnter={e => { if (!isBusy) (e.currentTarget as HTMLButtonElement).style.borderColor = '#4E7FB5' }}
        onMouseLeave={e => (e.currentTarget.style.borderColor = '#C8CDD3')}
      >
        {folderProgress ? (
          <>
            <svg className="w-4 h-4 animate-spin" style={{ color: '#6B94C0' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {folderProgress.current} of {folderProgress.total}...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            Upload Folder
          </>
        )}
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isBusy}
        className="px-4 py-2 bg-white font-semibold rounded-lg text-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
        style={{ border: '1px solid #C8CDD3', color: '#4E7FB5' }}
        onMouseEnter={e => { if (!isBusy) (e.currentTarget as HTMLButtonElement).style.borderColor = '#4E7FB5' }}
        onMouseLeave={e => (e.currentTarget.style.borderColor = '#C8CDD3')}
      >
        {uploading ? (
          <>
            <svg className="w-4 h-4 animate-spin" style={{ color: '#6B94C0' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Parsing...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload File
          </>
        )}
      </button>

      <button
        onClick={openNew}
        disabled={isBusy}
        className="px-4 py-2 font-semibold rounded-lg text-sm transition-all text-white disabled:opacity-50"
        style={{ background: '#4E7FB5' }}
        onMouseEnter={e => { if (!isBusy) (e.currentTarget as HTMLButtonElement).style.background = '#3A6A9A' }}
        onMouseLeave={e => (e.currentTarget.style.background = '#4E7FB5')}
      >
        + Add SOP
      </button>
    </div>
  )

  // ── Department folder view ──────────────────────────────────────────────────
  if (view === 'departments') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold mb-0.5" style={{ color: '#1B3A5C' }}>SOP Library</h1>
            <p className="text-sm" style={{ color: '#717680' }}>
              {sops.length} {sops.length === 1 ? 'procedure' : 'procedures'}
            </p>
          </div>
          {ActionButtons}
        </div>

        {uploadError && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm whitespace-pre-wrap" style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#B91C1C' }}>
            {uploadError}
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '1rem',
        }}>
          {allDepts.map(dept => {
            const ds = getDeptStyle(dept)
            const count = sops.filter(s => s.department === dept).length
            return (
              <button
                key={dept}
                onClick={() => openDept(dept)}
                style={{
                  background: '#fff',
                  borderRadius: '1rem',
                  padding: '1.375rem 1rem 1.125rem',
                  border: '1.5px solid #D4D7DC',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.625rem',
                  transition: 'box-shadow 0.15s, border-color 0.15s, transform 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(27,58,92,0.12)'
                  ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#A8B8CC'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = ''
                  ;(e.currentTarget as HTMLButtonElement).style.transform = ''
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#D4D7DC'
                }}
              >
                <div style={{
                  width: '3.5rem', height: '3.5rem', borderRadius: '0.75rem',
                  background: ds.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FolderIcon dept={dept} size={28} />
                </div>
                <p style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#1B3A5C', lineHeight: 1.35 }}>
                  {dept}
                </p>
                <span style={{ fontSize: '0.6875rem', color: count === 0 ? '#B0B4B9' : '#8A8F96' }}>
                  {count === 0 ? 'No SOPs yet' : `${count} SOP${count === 1 ? '' : 's'}`}
                </span>
              </button>
            )
          })}
        </div>

        {/* Modal form */}
        {showForm && <SOPFormModal
          editing={editing} form={form} setForm={setForm}
          saving={saving} uploadError={uploadError}
          onSave={handleSave} onClose={closeForm}
        />}
      </div>
    )
  }

  // ── Department SOP list (drill-in) ─────────────────────────────────────────
  const ds = getDeptStyle(selectedDept!)

  return (
    <div>
      {/* Back + breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.5rem' }}>
        <button
          onClick={goBack}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            color: '#4E7FB5', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.875rem', fontWeight: 500, padding: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
          onMouseLeave={e => (e.currentTarget.style.color = '#4E7FB5')}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          SOP Library
        </button>
        <span style={{ color: '#B0B4B9', fontSize: '0.875rem' }}>/</span>
        <span style={{ fontSize: '0.875rem', color: '#1B3A5C', fontWeight: 600 }}>{selectedDept}</span>
      </div>

      {/* Dept header + actions */}
      <div className="flex items-center justify-between mb-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem',
            background: ds.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <FolderIcon dept={selectedDept!} size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold mb-0.5" style={{ color: '#1B3A5C' }}>{selectedDept}</h1>
            <p className="text-sm" style={{ color: '#717680' }}>
              {deptSops.length} {deptSops.length === 1 ? 'procedure' : 'procedures'}
            </p>
          </div>
        </div>
        {ActionButtons}
      </div>

      {/* Move all bar */}
      {deptSops.length > 0 && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-lg" style={{ background: '#F2F3F5', border: '1px solid #D4D7DC' }}>
          <span className="text-xs font-medium" style={{ color: '#717680' }}>Move all {deptSops.length} SOPs to:</span>
          <select
            value={moveAllTarget}
            onChange={e => setMoveAllTarget(e.target.value)}
            disabled={movingAll}
            className="px-2 py-1 rounded text-xs focus:outline-none"
            style={{ border: '1px solid #C8CDD3', color: '#1B3A5C', background: '#fff' }}
          >
            <option value="">Select department...</option>
            {DEPARTMENTS.filter(d => d !== selectedDept).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button
            onClick={() => {
              if (moveAllTarget && confirm(`Move all ${deptSops.length} SOPs to ${moveAllTarget}?`)) {
                handleMoveAll(moveAllTarget)
              }
            }}
            disabled={!moveAllTarget || movingAll}
            className="px-3 py-1 rounded text-xs font-semibold transition-all disabled:opacity-40 text-white"
            style={{ background: '#4E7FB5' }}
            onMouseEnter={e => { if (moveAllTarget && !movingAll) (e.currentTarget as HTMLButtonElement).style.background = '#3A6A9A' }}
            onMouseLeave={e => (e.currentTarget.style.background = '#4E7FB5')}
          >
            {movingAll ? 'Moving...' : 'Move all'}
          </button>
        </div>
      )}

      {uploadError && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm whitespace-pre-wrap" style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#B91C1C' }}>
          {uploadError}
        </div>
      )}

      {/* SOP list */}
      {deptSops.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl" style={{ border: '1px solid #D4D7DC' }}>
          <div style={{
            width: '3.5rem', height: '3.5rem', borderRadius: '0.875rem', background: ds.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem',
          }}>
            <FolderIcon dept={selectedDept!} size={26} />
          </div>
          <p className="text-sm mb-3" style={{ color: '#717680' }}>No SOPs in this department yet.</p>
          <button onClick={openNew} className="font-medium text-sm hover:underline" style={{ color: '#4E7FB5' }}>
            Add the first SOP
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {deptSops.map(sop => (
            <div key={sop.id} className="bg-white rounded-lg px-4 py-3 flex items-start justify-between gap-4" style={{ border: '1px solid #D4D7DC' }}>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs" style={{ color: '#8A8F96' }}>v{sop.version}</span>
                  <span className="font-semibold text-sm truncate" style={{ color: '#1B3A5C' }}>{sop.title}</span>
                </div>
                <p className="text-xs line-clamp-2" style={{ color: '#717680' }}>{sop.content.replace(/#+\s/g, '')}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {movingIds.has(sop.id) ? (
                  <svg className="w-3.5 h-3.5 animate-spin" style={{ color: '#6B94C0' }} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <select
                    value=""
                    onChange={e => { if (e.target.value) handleMoveSop(sop.id, e.target.value) }}
                    disabled={movingIds.has(sop.id) || movingAll}
                    className="text-xs rounded px-1.5 py-0.5 focus:outline-none"
                    style={{ border: '1px solid #C8CDD3', color: '#717680', background: '#fff', maxWidth: '110px' }}
                  >
                    <option value="">Move to...</option>
                    {DEPARTMENTS.filter(d => d !== sop.department).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
                <button onClick={() => openEdit(sop)}
                  className="text-xs font-medium transition-colors"
                  style={{ color: '#4E7FB5' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#4E7FB5')}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(sop.id)}
                  disabled={deletingId === sop.id}
                  className="text-xs font-medium transition-colors disabled:opacity-40 text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal form */}
      {showForm && <SOPFormModal
        editing={editing} form={form} setForm={setForm}
        saving={saving} uploadError={uploadError}
        onSave={handleSave} onClose={closeForm}
      />}
    </div>
  )
}

// ── Extracted modal to avoid duplication ──────────────────────────────────────
function SOPFormModal({
  editing, form, setForm, saving, uploadError, onSave, onClose,
}: {
  editing: SOP | null
  form: { title: string; department: string; version: string; content: string }
  setForm: React.Dispatch<React.SetStateAction<{ title: string; department: string; version: string; content: string }>>
  saving: boolean
  uploadError: string
  onSave: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]" style={{ border: '1px solid #D4D7DC' }}>
        <div className="px-6 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid #F0F2F5' }}>
          <h2 className="font-semibold" style={{ color: '#1B3A5C' }}>
            {editing ? 'Edit SOP' : 'New SOP'}
          </h2>
          <button onClick={onClose} className="transition-colors" style={{ color: '#8A8F96' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
            onMouseLeave={e => (e.currentTarget.style.color = '#8A8F96')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!editing && form.content && (
          <div className="px-6 pt-3 shrink-0">
            <div className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: '#E0E4E9', border: '1px solid #C8CDD3', color: '#1B3A5C' }}>
              File content loaded — review below and click <strong>Add SOP</strong> to save.
            </div>
          </div>
        )}

        <div className="px-6 py-4 flex flex-col gap-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#4E7FB5' }}>Department</label>
              <select
                value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                style={{ border: '1px solid #C8CDD3', color: '#1B3A5C', '--tw-ring-color': '#4E7FB5' } as React.CSSProperties}
              >
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#4E7FB5' }}>Version</label>
              <input
                type="text"
                value={form.version}
                onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                placeholder="e.g. 1.0"
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                style={{ border: '1px solid #C8CDD3', color: '#1B3A5C', '--tw-ring-color': '#4E7FB5' } as React.CSSProperties}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#4E7FB5' }}>Title</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Resin Mixing Procedure"
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
              style={{ border: '1px solid #C8CDD3', color: '#1B3A5C', '--tw-ring-color': '#4E7FB5' } as React.CSSProperties}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#4E7FB5' }}>Content</label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Enter the procedure steps, safety notes, and references..."
              rows={10}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 resize-y transition-all"
              style={{ border: '1px solid #C8CDD3', color: '#1B3A5C', '--tw-ring-color': '#4E7FB5' } as React.CSSProperties}
            />
          </div>

          {uploadError && (
            <p className="text-sm" style={{ color: '#B91C1C' }}>{uploadError}</p>
          )}
        </div>

        <div className="px-6 py-4 flex justify-end gap-2 shrink-0" style={{ borderTop: '1px solid #F0F2F5' }}>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium transition-colors" style={{ color: '#717680' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
            onMouseLeave={e => (e.currentTarget.style.color = '#717680')}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !form.title.trim()}
            className="px-4 py-2 font-semibold rounded-lg text-sm transition-all text-white disabled:opacity-40"
            style={{ background: '#4E7FB5' }}
            onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = '#3A6A9A' }}
            onMouseLeave={e => (e.currentTarget.style.background = '#4E7FB5')}
          >
            {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add SOP'}
          </button>
        </div>
      </div>
    </div>
  )
}
