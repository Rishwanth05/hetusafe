import { useState, useEffect, useRef } from 'react'
import client from '../api/client'
import NotificationCenter from '../components/NotificationCenter'
import { AppDrawer, BottomNav, Card, Button } from '../components/ui'

/* ── Severity dot + badge colours — mirrors NotificationCenter's palette ─── */
const SEV = {
  low:      { dot: '#22c55e', cls: 'text-accent  bg-accent/10  border-accent/25',  label: 'INFO'     },
  medium:   { dot: '#f59e0b', cls: 'text-warn    bg-warn/10    border-warn/25',    label: 'ALERT'    },
  high:     { dot: '#ef4444', cls: 'text-danger  bg-danger/10  border-danger/25',  label: 'HIGH'     },
  critical: { dot: '#ef4444', cls: 'text-danger  bg-danger/10  border-danger/25',  label: 'CRITICAL' },
}

const TABS = [
  { id: 'all',     label: 'All'     },
  { id: 'updates', label: 'Updates' },
]

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function Alerts() {
  /* ── Notification state (same API calls as NotificationCenter) ────────── */
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]             = useState(true)
  const [tab, setTab]                     = useState('all')

  /* ── Top-bar / drawer state ───────────────────────────────────────────── */
  const [menuOpen, setMenuOpen]         = useState(false)
  const [unreadCount, setUnreadCount]   = useState(0)
  const navMenuRef = useRef(null)
  const drawerRef  = useRef(null)

  /* ── Fetch + mark-all-read on mount ──────────────────────────────────── */
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data } = await client.get('/notifications')
        setNotifications(data)
        await client.put('/notifications/read-all').catch(() => {})
        setUnreadCount(0)
      } catch {}
      finally { setLoading(false) }
    }
    load()
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

  /* ── Handlers (same logic as NotificationCenter) ─────────────────────── */
  async function handleDelete(id) {
    try {
      await client.delete(`/notifications/${id}`)
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch {}
  }

  async function handleClearAll() {
    if (!window.confirm('Delete all notifications?')) return
    try {
      await client.delete('/notifications/clear-all')
      setNotifications([])
      setUnreadCount(0)
    } catch {}
  }

  /* ── Tab filter ──────────────────────────────────────────────────────── */
  const filtered = notifications.filter(n => {
    if (tab === 'updates') return n.type !== 'mention'
    return true
  })

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
            <span className="text-[17px] font-bold text-light tracking-tight">Alerts</span>
          </div>

          <NotificationCenter externalCount={unreadCount} />
        </div>
      </header>

      <AppDrawer open={menuOpen} onClose={() => setMenuOpen(false)} drawerRef={drawerRef} />

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">

        {/* Page header + Clear All */}
        <div className="flex items-center justify-between mt-8 mb-5">
          <div>
            <h1 className="text-section font-bold text-light">🔔 Notifications</h1>
            <p className="text-caption text-muted mt-0.5">
              {notifications.length} total · marked as read on open
            </p>
          </div>
          {notifications.length > 0 && (
            <Button variant="secondary" size="sm" onClick={handleClearAll}>
              Clear all
            </Button>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-surface border border-edge rounded-2xl p-1 mb-5 w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-body font-semibold transition-all focus:outline-none ${
                tab === t.id
                  ? 'bg-elevated text-light shadow-sm'
                  : 'text-muted hover:text-light'
              }`}
            >
              {t.label}
              {t.id === 'all' && notifications.length > 0 && (
                <span className="ml-1.5 text-caption text-muted">({notifications.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-2 border-edge border-t-accent rounded-full animate-spin" />
            <p className="text-body text-muted">Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="py-16 text-center">
            <p className="text-4xl mb-3" aria-hidden="true">✅</p>
            <p className="text-section font-semibold text-light mb-1">All caught up!</p>
            <p className="text-body text-muted">
              {tab === 'all' ? 'No notifications yet.' : 'No hazard updates yet.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(n => {
              const s = SEV[n.severity] || SEV.medium
              const isCritical = n.severity === 'critical'
              return (
                <Card
                  key={n.id}
                  className={`flex items-start gap-3 p-4 ${isCritical ? 'border-danger/40' : ''}`}
                  style={isCritical ? { background: 'rgba(239,68,68,0.05)' } : undefined}
                >
                  {/* Severity dot */}
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
                    style={{ background: s.dot }}
                    aria-hidden="true"
                  />

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className={`text-body font-bold leading-snug ${isCritical ? 'text-danger' : 'text-light'}`}>
                        {n.title}
                      </p>
                      <span className={`text-[10px] font-bold border rounded px-1.5 py-0.5 whitespace-nowrap shrink-0 ${s.cls}`}>
                        {s.label}
                      </span>
                    </div>
                    <p className="text-caption text-muted leading-relaxed mb-1.5">{n.message}</p>
                    <p className="text-[11px] text-muted">{timeAgo(n.created_at)}</p>
                  </div>

                  {/* Delete button — 44×44px touch target */}
                  <button
                    onClick={() => handleDelete(n.id)}
                    aria-label="Delete notification"
                    className="w-11 h-11 -mt-2 -mr-2 shrink-0 flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-colors focus:outline-none"
                  >
                    ✕
                  </button>
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
