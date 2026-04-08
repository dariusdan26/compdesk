import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'
import { pushNewChangeRequest } from '@/lib/push'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { id: string | number; role: string }
  const userId = Number(user.id)

  const where = user.role === 'admin' ? {} : { submittedBy: userId }
  const requests = await prisma.changeRequest.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(requests)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { id: string | number }
  const userId = Number(user.id)
  const { description, reason, category, urgency } = await req.json()

  if (!description?.trim() || !reason?.trim() || !category || !urgency) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  const request = await prisma.changeRequest.create({
    data: { submittedBy: userId, description, reason, category, urgency, status: 'open' },
    include: { user: { select: { name: true } } },
  })

  // Fire-and-forget — push failure never blocks the response
  pushNewChangeRequest({
    submittedBy: request.user.name,
    category: request.category,
    urgency: request.urgency,
    description: request.description,
  }).catch(err => console.error('[push] pushNewChangeRequest failed:', err))

  return NextResponse.json(request, { status: 201 })
}
