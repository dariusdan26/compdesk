import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'
import { put } from '@vercel/blob'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { role: string }
  if (user.role !== 'admin' && user.role !== 'lead') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const files = formData.getAll('files') as File[]
  const category = (formData.get('category') as string) || 'General'
  const manufacturer = (formData.get('manufacturer') as string) || ''

  if (!files.length) {
    return NextResponse.json({ error: 'No files provided.' }, { status: 400 })
  }

  const results: { title: string; ok: boolean; error?: string }[] = []

  for (const file of files) {
    if (file.type !== 'application/pdf') {
      results.push({ title: file.name, ok: false, error: 'Only PDF files are supported.' })
      continue
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      const uuid = randomUUID()
      const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storedFilename = `${uuid}_${safeBase}`

      const blob = await put(`tds/${storedFilename}`, buffer, { access: 'public' })

      const title = file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ').trim()

      await prisma.tDSDocument.create({
        data: {
          title,
          manufacturer: manufacturer.trim() || null,
          category,
          filename: storedFilename,
          filePath: blob.url,
          fileSize: buffer.length,
        },
      })

      results.push({ title: file.name, ok: true })
    } catch (err) {
      results.push({ title: file.name, ok: false, error: String(err) })
    }
  }

  const succeeded = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok).length

  return NextResponse.json({ succeeded, failed, results }, { status: 201 })
}
