import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const roleLabel: Record<string, string> = {
  admin: 'Administrator',
  lead: 'Lead',
  staff: 'Staff',
}

const roleBadgeStyle: Record<string, React.CSSProperties> = {
  admin: { background: '#3D6B9B', color: '#fff', fontSize: '0.75rem', fontWeight: 600, padding: '2px 10px', borderRadius: '9999px', whiteSpace: 'nowrap' },
  lead:  { background: '#5B84B1', color: '#fff', fontSize: '0.75rem', fontWeight: 600, padding: '2px 10px', borderRadius: '9999px', whiteSpace: 'nowrap' },
  staff: { background: '#6B7A8D', color: '#fff', fontSize: '0.75rem', fontWeight: 600, padding: '2px 10px', borderRadius: '9999px', whiteSpace: 'nowrap' },
}

function HexIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={style}>
      <path d="M12 2L21.39 7.5V16.5L12 22L2.61 16.5V7.5L12 2Z" />
    </svg>
  )
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = session.user as { name: string; role: string }
  const role = user.role

  return (
    <div style={{ minHeight: '100vh', background: '#EEF3F9' }}>

      {/* ── Header ── */}
      <header style={{ background: '#1B3A5C', borderBottom: '1px solid #2E5478' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '0.875rem 1rem' }} className="flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center flex-shrink-0" style={{ gap: '0.625rem' }}>
            <HexIcon style={{ width: '1.75rem', height: '1.75rem', color: '#5B84B1', flexShrink: 0 }} />
            <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '1.125rem', letterSpacing: '-0.025em', whiteSpace: 'nowrap' }}>CompDesk</span>
          </div>
          {/* User info */}
          <div className="flex items-center min-w-0" style={{ gap: '0.5rem' }}>
            <span className="hidden sm:inline-flex" style={roleBadgeStyle[role] ?? roleBadgeStyle.staff}>
              {roleLabel[role] ?? role}
            </span>
            <span className="text-[#A8C4E0] text-sm truncate hidden xs:block" style={{ maxWidth: '8rem' }}>{user.name}</span>
            <Link
              href="/api/auth/signout"
              className="text-[#6B8BA8] hover:text-white transition-colors text-sm flex-shrink-0"
              style={{ textDecoration: 'none' }}
            >
              Sign out
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ maxWidth: '72rem', margin: '0 auto', padding: '2.5rem 1rem' }}>

        {/* Centered content wrapper */}
        <div style={{ maxWidth: '58rem', margin: '0 auto', textAlign: 'center' }}>

          {/* Welcome */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#1B3A5C', marginBottom: '6px' }}>
              Good to see you, {user.name.split(' ')[0]}.
            </h1>
            <p style={{ color: '#6B7A8D', fontSize: '1.0625rem' }}>What do you need help with today?</p>
          </div>

          {/* Module cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
            {/* Ask a Question — violet */}
            <Link href="/knowledge" style={{ textDecoration: 'none', display: 'block', padding: '1.5rem' }}
              className="group bg-white rounded-xl border border-[#D0DCE8] hover:border-[#7C3AED] hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div style={{ width: '3rem', height: '3rem', borderRadius: '0.5rem', background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.875rem auto' }}>
                <svg style={{ width: '1.375rem', height: '1.375rem', color: '#7C3AED' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 style={{ fontWeight: 600, fontSize: '1rem', color: '#1B3A5C', marginBottom: '4px' }}>Ask a Question</h2>
              <p style={{ fontSize: '0.8125rem', color: '#6B7A8D', lineHeight: 1.4 }}>Instant answers from the knowledge base.</p>
            </Link>

            {/* SOP Library — navy blue */}
            <Link href="/sops" style={{ textDecoration: 'none', display: 'block', padding: '1.5rem' }}
              className="group bg-white rounded-xl border border-[#D0DCE8] hover:border-[#3D6B9B] hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div style={{ width: '3rem', height: '3rem', borderRadius: '0.5rem', background: '#DCEAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.875rem auto' }}>
                <svg style={{ width: '1.375rem', height: '1.375rem', color: '#3D6B9B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 style={{ fontWeight: 600, fontSize: '1rem', color: '#1B3A5C', marginBottom: '4px' }}>SOP Library</h2>
              <p style={{ fontSize: '0.8125rem', color: '#6B7A8D', lineHeight: 1.4 }}>View and acknowledge operating procedures.</p>
            </Link>

            {/* Change Requests — amber */}
            <Link href="/change-requests" style={{ textDecoration: 'none', display: 'block', padding: '1.5rem' }}
              className="group bg-white rounded-xl border border-[#D0DCE8] hover:border-[#D97706] hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div style={{ width: '3rem', height: '3rem', borderRadius: '0.5rem', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.875rem auto' }}>
                <svg style={{ width: '1.375rem', height: '1.375rem', color: '#D97706' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h2 style={{ fontWeight: 600, fontSize: '1rem', color: '#1B3A5C', marginBottom: '4px' }}>Change Requests</h2>
              <p style={{ fontSize: '0.8125rem', color: '#6B7A8D', lineHeight: 1.4 }}>Propose process or material changes.</p>
            </Link>

            {/* NCR — red */}
            <Link href="/ncrs" style={{ textDecoration: 'none', display: 'block', padding: '1.5rem' }}
              className="group bg-white rounded-xl border border-[#D0DCE8] hover:border-[#DC2626] hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div style={{ width: '3rem', height: '3rem', borderRadius: '0.5rem', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.875rem auto' }}>
                <svg style={{ width: '1.375rem', height: '1.375rem', color: '#DC2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 style={{ fontWeight: 600, fontSize: '1rem', color: '#1B3A5C', marginBottom: '4px' }}>NCR</h2>
              <p style={{ fontSize: '0.8125rem', color: '#6B7A8D', lineHeight: 1.4 }}>Report a non-conforming material or product.</p>
            </Link>

            {/* Purchase Requisition — emerald */}
            <Link href="/requisitions" style={{ textDecoration: 'none', display: 'block', padding: '1.5rem' }}
              className="group bg-white rounded-xl border border-[#D0DCE8] hover:border-[#059669] hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div style={{ width: '3rem', height: '3rem', borderRadius: '0.5rem', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.875rem auto' }}>
                <svg style={{ width: '1.375rem', height: '1.375rem', color: '#059669' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
                </svg>
              </div>
              <h2 style={{ fontWeight: 600, fontSize: '1rem', color: '#1B3A5C', marginBottom: '4px' }}>Purchase Requisition</h2>
              <p style={{ fontSize: '0.8125rem', color: '#6B7A8D', lineHeight: 1.4 }}>Request materials or supplies.</p>
            </Link>

            {/* Dispatch Checklist — teal */}
            <Link href="/dispatch" style={{ textDecoration: 'none', display: 'block', padding: '1.5rem' }}
              className="group bg-white rounded-xl border border-[#D0DCE8] hover:border-[#0D9488] hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div style={{ width: '3rem', height: '3rem', borderRadius: '0.5rem', background: '#CCFBF1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.875rem auto' }}>
                <svg style={{ width: '1.375rem', height: '1.375rem', color: '#0D9488' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
              </div>
              <h2 style={{ fontWeight: 600, fontSize: '1rem', color: '#1B3A5C', marginBottom: '4px' }}>Dispatch Checklist</h2>
              <p style={{ fontSize: '0.8125rem', color: '#6B7A8D', lineHeight: 1.4 }}>Complete a pre-dispatch quality check.</p>
            </Link>

            {/* SDS Vault — orange */}
            <Link href="/sds" style={{ textDecoration: 'none', display: 'block', padding: '1.5rem' }}
              className="group bg-white rounded-xl border border-[#D0DCE8] hover:border-[#EA580C] hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div style={{ width: '3rem', height: '3rem', borderRadius: '0.5rem', background: '#FFEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.875rem auto' }}>
                <svg style={{ width: '1.375rem', height: '1.375rem', color: '#EA580C' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 style={{ fontWeight: 600, fontSize: '1rem', color: '#1B3A5C', marginBottom: '4px' }}>SDS Vault</h2>
              <p style={{ fontSize: '0.8125rem', color: '#6B7A8D', lineHeight: 1.4 }}>Access safety data sheets for all materials.</p>
            </Link>

            {/* TDS Vault — indigo */}
            <Link href="/tds" style={{ textDecoration: 'none', display: 'block', padding: '1.5rem' }}
              className="group bg-white rounded-xl border border-[#D0DCE8] hover:border-[#4F46E5] hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div style={{ width: '3rem', height: '3rem', borderRadius: '0.5rem', background: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.875rem auto' }}>
                <svg style={{ width: '1.375rem', height: '1.375rem', color: '#4F46E5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 style={{ fontWeight: 600, fontSize: '1rem', color: '#1B3A5C', marginBottom: '4px' }}>TDS Vault</h2>
              <p style={{ fontSize: '0.8125rem', color: '#6B7A8D', lineHeight: 1.4 }}>Access technical data sheets for all materials.</p>
            </Link>
          </div>

          {/* Admin section */}
          {role === 'admin' && (
            <div style={{ textAlign: 'left' }}>
              <h2 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8B939E', marginBottom: '0.875rem' }}>Admin</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.25rem' }}>
                <Link href="/admin/knowledge" style={{ textDecoration: 'none', display: 'block', background: '#1B3A5C', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #2E5478' }}
                  className="hover:border-[#5B84B1] hover:shadow-md transition-all"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '6px' }}>
                    <HexIcon style={{ width: '1.25rem', height: '1.25rem', color: '#5B84B1', flexShrink: 0 }} />
                    <h3 style={{ fontWeight: 600, color: '#ffffff', fontSize: '1.0625rem' }}>Manage Knowledge Base</h3>
                  </div>
                  <p style={{ fontSize: '0.9375rem', color: '#8BAFD4' }}>Add, edit, or remove product and process information.</p>
                </Link>
                <Link href="/admin/sops" style={{ textDecoration: 'none', display: 'block', background: '#1B3A5C', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #2E5478' }}
                  className="hover:border-[#5B84B1] hover:shadow-md transition-all"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '6px' }}>
                    <svg style={{ width: '1.25rem', height: '1.25rem', color: '#5B84B1', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 style={{ fontWeight: 600, color: '#ffffff', fontSize: '1.0625rem' }}>Manage SOPs</h3>
                  </div>
                  <p style={{ fontSize: '0.9375rem', color: '#8BAFD4' }}>Publish and manage standard operating procedures.</p>
                </Link>
                <Link href="/admin/change-requests" style={{ textDecoration: 'none', display: 'block', background: '#1B3A5C', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #2E5478' }}
                  className="hover:border-[#5B84B1] hover:shadow-md transition-all"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '6px' }}>
                    <svg style={{ width: '1.25rem', height: '1.25rem', color: '#5B84B1', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <h3 style={{ fontWeight: 600, color: '#ffffff', fontSize: '1.0625rem' }}>Manage Change Requests</h3>
                  </div>
                  <p style={{ fontSize: '0.9375rem', color: '#8BAFD4' }}>Review, approve, or reject submitted change requests.</p>
                </Link>
                <Link href="/admin/ncrs" style={{ textDecoration: 'none', display: 'block', background: '#1B3A5C', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #2E5478' }}
                  className="hover:border-[#5B84B1] hover:shadow-md transition-all"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '6px' }}>
                    <svg style={{ width: '1.25rem', height: '1.25rem', color: '#5B84B1', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 style={{ fontWeight: 600, color: '#ffffff', fontSize: '1.0625rem' }}>Manage NCRs</h3>
                  </div>
                  <p style={{ fontSize: '0.9375rem', color: '#8BAFD4' }}>Review non-conformance reports and set dispositions.</p>
                </Link>
                <Link href="/admin/requisitions" style={{ textDecoration: 'none', display: 'block', background: '#1B3A5C', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #2E5478' }}
                  className="hover:border-[#5B84B1] hover:shadow-md transition-all"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '6px' }}>
                    <svg style={{ width: '1.25rem', height: '1.25rem', color: '#5B84B1', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
                    </svg>
                    <h3 style={{ fontWeight: 600, color: '#ffffff', fontSize: '1.0625rem' }}>Manage Requisitions</h3>
                  </div>
                  <p style={{ fontSize: '0.9375rem', color: '#8BAFD4' }}>Approve or reject purchase requisitions.</p>
                </Link>
                <Link href="/admin/dispatch" style={{ textDecoration: 'none', display: 'block', background: '#1B3A5C', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #2E5478' }}
                  className="hover:border-[#5B84B1] hover:shadow-md transition-all"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '6px' }}>
                    <svg style={{ width: '1.25rem', height: '1.25rem', color: '#5B84B1', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                    </svg>
                    <h3 style={{ fontWeight: 600, color: '#ffffff', fontSize: '1.0625rem' }}>Dispatch Records</h3>
                  </div>
                  <p style={{ fontSize: '0.9375rem', color: '#8BAFD4' }}>Audit dispatch checklists and flag any fails.</p>
                </Link>
                <Link href="/admin/sds" style={{ textDecoration: 'none', display: 'block', background: '#1B3A5C', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #2E5478' }}
                  className="hover:border-[#5B84B1] hover:shadow-md transition-all"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '6px' }}>
                    <svg style={{ width: '1.25rem', height: '1.25rem', color: '#5B84B1', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 style={{ fontWeight: 600, color: '#ffffff', fontSize: '1.0625rem' }}>Manage SDS Vault</h3>
                  </div>
                  <p style={{ fontSize: '0.9375rem', color: '#8BAFD4' }}>Upload and manage safety data sheets.</p>
                </Link>
                <Link href="/admin/tds" style={{ textDecoration: 'none', display: 'block', background: '#1B3A5C', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #2E5478' }}
                  className="hover:border-[#5B84B1] hover:shadow-md transition-all"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '6px' }}>
                    <svg style={{ width: '1.25rem', height: '1.25rem', color: '#5B84B1', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 style={{ fontWeight: 600, color: '#ffffff', fontSize: '1.0625rem' }}>Manage TDS Vault</h3>
                  </div>
                  <p style={{ fontSize: '0.9375rem', color: '#8BAFD4' }}>Upload and manage technical data sheets.</p>
                </Link>
                <Link href="/admin/users" style={{ textDecoration: 'none', display: 'block', background: '#1B3A5C', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #2E5478' }}
                  className="hover:border-[#5B84B1] hover:shadow-md transition-all"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '6px' }}>
                    <svg style={{ width: '1.25rem', height: '1.25rem', color: '#5B84B1', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <h3 style={{ fontWeight: 600, color: '#ffffff', fontSize: '1.0625rem' }}>Manage Users</h3>
                  </div>
                  <p style={{ fontSize: '0.9375rem', color: '#8BAFD4' }}>Add staff accounts and assign roles.</p>
                </Link>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
