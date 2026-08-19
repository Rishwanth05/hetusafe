import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import NotificationCenter from '../components/NotificationCenter'
import { AppDrawer, BottomNav, Card, Button, PriorityBadge } from '../components/ui'

export default function MyReports() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  /* ── Data state — same endpoint as Profile.jsx ───────────────────────── */
  const [reports, setReports]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('active')

  /* ── Top-bar / drawer state ───────────────────────────────────────────── */
  const [menuOpen, setMenuOpen]         = useState(false)
  const [unreadCount, setUnreadCount]   = useState(0)
  const navMenuRef = useRef(null)
  const drawerRef  = useRef(null)

  /* ── Fetch: same API call used by Profile ─────────────────────────────── */
  useEffect(() => {
    client.get('/auth/my-reports')
      .then(({ data }) => setReports(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const close = (e) => {
      if (!navMenuRef.current?.contains(e.target) && !drawerRef.current?.contains(e.target))
        setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  useEffect(() => {
    const poll = async () => {
      try { setUnreadCount((await client.get('/notifications/unread-count')).data.count) } catch {}
    }
    poll()
    const id = setInterval(poll, 20000)
    return () => clearInterval(id)
  }, [])

  /* ── Derived lists ───────────────────────────────────────────────────── */
  const active   = reports.filter(r => r.status !== 'resolved')
  const resolved = reports.filter(r => r.status === 'resolved')
  const shown    = tab === 'active' ? active : resolved

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-canvas">

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <header
        ref={navMenuRef}
        className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-xl border-b border-edge"
      >
        <div className="flex items-center justify-between h-14 px-4 max-w-2xl mx-auto">
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted hover:text-light hover:bg-elevated transition-colors shrink-0"
          >
            {menuOpen
              ? <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              : <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            }
          </button>

          <div className="flex items-center gap-2">
            <svg width="26" height="26" viewBox="0 0 56 56" fill="none" aria-hidden="true">
              <rect width="56" height="56" rx="16" fill="#22C55E"/>
              <path d="M28 10L14 16V28C14 36.4 20.2 44.2 28 46C35.8 44.2 42 36.4 42 28V16L28 10Z" fill="white"/>
              <path d="M22 28L26 32L34 24" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[17px] font-bold text-light tracking-tight">My Reports</span>
          </div>

          <NotificationCenter externalCount={unreadCount} />
        </div>
      </header>

      <AppDrawer open={menuOpen} onClose={() => setMenuOpen(false)} drawerRef={drawerRef} />

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">

        {/* Page header */}
        <div className="mt-8 mb-5">
          <h1 className="text-section font-bold text-light">My Reports</h1>
          <p className="text-caption text-muted mt-0.5">
            {reports.length} total · {active.length} active · {resolved.length} resolved
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-surface border border-edge rounded-2xl p-1 mb-5 w-fit">
          <button
            onClick={() => setTab('active')}
            className={`px-5 py-2 rounded-xl text-body font-semibold transition-all focus:outline-none ${
              tab === 'active' ? 'bg-elevated text-light shadow-sm' : 'text-muted hover:text-light'
            }`}
          >
            Active
            {active.length > 0 && (
              <span className="ml-1.5 text-caption text-danger font-bold">({active.length})</span>
            )}
          </button>
          <button
            onClick={() => setTab('resolved')}
            className={`px-5 py-2 rounded-xl text-body font-semibold transition-all focus:outline-none ${
              tab === 'resolved' ? 'bg-elevated text-light shadow-sm' : 'text-muted hover:text-light'
            }`}
          >
            Resolved
            {resolved.length > 0 && (
              <span className="ml-1.5 text-caption text-accent font-bold">({resolved.length})</span>
            )}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-2 border-edge border-t-accent rounded-full animate-spin" />
            <p className="text-body text-muted">Loading…</p>
          </div>
        ) : shown.length === 0 ? (
          <Card className="py-16 text-center">
            <p className="text-4xl mb-3" aria-hidden="true">{tab === 'active' ? '✅' : '📋'}</p>
            <p className="text-section font-semibold text-light mb-2">
              {tab === 'active' ? 'No active reports' : 'No resolved reports yet'}
            </p>
            <p className="text-body text-muted mb-6">
              {tab === 'active'
                ? 'All your reports have been resolved — great work!'
                : 'Resolved reports will appear here once community members mark them fixed.'}
            </p>
            {tab === 'active' && (
              <Button variant="primary" onClick={() => navigate('/report')}>
                Report a hazard
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {shown.map(r => {
              const isResolved = r.status === 'resolved'
              return (
                <Card
                  key={r.id}
                  className={`p-4 flex items-center gap-4 ${isResolved ? 'border-accent/30' : ''}`}
                >
                  {/* Thumbnail */}
                  {r.image_url
                    ? <img
                        src={r.image_url}
                        alt="hazard"
                        className="w-14 h-14 object-cover rounded-xl shrink-0"
                      />
                    : <div className="w-14 h-14 bg-elevated rounded-xl flex items-center justify-center text-2xl shrink-0" aria-hidden="true">
                        🚧
                      </div>
                  }

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <strong className="text-body text-light font-bold truncate">{r.hazard_type}</strong>
                      <PriorityBadge level={r.severity} />
                    </div>
                    <p className="text-caption text-muted mb-1 leading-relaxed truncate">
                      {r.description?.slice(0, 80)}{r.description?.length > 80 ? '…' : ''}
                    </p>
                    <p className="text-[11px] text-muted">
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Status pill */}
                  <span className={`text-caption font-semibold px-2.5 py-1 rounded-full border shrink-0 ${
                    isResolved
                      ? 'text-accent bg-accent/10 border-accent/20'
                      : 'text-warn bg-warn/10 border-warn/20'
                  }`}>
                    {isResolved ? '✅ Resolved' : 'Active'}
                  </span>
                </Card>
              )
            })}
          </div>
        )}

      </main>

      <BottomNav />
    </div>
  )
}
