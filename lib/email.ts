import { Resend } from 'resend'
import { prisma } from '@/lib/db'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'CompDesk <onboarding@resend.dev>'
const BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

async function getNotificationRecipients(formType: string): Promise<string[]> {
  const users = await prisma.notificationPreference.findMany({
    where: { formType },
    include: { user: { select: { email: true } } },
  })
  const emails = users
    .map(p => p.user.email)
    .filter((e): e is string => !!e)

  // Always include ADMIN_EMAIL as fallback
  const admin = process.env.ADMIN_EMAIL
  if (admin && !emails.includes(admin)) emails.push(admin)

  console.log(`[email] recipients for "${formType}":`, {
    fromPreferences: users.map(u => u.user.email),
    finalList: emails,
  })

  return emails
}

type SendArgs = {
  to: string[] | string
  subject: string
  html: string
}

async function sendEmail(label: string, args: SendArgs) {
  console.log(`[email] sending "${label}" → ${Array.isArray(args.to) ? args.to.join(', ') : args.to}`)
  try {
    const result = await resend.emails.send({ from: FROM, ...args })
    if (result.error) {
      console.error(`[email] Resend rejected "${label}":`, result.error)
    } else {
      console.log(`[email] Resend accepted "${label}" id=${result.data?.id}`)
    }
    return result
  } catch (err) {
    console.error(`[email] threw while sending "${label}":`, err)
    throw err
  }
}

export async function notifyNewChangeRequest(data: {
  submittedBy: string
  category: string
  urgency: string
  description: string
  reason: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] notifyNewChangeRequest skipped: RESEND_API_KEY not set')
    return
  }

  const recipients = await getNotificationRecipients('change-requests')
  if (recipients.length === 0) {
    console.warn('[email] notifyNewChangeRequest skipped: no recipients')
    return
  }

  const urgencyColors: Record<string, string> = {
    Critical: '#DC2626',
    High:     '#EA580C',
    Medium:   '#CA8A04',
    Low:      '#475569',
  }
  const urgencyColor = urgencyColors[data.urgency] ?? '#475569'

  await sendEmail('change-request', {
    to: recipients,
    subject: `[${data.urgency}] New Change Request — ${data.category}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #D4D7DC;border-radius:12px;overflow:hidden">
        <div style="background:#1B3A5C;padding:20px 24px">
          <p style="margin:0;color:#7EA8CC;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">CompDesk</p>
          <h1 style="margin:4px 0 0;color:#fff;font-size:18px;font-weight:700">New Change Request</h1>
        </div>
        <div style="padding:24px">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#717680;width:110px">Submitted by</td>
              <td style="padding:6px 0;font-size:13px;color:#1B3A5C;font-weight:600">${data.submittedBy}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#717680">Category</td>
              <td style="padding:6px 0;font-size:13px;color:#1B3A5C">${data.category}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#717680">Urgency</td>
              <td style="padding:6px 0">
                <span style="font-size:12px;font-weight:700;color:${urgencyColor}">${data.urgency}</span>
              </td>
            </tr>
          </table>
          <div style="margin-bottom:16px">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#717680;text-transform:uppercase;letter-spacing:0.05em">Proposed Change</p>
            <p style="margin:0;font-size:14px;color:#1B3A5C;line-height:1.6;background:#F0F2F5;padding:12px;border-radius:8px">${data.description}</p>
          </div>
          <div style="margin-bottom:24px">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#717680;text-transform:uppercase;letter-spacing:0.05em">Reason</p>
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;background:#F0F2F5;padding:12px;border-radius:8px">${data.reason}</p>
          </div>
          <a href="${BASE_URL}/admin/change-requests"
            style="display:inline-block;padding:10px 20px;background:#4E7FB5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
            Review in CompDesk →
          </a>
        </div>
      </div>
    `,
  })
}

export async function notifyNewNCR(data: {
  submittedBy: string
  bcPoNumber: string
  department: string
  severity: string
  description: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] notifyNewNCR skipped: RESEND_API_KEY not set')
    return
  }

  const recipients = await getNotificationRecipients('ncrs')
  if (recipients.length === 0) {
    console.warn('[email] notifyNewNCR skipped: no recipients')
    return
  }

  const severityColors: Record<string, string> = { Critical: '#DC2626', Major: '#EA580C', Minor: '#475569' }
  const severityColor = severityColors[data.severity] ?? '#475569'

  await sendEmail('ncr', {
    to: recipients,
    subject: `[${data.severity}] New NCR — ${data.department} / PO ${data.bcPoNumber}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #D4D7DC;border-radius:12px;overflow:hidden">
        <div style="background:#7F1D1D;padding:20px 24px">
          <p style="margin:0;color:#FCA5A5;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">CompDesk</p>
          <h1 style="margin:4px 0 0;color:#fff;font-size:18px;font-weight:700">Non-Conformance Report</h1>
        </div>
        <div style="padding:24px">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:6px 0;font-size:13px;color:#717680;width:110px">Submitted by</td><td style="padding:6px 0;font-size:13px;color:#1B3A5C;font-weight:600">${data.submittedBy}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#717680">BC PO Number</td><td style="padding:6px 0;font-size:13px;color:#1B3A5C;font-weight:600">${data.bcPoNumber}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#717680">Department</td><td style="padding:6px 0;font-size:13px;color:#1B3A5C">${data.department}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#717680">Severity</td><td style="padding:6px 0"><span style="font-size:12px;font-weight:700;color:${severityColor}">${data.severity}</span></td></tr>
          </table>
          <div style="margin-bottom:24px">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#717680;text-transform:uppercase;letter-spacing:0.05em">Description</p>
            <p style="margin:0;font-size:14px;color:#1B3A5C;line-height:1.6;background:#FEF2F2;padding:12px;border-radius:8px;border-left:3px solid #DC2626">${data.description}</p>
          </div>
          <a href="${BASE_URL}/admin/ncrs"
            style="display:inline-block;padding:10px 20px;background:#DC2626;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
            Review in CompDesk →
          </a>
        </div>
      </div>
    `,
  })
}

export async function notifyNewRequisition(data: {
  submittedBy: string
  title: string
  department: string
  urgency: string
  lineCount: number
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] notifyNewRequisition skipped: RESEND_API_KEY not set')
    return
  }

  const recipients = await getNotificationRecipients('requisitions')
  if (recipients.length === 0) {
    console.warn('[email] notifyNewRequisition skipped: no recipients')
    return
  }

  const urgencyColors: Record<string, string> = { Critical: '#DC2626', High: '#EA580C', Medium: '#CA8A04', Low: '#475569' }
  const urgencyColor = urgencyColors[data.urgency] ?? '#475569'

  await sendEmail('requisition', {
    to: recipients,
    subject: `[${data.urgency}] New Purchase Requisition — ${data.department}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #D4D7DC;border-radius:12px;overflow:hidden">
        <div style="background:#064E3B;padding:20px 24px">
          <p style="margin:0;color:#6EE7B7;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">CompDesk</p>
          <h1 style="margin:4px 0 0;color:#fff;font-size:18px;font-weight:700">Purchase Requisition</h1>
        </div>
        <div style="padding:24px">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:6px 0;font-size:13px;color:#717680;width:110px">Submitted by</td><td style="padding:6px 0;font-size:13px;color:#1B3A5C;font-weight:600">${data.submittedBy}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#717680">Title</td><td style="padding:6px 0;font-size:13px;color:#1B3A5C">${data.title}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#717680">Department</td><td style="padding:6px 0;font-size:13px;color:#1B3A5C">${data.department}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#717680">Urgency</td><td style="padding:6px 0"><span style="font-size:12px;font-weight:700;color:${urgencyColor}">${data.urgency}</span></td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#717680">Line Items</td><td style="padding:6px 0;font-size:13px;color:#1B3A5C">${data.lineCount} item${data.lineCount === 1 ? '' : 's'}</td></tr>
          </table>
          <a href="${BASE_URL}/admin/requisitions"
            style="display:inline-block;padding:10px 20px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
            Review in CompDesk →
          </a>
        </div>
      </div>
    `,
  })
}

export async function notifyNewIssue(data: {
  submittedBy: string
  category: string
  urgency: string
  description: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] notifyNewIssue skipped: RESEND_API_KEY not set')
    return
  }

  const recipients = await getNotificationRecipients('issues')
  if (recipients.length === 0) {
    console.warn('[email] notifyNewIssue skipped: no recipients')
    return
  }

  const urgencyColors: Record<string, string> = {
    Critical: '#DC2626',
    High:     '#EA580C',
    Medium:   '#CA8A04',
    Low:      '#475569',
  }
  const urgencyColor = urgencyColors[data.urgency] ?? '#475569'

  await sendEmail('issue', {
    to: recipients,
    subject: `[${data.urgency}] New Issue Reported — ${data.category}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #D4D7DC;border-radius:12px;overflow:hidden">
        <div style="background:#7F1D1D;padding:20px 24px">
          <p style="margin:0;color:#FCA5A5;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">CompDesk</p>
          <h1 style="margin:4px 0 0;color:#fff;font-size:18px;font-weight:700">Issue Reported</h1>
        </div>
        <div style="padding:24px">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#717680;width:110px">Reported by</td>
              <td style="padding:6px 0;font-size:13px;color:#1B3A5C;font-weight:600">${data.submittedBy}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#717680">Category</td>
              <td style="padding:6px 0;font-size:13px;color:#1B3A5C">${data.category}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#717680">Urgency</td>
              <td style="padding:6px 0">
                <span style="font-size:12px;font-weight:700;color:${urgencyColor}">${data.urgency}</span>
              </td>
            </tr>
          </table>
          <div style="margin-bottom:24px">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#717680;text-transform:uppercase;letter-spacing:0.05em">Issue Description</p>
            <p style="margin:0;font-size:14px;color:#1B3A5C;line-height:1.6;background:#FEF2F2;padding:12px;border-radius:8px;border-left:3px solid #DC2626">${data.description}</p>
          </div>
          <a href="${BASE_URL}/admin/issues"
            style="display:inline-block;padding:10px 20px;background:#DC2626;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
            Review in CompDesk →
          </a>
        </div>
      </div>
    `,
  })
}

export async function notifyNewDispatch(data: {
  submittedBy: string
  bcSoNumber: string
  customerName: string
  department: string
  overallStatus: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] notifyNewDispatch skipped: RESEND_API_KEY not set')
    return
  }

  const recipients = await getNotificationRecipients('dispatch')
  if (recipients.length === 0) {
    console.warn('[email] notifyNewDispatch skipped: no recipients')
    return
  }

  const statusColor = data.overallStatus === 'pass' ? '#059669' : '#DC2626'
  const statusLabel = data.overallStatus === 'pass' ? 'PASS' : 'FAIL'

  await sendEmail('dispatch', {
    to: recipients,
    subject: `[${statusLabel}] Dispatch Checklist — SO ${data.bcSoNumber}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #D4D7DC;border-radius:12px;overflow:hidden">
        <div style="background:#1B3A5C;padding:20px 24px">
          <p style="margin:0;color:#7EA8CC;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">CompDesk</p>
          <h1 style="margin:4px 0 0;color:#fff;font-size:18px;font-weight:700">Dispatch Checklist</h1>
        </div>
        <div style="padding:24px">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:6px 0;font-size:13px;color:#717680;width:110px">Submitted by</td><td style="padding:6px 0;font-size:13px;color:#1B3A5C;font-weight:600">${data.submittedBy}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#717680">SO Number</td><td style="padding:6px 0;font-size:13px;color:#1B3A5C;font-weight:600">${data.bcSoNumber}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#717680">Customer</td><td style="padding:6px 0;font-size:13px;color:#1B3A5C">${data.customerName}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#717680">Department</td><td style="padding:6px 0;font-size:13px;color:#1B3A5C">${data.department}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#717680">Status</td><td style="padding:6px 0"><span style="font-size:12px;font-weight:700;color:${statusColor}">${statusLabel}</span></td></tr>
          </table>
          <a href="${BASE_URL}/admin/dispatch"
            style="display:inline-block;padding:10px 20px;background:#4E7FB5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
            Review in CompDesk →
          </a>
        </div>
      </div>
    `,
  })
}

const FORM_TYPE_LABELS: Record<string, string> = {
  'change-requests': 'Change Request',
  'issues': 'Issue',
  'ncrs': 'Non-Conformance Report',
  'requisitions': 'Purchase Requisition',
  'dispatch': 'Dispatch Checklist',
}

const STATUS_COLORS: Record<string, string> = {
  open: '#CA8A04',
  'in-progress': '#4E7FB5',
  resolved: '#059669',
  closed: '#475569',
  approved: '#059669',
  rejected: '#DC2626',
  pending: '#CA8A04',
}

export async function notifyStatusUpdate(data: {
  submitterEmail: string
  submitterName: string
  formType: string
  status: string
  adminNote?: string | null
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] notifyStatusUpdate skipped: RESEND_API_KEY not set')
    return
  }
  if (!data.submitterEmail) {
    console.warn(`[email] notifyStatusUpdate skipped: no submitter email (formType=${data.formType})`)
    return
  }

  const label = FORM_TYPE_LABELS[data.formType] ?? data.formType
  const statusColor = STATUS_COLORS[data.status.toLowerCase()] ?? '#475569'
  const link = `${BASE_URL}/${data.formType}`

  await sendEmail('status-update', {
    to: data.submitterEmail,
    subject: `Your ${label} has been updated — ${data.status}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #D4D7DC;border-radius:12px;overflow:hidden">
        <div style="background:#1B3A5C;padding:20px 24px">
          <p style="margin:0;color:#7EA8CC;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">CompDesk</p>
          <h1 style="margin:4px 0 0;color:#fff;font-size:18px;font-weight:700">${label} Updated</h1>
        </div>
        <div style="padding:24px">
          <p style="margin:0 0 16px;font-size:14px;color:#1B3A5C;line-height:1.6">
            Hi ${data.submitterName}, your <strong>${label.toLowerCase()}</strong> status has been updated:
          </p>
          <div style="margin-bottom:20px;padding:12px 16px;background:#F0F2F5;border-radius:8px;display:flex;align-items:center;gap:8px">
            <span style="font-size:13px;color:#717680">New Status:</span>
            <span style="font-size:13px;font-weight:700;color:${statusColor};text-transform:capitalize">${data.status}</span>
          </div>
          ${data.adminNote ? `
          <div style="margin-bottom:24px">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#717680;text-transform:uppercase;letter-spacing:0.05em">Admin Note</p>
            <p style="margin:0;font-size:14px;color:#1B3A5C;line-height:1.6;background:#F0F2F5;padding:12px;border-radius:8px">${data.adminNote}</p>
          </div>
          ` : ''}
          <a href="${link}"
            style="display:inline-block;padding:10px 20px;background:#4E7FB5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
            View in CompDesk →
          </a>
        </div>
      </div>
    `,
  })
}
