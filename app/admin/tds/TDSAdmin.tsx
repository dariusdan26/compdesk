'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

interface TDSDocument {
  id: number
  title: string
  manufacturer: string | null
  category: string
  filename: string
  filePath: string
  fileSize: number
  createdAt: string
}

const TDS_CATEGORIES = [
  'Laminating Resins',
  'Gelcoats',
  'Tooling Gelcoats',
  'Tooling Resins & Cores',
  'Putties & Fillers',
  'Primers & Topcoats',
  'Adhesives',
  'Core Materials',
  'Process Materials',
  'Additives & Promoters',
  'Pigments & Colorants',
  'Solvents & Cleaners',
  'General',
]

const CATEGORY_COLORS: Record<string, { bg: string; icon: string; border: string }> = {
  'Laminating Resins':       { bg: '#DBEAFE', icon: '#1D4ED8', border: '#BFDBFE' },
  'Gelcoats':                { bg: '#FEF3C7', icon: '#B45309', border: '#FDE68A' },
  'Tooling Gelcoats':        { bg: '#FCE7F3', icon: '#BE185D', border: '#FBCFE8' },
  'Tooling Resins & Cores':  { bg: '#EDE9FE', icon: '#6D28D9', border: '#DDD6FE' },
  'Putties & Fillers':       { bg: '#F3E8D2', icon: '#92400E', border: '#E7D2A6' },
  'Primers & Topcoats':      { bg: '#CCFBF1', icon: '#0F766E', border: '#99F6E4' },
  'Adhesives':               { bg: '#F5D0FE', icon: '#A21CAF', border: '#F0ABFC' },
  'Core Materials':          { bg: '#D1FAE5', icon: '#15803D', border: '#A7F3D0' },
  'Process Materials':       { bg: '#E2E8F0', icon: '#475569', border: '#CBD5E1' },
  'Additives & Promoters':   { bg: '#E0E7FF', icon: '#4338CA', border: '#C7D2FE' },
  'Pigments & Colorants':    { bg: '#FFE4E6', icon: '#BE123C', border: '#FECDD3' },
  'Solvents & Cleaners':     { bg: '#FFEDD5', icon: '#EA580C', border: '#FED7AA' },
  'General':                 { bg: '#F2F3F5', icon: '#475569', border: '#E2E8F0' },
}

function categoryStyle(cat: string) {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS['General']
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function TDSAdmin({ initialDocs }: { initialDocs: TDSDocument[] }) {
  const [docs, setDocs] = useState<TDSDocument[]>(initialDocs)
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
  const [editing, setEditing] = useState<TDSDocument | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editManufacturer, setEditManufacturer] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [saving, setSaving] = useState(false)

  // Filter/search
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Drag-drop state
  const [dragOverCat, setDragOverCat] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)

  // Legacy categories present in the data but no longer in the curated list
  const legacyCategories = Array.from(new Set(docs.map(d => d.category))).filter(c => !TDS_CATEGORIES.includes(c))
  const allCategories = ['All', ...TDS_CATEGORIES, ...legacyCategories]

  const filtered = docs.filter(doc => {
    const matchCat = filterCategory === 'All' || doc.category === filterCategory
    const q = search.toLowerCase()
    const matchSearch = !q ||
      doc.title.toLowerCase().includes(q) ||
      (doc.manufacturer ?? '').toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  async function moveDocToCategory(docId: number, newCategory: string) {
    const doc = docs.find(d => d.id === docId)
    if (!doc || doc.category === newCategory) return
    const previous = doc
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, category: newCategory } : d))
    try {
      const res = await fetch(`/api/admin/tds/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: doc.title, manufacturer: doc.manufacturer ?? '', category: newCategory }),
      })
      if (!res.ok) throw new Error('Move failed')
      const updated = await res.json()
      setDocs(prev => prev.map(d => d.id === docId ? updated : d))
    } catch {
      setDocs(prev => prev.map(d => d.id === docId ? previous : d))
      alert('Failed to move document. Please try again.')
    }
  }

  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)

  async function handleUpload() {
    if (!uploadFiles || uploadFiles.length === 0) {
      setUploadError('Please select at least one PDF file.')
      return
    }
    setUploadError('')
    setUploadResult(null)
    setUploading(true)

    const files = Array.from(uploadFiles)
    const results: { title: string; ok: boolean; error?: string }[] = []
    let succeeded = 0
    let failed = 0

    try {
      for (let i = 0; i < files.length; i++) {
        setUploadProgress({ current: i + 1, total: files.length })

        const formData = new FormData()
        formData.append('files', files[i])
        formData.append('category', uploadCategory)
        formData.append('manufacturer', uploadManufacturer)

        try {
          const res = await fetch('/api/admin/tds/upload', { method: 'POST', body: formData })
          const data = await res.json()

          if (!res.ok) {
            results.push({ title: files[i].name, ok: false, error: data.error ?? 'Upload failed' })
            failed++
          } else {
            results.push(...data.results)
            succeeded += data.succeeded
            failed += data.failed
          }
        } catch {
          results.push({ title: files[i].name, ok: false, error: 'Network error' })
          failed++
        }
      }

      setUploadResult({ succeeded, failed, results })

      const listRes = await fetch('/api/tds')
      if (listRes.ok) setDocs(await listRes.json())

      if (fileInputRef.current) fileInputRef.current.value = ''
      if (folderInputRef.current) folderInputRef.current.value = ''
      setUploadFiles(null)
      setUploadManufacturer('')
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  function openEdit(doc: TDSDocument) {
    setEditing(doc)
    setEditTitle(doc.title)
    setEditManufacturer(doc.manufacturer ?? '')
    setEditCategory(doc.category)
  }

  async function handleSaveEdit() {
    if (!editing) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/tds/${editing.id}`, {
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
    if (!confirm('Permanently delete this TDS document? This cannot be undone.')) return
    setDeletingId(id)
    await fetch(`/api/admin/tds/${id}`, { method: 'DELETE' })
    setDocs(prev => prev.filter(d => d.id !== id))
    setDeletingId(null)
    if (editing?.id === id) setEditing(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F2F5' }}>
      {/* Header */}
      <header style={{ background: '#1B3A5C', borderBottom: '1px solid #2A4A6E' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '1.125rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '2.25rem', height: '2.25rem', color: '#6B94C0', flexShrink: 0 }}>
              <path d="M12 2L21.39 7.5V16.5L12 22L2.61 16.5V7.5L12 2Z" />
            </svg>
            <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.025em' }}>CompDesk</span>
          </div>
          <Link href="/dashboard" style={{ color: '#7A8FA0', fontSize: '0.875rem', textDecoration: 'none' }}>
            ← Dashboard
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1B3A5C', marginBottom: '2px' }}>TDS Vault — Admin</h1>
            <p style={{ color: '#717680', fontSize: '0.875rem' }}>
              {docs.length} document{docs.length === 1 ? '' : 's'} stored
            </p>
          </div>
          <button
            onClick={() => { setShowUpload(v => !v); setUploadResult(null); setUploadError('') }}
            style={{
              padding: '0.5rem 1.125rem', background: '#4E7FB5', color: '#fff',
              border: 'none', borderRadius: '0.625rem', fontWeight: 600, fontSize: '0.875rem',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#3A6A9A')}
            onMouseLeave={e => (e.currentTarget.style.background = '#4E7FB5')}
          >
            {showUpload ? '✕ Close Upload' : '+ Upload TDS Files'}
          </button>
        </div>

        {/* Upload panel */}
        {showUpload && (
          <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #D4D7DC', padding: '1.5rem', marginBottom: '1.75rem', boxShadow: '0 2px 8px rgba(27,58,92,0.06)' }}>
            <h2 style={{ fontWeight: 700, color: '#1B3A5C', fontSize: '1rem', marginBottom: '1.25rem' }}>Upload Technical Data Sheets</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#4E7FB5', marginBottom: '0.375rem' }}>Category</label>
                <select
                  value={uploadCategory}
                  onChange={e => setUploadCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C8CDD3', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff' }}
                >
                  {TDS_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#4E7FB5', marginBottom: '0.375rem' }}>Manufacturer <span style={{ fontWeight: 400, color: '#8A8F96' }}>(optional)</span></label>
                <input
                  type="text"
                  value={uploadManufacturer}
                  onChange={e => setUploadManufacturer(e.target.value)}
                  placeholder="e.g. Huntsman, Hexion…"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C8CDD3', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Drop zone */}
            <div style={{ border: '2px dashed #C8CDD3', borderRadius: '0.875rem', padding: '2rem 1rem', textAlign: 'center', marginBottom: '1rem', background: uploadFiles && uploadFiles.length > 0 ? '#EEF7FF' : '#F7F8F9' }}>
              <svg style={{ width: '2rem', height: '2rem', color: '#4E7FB5', margin: '0 auto 0.75rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>

              {uploadFiles && uploadFiles.length > 0 ? (
                <p style={{ fontWeight: 600, color: '#4E7FB5', fontSize: '0.9375rem', marginBottom: '1rem' }}>
                  {uploadFiles.length} PDF{uploadFiles.length === 1 ? '' : 's'} selected
                </p>
              ) : (
                <p style={{ fontWeight: 600, color: '#1B3A5C', fontSize: '0.9375rem', marginBottom: '1rem' }}>
                  Select individual files or an entire folder
                </p>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '0.5rem 1.125rem', fontSize: '0.875rem', fontWeight: 600, background: '#fff', color: '#4E7FB5', border: '1.5px solid #4E7FB5', borderRadius: '0.5rem', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E0E4E9' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}
                >
                  📄 Select Files
                </button>
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  style={{ padding: '0.5rem 1.125rem', fontSize: '0.875rem', fontWeight: 600, background: '#fff', color: '#4E7FB5', border: '1.5px solid #4E7FB5', borderRadius: '0.5rem', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E0E4E9' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}
                >
                  📁 Select Folder
                </button>
              </div>

              <p style={{ color: '#9CA3AF', fontSize: '0.75rem', marginTop: '0.75rem' }}>PDF files only</p>

              <input ref={fileInputRef} type="file" multiple accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={e => { if (e.target.files?.length) setUploadFiles(e.target.files) }} />
              <input ref={folderInputRef} type="file" {...({ webkitdirectory: '', mozdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)} multiple style={{ display: 'none' }} onChange={e => { if (e.target.files?.length) setUploadFiles(e.target.files) }} />
            </div>

            {/* Selected file list */}
            {uploadFiles && uploadFiles.length > 0 && (
              <div style={{ background: '#F7F8F9', borderRadius: '0.625rem', border: '1px solid #E2E8F0', padding: '0.75rem 1rem', marginBottom: '1rem', maxHeight: '10rem', overflowY: 'auto' }}>
                {Array.from(uploadFiles).map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#1B3A5C', padding: '0.125rem 0' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '1rem' }}>{f.name}</span>
                    <span style={{ color: '#8A8F96', flexShrink: 0 }}>{formatFileSize(f.size)}</span>
                  </div>
                ))}
              </div>
            )}

            {uploadError && <p style={{ fontSize: '0.875rem', color: '#B91C1C', marginBottom: '0.875rem' }}>{uploadError}</p>}

            {uploadResult && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '0.625rem', marginBottom: '1rem', background: uploadResult.failed === 0 ? '#EEF7FF' : '#FFF7ED', border: `1px solid ${uploadResult.failed === 0 ? '#C8D0D8' : '#FED7AA'}` }}>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: uploadResult.failed === 0 ? '#4E7FB5' : '#D97706', marginBottom: uploadResult.failed > 0 ? '0.5rem' : 0 }}>
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
                style={{ padding: '0.5625rem 1.5rem', background: '#4E7FB5', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.875rem', cursor: uploading ? 'not-allowed' : 'pointer', opacity: (uploading || !uploadFiles || uploadFiles.length === 0) ? 0.6 : 1 }}
                onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLButtonElement).style.background = '#3A6A9A' }}
                onMouseLeave={e => (e.currentTarget.style.background = '#4E7FB5')}
              >
                {uploading && uploadProgress
                  ? `Uploading ${uploadProgress.current} of ${uploadProgress.total}…`
                  : uploading
                    ? 'Uploading…'
                    : `Upload ${uploadFiles ? uploadFiles.length : 0} File${uploadFiles && uploadFiles.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        )}

        {/* Filter bar */}
        {docs.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
              <svg style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#8A8F96', pointerEvents: 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', paddingLeft: '2.25rem', paddingRight: '0.75rem', paddingTop: '0.4375rem', paddingBottom: '0.4375rem', borderRadius: '0.5rem', border: '1px solid #C8CDD3', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff', boxSizing: 'border-box' }} />
            </div>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '0.4375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C8CDD3', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff' }}>
              {allCategories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        )}

        {/* Document list — grouped sections with drag-and-drop */}
        {docs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#fff', borderRadius: '1rem', border: '1px solid #D4D7DC' }}>
            <p style={{ color: '#717680', fontSize: '0.9375rem' }}>No TDS documents uploaded yet. Use the upload panel above.</p>
          </div>
        ) : (() => {
          const shownCategories = filterCategory === 'All'
            ? [...TDS_CATEGORIES, ...legacyCategories]
            : [filterCategory]
          const sections = shownCategories.map(cat => ({
            cat,
            docs: filtered.filter(d => d.category === cat),
          }))
          const totalVisible = sections.reduce((s, x) => s + x.docs.length, 0)
          if (totalVisible === 0 && search) {
            return (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#fff', borderRadius: '1rem', border: '1px solid #D4D7DC' }}>
                <p style={{ color: '#717680', fontSize: '0.9375rem' }}>No documents match your search.</p>
              </div>
            )
          }
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <p style={{ color: '#717680', fontSize: '0.8125rem', margin: '0 0.25rem' }}>
                <span aria-hidden style={{ marginRight: '0.375rem' }}>⋮⋮</span>
                Drag any document and drop it onto a category to move it.
              </p>
              {sections.map(({ cat, docs: sectionDocs }) => {
                const cs = categoryStyle(cat)
                const isOver = dragOverCat === cat
                return (
                  <section
                    key={cat}
                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverCat !== cat) setDragOverCat(cat) }}
                    onDragLeave={e => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return
                      setDragOverCat(prev => prev === cat ? null : prev)
                    }}
                    onDrop={e => {
                      e.preventDefault()
                      const id = Number(e.dataTransfer.getData('text/plain'))
                      if (id) moveDocToCategory(id, cat)
                      setDragOverCat(null)
                      setDraggingId(null)
                    }}
                    style={{
                      background: isOver ? cs.bg : '#fff',
                      borderRadius: '1rem',
                      border: `${isOver ? 2 : 1}px ${isOver ? 'dashed' : 'solid'} ${isOver ? cs.icon : '#D4D7DC'}`,
                      padding: '0.75rem 0.875rem',
                      transition: 'background-color 120ms, border-color 120ms',
                    }}
                  >
                    <header style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.25rem 0.25rem 0.625rem', borderBottom: '1px solid #F0F2F5' }}>
                      <span style={{ width: '0.625rem', height: '0.625rem', borderRadius: '9999px', background: cs.icon, flexShrink: 0 }} />
                      <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1B3A5C' }}>{cat}</h2>
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#717680', background: cs.bg, padding: '1px 7px', borderRadius: '9999px', border: `1px solid ${cs.border}` }}>
                        {sectionDocs.length}
                      </span>
                      {legacyCategories.includes(cat) && (
                        <span style={{ fontSize: '0.6875rem', color: '#B45309', fontStyle: 'italic' }}>legacy</span>
                      )}
                    </header>
                    {sectionDocs.length === 0 ? (
                      <div style={{ padding: '1.125rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                        {isOver ? `Release to move into ${cat}` : `Drop documents here to move them into ${cat}`}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginTop: '0.5rem' }}>
                        {sectionDocs.map(doc => {
                          const isDragging = draggingId === doc.id
                          return (
                            <div
                              key={doc.id}
                              draggable
                              onDragStart={e => {
                                e.dataTransfer.effectAllowed = 'move'
                                e.dataTransfer.setData('text/plain', String(doc.id))
                                setDraggingId(doc.id)
                              }}
                              onDragEnd={() => { setDraggingId(null); setDragOverCat(null) }}
                              style={{
                                background: isDragging ? '#F7F8F9' : '#fff',
                                opacity: isDragging ? 0.5 : 1,
                                borderRadius: '0.625rem',
                                padding: '0.5625rem 0.75rem',
                                border: '1px solid #E5E7EB',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                cursor: 'grab',
                              }}
                            >
                              <span style={{ color: '#B0B4B9', flexShrink: 0, fontSize: '0.875rem', userSelect: 'none', letterSpacing: '-2px' }} aria-hidden>⋮⋮</span>
                              <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: cs.bg, border: `1px solid ${cs.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={cs.icon} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                  <polyline points="14 2 14 8 20 8" />
                                </svg>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1B3A5C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</p>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '1px' }}>
                                  {doc.manufacturer && <span style={{ fontSize: '0.75rem', color: '#717680' }}>{doc.manufacturer}</span>}
                                  <span style={{ fontSize: '0.75rem', color: '#B0B4B9' }}>{formatFileSize(doc.fileSize)}</span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                                <a href={doc.filePath} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#4E7FB5', textDecoration: 'none' }}>View</a>
                                <button onClick={() => openEdit(doc)} style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#717680', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Edit</button>
                                <button onClick={() => handleDelete(doc.id)} disabled={deletingId === doc.id} style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: deletingId === doc.id ? 0.5 : 1 }}>Delete</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </section>
                )
              })}
            </div>
          )
        })()}
      </main>

      {/* Edit modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '32rem', border: '1px solid #D4D7DC' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontWeight: 700, color: '#1B3A5C', fontSize: '1.0625rem' }}>Edit Document</h2>
              <button onClick={() => setEditing(null)} style={{ color: '#8A8F96', background: 'none', border: 'none', cursor: 'pointer' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#4E7FB5', marginBottom: '0.375rem' }}>Title</label>
                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C8CDD3', color: '#1B3A5C', fontSize: '0.875rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#4E7FB5', marginBottom: '0.375rem' }}>Manufacturer <span style={{ fontWeight: 400, color: '#8A8F96' }}>(optional)</span></label>
                <input type="text" value={editManufacturer} onChange={e => setEditManufacturer(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C8CDD3', color: '#1B3A5C', fontSize: '0.875rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#4E7FB5', marginBottom: '0.375rem' }}>Category</label>
                <select value={editCategory} onChange={e => setEditCategory(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C8CDD3', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff' }}>
                  {TDS_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #F0F2F5', display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
              <button onClick={() => setEditing(null)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#717680', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving} style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, background: '#4E7FB5', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
