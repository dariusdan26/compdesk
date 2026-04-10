import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'

import { PageHeader } from '@/app/components/PageHeader'
import NCRList from './NCRList'

export default async function NCRsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const ncrs = await prisma.nCR.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main style={{ minHeight: '100vh', background: '#F0F2F5' }}>
      <PageHeader title="Non-Conformance Reports" />
      <div style={{ maxWidth: '52rem', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <NCRList initialNCRs={ncrs.map((n) => ({ ...n, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() }))} />
      </div>
    </main>
  )
}
