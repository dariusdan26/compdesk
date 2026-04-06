import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sessionUser = session.user as { role: string; id: string }
  if (sessionUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const uid = Number(id)
  const { name, role, password, email, notificationPreferences } = await req.json()

  const data: Record<string, unknown> = {}
  if (name) data.name = name
  if (role) data.role = role
  if (password) data.password = await hashPassword(password)
  if (email !== undefined) data.email = email || null

  const updated = await prisma.user.update({
    where: { id: uid },
    data,
    select: { id: true, name: true, username: true, email: true, role: true, createdAt: true },
  })

  // Update notification preferences if provided
  if (Array.isArray(notificationPreferences)) {
    await prisma.notificationPreference.deleteMany({ where: { userId: uid } })
    if (notificationPreferences.length > 0) {
      await prisma.notificationPreference.createMany({
        data: notificationPreferences.map((ft: string) => ({ userId: uid, formType: ft })),
      })
    }
  }

  // Re-fetch with prefs
  const result = await prisma.user.findUnique({
    where: { id: uid },
    select: {
      id: true, name: true, username: true, email: true, role: true, createdAt: true,
      notificationPreferences: { select: { formType: true } },
    },
  })

  return NextResponse.json(result)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sessionUser = session.user as { role: string; id: string }
  if (sessionUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  // Prevent deleting yourself
  if (sessionUser.id === id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }

  const uid = Number(id)

  // Delete dependent records first to satisfy foreign key constraints
  await prisma.notificationPreference.deleteMany({ where: { userId: uid } })
  await prisma.questionLog.deleteMany({ where: { userId: uid } })
  await prisma.sOPAcknowledgement.deleteMany({ where: { userId: uid } })
  await prisma.changeRequest.deleteMany({ where: { submittedBy: uid } })
  await prisma.issue.deleteMany({ where: { submittedBy: uid } })
  await prisma.nCR.deleteMany({ where: { submittedBy: uid } })
  await prisma.purchaseRequisition.deleteMany({ where: { submittedBy: uid } })
  await prisma.dispatchChecklist.deleteMany({ where: { submittedBy: uid } })

  await prisma.user.delete({ where: { id: uid } })
  return NextResponse.json({ ok: true })
}
