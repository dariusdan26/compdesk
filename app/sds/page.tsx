import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import SDSVault from './SDSVault'

export default async function SDSVaultPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const docs = await prisma.sDSDocument.findMany({
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
  })

  return <SDSVault initialDocs={docs.map((d: typeof docs[number]) => ({ ...d, createdAt: d.createdAt.toISOString() }))} />
}
