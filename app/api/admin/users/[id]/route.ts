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
  const { name, role, password } = await req.json()

  const data: Record<string, string> = {}
  if (name) data.name = name
  if (role) data.role = role
  if (password) data.password = await hashPassword(password)

  const updated = await prisma.user.update({
    where: { id: Number(id) },
    data,
    select: { id: true, name: true, username: true, role: true, createdAt: true },
  })

  return NextResponse.json(updated)
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

  await prisma.user.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
