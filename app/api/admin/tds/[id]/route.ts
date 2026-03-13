import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'
import { del } from '@vercel/blob'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { role: string }
  if (user.role !== 'admin' && user.role !== 'lead') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { title, manufacturer, category } = await req.json()

  const doc = await prisma.tDSDocument.update({
    where: { id: Number(id) },
    data: {
      title: title?.trim() || undefined,
      manufacturer: manufacturer?.trim() || null,
      category: category || undefined,
    },
  })

  return NextResponse.json(doc)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { role: string }
  if (user.role !== 'admin' && user.role !== 'lead') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const doc = await prisma.tDSDocument.findUnique({ where: { id: Number(id) } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete from Vercel Blob
  try {
    await del(doc.filePath)
  } catch {
    // Blob may already be missing — continue with DB delete
  }

  await prisma.tDSDocument.delete({ where: { id: Number(id) } })

  return NextResponse.json({ ok: true })
}
