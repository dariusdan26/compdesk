import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { id: string | number; role: string }
  const userId = Number(user.id)

  const where = user.role === 'admin' ? {} : { submittedBy: userId }
  const checklists = await prisma.dispatchChecklist.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(checklists)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { id: string | number }
  const userId = Number(user.id)
  const { bcSoNumber, customerName, department, items, notes } = await req.json()

  if (!bcSoNumber?.trim() || !customerName?.trim() || !department) {
    return NextResponse.json({ error: 'Sales order number, customer name and department are required.' }, { status: 400 })
  }

  const allChecked = Array.isArray(items) && items.every((i: { checked: boolean }) => i.checked)
  const overallStatus = allChecked ? 'pass' : 'fail'

  const checklist = await prisma.dispatchChecklist.create({
    data: {
      submittedBy: userId,
      bcSoNumber,
      customerName,
      department,
      items: JSON.stringify(items),
      overallStatus,
      notes: notes ?? null,
    },
    include: { user: { select: { name: true } } },
  })

  return NextResponse.json(checklist, { status: 201 })
}
