'use client'

import { useState } from 'react'

interface User {
  id: number
  name: string
  username: string
  email: string | null
  role: string
  createdAt: string
  notificationPreferences: string[]
}

const ROLE_OPTIONS = ['staff', 'lead', 'admin']
const ROLE_LABELS: Record<string, string> = { staff: 'Staff', lead: 'Lead', admin: 'Admin' }
const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  admin: { bg: '#1B3A5C', color: '#ffffff' },
  lead:  { bg: '#DCEAF7', color: '#3D6B9B' },
  staff: { bg: '#F1F5F9', color: '#475569' },
}

const FORM_TYPES = [
  { key: 'change-requests', label: 'Change Requests' },
  { key: 'issues', label: 'Issues' },
  { key: 'ncrs', label: 'NCRs' },
  { key: 'requisitions', label: 'Requisitions' },
  { key: 'dispatch', label: 'Dispatch' },
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
  border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem',
  background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit',
}
const selectStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.625rem', borderRadius: '0.5rem',
  border: '1px solid #C5D8EF', color: '#1B3A5C', fontSize: '0.875rem', background: '#fff',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#3D6B9B', marginBottom: '0.375rem',
}

function Badge({ role }: { role: string }) {
  const s = ROLE_STYLES[role] ?? ROLE_STYLES.staff
  return (
    <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px', background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

const emptyForm = { name: '', username: '', password: '', role: 'staff', email: '', notificationPreferences: [] as string[] }

export default function UserAdmin({ initialUsers, currentUserId }: { initialUsers: User[]; currentUserId: string }) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<User | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState({ name: '', role: 'staff', password: '', email: '', notificationPreferences: [] as string[] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openCreate() {
    setForm(emptyForm)
    setError('')
    setCreating(true)
  }

  function openEdit(u: User) {
    setEditing(u)
    setEditForm({
      name: u.name,
      role: u.role,
      password: '',
      email: u.email ?? '',
      notificationPreferences: u.notificationPreferences ?? [],
    })
    setError('')
  }

  function togglePref(prefs: string[], key: string): string[] {
    return prefs.includes(key) ? prefs.filter(p => p !== key) : [...prefs, key]
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
      setError('Name, username and password are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          notificationPreferences: form.notificationPreferences,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create user.'); return }
      setUsers(prev => [...prev, {
        ...data,
        notificationPreferences: data.notificationPreferences?.map((p: { formType: string }) => p.formType) ?? [],
      }])
      setCreating(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit() {
    if (!editing) return
    if (!editForm.name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError('')
    try {
      const body: Record<string, unknown> = {
        name: editForm.name,
        role: editForm.role,
        email: editForm.email,
        notificationPreferences: editForm.notificationPreferences,
      }
      if (editForm.password.trim()) body.password = editForm.password
      const res = await fetch(`/api/admin/users/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to update user.'); return }
      setUsers(prev => prev.map(u => u.id === data.id ? {
        ...data,
        notificationPreferences: data.notificationPreferences?.map((p: { formType: string }) => p.formType) ?? [],
      } : u))
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    const res = await fetch(`/api/admin/users/${deleting.id}`, { method: 'DELETE' })
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== deleting.id))
      setDeleting(null)
    }
  }

  const btnPrimary: React.CSSProperties = { padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, background: '#3D6B9B', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }
  const btnGhost: React.CSSProperties = { padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#6B7A8D', background: 'none', border: 'none', cursor: 'pointer' }
  const btnDanger: React.CSSProperties = { padding: '0.5rem 1.125rem', fontSize: '0.875rem', fontWeight: 600, background: '#DC2626', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }

  function NotificationToggles({ prefs, onChange }: { prefs: string[]; onChange: (prefs: string[]) => void }) {
    return (
      <div>
        <label style={labelStyle}>Email Notifications</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {FORM_TYPES.map(ft => {
            const active = prefs.includes(ft.key)
            return (
              <button
                key={ft.key}
                type="button"
                onClick={() => onChange(togglePref(prefs, ft.key))}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  borderRadius: '9999px',
                  border: active ? '1.5px solid #3D6B9B' : '1.5px solid #D0DCE8',
                  background: active ? '#DCEAF7' : '#fff',
                  color: active ? '#1B3A5C' : '#6B7A8D',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {active ? '\u2713 ' : ''}{ft.label}
              </button>
            )
          })}
        </div>
        <p style={{ fontSize: '0.75rem', color: '#8B939E', marginTop: '0.375rem' }}>
          User will receive email notifications for selected form types.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1B3A5C', marginBottom: '2px' }}>User Accounts</h1>
          <p style={{ color: '#6B7A8D', fontSize: '0.875rem' }}>{users.length} {users.length === 1 ? 'account' : 'accounts'}</p>
        </div>
        <button onClick={openCreate} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#2A5080')}
          onMouseLeave={e => (e.currentTarget.style.background = '#3D6B9B')}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New User
        </button>
      </div>

      {/* User list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {users.map(u => (
          <div key={u.id} style={{ background: '#fff', borderRadius: '0.875rem', padding: '1rem 1.25rem', border: '1px solid #D0DCE8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
              {/* Avatar */}
              <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '9999px', background: '#DCEAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#3D6B9B' }}>
                  {u.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                </span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, color: '#1B3A5C', fontSize: '0.9375rem' }}>{u.name}</span>
                  <Badge role={u.role} />
                  {String(u.id) === currentUserId && (
                    <span style={{ fontSize: '0.6875rem', color: '#8B939E', fontStyle: 'italic' }}>you</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8125rem', color: '#6B7A8D' }}>@{u.username}</span>
                  {u.email && <span style={{ fontSize: '0.75rem', color: '#8B939E' }}>{u.email}</span>}
                </div>
                {u.notificationPreferences.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                    {u.notificationPreferences.map(ft => (
                      <span key={ft} style={{ fontSize: '0.625rem', padding: '1px 6px', borderRadius: '4px', background: '#EEF3F9', color: '#3D6B9B', fontWeight: 500 }}>
                        {FORM_TYPES.find(f => f.key === ft)?.label ?? ft}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <button onClick={() => openEdit(u)}
                style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600, background: '#3D6B9B', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#2A5080')}
                onMouseLeave={e => (e.currentTarget.style.background = '#3D6B9B')}>
                Edit
              </button>
              {String(u.id) !== currentUserId && (
                <button onClick={() => setDeleting(u)}
                  style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600, background: 'none', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '0.5rem', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FEE2E2' }}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create modal */}
      {creating && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '28rem', border: '1px solid #D0DCE8', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEF3F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontWeight: 700, color: '#1B3A5C', fontSize: '1.0625rem' }}>New User</h2>
              <button onClick={() => setCreating(false)} style={{ color: '#8B939E', background: 'none', border: 'none', cursor: 'pointer' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {error && <p style={{ fontSize: '0.875rem', color: '#DC2626', background: '#FEE2E2', padding: '0.5rem 0.75rem', borderRadius: '0.5rem' }}>{error}</p>}
              <div>
                <label style={labelStyle}>Full Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Jane Smith" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Username</label>
                <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, '') }))} placeholder="e.g. jsmith" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email <span style={{ fontWeight: 400, color: '#8B939E' }}>(optional)</span></label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="e.g. jane@company.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Temporary Password</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="They can change this later" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={selectStyle}>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <NotificationToggles
                prefs={form.notificationPreferences}
                onChange={prefs => setForm(f => ({ ...f, notificationPreferences: prefs }))}
              />
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #EEF3F9', display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
              <button onClick={() => setCreating(false)} style={btnGhost}
                onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6B7A8D')}>Cancel</button>
              <button onClick={handleCreate} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}
                onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = '#2A5080' }}
                onMouseLeave={e => (e.currentTarget.style.background = '#3D6B9B')}>
                {saving ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '28rem', border: '1px solid #D0DCE8', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEF3F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontWeight: 700, color: '#1B3A5C', fontSize: '1.0625rem' }}>Edit User — @{editing.username}</h2>
              <button onClick={() => setEditing(null)} style={{ color: '#8B939E', background: 'none', border: 'none', cursor: 'pointer' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {error && <p style={{ fontSize: '0.875rem', color: '#DC2626', background: '#FEE2E2', padding: '0.5rem 0.75rem', borderRadius: '0.5rem' }}>{error}</p>}
              <div>
                <label style={labelStyle}>Full Name</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email <span style={{ fontWeight: 400, color: '#8B939E' }}>(optional)</span></label>
                <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="e.g. jane@company.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} style={selectStyle}>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>New Password <span style={{ fontWeight: 400, color: '#8B939E' }}>(leave blank to keep current)</span></label>
                <input type="password" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} placeholder="Enter new password to reset" style={inputStyle} />
              </div>
              <NotificationToggles
                prefs={editForm.notificationPreferences}
                onChange={prefs => setEditForm(f => ({ ...f, notificationPreferences: prefs }))}
              />
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #EEF3F9', display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
              <button onClick={() => setEditing(null)} style={btnGhost}
                onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6B7A8D')}>Cancel</button>
              <button onClick={handleEdit} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}
                onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = '#2A5080' }}
                onMouseLeave={e => (e.currentTarget.style.background = '#3D6B9B')}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', maxWidth: '24rem', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontWeight: 700, color: '#1B3A5C', marginBottom: '0.625rem' }}>Delete account?</h3>
            <p style={{ fontSize: '0.875rem', color: '#6B7A8D', marginBottom: '1.25rem' }}>
              <strong>{deleting.name}</strong> (@{deleting.username}) will be permanently removed. This cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
              <button onClick={() => setDeleting(null)} style={btnGhost}
                onMouseEnter={e => (e.currentTarget.style.color = '#1B3A5C')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6B7A8D')}>Cancel</button>
              <button onClick={handleDelete} style={btnDanger}
                onMouseEnter={e => (e.currentTarget.style.background = '#B91C1C')}
                onMouseLeave={e => (e.currentTarget.style.background = '#DC2626')}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
