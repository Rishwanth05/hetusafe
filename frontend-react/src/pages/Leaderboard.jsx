import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import NotificationCenter from '../components/NotificationCenter'
import { AppDrawer, BottomNav, Card, Button } from '../components/ui'

/* ── Constants ───────────────────────────────────────────────────────────── */
const RANK_MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }

/* ── Main component ──────────────────────────────────────────────────────── */
export default function Leaderboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  /* ── All existing state (unchanged) ──────────────────────────────────── */
  const [leaders, setLeaders]   = useState([])
  const [myBadges, setMyBadges] = useState({ stats: null, badges: [] })
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('leaderboard')

  /* ── Top-bar / drawer state ───────────────────────────────────────────── */
  const [menuOpen, setMenuOpen]     = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const navMenuRef = useRef(null)
  const drawerRef  = useRef(null)

  /* ── All existing useEffects (unchanged) ─────────────────────────────── */
  useEffect(() => {
    Promise.all([
      client.get('/badges/leaderboard'),
      client.get('/badges/me'),
    ]).then(([lRes, bRes]) => {
      setLeaders(lRes.data)
      setMyBadges(bRes.data)
    }).catch(console.error)
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
    const fetchUnread = async () => {
      try { setUnreadCount((await client.get('/notifications/unread-count')).data.count) } catch {}
    }
    fetchUnread()
    const id = setInterval(fetchUnread, 20000)
    return () => clearInterval(id)
  }, [])

  /* ── All existing handlers (unchanged) ──────────────────────────────── */
  const handleLogout = () => { logout(); navigate('/login') }
  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-canvas">

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <header
        ref={navMenuRef}
        className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-xl border-b border-edge"
      >
        <div className="flex items-center justify-between h-14 px-4 max-w-3xl mx-auto">
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
            <span className="text-[17px] font-bold text-light tracking-tight">Leaderboard</span>
          </div>

          <NotificationCenter externalCount={unreadCount} />
        </div>
      </header>

      <AppDrawer open={menuOpen} onClose={() => setMenuOpen(false)} drawerRef={drawerRef} />

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">

        {/* Page header */}
        <div className="mt-8 mb-6">
          <h1 className="text-hero text-light mb-1">🏆 Community Rankings</h1>
          <p className="text-caption text-muted">
            +10 pts per report submitted · +25 pts per report resolved
          </p>
        </div>

        {/* Tab toggle */}
        <div className="flex gap-1 bg-surface border border-edge rounded-2xl p-1 mb-6 w-fit">
          {[
            { id: 'leaderboard', label: '🏆 Leaderboard' },
            { id: 'badges',      label: '🏅 My Badges'   },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-xl text-body font-semibold transition-all focus:outline-none ${
                tab === t.id
                  ? 'bg-elevated text-light shadow-sm'
                  : 'text-muted hover:text-light'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-2 border-edge border-t-accent rounded-full animate-spin" />
            <p className="text-body text-muted">Loading…</p>
          </div>
        ) : tab === 'leaderboard' ? (
          <LeaderboardTab leaders={leaders} userId={user?.id} />
        ) : (
          <BadgesTab myBadges={myBadges} />
        )}

      </main>

      <BottomNav />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   LEADERBOARD TAB — flat ranked list, graceful at any user count
══════════════════════════════════════════════════════════════════════════ */
function LeaderboardTab({ leaders, userId }) {
  if (!leaders.length) {
    return (
      <Card className="py-20 text-center">
        <p className="text-5xl mb-4" aria-hidden="true">🚀</p>
        <p className="text-section font-semibold text-light mb-2">No reports yet</p>
        <p className="text-body text-muted">Be the first to submit a hazard report!</p>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {leaders.map((row, i) => {
        const rank  = i + 1
        const isMe  = row.id === userId
        const medal = RANK_MEDAL[rank]
        const ini   = (row.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        return (
          <Card
            key={row.id}
            className={`flex items-center gap-4 p-4 ${isMe ? 'border-accent/50 bg-accent/5' : ''}`}
          >
            {/* Rank — medal emoji for top 3, plain #N for the rest */}
            <div className="w-8 text-center shrink-0">
              {medal
                ? <span className="text-2xl leading-none" aria-label={`Rank ${rank}`}>{medal}</span>
                : <span className="text-body font-bold text-muted">#{rank}</span>
              }
            </div>

            {/* Avatar */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-caption font-bold text-light shrink-0 select-none ${
              isMe ? 'bg-accent/20 border border-accent/40' : 'bg-elevated border border-edge'
            }`}>
              {ini}
            </div>

            {/* Name + stats */}
            <div className="flex-1 min-w-0">
              <p className="text-body text-light font-bold truncate">
                {row.name}
                {isMe && <span className="text-caption text-accent font-semibold ml-1.5">(you)</span>}
              </p>
              <p className="text-caption text-muted mt-0.5">
                {row.reports_submitted} submitted · {row.reports_resolved} resolved · {row.badge_count} badge{row.badge_count !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Top badge + score */}
            <div className="text-right shrink-0">
              {row.top_badge && <div className="text-xl mb-0.5" aria-hidden="true">{row.top_badge}</div>}
              <p className="text-body font-black text-accent">{row.score}</p>
              <p className="text-[10px] text-muted">pts</p>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   BADGES TAB
══════════════════════════════════════════════════════════════════════════ */
function BadgesTab({ myBadges }) {
  const { stats, badges } = myBadges
  const earned = badges.filter(b => b.earned)

  return (
    <div className="space-y-5">

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Reports Submitted', value: stats.reports_submitted, cls: 'text-accent'     },
            { label: 'Reports Resolved',  value: stats.reports_resolved,  cls: 'text-blue-400'   },
          ].map(({ label, value, cls }) => (
            <Card key={label} className="p-5 text-center">
              <p className={`text-4xl font-black mb-1 ${cls}`}>{value}</p>
              <p className="text-caption text-muted">{label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Progress line */}
      <p className="text-caption text-muted">
        <span className="text-light font-semibold">{earned.length}</span> of{' '}
        <span className="text-light font-semibold">{badges.length}</span> badges earned
      </p>

      {/* Badge grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {badges.map(b => (
          <Card
            key={b.id}
            className={`p-5 text-center flex flex-col items-center gap-2 transition-all ${
              b.earned
                ? 'border-accent/40'
                : 'opacity-40'
            }`}
          >
            <span
              className="text-5xl"
              style={{ filter: b.earned ? 'none' : 'grayscale(100%)' }}
              aria-hidden="true"
            >
              {b.emoji}
            </span>
            <p className="text-body font-bold text-light leading-snug">{b.name}</p>
            <p className="text-caption text-muted leading-relaxed">{b.description}</p>
            {b.earned && (
              <span className="text-[10px] font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full tracking-wider">
                ✓ EARNED
              </span>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
