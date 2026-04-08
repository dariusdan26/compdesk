import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'
import { pushStatusUpdate } from '@/lib/push'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as { role: string }
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { status, adminNote } = await req.json()

  const updated = await prisma.purchaseRequisition.update({
    where: { id: Number(id) },
    data: { status, adminNote: adminNote ?? null },
    include: { user: { select: { name: true } }, lineItems: true },
  })

  pushStatusUpdate({
    submitterUserId: updated.submittedBy,
    formType: 'requisitions',
    status,
    adminNote,
  }).catch(err => console.error('[push] pushStatusUpdate failed:', err))

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as { role: string }
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  await prisma.purchaseRequisition.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
