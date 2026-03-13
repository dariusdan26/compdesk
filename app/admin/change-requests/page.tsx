import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import ChangeRequestAdmin from './ChangeRequestAdmin'

export default async function AdminChangeRequestsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = session.user as { role: string }
  if (user.role !== 'admin') redirect('/dashboard')

  const requests = await prisma.changeRequest.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main style={{ minHeight: '100vh', background: '#EEF3F9' }}>
      <header style={{ background: '#1B3A5C', padding: '0 1.5rem', height: '3.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <a href="/dashboard" style={{ color: '#7EB3E8', fontSize: '1.25rem', lineHeight: 1, textDecoration: 'none', fontWeight: 300 }}>‹</a>
        <div style={{ width: '1.75rem', height: '1.75rem' }}>
          <svg viewBox="0 0 32 32" fill="none">
            <polygon points="16,2 30,9 30,23 16,30 2,23 2,9" fill="#2A5080" stroke="#5B84B1" strokeWidth="1.5" />
            <polygon points="16,7 26,12.5 26,23.5 16,29 6,23.5 6,12.5" fill="#1B3A5C" />
            <text x="16" y="21" textAnchor="middle" fill="#7EB3E8" fontSize="11" fontWeight="700" fontFamily="system-ui">C</text>
          </svg>
        </div>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.0625rem' }}>CompDesk</span>
        <span style={{ color: '#5B84B1', fontSize: '0.875rem' }}>/</span>
        <span style={{ color: '#A8C4E0', fontSize: '0.875rem' }}>Manage Change Requests</span>
      </header>

      <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <ChangeRequestAdmin initialRequests={requests} />
      </div>
    </main>
  )
}
