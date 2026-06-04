import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'

const MIME_BY_EXT: Record<string, { type: string; inline: boolean }> = {
  '.pdf':  { type: 'application/pdf', inline: true },
  '.docx': { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', inline: false },
  '.doc':  { type: 'application/msword', inline: false },
  '.txt':  { type: 'text/plain; charset=utf-8', inline: true },
}

function extOf(name: string): string {
  const m = name.match(/\.[^.]+$/)
  return m ? m[0].toLowerCase() : ''
}

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

  const doc = await prisma.tDSDocument.findUnique({ where: { id: docId } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ext = extOf(doc.filename) || extOf(doc.filePath) || '.pdf'

  // Word documents can't render inline in browsers — open in Microsoft's
  // hosted Office viewer so users see the doc instead of an instant download.
  if (ext === '.docx' || ext === '.doc') {
    const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(doc.filePath)}`
    return NextResponse.redirect(viewerUrl)
  }

  const upstream = await fetch(doc.filePath)
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'Failed to fetch source file' }, { status: 502 })
  }

  const mime = MIME_BY_EXT[ext] ?? { type: 'application/octet-stream', inline: false }
  const filename = sanitizeFilename(`${doc.title}${ext}`)
  const disposition = mime.inline ? 'inline' : 'attachment'

  return new Response(upstream.body, {
    headers: {
      'Content-Type': mime.type,
      'Content-Disposition': `${disposition}; filename="${filename}"`,
      'Cache-Control': 'private, max-age=300',
    },
  })
}
