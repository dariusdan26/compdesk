import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = Number((session.user as { id: string | number }).id)
  const body = await req.json()

  const endpoint: string | undefined = body?.endpoint
  const p256dh: string | undefined = body?.keys?.p256dh
  const auth: string | undefined = body?.keys?.auth

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 })
  }

  const userAgent = req.headers.get('user-agent') ?? null

  // Upsert by endpoint (the unique key). If a different user ever re-subscribes
  // from the same browser, the row's userId is updated to the new user.
  const sub = await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh, auth, userAgent },
    update: { userId, p256dh, auth, userAgent },
  })

  console.log(`[push] subscribed userId=${userId} endpoint=${endpoint.slice(0, 60)}...`)
  return NextResponse.json({ id: sub.id }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = Number((session.user as { id: string | number }).id)
  const { endpoint } = await req.json()

  if (!endpoint) {
    return NextResponse.json({ error: 'endpoint required' }, { status: 400 })
  }

  // Only allow deleting your own subscription.
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } })
  console.log(`[push] unsubscribed userId=${userId} endpoint=${endpoint.slice(0, 60)}...`)
  return NextResponse.json({ ok: true })
}
