import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomUUID } from 'crypto'
import { put } from '@vercel/blob'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'
import { pushNewDispatch } from '@/lib/push'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { id: string | number; role: string }
  const userId = Number(user.id)

  const checklists = await prisma.dispatchChecklist.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(checklists)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { id: string | number }
  const userId = Number(user.id)

  const formData = await req.formData()
  const bcSoNumber = (formData.get('bcSoNumber') as string | null)?.trim() ?? ''
  const customerName = (formData.get('customerName') as string | null)?.trim() ?? ''
  const department = (formData.get('department') as string | null) ?? ''
  const notesRaw = (formData.get('notes') as string | null) ?? ''
  const itemsJson = (formData.get('items') as string | null) ?? ''

  if (!bcSoNumber || !customerName || !department) {
    return NextResponse.json({ error: 'Sales order number, customer name and department are required.' }, { status: 400 })
  }

  let items: { label: string; checked: boolean }[]
  try {
    items = JSON.parse(itemsJson)
    if (!Array.isArray(items)) throw new Error()
  } catch {
    return NextResponse.json({ error: 'Invalid checklist items.' }, { status: 400 })
  }

  const photos = formData.getAll('photos').filter((v): v is File => v instanceof File && v.size > 0)
  if (photos.length < 1) {
    return NextResponse.json({ error: 'At least one photo is required.' }, { status: 400 })
  }
  if (photos.length > 5) {
    return NextResponse.json({ error: 'A maximum of 5 photos is allowed.' }, { status: 400 })
  }
  for (const p of photos) {
    if (!p.type.startsWith('image/')) {
      return NextResponse.json({ error: `"${p.name}" is not an image.` }, { status: 400 })
    }
    if (p.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: `"${p.name}" is larger than 8 MB.` }, { status: 400 })
    }
  }

  // Upload photos to Vercel Blob in parallel
  const photoUrls: string[] = []
  try {
    const uploaded = await Promise.all(
      photos.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer())
        const extMatch = file.name.match(/\.[a-zA-Z0-9]+$/)
        const ext = extMatch ? extMatch[0].toLowerCase() : '.jpg'
        const key = `dispatch/${randomUUID()}${ext}`
        const blob = await put(key, buffer, { access: 'public', contentType: file.type })
        return blob.url
      })
    )
    photoUrls.push(...uploaded)
    console.log(`[dispatch] uploaded ${photoUrls.length} photo(s) to Vercel Blob`)
  } catch (err) {
    console.error('[dispatch] photo upload failed:', err)
    return NextResponse.json({ error: 'Failed to upload photos. Please try again.' }, { status: 500 })
  }

  const allChecked = items.every((i) => i.checked)
  const overallStatus = allChecked ? 'pass' : 'fail'

  const checklist = await prisma.dispatchChecklist.create({
    data: {
      submittedBy: userId,
      bcSoNumber,
      customerName,
      department,
      items: JSON.stringify(items),
      overallStatus,
      notes: notesRaw.trim() ? notesRaw : null,
      photoUrls: JSON.stringify(photoUrls),
    },
    include: { user: { select: { name: true } } },
  })

  after(async () => {
    try {
      await pushNewDispatch({
        submittedBy: checklist.user.name,
        bcSoNumber,
        customerName,
        department,
        overallStatus,
      })
    } catch (err) {
      console.error('[push] pushNewDispatch failed:', err)
    }
  })

  return NextResponse.json(checklist, { status: 201 })
}
