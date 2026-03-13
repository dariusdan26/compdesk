'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

interface SDSDocument {
  id: number
  title: string
  manufacturer: string | null
  category: string
  filename: string
  filePath: string
  fileSize: number
  createdAt: string
}

const SDS_CATEGORIES = [
  'Chemicals', 'Solvents', 'Resins', 'Adhesives',
  'Coatings', 'Composites', 'Safety Equipment', 'General',
]

const CATEGORY_COLORS: Record<string, { bg: string; icon: string; border: string }> = {
  'Chemicals':         { bg: '#FEE2E2', icon: '#DC2626', border: '#FECACA' },
  'Solvents':          { bg: '#FFEDD5', icon: '#EA580C', border: '#FED7AA' },
  'Resins':            { bg: '#FFF7ED', icon: '#D97706', border: '#FDE68A' },
  'Adhesives':         { bg: '#FEF9C3', icon: '#CA8A04', border: '#FEF08A' },
  'Coatings':          { bg: '#EDE9FE', icon: '#7C3AED', border: '#DDD6FE' },
  'Composites':        { bg: '#DCEAF7', icon: '#3D6B9B', border: '#BFDBFE' },
  'Safety Equipment':  { bg: '#D1FAE5', icon: '#059669', border: '#A7F3D0' },
  'General':           { bg: '#F1F5F9', icon: '#475569', border: '#E2E8F0' },
}

function categoryStyle(cat: string) {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS['General']
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function SDSAdmin({ initialDocs }: { initialDocs: SDSDocument[] }) {
  const [docs, setDocs] = useState<SDSDocument[]>(initialDocs)
  const [showUpload, setShowUpload] = useState(false)

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null)
  const [uploadCategory, setUploadCategory] = useState('General')
  const [uploadManufacturer, setUploadManufacturer] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ succeeded: number; failed: number; results: { title: string; ok: boolean; error?: string }[] } | null>(null)
  const [uploadError, setUploadError] = useState('')

  // Edit state
  const [editing, setEditing] = useState<SDSDocument | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editManufacturer, setEditManufacturer] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [saving, setSaving] = useState(false)

  // Filter/search
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const allCategories = ['All', ...Array.from(new Set(docs.map(d => d.category))).sort()]

  const filtered = docs.filter(doc => {
    const matchCat = filterCategory === 'All' || doc.category === filterCategory
    const q = search.toLowerCase()
    const matchSearch = !q ||
      doc.title.toLowerCase().includes(q) ||
      (doc.manufacturer ?? '').toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  async function handleUpload() {
    if (!uploadFiles || uploadFiles.length === 0) {
      setUploadError('Please select at least one PDF file.')
      return
    }
    setUploadError('')
    setUploadResult(null)
    setUploading(true)

    try {
      const formData = new FormData()
      for (let i = 0; i < uploadFiles.length; i++) {
        formData.append('files', uploadFiles[i])
      }
      formData.append('category', uploadCategory)
      formData.append('manufacturer', uploadManufacturer)

      const res = await fetch('/api/admin/sds/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setUploadError(data.error ?? 'Upload failed.')
        return
      }

      setUploadResult(data)

      // Refresh doc list from server
      const listRes = await fetch('/api/sds')
      if (listRes.ok) {
        const fresh = await listRes.json()
        setDocs(fresh)
      }

      // Reset file inputs
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (folderInputRef.current) folderInputRef.current.value = ''
      setUploadFiles(null)
      setUploadManufacturer('')
    } finally {
      setUploading(false)
    }
  }

  function openEdit(doc: SDSDocument) {
    setEditing(doc)
    setEditTitle(doc.title)
    setEditManufacturer(doc.manufacturer ?? '')
    setEditCategory(doc.category)
  }

  async function handleSaveEdit() {
    if (!editing) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/sds/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, manufacturer: editManufacturer, category: editCategory }),
      })
      const updated = await res.json()
      setDocs(prev => prev.map(d => d.id === editing.id ? updated : d))
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Permanently delete this SDS document? This cannot be undone.')) return
    setDeletingId(id)
    await fetch(`/api/admin/sds/${id}`, { method: 'DELETE' })
    setDocs(prev => prev.filter(d => d.id !== id))
    setDeletingId(null)
    if (editing?.id === id) setEditing(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EEF3F9' }}>
      {/* Header */}
      <header style={{ background: '#1B3A5C', borderBottom: '1px solid #2E5478' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '1.125rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '2.25rem', height: '2.25rem', color: '#5B84B1', flexShrink: 0 }}>
              <path d="M12 2L21.39 7.5V16.5L12 22L2.61 16.5V7.5L12 2Z" />
            </svg>
            <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.025em' }}>CompDesk</span>
          </div>
          <Link href="/dashboard" style={{ color: '#6B8BA8', fontSize: '0.875rem', textDecoration: 'none' }}>
            ← Dashboard
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1B3A5C', marginBottom: '2px' }}>SDS Vault — Admin</h1>
            <p style={{ color: '#6B7A8D', fontSize: '0.875rem' }}>
              {docs.length} document{docs.length === 1 ? '' : 's'} stored
            </p>
          </div>
          <button
            onClick={() => { setShowUpload(v => !v); setUploadResult(null); setUploadError('') }}
            style={{
              padding: '0.5rem 1.125rem', background: '#DC2626', color: '#fff',
              border: 'none', borderRadius: '0.625rem', fontWeight: 600, fontSize: '0.875rem',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#B91C1C')}
            onMouseLeave={e => (e.currentTarget.style.background = '#DC2626')}
          >
            {showUpload ? '✕ Close Upload' : '+ Upload SDS Files'}
          </button>
        </div>

        {/* Upload panel */}
        {showUpload && (
          <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #D0DCE8', padding: '1.5rem', marginBottom: '1.75rem', boxShadow: '0 2px 8px rgba(27,58,92,0.06)' }}>
            <h2 style={{ fontWeight: 700, color: '#1B3A5C', fontSize: '1rem', marginBottom: '1.25rem' }}>Upload Safety Data Sheets</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem' }}>Category</label>
                <select
                  value={uploadCategory}
                  onChange={e => setUploadCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff' }}
                >
                  {SDS_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem' }}>Manufacturer <span style={{ fontWeight: 400, color: '#8B939E' }}>(optional)</span></label>
                <input
                  type="text"
                  value={uploadManufacturer}
                  onChange={e => setUploadManufacturer(e.target.value)}
                  placeholder="e.g. Huntsman, Hexion…"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Drop zone / file picker */}
            <div
              style={{
                border: '2px dashed #C5D8EF', borderRadius: '0.875rem', padding: '2rem 1rem',
                textAlign: 'center', marginBottom: '1rem',
                background: uploadFiles && uploadFiles.length > 0 ? '#F0FDF4' : '#F8FAFC',
              }}
            >
              <svg style={{ width: '2rem', height: '2rem', color: '#DC2626', margin: '0 auto 0.75rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>

              {uploadFiles && uploadFiles.length > 0 ? (
                <p style={{ fontWeight: 600, color: '#059669', fontSize: '0.9375rem', marginBottom: '1rem' }}>
                  {uploadFiles.length} PDF{uploadFiles.length === 1 ? '' : 's'} selected
                </p>
              ) : (
                <p style={{ fontWeight: 600, color: '#1B3A5C', fontSize: '0.9375rem', marginBottom: '1rem' }}>
                  Select individual files or an entire folder
                </p>
              )}

              {/* Two picker buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '0.5rem 1.125rem', fontSize: '0.875rem', fontWeight: 600,
                    background: '#fff', color: '#3D6B9B', border: '1.5px solid #3D6B9B',
                    borderRadius: '0.5rem', cursor: 'pointer',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#DCEAF7' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}
                >
                  📄 Select Files
                </button>
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  style={{
                    padding: '0.5rem 1.125rem', fontSize: '0.875rem', fontWeight: 600,
                    background: '#fff', color: '#DC2626', border: '1.5px solid #DC2626',
                    borderRadius: '0.5rem', cursor: 'pointer',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FEE2E2' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}
                >
                  📁 Select Folder
                </button>
              </div>

              <p style={{ color: '#9CA3AF', fontSize: '0.75rem', marginTop: '0.75rem' }}>PDF files only</p>

              {/* Hidden inputs */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,application/pdf"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.length) setUploadFiles(e.target.files) }}
              />
              <input
                ref={folderInputRef}
                type="file"
                {...({ webkitdirectory: '', mozdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                multiple
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.length) setUploadFiles(e.target.files) }}
              />
            </div>

            {/* Selected file list */}
            {uploadFiles && uploadFiles.length > 0 && (
              <div style={{ background: '#F8FAFC', borderRadius: '0.625rem', border: '1px solid #E2E8F0', padding: '0.75rem 1rem', marginBottom: '1rem', maxHeight: '10rem', overflowY: 'auto' }}>
                {Array.from(uploadFiles).map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#1B3A5C', padding: '0.125rem 0' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '1rem' }}>{f.name}</span>
                    <span style={{ color: '#8B939E', flexShrink: 0 }}>{formatFileSize(f.size)}</span>
                  </div>
                ))}
              </div>
            )}

            {uploadError && <p style={{ fontSize: '0.875rem', color: '#B91C1C', marginBottom: '0.875rem' }}>{uploadError}</p>}

            {/* Upload result */}
            {uploadResult && (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: '0.625rem', marginBottom: '1rem',
                background: uploadResult.failed === 0 ? '#F0FDF4' : '#FFF7ED',
                border: `1px solid ${uploadResult.failed === 0 ? '#A7F3D0' : '#FED7AA'}`,
              }}>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: uploadResult.failed === 0 ? '#059669' : '#D97706', marginBottom: uploadResult.failed > 0 ? '0.5rem' : 0 }}>
                  {uploadResult.succeeded} uploaded successfully{uploadResult.failed > 0 ? `, ${uploadResult.failed} failed` : ''}
                </p>
                {uploadResult.results.filter(r => !r.ok).map((r, i) => (
                  <p key={i} style={{ fontSize: '0.8125rem', color: '#DC2626' }}>✕ {r.title}: {r.error}</p>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadFiles || uploadFiles.length === 0}
                style={{
                  padding: '0.5625rem 1.5rem', background: '#DC2626', color: '#fff',
                  border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.875rem',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  opacity: (uploading || !uploadFiles || uploadFiles.length === 0) ? 0.6 : 1,
                }}
                onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLButtonElement).style.background = '#B91C1C' }}
                onMouseLeave={e => (e.currentTarget.style.background = '#DC2626')}
              >
                {uploading ? 'Uploading…' : `Upload ${uploadFiles ? uploadFiles.length : 0} File${uploadFiles && uploadFiles.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        )}

        {/* Filter bar */}
        {docs.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
              <svg style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#8B939E', pointerEvents: 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.25rem', paddingRight: '0.75rem', paddingTop: '0.4375rem', paddingBottom: '0.4375rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff', boxSizing: 'border-box' }}
              />
            </div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              style={{ padding: '0.4375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff' }}
            >
              {allCategories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        )}

        {/* Document list */}
        {docs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#fff', borderRadius: '1rem', border: '1px solid #D0DCE8' }}>
            <p style={{ color: '#6B7A8D', fontSize: '0.9375rem' }}>No SDS documents uploaded yet. Use the upload panel above.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#fff', borderRadius: '1rem', border: '1px solid #D0DCE8' }}>
            <p style={{ color: '#6B7A8D', fontSize: '0.9375rem' }}>No documents match your search.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filtered.map(doc => {
              const cs = categoryStyle(doc.category)
              return (
                <div
                  key={doc.id}
                  style={{ background: '#fff', borderRadius: '0.875rem', padding: '0.875rem 1.125rem', border: '1px solid #D0DCE8', display: 'flex', alignItems: 'center', gap: '1rem' }}
                >
                  {/* PDF icon */}
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', background: cs.bg, border: `1px solid ${cs.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cs.icon} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="9" y1="13" x2="15" y2="13" />
                      <line x1="9" y1="17" x2="13" y2="17" />
                    </svg>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1B3A5C', marginBottom: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {doc.title}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '1px 6px', borderRadius: '9999px', background: cs.bg, color: cs.icon, border: `1px solid ${cs.border}` }}>
                        {doc.category}
                      </span>
                      {doc.manufacturer && (
                        <span style={{ fontSize: '0.75rem', color: '#6B7A8D' }}>{doc.manufacturer}</span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: '#B0BAC5' }}>{formatFileSize(doc.fileSize)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    <a
                      href={doc.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#3D6B9B', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#3D6B9B')}
                    >
                      View
                    </a>
                    <button
                      onClick={() => openEdit(doc)}
                      style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#6B7A8D', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#6B7A8D')}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: deletingId === doc.id ? 0.5 : 1 }}
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
      </main>

      {/* Edit modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '32rem', border: '1px solid #D0DCE8' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEF3F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontWeight: 700, color: '#1B3A5C', fontSize: '1.0625rem' }}>Edit Document</h2>
              <button onClick={() => setEditing(null)} style={{ color: '#8B939E', background: 'none', border: 'none', cursor: 'pointer' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem' }}>Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem' }}>Manufacturer <span style={{ fontWeight: 400, color: '#8B939E' }}>(optional)</span></label>
                <input
                  type="text"
                  value={editManufacturer}
                  onChange={e => setEditManufacturer(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem' }}>Category</label>
                <select
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff' }}
                >
                  {SDS_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #EEF3F9', display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
              <button onClick={() => setEditing(null)}
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#6B7A8D', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, background: '#3D6B9B', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
