'use client'

import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

export type ReportsData = {
  kpis: {
    ncrLast30: number
    ncrDeltaPct: number | null
    openIssueCount: number
    dispatchPassRate: number | null
    dispatchTotal30: number
    pendingReviewsTotal: number
  }
  ncrSeverityData: { label: string; value: number }[]
  issueStatusData: { label: string; value: number }[]
  dispatchTrendData: { label: string; pass: number; fail: number }[]
  requisitionStatusData: { label: string; value: number }[]
  sopComplianceData: {
    id: number
    title: string
    department: string
    pct: number
    acks: number
    total: number
  }[]
  recentActivity: {
    id: string
    type: 'ncr' | 'issue' | 'change-request' | 'requisition' | 'dispatch'
    label: string
    submitter: string
    createdAt: string
    href: string
  }[]
}

// ─── Palette ────────────────────────────────────────────────────────────────
const COLOR = {
  navy: '#1B3A5C',
  blue: '#4E7FB5',
  lightBlue: '#6B94C0',
  border: '#D4D7DC',
  muted: '#717680',
  bg: '#F0F2F5',
  green: '#059669',
  amber: '#CA8A04',
  red: '#DC2626',
  orange: '#EA580C',
  slate: '#475569',
  violet: '#7C3AED',
}

const SEVERITY_COLORS: Record<string, string> = {
  Critical: COLOR.red,
  Major: COLOR.orange,
  Minor: COLOR.slate,
}

const ISSUE_STATUS_COLORS: Record<string, string> = {
  open: COLOR.amber,
  investigating: COLOR.blue,
  resolved: COLOR.green,
  closed: COLOR.slate,
}

const REQ_STATUS_COLORS: Record<string, string> = {
  open: COLOR.amber,
  approved: COLOR.blue,
  ordered: COLOR.violet,
  received: COLOR.green,
  rejected: COLOR.red,
}

// ─── Shared styles ──────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: `1px solid ${COLOR.border}`,
  borderRadius: '0.875rem',
  padding: '1.25rem 1.375rem',
  boxShadow: '0 1px 3px rgba(27, 58, 92, 0.04)',
}

const cardTitleStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: COLOR.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.75rem',
}

const emptyChartStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 220,
  color: COLOR.muted,
  fontSize: '0.875rem',
  textAlign: 'center',
  padding: '0 1rem',
}

function ChartCard({ title, children, isEmpty, emptyMessage }: {
  title: string
  children: React.ReactNode
  isEmpty: boolean
  emptyMessage: string
}) {
  return (
    <div style={cardStyle}>
      <p style={cardTitleStyle}>{title}</p>
      {isEmpty ? <div style={emptyChartStyle}>{emptyMessage}</div> : children}
    </div>
  )
}

// ─── KPI card ───────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  caption,
  accent,
}: {
  label: string
  value: string
  caption?: string
  accent?: string
}) {
  return (
    <div style={cardStyle}>
      <p style={cardTitleStyle}>{label}</p>
      <p style={{
        fontSize: '1.75rem',
        fontWeight: 700,
        color: accent ?? COLOR.navy,
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
      }}>{value}</p>
      {caption && (
        <p style={{ fontSize: '0.75rem', color: COLOR.muted, marginTop: '0.375rem' }}>{caption}</p>
      )}
    </div>
  )
}

// ─── Activity icon by type ──────────────────────────────────────────────────
const ACTIVITY_ICONS: Record<ReportsData['recentActivity'][number]['type'], { label: string; color: string }> = {
  ncr: { label: 'NCR', color: COLOR.red },
  issue: { label: 'ISS', color: COLOR.orange },
  'change-request': { label: 'CR', color: COLOR.blue },
  requisition: { label: 'REQ', color: COLOR.violet },
  dispatch: { label: 'DSP', color: COLOR.green },
}

function relativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const secs = Math.floor((now - then) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  const days = Math.floor(secs / 86400)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

// ─── Main dashboard ─────────────────────────────────────────────────────────
export default function ReportsDashboard({ data }: { data: ReportsData }) {
  const {
    kpis,
    ncrSeverityData,
    issueStatusData,
    dispatchTrendData,
    requisitionStatusData,
    sopComplianceData,
    recentActivity,
  } = data

  // ─── KPI derived strings ─────────────────────────────────────────────────
  const ncrDeltaCaption = (() => {
    if (kpis.ncrLast30 === 0 && kpis.ncrDeltaPct === null) return 'No NCRs in the last 30 days'
    if (kpis.ncrDeltaPct === null) return 'vs 0 in previous 30 days'
    const arrow = kpis.ncrDeltaPct > 0 ? '↑' : kpis.ncrDeltaPct < 0 ? '↓' : '→'
    const abs = Math.abs(kpis.ncrDeltaPct)
    return `${arrow} ${abs}% vs previous 30 days`
  })()

  const dispatchPassCaption = kpis.dispatchTotal30 === 0
    ? 'No dispatches in the last 30 days'
    : `${kpis.dispatchTotal30} dispatch${kpis.dispatchTotal30 === 1 ? '' : 'es'} in the last 30 days`

  const hasSeverityData = ncrSeverityData.some((d) => d.value > 0)
  const hasIssueStatusData = issueStatusData.some((d) => d.value > 0)
  const hasDispatchTrendData = dispatchTrendData.some((d) => d.pass > 0 || d.fail > 0)
  const hasRequisitionData = requisitionStatusData.some((d) => d.value > 0)
  const hasSOPData = sopComplianceData.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: COLOR.navy, marginBottom: '0.25rem' }}>
          Reports
        </h1>
        <p style={{ fontSize: '0.875rem', color: COLOR.muted }}>
          Aggregate view of all submissions over the last 30–90 days.
        </p>
      </div>

      {/* ─── KPI Row ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
      }}>
        <KpiCard
          label="NCRs (last 30d)"
          value={String(kpis.ncrLast30)}
          caption={ncrDeltaCaption}
        />
        <KpiCard
          label="Open Issues"
          value={String(kpis.openIssueCount)}
          caption={kpis.openIssueCount === 0 ? 'All clear' : 'Still needing attention'}
          accent={kpis.openIssueCount > 0 ? COLOR.orange : COLOR.green}
        />
        <KpiCard
          label="Dispatch Pass Rate (30d)"
          value={kpis.dispatchPassRate === null ? '—' : `${kpis.dispatchPassRate}%`}
          caption={dispatchPassCaption}
          accent={
            kpis.dispatchPassRate === null
              ? COLOR.muted
              : kpis.dispatchPassRate >= 95
                ? COLOR.green
                : kpis.dispatchPassRate >= 80
                  ? COLOR.amber
                  : COLOR.red
          }
        />
        <KpiCard
          label="Pending Reviews"
          value={String(kpis.pendingReviewsTotal)}
          caption="Across all form types"
          accent={kpis.pendingReviewsTotal > 0 ? COLOR.blue : COLOR.green}
        />
      </div>

      {/* ─── Charts Row 1 — Status Breakdowns ────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1rem',
      }}>
        <ChartCard
          title="NCRs by Severity · Last 90 days"
          isEmpty={!hasSeverityData}
          emptyMessage="No NCRs in the last 90 days. Data will appear as users submit them."
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ncrSeverityData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLOR.border} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: COLOR.muted, fontSize: 12 }} axisLine={{ stroke: COLOR.border }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: COLOR.muted, fontSize: 12 }} axisLine={{ stroke: COLOR.border }} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(61,107,155,0.06)' }}
                contentStyle={{ background: '#fff', border: `1px solid ${COLOR.border}`, borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {ncrSeverityData.map((d) => (
                  <Cell key={d.label} fill={SEVERITY_COLORS[d.label] ?? COLOR.slate} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Issues by Status · All time"
          isEmpty={!hasIssueStatusData}
          emptyMessage="No issues reported yet."
        >
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Tooltip
                contentStyle={{ background: '#fff', border: `1px solid ${COLOR.border}`, borderRadius: 8, fontSize: 12 }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 12, color: COLOR.muted }}
              />
              <Pie
                data={issueStatusData.filter((d) => d.value > 0)}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
              >
                {issueStatusData.filter((d) => d.value > 0).map((d) => (
                  <Cell key={d.label} fill={ISSUE_STATUS_COLORS[d.label] ?? COLOR.slate} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ─── Charts Row 2 — Trend + Requisitions ─────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1rem',
      }}>
        <ChartCard
          title="Dispatch Pass / Fail · Last 8 weeks"
          isEmpty={!hasDispatchTrendData}
          emptyMessage="No dispatches in the last 8 weeks."
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dispatchTrendData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLOR.border} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: COLOR.muted, fontSize: 11 }} axisLine={{ stroke: COLOR.border }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: COLOR.muted, fontSize: 12 }} axisLine={{ stroke: COLOR.border }} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(61,107,155,0.06)' }}
                contentStyle={{ background: '#fff', border: `1px solid ${COLOR.border}`, borderRadius: 8, fontSize: 12 }}
              />
              <Legend iconType="square" wrapperStyle={{ fontSize: 12, color: COLOR.muted }} />
              <Bar dataKey="pass" name="Pass" stackId="a" fill={COLOR.green} radius={[0, 0, 0, 0]} />
              <Bar dataKey="fail" name="Fail" stackId="a" fill={COLOR.red} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Requisitions by Status · All time"
          isEmpty={!hasRequisitionData}
          emptyMessage="No purchase requisitions submitted yet."
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={requisitionStatusData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={COLOR.border} horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fill: COLOR.muted, fontSize: 12 }} axisLine={{ stroke: COLOR.border }} tickLine={false} />
              <YAxis type="category" dataKey="label" width={80} tick={{ fill: COLOR.muted, fontSize: 12 }} axisLine={{ stroke: COLOR.border }} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(61,107,155,0.06)' }}
                contentStyle={{ background: '#fff', border: `1px solid ${COLOR.border}`, borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {requisitionStatusData.map((d) => (
                  <Cell key={d.label} fill={REQ_STATUS_COLORS[d.label] ?? COLOR.slate} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ─── SOP Compliance ──────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <p style={cardTitleStyle}>SOP Acknowledgement Compliance</p>
        {!hasSOPData ? (
          <div style={emptyChartStyle}>No SOPs published yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sopComplianceData.map((sop) => (
              <div key={sop.id}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: '0.5rem',
                  marginBottom: '0.25rem',
                }}>
                  <span style={{ fontSize: '0.8125rem', color: COLOR.navy, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sop.title}
                    <span style={{ color: COLOR.muted, fontWeight: 400, marginLeft: '0.5rem' }}>· {sop.department}</span>
                  </span>
                  <span style={{ fontSize: '0.75rem', color: COLOR.muted, flexShrink: 0 }}>
                    {sop.acks} / {sop.total} ({sop.pct}%)
                  </span>
                </div>
                <div style={{
                  height: 8,
                  borderRadius: 999,
                  background: '#F2F3F5',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${sop.pct}%`,
                    background: sop.pct >= 90 ? COLOR.green : sop.pct >= 50 ? COLOR.amber : COLOR.red,
                    transition: 'width 0.3s',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Activity Feed ───────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <p style={cardTitleStyle}>Recent Activity</p>
        {recentActivity.length === 0 ? (
          <div style={emptyChartStyle}>No recent activity yet. Submissions will appear here.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentActivity.map((item, i) => {
              const meta = ACTIVITY_ICONS[item.type]
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 0.25rem',
                    borderBottom: i === recentActivity.length - 1 ? 'none' : `1px solid ${COLOR.border}`,
                    textDecoration: 'none',
                  }}
                >
                  <span style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: `${meta.color}14`,
                    color: meta.color,
                    letterSpacing: '0.04em',
                    flexShrink: 0,
                    minWidth: 40,
                    textAlign: 'center',
                  }}>
                    {meta.label}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '0.875rem',
                      color: COLOR.navy,
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: COLOR.muted }}>
                      by {item.submitter}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: COLOR.muted, flexShrink: 0 }}>
                    {relativeTime(item.createdAt)}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
