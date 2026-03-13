import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import TDSVault from './TDSVault'

export default async function TDSVaultPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const docs = await prisma.tDSDocument.findMany({
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
  })

  return <TDSVault initialDocs={docs} />
}
