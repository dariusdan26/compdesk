import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'

import { PageHeader } from '@/app/components/PageHeader'
import ChangeRequestList from './ChangeRequestList'

export default async function ChangeRequestsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const requests = await prisma.changeRequest.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main style={{ minHeight: '100vh', background: '#F0F2F5' }}>
      <PageHeader title="Change Requests" />

      <div style={{ maxWidth: '52rem', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <ChangeRequestList initialRequests={requests.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }))} />
      </div>
    </main>
  )
}
