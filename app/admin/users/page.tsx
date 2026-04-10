import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import UserAdmin from './UserAdmin'

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const sessionUser = session.user as { role: string; id: string }
  if (sessionUser.role !== 'admin') redirect('/dashboard')

  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, username: true, email: true, role: true, createdAt: true,
      notificationPreferences: { select: { formType: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <main style={{ minHeight: '100vh', background: '#F0F2F5' }}>
      <header style={{ background: '#1B3A5C', padding: '0 1.5rem', height: '3.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <a href="/dashboard" style={{ color: '#7EA8CC', fontSize: '1.25rem', lineHeight: 1, textDecoration: 'none', fontWeight: 300 }}>‹</a>
        <div style={{ width: '1.75rem', height: '1.75rem' }}>
          <svg viewBox="0 0 32 32" fill="none">
            <polygon points="16,2 30,9 30,23 16,30 2,23 2,9" fill="#3A6A9A" stroke="#6B94C0" strokeWidth="1.5" />
            <polygon points="16,7 26,12.5 26,23.5 16,29 6,23.5 6,12.5" fill="#1B3A5C" />
            <text x="16" y="21" textAnchor="middle" fill="#7EA8CC" fontSize="11" fontWeight="700" fontFamily="system-ui">C</text>
          </svg>
        </div>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.0625rem' }}>CompDesk</span>
        <span style={{ color: '#6B94C0', fontSize: '0.875rem' }}>/</span>
        <span style={{ color: '#A8B8CC', fontSize: '0.875rem' }}>Manage Users</span>
      </header>
      <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <UserAdmin
          initialUsers={users.map(u => ({
            ...u,
            createdAt: u.createdAt.toISOString(),
            notificationPreferences: u.notificationPreferences.map(p => p.formType),
          }))}
          currentUserId={sessionUser.id}
        />
      </div>
    </main>
  )
}
