import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { id: string | number }
  const userId = Number(user.id)
  const { sopId } = await req.json()

  if (!sopId) return NextResponse.json({ error: 'Missing sopId' }, { status: 400 })

  // Create if not already acknowledged
  const existing = await prisma.sOPAcknowledgement.findFirst({ where: { userId, sopId } })
  const ack = existing ?? await prisma.sOPAcknowledgement.create({ data: { userId, sopId } })

  return NextResponse.json(ack)
}
