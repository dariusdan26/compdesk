import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import SDSAdmin from './SDSAdmin'

export default async function SDSAdminPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = session.user as { role: string }
  if (user.role !== 'admin' && user.role !== 'lead') redirect('/dashboard')

  const docs = await prisma.sDSDocument.findMany({
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
  })

  return <SDSAdmin initialDocs={docs.map((d: typeof docs[number]) => ({ ...d, createdAt: d.createdAt.toISOString() }))} />
}
