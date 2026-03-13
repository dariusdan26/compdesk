import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function notifyNewChangeRequest(data: {
  submittedBy: string
  category: string
  urgency: string
  description: string
  reason: string
}) {
  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL) return

  const urgencyColors: Record<string, string> = {
    Critical: '#DC2626',
    High:     '#EA580C',
    Medium:   '#CA8A04',
    Low:      '#475569',
  }
  const urgencyColor = urgencyColors[data.urgency] ?? '#475569'

  await resend.emails.send({
    from: 'CompDesk <onboarding@resend.dev>',
    to: process.env.ADMIN_EMAIL,
    subject: `[${data.urgency}] New Change Request — ${data.category}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #D0DCE8;border-radius:12px;overflow:hidden">
        <div style="background:#1B3A5C;padding:20px 24px">
          <p style="margin:0;color:#7EB3E8;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">CompDesk</p>
          <h1 style="margin:4px 0 0;color:#fff;font-size:18px;font-weight:700">New Change Request</h1>
        </div>
        <div style="padding:24px">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#6B7A8D;width:110px">Submitted by</td>
              <td style="padding:6px 0;font-size:13px;color:#1B3A5C;font-weight:600">${data.submittedBy}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#6B7A8D">Category</td>
              <td style="padding:6px 0;font-size:13px;color:#1B3A5C">${data.category}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#6B7A8D">Urgency</td>
              <td style="padding:6px 0">
                <span style="font-size:12px;font-weight:700;color:${urgencyColor}">${data.urgency}</span>
              </td>
            </tr>
          </table>
          <div style="margin-bottom:16px">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#6B7A8D;text-transform:uppercase;letter-spacing:0.05em">Proposed Change</p>
            <p style="margin:0;font-size:14px;color:#1B3A5C;line-height:1.6;background:#EEF3F9;padding:12px;border-radius:8px">${data.description}</p>
          </div>
          <div style="margin-bottom:24px">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#6B7A8D;text-transform:uppercase;letter-spacing:0.05em">Reason</p>
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;background:#EEF3F9;padding:12px;border-radius:8px">${data.reason}</p>
          </div>
          <a href="${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/admin/change-requests"
            style="display:inline-block;padding:10px 20px;background:#3D6B9B;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
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
  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL) return

  const severityColors: Record<string, string> = { Critical: '#DC2626', Major: '#EA580C', Minor: '#475569' }
  const severityColor = severityColors[data.severity] ?? '#475569'

  await resend.emails.send({
    from: 'CompDesk <onboarding@resend.dev>',
    to: process.env.ADMIN_EMAIL,
    subject: `[${data.severity}] New NCR — ${data.department} / PO ${data.bcPoNumber}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #D0DCE8;border-radius:12px;overflow:hidden">
        <div style="background:#7F1D1D;padding:20px 24px">
          <p style="margin:0;color:#FCA5A5;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">CompDesk</p>
          <h1 style="margin:4px 0 0;color:#fff;font-size:18px;font-weight:700">Non-Conformance Report</h1>
        </div>
        <div style="padding:24px">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:6px 0;font-size:13px;color:#6B7A8D;width:110px">Submitted by</td><td style="padding:6px 0;font-size:13px;color:#1B3A5C;font-weight:600">${data.submittedBy}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#6B7A8D">BC PO Number</td><td style="padding:6px 0;font-size:13px;color:#1B3A5C;font-weight:600">${data.bcPoNumber}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#6B7A8D">Department</td><td style="padding:6px 0;font-size:13px;color:#1B3A5C">${data.department}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#6B7A8D">Severity</td><td style="padding:6px 0"><span style="font-size:12px;font-weight:700;color:${severityColor}">${data.severity}</span></td></tr>
          </table>
          <div style="margin-bottom:24px">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#6B7A8D;text-transform:uppercase;letter-spacing:0.05em">Description</p>
            <p style="margin:0;font-size:14px;color:#1B3A5C;line-height:1.6;background:#FEF2F2;padding:12px;border-radius:8px;border-left:3px solid #DC2626">${data.description}</p>
          </div>
          <a href="${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/admin/ncrs"
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
  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL) return

  const urgencyColors: Record<string, string> = { Critical: '#DC2626', High: '#EA580C', Medium: '#CA8A04', Low: '#475569' }
  const urgencyColor = urgencyColors[data.urgency] ?? '#475569'

  await resend.emails.send({
    from: 'CompDesk <onboarding@resend.dev>',
    to: process.env.ADMIN_EMAIL,
    subject: `[${data.urgency}] New Purchase Requisition — ${data.department}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #D0DCE8;border-radius:12px;overflow:hidden">
        <div style="background:#064E3B;padding:20px 24px">
          <p style="margin:0;color:#6EE7B7;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">CompDesk</p>
          <h1 style="margin:4px 0 0;color:#fff;font-size:18px;font-weight:700">Purchase Requisition</h1>
        </div>
        <div style="padding:24px">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:6px 0;font-size:13px;color:#6B7A8D;width:110px">Submitted by</td><td style="padding:6px 0;font-size:13px;color:#1B3A5C;font-weight:600">${data.submittedBy}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#6B7A8D">Title</td><td style="padding:6px 0;font-size:13px;color:#1B3A5C">${data.title}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#6B7A8D">Department</td><td style="padding:6px 0;font-size:13px;color:#1B3A5C">${data.department}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#6B7A8D">Urgency</td><td style="padding:6px 0"><span style="font-size:12px;font-weight:700;color:${urgencyColor}">${data.urgency}</span></td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#6B7A8D">Line Items</td><td style="padding:6px 0;font-size:13px;color:#1B3A5C">${data.lineCount} item${data.lineCount === 1 ? '' : 's'}</td></tr>
          </table>
          <a href="${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/admin/requisitions"
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
  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL) return

  const urgencyColors: Record<string, string> = {
    Critical: '#DC2626',
    High:     '#EA580C',
    Medium:   '#CA8A04',
    Low:      '#475569',
  }
  const urgencyColor = urgencyColors[data.urgency] ?? '#475569'

  await resend.emails.send({
    from: 'CompDesk <onboarding@resend.dev>',
    to: process.env.ADMIN_EMAIL,
    subject: `[${data.urgency}] New Issue Reported — ${data.category}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #D0DCE8;border-radius:12px;overflow:hidden">
        <div style="background:#7F1D1D;padding:20px 24px">
          <p style="margin:0;color:#FCA5A5;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">CompDesk</p>
          <h1 style="margin:4px 0 0;color:#fff;font-size:18px;font-weight:700">Issue Reported</h1>
        </div>
        <div style="padding:24px">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#6B7A8D;width:110px">Reported by</td>
              <td style="padding:6px 0;font-size:13px;color:#1B3A5C;font-weight:600">${data.submittedBy}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#6B7A8D">Category</td>
              <td style="padding:6px 0;font-size:13px;color:#1B3A5C">${data.category}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#6B7A8D">Urgency</td>
              <td style="padding:6px 0">
                <span style="font-size:12px;font-weight:700;color:${urgencyColor}">${data.urgency}</span>
              </td>
            </tr>
          </table>
          <div style="margin-bottom:24px">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#6B7A8D;text-transform:uppercase;letter-spacing:0.05em">Issue Description</p>
            <p style="margin:0;font-size:14px;color:#1B3A5C;line-height:1.6;background:#FEF2F2;padding:12px;border-radius:8px;border-left:3px solid #DC2626">${data.description}</p>
          </div>
          <a href="${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/admin/issues"
            style="display:inline-block;padding:10px 20px;background:#DC2626;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
            Review in CompDesk →
          </a>
        </div>
      </div>
    `,
  })
}
