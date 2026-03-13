import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const docs = await prisma.tDSDocument.findMany({
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
  })

  return NextResponse.json(docs)
}
