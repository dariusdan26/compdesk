import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'

import { PageHeader } from '@/app/components/PageHeader'
import RequisitionList from './RequisitionList'

export default async function RequisitionsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const requisitions = await prisma.purchaseRequisition.findMany({
    include: { user: { select: { name: true } }, lineItems: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main style={{ minHeight: '100vh', background: '#EEF3F9' }}>
      <PageHeader title="Purchase Requisitions" />
      <div style={{ maxWidth: '52rem', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <RequisitionList initialRequisitions={requisitions.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(), lineItems: r.lineItems.map((li) => ({ ...li, estimatedCost: li.estimatedCost ?? '' })) }))} />
      </div>
    </main>
  )
}
