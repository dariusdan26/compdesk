import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'

import { PageHeader } from '@/app/components/PageHeader'
import DispatchList from './DispatchList'

export default async function DispatchPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const checklists = await prisma.dispatchChecklist.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main style={{ minHeight: '100vh', background: '#F0F2F5' }}>
      <PageHeader title="Dispatch Checklists" />
      <div style={{ maxWidth: '52rem', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <DispatchList initialChecklists={checklists.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))} />
      </div>
    </main>
  )
}
