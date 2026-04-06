import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as { role: string }
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, username: true, email: true, role: true, createdAt: true,
      notificationPreferences: { select: { formType: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sessionUser = session.user as { role: string }
  if (sessionUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, username, password, role, email, notificationPreferences } = await req.json()

  if (!name || !username || !password) {
    return NextResponse.json({ error: 'Name, username and password are required' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
  }

  const hashed = await hashPassword(password)
  const created = await prisma.user.create({
    data: {
      name,
      username,
      password: hashed,
      role: role ?? 'staff',
      email: email || null,
      notificationPreferences: Array.isArray(notificationPreferences) && notificationPreferences.length > 0
        ? { create: notificationPreferences.map((ft: string) => ({ formType: ft })) }
        : undefined,
    },
    select: {
      id: true, name: true, username: true, email: true, role: true, createdAt: true,
      notificationPreferences: { select: { formType: true } },
    },
  })

  return NextResponse.json(created, { status: 201 })
}
