import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import TDSAdmin from './TDSAdmin'

export default async function TDSAdminPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = session.user as { role: string }
  if (user.role !== 'admin' && user.role !== 'lead') redirect('/dashboard')

  const docs = await prisma.tDSDocument.findMany({
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
  })

  return <TDSAdmin initialDocs={docs} />
}
