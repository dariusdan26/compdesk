import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'

import { PageHeader } from '@/app/components/PageHeader'
import IssueList from './IssueList'

export default async function IssuesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const issues = await prisma.issue.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main style={{ minHeight: '100vh', background: '#EEF3F9' }}>
      <PageHeader title="Issue Reports" />

      <div style={{ maxWidth: '52rem', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <IssueList initialIssues={issues.map((i) => ({ ...i, createdAt: i.createdAt.toISOString(), updatedAt: i.updatedAt.toISOString() }))} />
      </div>
    </main>
  )
}
