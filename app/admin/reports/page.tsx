import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/app/components/PageHeader'
import ReportsDashboard, { ReportsData } from './ReportsDashboard'

// Force dynamic rendering — this page reads live DB state.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const DAY_MS = 86400000

export default async function AdminReportsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const user = session.user as { role: string }
  if (user.role !== 'admin') redirect('/dashboard')

  const now = new Date()
  const last30 = new Date(now.getTime() - 30 * DAY_MS)
  const prev30Start = new Date(now.getTime() - 60 * DAY_MS)
  const last90 = new Date(now.getTime() - 90 * DAY_MS)
  const last8Weeks = new Date(now.getTime() - 56 * DAY_MS)

  const [
    ncrLast30,
    ncrPrev30,
    openIssueCount,
    dispatchLast30,
    pendingChangeRequests,
    pendingIssues,
    pendingNcrs,
    pendingRequisitions,
    ncrsBySeverity,
    issuesAll,
    dispatch8w,
    requisitionsAll,
    sops,
    sopAcks,
    staffCount,
    recentNcrs,
    recentIssues,
    recentChangeRequests,
    recentRequisitions,
    recentDispatches,
  ] = await Promise.all([
    prisma.nCR.count({ where: { createdAt: { gte: last30 } } }),
    prisma.nCR.count({ where: { createdAt: { gte: prev30Start, lt: last30 } } }),
    prisma.issue.count({ where: { status: { in: ['open', 'investigating'] } } }),
    prisma.dispatchChecklist.findMany({
      where: { createdAt: { gte: last30 } },
      select: { overallStatus: true },
    }),
    prisma.changeRequest.count({ where: { status: { in: ['open', 'under_review'] } } }),
    prisma.issue.count({ where: { status: { in: ['open', 'investigating'] } } }),
    prisma.nCR.count({ where: { status: { in: ['open', 'under_review'] } } }),
    prisma.purchaseRequisition.count({ where: { status: 'open' } }),
    prisma.nCR.findMany({
      where: { createdAt: { gte: last90 } },
      select: { severity: true },
    }),
    prisma.issue.findMany({ select: { status: true } }),
    prisma.dispatchChecklist.findMany({
      where: { createdAt: { gte: last8Weeks } },
      select: { createdAt: true, overallStatus: true },
    }),
    prisma.purchaseRequisition.findMany({ select: { status: true } }),
    prisma.sOP.findMany({ select: { id: true, title: true, department: true } }),
    prisma.sOPAcknowledgement.findMany({ select: { sopId: true, userId: true } }),
    prisma.user.count({ where: { role: { not: 'admin' } } }),
    prisma.nCR.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { name: true } } },
    }),
    prisma.issue.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { name: true } } },
    }),
    prisma.changeRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { name: true } } },
    }),
    prisma.purchaseRequisition.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { name: true } } },
    }),
    prisma.dispatchChecklist.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { name: true } } },
    }),
  ])

  // ─── KPI: dispatch pass rate ──────────────────────────────────────────────
  const dispatchTotal30 = dispatchLast30.length
  const dispatchPass30 = dispatchLast30.filter((d) => d.overallStatus === 'pass').length
  const dispatchPassRate = dispatchTotal30 === 0 ? null : Math.round((dispatchPass30 / dispatchTotal30) * 100)

  // ─── KPI: NCR delta vs previous 30 days ───────────────────────────────────
  let ncrDeltaPct: number | null = null
  if (ncrPrev30 > 0) {
    ncrDeltaPct = Math.round(((ncrLast30 - ncrPrev30) / ncrPrev30) * 100)
  } else if (ncrLast30 > 0) {
    ncrDeltaPct = null // can't show percentage change from zero
  }

  // ─── Severity counts (last 90d) ───────────────────────────────────────────
  const severityOrder = ['Critical', 'Major', 'Minor']
  const severityCounts: Record<string, number> = { Critical: 0, Major: 0, Minor: 0 }
  for (const r of ncrsBySeverity) {
    if (r.severity in severityCounts) severityCounts[r.severity]++
    else severityCounts[r.severity] = (severityCounts[r.severity] ?? 0) + 1
  }
  const ncrSeverityData = severityOrder.map((label) => ({ label, value: severityCounts[label] ?? 0 }))

  // ─── Issue status counts ──────────────────────────────────────────────────
  const issueStatusOrder = ['open', 'investigating', 'resolved', 'closed']
  const issueStatusCounts: Record<string, number> = { open: 0, investigating: 0, resolved: 0, closed: 0 }
  for (const i of issuesAll) {
    issueStatusCounts[i.status] = (issueStatusCounts[i.status] ?? 0) + 1
  }
  const issueStatusData = issueStatusOrder.map((label) => ({ label, value: issueStatusCounts[label] ?? 0 }))

  // ─── Dispatch 8-week trend — bucket by ISO week ───────────────────────────
  function weekKey(d: Date): string {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    const dayNum = date.getUTCDay() || 7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
  }
  // Build the last 8 complete week keys in order
  const weekBuckets: { key: string; label: string; pass: number; fail: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 7 * DAY_MS)
    const key = weekKey(d)
    if (!weekBuckets.find((w) => w.key === key)) {
      // Short label: e.g. "Mar 17"
      const monday = new Date(d)
      const day = monday.getDay() || 7
      monday.setDate(monday.getDate() - (day - 1))
      const label = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      weekBuckets.push({ key, label, pass: 0, fail: 0 })
    }
  }
  for (const d of dispatch8w) {
    const key = weekKey(new Date(d.createdAt))
    const bucket = weekBuckets.find((w) => w.key === key)
    if (bucket) {
      if (d.overallStatus === 'pass') bucket.pass++
      else bucket.fail++
    }
  }
  const dispatchTrendData = weekBuckets.map(({ label, pass, fail }) => ({ label, pass, fail }))

  // ─── Requisitions by status ───────────────────────────────────────────────
  const reqStatusOrder = ['open', 'approved', 'ordered', 'received', 'rejected']
  const reqStatusCounts: Record<string, number> = { open: 0, approved: 0, ordered: 0, received: 0, rejected: 0 }
  for (const r of requisitionsAll) {
    reqStatusCounts[r.status] = (reqStatusCounts[r.status] ?? 0) + 1
  }
  const requisitionStatusData = reqStatusOrder.map((label) => ({ label, value: reqStatusCounts[label] ?? 0 }))

  // ─── SOP compliance ───────────────────────────────────────────────────────
  // Count unique (sopId, userId) pairs where userId refers to a staff user
  // (we don't have the user role on sopAcks here, so accept all acks — the
  // denominator is staff count only; acks by admins will inflate slightly but
  // capped at 100%)
  const ackMap = new Map<number, Set<number>>()
  for (const ack of sopAcks) {
    if (!ackMap.has(ack.sopId)) ackMap.set(ack.sopId, new Set())
    ackMap.get(ack.sopId)!.add(ack.userId)
  }
  const sopComplianceData = sops.map((sop) => {
    const uniqueAcks = ackMap.get(sop.id)?.size ?? 0
    const pct = staffCount === 0 ? 0 : Math.min(100, Math.round((uniqueAcks / staffCount) * 100))
    return { id: sop.id, title: sop.title, department: sop.department, pct, acks: uniqueAcks, total: staffCount }
  })

  // ─── Recent activity: merge all module feeds and sort ─────────────────────
  type ActivityItem = {
    id: string
    type: 'ncr' | 'issue' | 'change-request' | 'requisition' | 'dispatch'
    label: string
    submitter: string
    createdAt: string
    href: string
  }
  const activity: ActivityItem[] = [
    ...recentNcrs.map((r) => ({
      id: `ncr-${r.id}`,
      type: 'ncr' as const,
      label: `NCR · PO ${r.bcPoNumber} (${r.severity})`,
      submitter: r.user.name,
      createdAt: r.createdAt.toISOString(),
      href: '/admin/ncrs',
    })),
    ...recentIssues.map((r) => ({
      id: `issue-${r.id}`,
      type: 'issue' as const,
      label: `Issue · ${r.category} (${r.urgency})`,
      submitter: r.user.name,
      createdAt: r.createdAt.toISOString(),
      href: '/admin/issues',
    })),
    ...recentChangeRequests.map((r) => ({
      id: `cr-${r.id}`,
      type: 'change-request' as const,
      label: `Change Request · ${r.category} (${r.urgency})`,
      submitter: r.user.name,
      createdAt: r.createdAt.toISOString(),
      href: '/admin/change-requests',
    })),
    ...recentRequisitions.map((r) => ({
      id: `req-${r.id}`,
      type: 'requisition' as const,
      label: `Requisition · ${r.title}`,
      submitter: r.user.name,
      createdAt: r.createdAt.toISOString(),
      href: '/admin/requisitions',
    })),
    ...recentDispatches.map((r) => ({
      id: `dispatch-${r.id}`,
      type: 'dispatch' as const,
      label: `Dispatch · SO ${r.bcSoNumber} (${r.overallStatus})`,
      submitter: r.user.name,
      createdAt: r.createdAt.toISOString(),
      href: '/admin/dispatch',
    })),
  ]
  activity.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  const recentActivity = activity.slice(0, 10)

  const data: ReportsData = {
    kpis: {
      ncrLast30,
      ncrDeltaPct,
      openIssueCount,
      dispatchPassRate,
      dispatchTotal30,
      pendingReviewsTotal: pendingChangeRequests + pendingIssues + pendingNcrs + pendingRequisitions,
    },
    ncrSeverityData,
    issueStatusData,
    dispatchTrendData,
    requisitionStatusData,
    sopComplianceData,
    recentActivity,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EEF3F9', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Reports" />
      <main style={{ maxWidth: '72rem', margin: '0 auto', padding: '1.75rem 1rem', width: '100%' }}>
        <ReportsDashboard data={data} />
      </main>
    </div>
  )
}
