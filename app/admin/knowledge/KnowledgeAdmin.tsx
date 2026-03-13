'use client'

import { useState, useRef } from 'react'

interface Entry {
  id: number
  category: string
  title: string
  content: string
}

const CATEGORIES = [
  'Resin',
  'Gelcoat',
  'Nidaplast',
  'Matline',
  'Other',
  'Pricing',
]

interface BatchResult {
  name: string
  ok: boolean
  error?: string
}

export default function KnowledgeAdmin({ initialEntries }: { initialEntries: Entry[] }) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Entry | null>(null)
  const [form, setForm] = useState({ category: CATEGORIES[0], title: '', content: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [filterCategory, setFilterCategory] = useState('All')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null)
  const [batchResults, setBatchResults] = useState<BatchResult[] | null>(null)

  function openNew() {
    setEditing(null)
    setForm({ category: CATEGORIES[0], title: '', content: '' })
    setUploadError('')
    setShowForm(true)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/admin/knowledge/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setUploadError(data.error ?? 'Upload failed.')
      } else if (data.multiEntry) {
        // xlsx: save each sheet as a separate entry
        const results: BatchResult[] = []
        for (const entry of data.entries as { title: string; content: string; category: string }[]) {
          const saveRes = await fetch('/api/admin/knowledge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry),
          })
          const saved = await saveRes.json()
          if (!saveRes.ok) {
            results.push({ name: entry.title, ok: false, error: saved.error ?? 'Save failed' })
          } else {
            setEntries(prev => [...prev, saved])
            results.push({ name: entry.title, ok: true })
          }
        }
        setBatchResults(results)
      } else {
        setEditing(null)
        setForm({ category: CATEGORIES[0], title: data.suggestedTitle, content: data.text })
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
    const allFiles = Array.from(e.target.files ?? [])
    const supported = allFiles.filter(f => /\.(pdf|docx|txt|xlsx|xls)$/i.test(f.name))

    if (supported.length === 0) {
      setUploadError('No supported files found in folder. Only PDF, DOCX, TXT, and XLSX files are imported.')
      if (folderInputRef.current) folderInputRef.current.value = ''
      return
    }

    setBatchProgress({ current: 0, total: supported.length })
    setBatchResults(null)
    setUploadError('')

    const results: BatchResult[] = []

    for (let i = 0; i < supported.length; i++) {
      const file = supported[i]
      setBatchProgress({ current: i + 1, total: supported.length })

      try {
        const formData = new FormData()
        formData.append('file', file)
        const uploadRes = await fetch('/api/admin/knowledge/upload', { method: 'POST', body: formData })
        const uploadData = await uploadRes.json()

        if (!uploadRes.ok) {
          results.push({ name: file.name, ok: false, error: uploadData.error ?? 'Parse failed' })
          continue
        }

        const saveRes = await fetch('/api/admin/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: CATEGORIES[0],
            title: uploadData.suggestedTitle,
            content: uploadData.text,
          }),
        })
        const saved = await saveRes.json()

        if (!saveRes.ok) {
          results.push({ name: file.name, ok: false, error: saved.error ?? 'Save failed' })
        } else {
          setEntries(prev => [...prev, saved])
          results.push({ name: file.name, ok: true })
        }
      } catch {
        results.push({ name: file.name, ok: false, error: 'Unexpected error' })
      }
    }

    setBatchProgress(null)
    setBatchResults(results)
    if (folderInputRef.current) folderInputRef.current.value = ''
  }

  function openEdit(entry: Entry) {
    setEditing(entry)
    setForm({ category: entry.category, title: entry.title, content: entry.content })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  async function handleSave() {
    if (!form.title.trim()) { setUploadError('Please enter a title.'); return }
    if (!form.content.trim()) { setUploadError('No content to save — the file may not have been parsed correctly. Try uploading again.'); return }
    setUploadError('')
    setSaving(true)

    const url = editing ? `/api/admin/knowledge/${editing.id}` : '/api/admin/knowledge'
    const method = editing ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    if (editing) {
      setEntries(prev => prev.map(e => e.id === editing.id ? data : e))
    } else {
      setEntries(prev => [...prev, data])
    }

    setSaving(false)
    closeForm()
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this entry? This cannot be undone.')) return
    setDeletingId(id)
    await fetch(`/api/admin/knowledge/${id}`, { method: 'DELETE' })
    setEntries(prev => prev.filter(e => e.id !== id))
    setDeletingId(null)
  }

  const categories = ['All', ...Array.from(new Set(entries.map(e => e.category)))]
  const filtered = filterCategory === 'All' ? entries : entries.filter(e => e.category === filterCategory)

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold mb-0.5" style={{ color: '#1B3A5C' }}>Knowledge Base</h1>
          <p className="text-sm" style={{ color: '#6B7A8D' }}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} — used to answer staff questions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          <input ref={folderInputRef} type="file" onChange={handleFolderUpload} className="hidden"
            // @ts-expect-error webkitdirectory is not in the standard types
            webkitdirectory="" multiple />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !!batchProgress}
            className="px-4 py-2 bg-white font-semibold rounded-lg text-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
            style={{ border: '1px solid #C5D8EF', color: '#3D6B9B' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#3D6B9B')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#C5D8EF')}
          >
            {uploading ? (
              <>
                <svg className="w-4 h-4 animate-spin" style={{ color: '#5B84B1' }} fill="none" viewBox="0 0 24 24">
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
            onClick={() => folderInputRef.current?.click()}
            disabled={uploading || !!batchProgress}
            className="px-4 py-2 bg-white font-semibold rounded-lg text-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
            style={{ border: '1px solid #C5D8EF', color: '#3D6B9B' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#3D6B9B')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#C5D8EF')}
          >
            {batchProgress ? (
              <>
                <svg className="w-4 h-4 animate-spin" style={{ color: '#5B84B1' }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                {batchProgress.current}/{batchProgress.total}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Upload Folder
              </>
            )}
          </button>

          <button
            onClick={openNew}
            className="px-4 py-2 font-semibold rounded-lg text-sm transition-all text-white"
            style={{ background: '#3D6B9B' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2A5080')}
            onMouseLeave={e => (e.currentTarget.style.background = '#3D6B9B')}
          >
            + Add Entry
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#B91C1C' }}>
          {uploadError}
        </div>
      )}

      {batchProgress && (
        <div className="mb-4 px-4 py-3 rounded-lg" style={{ background: '#fff', border: '1px solid #C5D8EF' }}>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium" style={{ color: '#1B3A5C' }}>Importing files...</span>
            <span style={{ color: '#6B7A8D' }}>{batchProgress.current} of {batchProgress.total}</span>
          </div>
          <div className="w-full rounded-full h-1.5" style={{ background: '#D0DCE8' }}>
            <div
              className="h-1.5 rounded-full transition-all"
              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%`, background: '#3D6B9B' }}
            />
          </div>
        </div>
      )}

      {batchResults && (
        <div className="mb-4 rounded-lg overflow-hidden" style={{ border: '1px solid #C5D8EF' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#DCEAF7', borderBottom: '1px solid #C5D8EF' }}>
            <span className="text-sm font-semibold" style={{ color: '#1B3A5C' }}>
              Import complete — {batchResults.filter(r => r.ok).length} of {batchResults.length} files added
            </span>
            <button onClick={() => setBatchResults(null)} className="text-xs transition-colors" style={{ color: '#6B7A8D' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
              onMouseLeave={e => (e.currentTarget.style.color = '#6B7A8D')}
            >
              Dismiss
            </button>
          </div>
          <div className="divide-y max-h-48 overflow-y-auto bg-white" style={{ '--tw-divide-opacity': 1, borderColor: '#EEF3F9' } as React.CSSProperties}>
            {batchResults.map((r, i) => (
              <div key={i} className="px-4 py-2 flex items-center gap-2 text-sm">
                {r.ok
                  ? <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-xs" style={{ background: '#DCFCE7', color: '#16A34A' }}>✓</span>
                  : <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-xs" style={{ background: '#FEE2E2', color: '#DC2626' }}>✗</span>
                }
                <span className="truncate" style={{ color: '#1B3A5C' }}>{r.name}</span>
                {r.error && <span className="text-xs ml-auto shrink-0" style={{ color: '#6B7A8D' }}>{r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category filter */}
      {entries.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={
                filterCategory === cat
                  ? { background: '#1B3A5C', color: '#fff', border: '1px solid #1B3A5C' }
                  : { background: '#fff', color: '#3D6B9B', border: '1px solid #C5D8EF' }
              }
              onMouseEnter={e => {
                if (filterCategory !== cat) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#3D6B9B'
                }
              }}
              onMouseLeave={e => {
                if (filterCategory !== cat) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#C5D8EF'
                }
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Entry list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl" style={{ border: '1px solid #D0DCE8' }}>
          <p className="text-sm mb-3" style={{ color: '#6B7A8D' }}>No knowledge entries yet.</p>
          <button onClick={openNew} className="font-medium text-sm hover:underline" style={{ color: '#3D6B9B' }}>
            Add your first entry
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(entry => (
            <div key={entry.id} className="bg-white rounded-lg px-4 py-3 flex items-start justify-between gap-4" style={{ border: '1px solid #D0DCE8' }}>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#DCEAF7', color: '#3D6B9B' }}>
                    {entry.category}
                  </span>
                  <span className="font-semibold text-sm truncate" style={{ color: '#1B3A5C' }}>{entry.title}</span>
                </div>
                <p className="text-xs line-clamp-2" style={{ color: '#6B7A8D' }}>{entry.content}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => openEdit(entry)}
                  className="text-xs font-medium transition-colors"
                  style={{ color: '#3D6B9B' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#3D6B9B')}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
                  disabled={deletingId === entry.id}
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
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]" style={{ border: '1px solid #D0DCE8' }}>
            {/* Modal header */}
            <div className="px-6 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid #EEF3F9' }}>
              <h2 className="font-semibold" style={{ color: '#1B3A5C' }}>
                {editing ? 'Edit Entry' : 'New Knowledge Entry'}
              </h2>
              <button onClick={closeForm} className="transition-colors" style={{ color: '#8B939E' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
                onMouseLeave={e => (e.currentTarget.style.color = '#8B939E')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* File loaded banner */}
            {!editing && form.content && (
              <div className="px-6 pt-3 shrink-0">
                <div className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: '#DCEAF7', border: '1px solid #C5D8EF', color: '#1B3A5C' }}>
                  File content loaded — review below and click <strong>Add Entry</strong> to save to the knowledge base.
                </div>
              </div>
            )}

            {/* Form fields */}
            <div className="px-6 py-4 flex flex-col gap-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#3D6B9B' }}>Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ border: '1px solid #C5D8EF', color: '#1B3A5C', '--tw-ring-color': '#3D6B9B' } as React.CSSProperties}
                >
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#3D6B9B' }}>Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. West System 105 Epoxy Resin"
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ border: '1px solid #C5D8EF', color: '#1B3A5C', '--tw-ring-color': '#3D6B9B' } as React.CSSProperties}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#3D6B9B' }}>Content</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Paste in product specs, mix ratios, cure times, usage notes, supplier info, or process steps..."
                  rows={8}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 resize-y transition-all"
                  style={{ border: '1px solid #C5D8EF', color: '#1B3A5C', '--tw-ring-color': '#3D6B9B' } as React.CSSProperties}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 flex justify-end gap-2 shrink-0" style={{ borderTop: '1px solid #EEF3F9' }}>
              <button onClick={closeForm} className="px-4 py-2 text-sm font-medium transition-colors" style={{ color: '#6B7A8D' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6B7A8D')}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="px-4 py-2 font-semibold rounded-lg text-sm transition-all text-white disabled:opacity-40"
                style={{ background: '#3D6B9B' }}
                onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = '#2A5080' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#3D6B9B' }}
              >
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
