'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/app/components/PageHeader'

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

const CATEGORY_COLORS: Record<string, { bg: string; icon: string; border: string }> = {
  'Resins':            { bg: '#E0E4E9', icon: '#4E7FB5', border: '#C8D0D8' },
  'Adhesives':         { bg: '#EDE9FE', icon: '#7C3AED', border: '#DDD6FE' },
  'Coatings':          { bg: '#D1FAE5', icon: '#059669', border: '#A7F3D0' },
  'Composites':        { bg: '#FEF9C3', icon: '#CA8A04', border: '#FEF08A' },
  'Reinforcements':    { bg: '#E0E4E9', icon: '#1D4ED8', border: '#C8D0D8' },
  'Core Materials':    { bg: '#F0FDF4', icon: '#15803D', border: '#BBF7D0' },
  'Solvents':          { bg: '#FFEDD5', icon: '#EA580C', border: '#FED7AA' },
  'General':           { bg: '#F2F3F5', icon: '#475569', border: '#E2E8F0' },
}

function categoryStyle(cat: string) {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS['General']
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function TDSIcon({ color = '#4E7FB5' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  )
}

export default function TDSVault({ initialDocs }: { initialDocs: TDSDocument[] }) {
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')

  const categories = ['All', ...Array.from(new Set(initialDocs.map(d => d.category))).sort()]

  const filtered = initialDocs.filter(doc => {
    const matchCat = filterCategory === 'All' || doc.category === filterCategory
    const q = search.toLowerCase()
    const matchSearch = !q ||
      doc.title.toLowerCase().includes(q) ||
      (doc.manufacturer ?? '').toLowerCase().includes(q) ||
      doc.category.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  const grouped: Record<string, TDSDocument[]> = {}
  for (const doc of filtered) {
    if (!grouped[doc.category]) grouped[doc.category] = []
    grouped[doc.category].push(doc)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F2F5' }}>
      {/* Header */}
      <PageHeader title="TDS Vault" />

      <main style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Page title */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '4px' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem', background: '#E0E4E9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TDSIcon color="#4E7FB5" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B3A5C' }}>TDS Vault</h1>
          </div>
          <p style={{ color: '#717680', fontSize: '0.875rem', marginLeft: '3.25rem' }}>
            {initialDocs.length === 0
              ? 'No technical data sheets uploaded yet.'
              : `${initialDocs.length} document${initialDocs.length === 1 ? '' : 's'} · Click any sheet to open as PDF`}
          </p>
        </div>

        {/* Search + filter bar */}
        {initialDocs.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
              <svg style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#8A8F96', pointerEvents: 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or manufacturer…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.25rem', paddingRight: '0.75rem', paddingTop: '0.4375rem', paddingBottom: '0.4375rem', borderRadius: '0.5rem', border: '1px solid #C8CDD3', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff', boxSizing: 'border-box' }}
              />
            </div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              style={{ padding: '0.4375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C8CDD3', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff' }}
            >
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            {(search || filterCategory !== 'All') && (
              <button
                onClick={() => { setSearch(''); setFilterCategory('All') }}
                style={{ padding: '0.4375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #C8CDD3', color: '#717680', fontSize: '0.875rem', background: '#fff', cursor: 'pointer' }}
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {initialDocs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '5rem 1rem', background: '#fff', borderRadius: '1rem', border: '1px solid #D4D7DC' }}>
            <div style={{ width: '4rem', height: '4rem', borderRadius: '1rem', background: '#E0E4E9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <TDSIcon color="#4E7FB5" />
            </div>
            <p style={{ color: '#717680', fontSize: '0.9375rem', marginBottom: '0.5rem', fontWeight: 500 }}>No TDS documents yet</p>
            <p style={{ color: '#9CA3AF', fontSize: '0.8125rem' }}>Ask an admin to upload technical data sheets.</p>
          </div>
        )}

        {/* No results */}
        {initialDocs.length > 0 && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#fff', borderRadius: '1rem', border: '1px solid #D4D7DC' }}>
            <p style={{ color: '#717680', fontSize: '0.9375rem' }}>No documents match your search.</p>
          </div>
        )}

        {/* Grouped document list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, docs]) => {
            const cs = categoryStyle(category)
            return (
              <section key={category}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}>
                  <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem', background: cs.bg, border: `1px solid ${cs.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={cs.icon} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1B3A5C' }}>{category}</h2>
                  <span style={{ fontSize: '0.75rem', color: '#8A8F96', fontWeight: 500 }}>({docs.length})</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {docs.map(doc => (
                    <a
                      key={doc.id}
                      href={doc.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        background: '#fff', borderRadius: '0.75rem', padding: '0.875rem 1.125rem',
                        border: '1px solid #D4D7DC', textDecoration: 'none',
                        transition: 'box-shadow 0.15s, border-color 0.15s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 16px rgba(27,58,92,0.1)'
                        ;(e.currentTarget as HTMLAnchorElement).style.borderColor = '#A8B8CC'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLAnchorElement).style.boxShadow = ''
                        ;(e.currentTarget as HTMLAnchorElement).style.borderColor = '#D4D7DC'
                      }}
                    >
                      <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', background: cs.bg, border: `1px solid ${cs.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cs.icon} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="9" y1="13" x2="15" y2="13" />
                          <line x1="9" y1="17" x2="13" y2="17" />
                        </svg>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1B3A5C', marginBottom: '1px',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {doc.title}
                        </p>
                        {doc.manufacturer && (
                          <p style={{ fontSize: '0.75rem', color: '#717680' }}>{doc.manufacturer}</p>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.75rem', color: '#B0B4B9' }}>{formatFileSize(doc.fileSize)}</span>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px', background: '#E0E4E9', color: '#4E7FB5' }}>PDF</span>
                        <svg width="14" height="14" fill="none" stroke="#B0B4B9" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}
