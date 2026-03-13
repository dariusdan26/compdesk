import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'
import { notifyNewNCR } from '@/lib/email'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { id: string | number; role: string }
  const userId = Number(user.id)

  const where = user.role === 'admin' ? {} : { submittedBy: userId }
  const ncrs = await prisma.nCR.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(ncrs)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { id: string | number; name: string }
  const userId = Number(user.id)
  const { bcPoNumber, itemDescription, department, defectType, severity, description } = await req.json()

  if (!bcPoNumber?.trim() || !itemDescription?.trim() || !department || !defectType || !severity || !description?.trim()) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  const ncr = await prisma.nCR.create({
    data: { submittedBy: userId, bcPoNumber, itemDescription, department, defectType, severity, description },
    include: { user: { select: { name: true } } },
  })

  notifyNewNCR({ submittedBy: user.name, bcPoNumber, department, severity, description }).catch(() => {})

  return NextResponse.json(ncr, { status: 201 })
}
