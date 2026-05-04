import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'

function sanitizeFilename(name: string) {
  return name.replace(/[\r\n"\\/]/g, '_').slice(0, 200)
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const docId = Number(id)
  if (!Number.isFinite(docId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const doc = await prisma.sDSDocument.findUnique({ where: { id: docId } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const upstream = await fetch(doc.filePath)
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'Failed to fetch source file' }, { status: 502 })
  }

  const filename = sanitizeFilename(`${doc.title}.pdf`)

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, max-age=300',
    },
  })
}
