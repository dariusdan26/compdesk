import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'
import { notifyStatusUpdate } from '@/lib/email'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { role: string }
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { status, resolution } = await req.json()

  const updated = await prisma.issue.update({
    where: { id: Number(id) },
    data: { status, resolution: resolution ?? null },
    include: { user: { select: { name: true, email: true } } },
  })

  if (updated.user.email) {
    notifyStatusUpdate({
      submitterEmail: updated.user.email,
      submitterName: updated.user.name,
      formType: 'issues',
      status,
      adminNote: resolution,
    }).catch(() => {})
  }

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { role: string }
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  await prisma.issue.delete({ where: { id: Number(id) } })

  return NextResponse.json({ ok: true })
}
