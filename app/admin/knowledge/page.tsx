import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import KnowledgeAdmin from './KnowledgeAdmin'

function HexIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M12 2L21.39 7.5V16.5L12 22L2.61 16.5V7.5L12 2Z" />
    </svg>
  )
}

export default async function AdminKnowledgePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const user = session.user as { role: string }
  if (user.role !== 'admin') redirect('/dashboard')

  const entries = await prisma.knowledgeEntry.findMany({
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
  })

  return (
    <div style={{ minHeight: '100vh', background: '#EEF3F9' }}>
      <header style={{ background: '#1B3A5C', borderBottom: '1px solid #2E5478' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '1.125rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard" style={{ color: '#6B8BA8', flexShrink: 0, display: 'flex', alignItems: 'center' }}
            className="hover:text-white transition-colors"
          >
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <HexIcon style={{ width: '2.25rem', height: '2.25rem', color: '#5B84B1', flexShrink: 0 }} />
            <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.025em' }}>CompDesk</span>
          </div>
          <span style={{ color: '#3D6B9B', fontSize: '1.125rem' }}>/</span>
          <span style={{ color: '#A8C4E0', fontSize: '1rem' }}>Manage Knowledge Base</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <KnowledgeAdmin initialEntries={entries} />
      </main>
    </div>
  )
}
