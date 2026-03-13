import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'
import { notifyNewRequisition } from '@/lib/email'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { id: string | number; role: string }
  const userId = Number(user.id)

  const where = user.role === 'admin' ? {} : { submittedBy: userId }
  const requisitions = await prisma.purchaseRequisition.findMany({
    where,
    include: { user: { select: { name: true } }, lineItems: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(requisitions)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { id: string | number; name: string }
  const userId = Number(user.id)
  const { title, department, urgency, justification, lineItems } = await req.json()

  if (!title?.trim() || !department || !urgency || !justification?.trim()) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return NextResponse.json({ error: 'At least one line item is required.' }, { status: 400 })
  }

  const requisition = await prisma.purchaseRequisition.create({
    data: {
      submittedBy: userId,
      title,
      department,
      urgency,
      justification,
      lineItems: {
        create: lineItems.map((item: { description: string; quantity: string; unit: string; estimatedCost?: string }) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          estimatedCost: item.estimatedCost ?? null,
        })),
      },
    },
    include: { user: { select: { name: true } }, lineItems: true },
  })

  notifyNewRequisition({ submittedBy: user.name, title, department, urgency, lineCount: lineItems.length }).catch(() => {})

  return NextResponse.json(requisition, { status: 201 })
}
