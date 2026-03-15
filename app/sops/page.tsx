import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import SOPList from './SOPList'
import { PageHeader } from '@/app/components/PageHeader'

export default async function SOPsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = session.user as { id: string | number; name: string; role: string }
  const userId = Number(user.id)

  const [sops, acknowledgements] = await Promise.all([
    prisma.sOP.findMany({ orderBy: [{ department: 'asc' }, { title: 'asc' }] }),
    prisma.sOPAcknowledgement.findMany({ where: { userId }, select: { sopId: true } }),
  ])

  const acknowledgedIds = new Set(acknowledgements.map(a => a.sopId))

  return (
    <div style={{ minHeight: '100vh', background: '#EEF3F9' }}>
      <PageHeader title="SOP Library" />

      <main style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem 1rem' }}>
        <SOPList
          initialSops={sops.map(s => ({ ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() }))}
          initialAcknowledgedIds={Array.from(acknowledgedIds)}
        />
      </main>
    </div>
  )
}
