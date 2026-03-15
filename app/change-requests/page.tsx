import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'

import { PageHeader } from '@/app/components/PageHeader'
import ChangeRequestList from './ChangeRequestList'

export default async function ChangeRequestsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = session.user as { id: string | number; name: string; role: string }
  const userId = Number(user.id)

  const requests = await prisma.changeRequest.findMany({
    where: { submittedBy: userId },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main style={{ minHeight: '100vh', background: '#EEF3F9' }}>
      <PageHeader title="Change Requests" />

      <div style={{ maxWidth: '52rem', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <ChangeRequestList initialRequests={requests.map((r: typeof requests[number]) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }))} />
      </div>
    </main>
  )
}
