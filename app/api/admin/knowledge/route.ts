import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as { role: string }
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { category, title, content } = await req.json()
  if (!category || !title || !content) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const entry = await prisma.knowledgeEntry.create({
    data: { category, title, content },
  })

  return NextResponse.json(entry)
}
