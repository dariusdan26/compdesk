import webpush from 'web-push'
import { prisma } from '@/lib/db'

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@compositeessentials.com'
const BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

let configured = false
function ensureConfigured(): boolean {
  if (configured) return true
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.warn('[push] VAPID keys not set — push notifications disabled')
    return false
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
  configured = true
  return true
}

type PushPayload = {
  title: string
  body: string
  url: string
  tag?: string
}

type SubscriptionRow = {
  id: number
  endpoint: string
  p256dh: string
  auth: string
}

async function deliverToSubscriptions(label: string, subs: SubscriptionRow[], payload: PushPayload) {
  if (subs.length === 0) {
    console.warn(`[push] "${label}" skipped: no subscriptions`)
    return
  }
  console.log(`[push] sending "${label}" to ${subs.length} subscription(s)`)

  const body = JSON.stringify(payload)
  let sent = 0
  let removed = 0

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        )
        sent++
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          // Subscription is gone — remove it from DB
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
          removed++
          console.log(`[push] removed expired subscription id=${sub.id}`)
        } else {
          console.error(`[push] send failed for subscription id=${sub.id}:`, err)
        }
      }
    })
  )

  console.log(`[push] "${label}" done: sent=${sent} removed=${removed}`)
}

async function sendToFormType(formType: string, payload: PushPayload) {
  if (!ensureConfigured()) return

  const subs = await prisma.pushSubscription.findMany({
    where: {
      user: {
        notificationPreferences: { some: { formType } },
      },
    },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  })

  await deliverToSubscriptions(`${formType}/new`, subs, payload)
}

async function sendToUser(userId: number, label: string, payload: PushPayload) {
  if (!ensureConfigured()) return

  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  })

  await deliverToSubscriptions(label, subs, payload)
}

// ─── New-form notifications (parallel to lib/email.ts) ───────────────────────

export async function pushNewChangeRequest(data: {
  submittedBy: string
  category: string
  urgency: string
  description: string
}) {
  await sendToFormType('change-requests', {
    title: `[${data.urgency}] New Change Request`,
    body: `${data.submittedBy} • ${data.category}\n${data.description.slice(0, 120)}`,
    url: `${BASE_URL}/change-requests`,
    tag: 'change-request',
  })
}

export async function pushNewIssue(data: {
  submittedBy: string
  category: string
  urgency: string
  description: string
}) {
  await sendToFormType('issues', {
    title: `[${data.urgency}] New Issue`,
    body: `${data.submittedBy} • ${data.category}\n${data.description.slice(0, 120)}`,
    url: `${BASE_URL}/issues`,
    tag: 'issue',
  })
}

export async function pushNewNCR(data: {
  submittedBy: string
  bcPoNumber: string
  department: string
  severity: string
  description: string
}) {
  await sendToFormType('ncrs', {
    title: `[${data.severity}] New NCR — PO ${data.bcPoNumber}`,
    body: `${data.submittedBy} • ${data.department}\n${data.description.slice(0, 120)}`,
    url: `${BASE_URL}/ncrs`,
    tag: 'ncr',
  })
}

export async function pushNewRequisition(data: {
  submittedBy: string
  title: string
  department: string
  urgency: string
  lineCount: number
}) {
  await sendToFormType('requisitions', {
    title: `[${data.urgency}] New Purchase Requisition`,
    body: `${data.submittedBy} • ${data.department}\n${data.title} (${data.lineCount} item${data.lineCount === 1 ? '' : 's'})`,
    url: `${BASE_URL}/requisitions`,
    tag: 'requisition',
  })
}

export async function pushNewDispatch(data: {
  submittedBy: string
  bcSoNumber: string
  customerName: string
  department: string
  overallStatus: string
}) {
  const statusLabel = data.overallStatus === 'pass' ? 'PASS' : 'FAIL'
  await sendToFormType('dispatch', {
    title: `[${statusLabel}] Dispatch Checklist — SO ${data.bcSoNumber}`,
    body: `${data.submittedBy} • ${data.customerName} • ${data.department}`,
    url: `${BASE_URL}/dispatch`,
    tag: 'dispatch',
  })
}

// ─── Status update back to submitter ─────────────────────────────────────────

const FORM_TYPE_LABELS: Record<string, string> = {
  'change-requests': 'Change Request',
  'issues': 'Issue',
  'ncrs': 'Non-Conformance Report',
  'requisitions': 'Purchase Requisition',
  'dispatch': 'Dispatch Checklist',
}

export async function pushStatusUpdate(data: {
  submitterUserId: number
  formType: string
  status: string
  adminNote?: string | null
}) {
  const label = FORM_TYPE_LABELS[data.formType] ?? data.formType
  const body = data.adminNote
    ? `Status: ${data.status}\n${data.adminNote.slice(0, 120)}`
    : `Status: ${data.status}`

  await sendToUser(data.submitterUserId, `status-update/${data.formType}`, {
    title: `Your ${label} was updated`,
    body,
    url: `${BASE_URL}/${data.formType}`,
    tag: `status-${data.formType}-${data.submitterUserId}`,
  })
}
