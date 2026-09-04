import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import NotificationCenter from '../components/NotificationCenter'
import { io } from 'socket.io-client'
import { Button, BottomNav, StatCard, Card, AppDrawer, PriorityBadge } from '../components/ui'

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }

/* ── Small helper ────────────────────────────────────────────────────────── */

export default function Dashboard() {
  const navigate = useNavigate()

  // ── All state from original (unchanged) ────────────────────────────────
  const [reports, setReports]               = useState([])
  const [loading, setLoading]               = useState(true)
  const [newReportFlash, setNewReportFlash] = useState(null)
  const socketRef = useRef(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const navMenuRef = useRef(null)
  // drawerRef added so clicks inside the drawer panel don't fire the
  // navMenuRef outside-click handler and immediately close the drawer.
  const drawerRef = useRef(null)

  const [unreadCount, setUnreadCount] = useState(0)

  // ── Nearby reports feature ──────────────────────────────────────────────
  const [nearbyReports, setNearbyReports]   = useState([])
  const [nearbyLoading, setNearbyLoading]   = useState(false)
  const [nearbyCoords, setNearbyCoords]     = useState(null)   // { lat, lng }
  const [nearbyLabel, setNearbyLabel]       = useState(null)   // Nominatim display name
  const [locationState, setLocationState]   = useState('pending') // 'pending'|'granted'|'denied'|'confirmed'
  const [areaInput, setAreaInput]           = useState('')
  const [areaError, setAreaError]           = useState('')
  const [areaLoading, setAreaLoading]       = useState(false)

  // ── All useEffects from original (unchanged logic) ──────────────────────
  useEffect(() => {
    client.get('/reports/all')
      .then(({ data }) => {
        const sorted = [...data].sort((a, b) =>
          (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4)
        )
        setReports(sorted)
      })
      .catch(err => {
        console.error('Reports fetch failed:', err.response?.status, err.response?.data, err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  // RT-2 — Socket.io real-time listener
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    socketRef.current = io(API_URL, { withCredentials: true })

    socketRef.current.on('connect', () => {})

    socketRef.current.on('new-report', (report) => {
      setReports(prev => {
        if (prev.find(r => r.id === report.id)) return prev
        const updated = [report, ...prev].sort((a, b) =>
          (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4)
        )
        return updated
      })
      setNewReportFlash(report)
      setTimeout(() => setNewReportFlash(null), 5000)
    })

    return () => { socketRef.current?.disconnect() }
  }, [])

  // Close nav menu on outside click — also checks drawerRef so clicks
  // inside the open drawer panel don't immediately dismiss it.
  useEffect(() => {
    if (!menuOpen) return
    const close = (e) => {
      const inHeader = navMenuRef.current?.contains(e.target)
      const inDrawer = drawerRef.current?.contains(e.target)
      if (!inHeader && !inDrawer) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await client.get('/notifications/unread-count')
        setUnreadCount(res.data.count)
      } catch {}
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 20000)
    return () => clearInterval(interval)
  }, [])

  // ── Geolocation: request on mount, set locationState ───────────────────
  useEffect(() => {
    if (!navigator.geolocation) { setLocationState('denied'); return }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setNearbyCoords({ lat: coords.latitude, lng: coords.longitude })
        setLocationState('granted')
      },
      () => setLocationState('denied'),
      { timeout: 8000 }
    )
  }, [])

  // ── Fetch nearby reports when coords available; poll every 30s ──────────
  useEffect(() => {
    if (!nearbyCoords) return
    const fetchNearby = () => {
      setNearbyLoading(true)
      client.get(`/reports/nearby?lat=${nearbyCoords.lat}&lng=${nearbyCoords.lng}&radius_km=10&limit=5`)
        .then(({ data }) => setNearbyReports(data))
        .catch(() => {})
        .finally(() => setNearbyLoading(false))
    }
    fetchNearby()
    const id = setInterval(fetchNearby, 30000)
    return () => clearInterval(id)
  }, [nearbyCoords])

  // ── Nominatim area search (used when geolocation is denied) ────────────
  const handleAreaSearch = async () => {
    if (!areaInput.trim()) return
    setAreaLoading(true)
    setAreaError('')
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(areaInput.trim())}&format=json&limit=1`,
        { headers: { 'User-Agent': 'Hetusafe/1.0 (https://hetusafe.com)', 'Referer': 'https://hetusafe.com' } }
      )
      const data = await res.json()
      if (!data.length) {
        setAreaError("Couldn't find that location — try a nearby town or city name")
        return
      }
      const { lat, lon, display_name } = data[0]
      setNearbyCoords({ lat: parseFloat(lat), lng: parseFloat(lon) })
      setNearbyLabel(display_name)
      setLocationState('confirmed')
    } catch {
      setAreaError('Location search failed. Please try again.')
    } finally {
      setAreaLoading(false)
    }
  }

  const timeAgo = (d) => {
    const diff = (Date.now() - new Date(d)) / 1000
    if (diff < 60)    return 'just now'
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return new Date(d).toLocaleDateString()
  }

  const formatDistance = (km) => {
    if (km < 1) return `${Math.round(km * 1000)} m away`
    return `${km.toFixed(1)} km away`
  }

  // ── Derived stats (from existing reports data — no new API calls) ───────
  const resolvedCount = reports.filter(r => r.status === 'resolved').length
  const activeCount   = reports.filter(r => r.status !== 'resolved').length
  const rateStr = reports.length > 0
    ? Math.round((resolvedCount / reports.length) * 100) + '%'
    : '—'

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-canvas">

      {/* RT-2 — Real-time flash toast (dark-theme restyled) */}
      {newReportFlash && (
        <div
          className="fixed top-16 right-4 z-[9999] bg-elevated border border-edge rounded-2xl px-4 py-3 max-w-xs w-[calc(100vw-2rem)] flex items-center gap-3 shadow-card"
          style={{ animation: 'slideIn 0.3s ease' }}
        >
          <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
          <span className="text-2xl shrink-0" aria-hidden="true">🚨</span>
          <div className="min-w-0 flex-1">
            <p className="text-body text-light font-bold">New report added</p>
            <p className="text-caption text-muted truncate">
              {newReportFlash.hazard_type} — {newReportFlash.severity}
            </p>
          </div>
          <button
            onClick={() => setNewReportFlash(null)}
            aria-label="Dismiss notification"
            className="text-muted hover:text-light shrink-0 text-lg leading-none ml-auto"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      {/*
        --navbar-h consumed by NotificationCenter's mobile panel offset.
        h-14 = 3.5rem = 56px.
      */}
      <header
        ref={navMenuRef}
        className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-xl border-b border-edge"
        style={{ '--navbar-h': '3.5rem' }}
      >
        <div className="flex items-center justify-between h-14 px-4 max-w-2xl mx-auto">

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted hover:text-light hover:bg-elevated transition-colors shrink-0"
          >
            {menuOpen
              ? <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              : <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            }
          </button>

          {/* Logo + title */}
          <div className="flex items-center gap-2">
            <svg width="26" height="26" viewBox="0 0 56 56" fill="none" aria-hidden="true">
              <rect width="56" height="56" rx="16" fill="#22C55E"/>
              <path d="M28 10L14 16V28C14 36.4 20.2 44.2 28 46C35.8 44.2 42 36.4 42 28V16L28 10Z" fill="white"/>
              <path d="M22 28L26 32L34 24" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[17px] font-bold text-light tracking-tight">Hetusafe</span>
          </div>

          {/* Notification bell (existing component — unchanged) */}
          <NotificationCenter externalCount={unreadCount} />
        </div>
      </header>

      {/* ── Side drawer (shared AppDrawer component) ────────────────────── */}
      <AppDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        drawerRef={drawerRef}
      />

      {/* ── Main scrollable content ─────────────────────────────────────── */}
      {/*
        pb-[calc(4rem+env(safe-area-inset-bottom))] ensures the last visible
        content clears the fixed BottomNav bar plus the iOS home-indicator zone.
        (Flagged as required page-level concern in the Stage 2 hardening pass.)
      */}
      <main className="max-w-2xl mx-auto px-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">

        {/* Tagline pill */}
        <div className="mt-8 mb-5">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-caption font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" aria-hidden="true" />
            Live. Local. Together.
          </span>
        </div>

        {/* Hero heading — text-hero = 2rem/700/−0.02em tracking (from tailwind.config.js) */}
        <h1 className="text-hero text-light mb-3">
          Together, We Keep<br />
          Our City Safe
        </h1>
        <p className="text-body text-muted mb-8 max-w-sm">
          Report community hazards, track resolutions, and make your neighbourhood
          safer — in real time.
        </p>

        {/* CTA — sole hero action (FAB handles report submission app-wide) */}
        <div className="mb-10">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => navigate('/results', { state: { view: 'map' } })}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 shrink-0" aria-hidden="true">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            View Live Map
          </Button>
        </div>

        {/* Stat grid
            2 cols on ≤639px (each card ≈(375−12)/2 = 181px → fits comfortably).
            4 cols on sm+ (640px+).
            Values come from the existing `reports` state — no new API calls. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <button onClick={() => navigate('/my-reports')} className="text-left focus:outline-none">
            <StatCard value={loading ? '…' : String(reports.length)} label="Reports" />
          </button>
          <button onClick={() => navigate('/my-reports', { state: { tab: 'active' } })} className="text-left focus:outline-none">
            <StatCard value={loading ? '…' : String(activeCount)} label="Active" accent="text-warn" />
          </button>
          <button onClick={() => navigate('/my-reports', { state: { tab: 'resolved' } })} className="text-left focus:outline-none">
            <StatCard value={loading ? '…' : String(resolvedCount)} label="Resolved" accent="text-accent" />
          </button>
          <button onClick={() => navigate('/my-reports')} className="text-left focus:outline-none">
            <StatCard value={loading ? '…' : rateStr} label="Rate" accent="text-glow" />
          </button>
        </div>

        {/* ── Near You ────────────────────────────────────────────────────── */}
        <section className="mb-10" aria-label="Nearby reports">
          <h2 className="text-section font-bold text-light mb-4">Near You</h2>

          {/* Locating… */}
          {locationState === 'pending' && (
            <Card className="p-6 flex items-center gap-3 text-muted">
              <div className="w-4 h-4 border-2 border-edge border-t-accent rounded-full animate-spin shrink-0" />
              <span className="text-caption">Locating you…</span>
            </Card>
          )}

          {/* Geolocation denied — area input fallback */}
          {locationState === 'denied' && (
            <Card className="p-5">
              <p className="text-body text-light font-semibold mb-0.5">Enable location, or enter your area</p>
              <p className="text-caption text-muted mb-4">to see nearby hazards</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={areaInput}
                  onChange={e => setAreaInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAreaSearch()}
                  placeholder="e.g. Downtown Austin, TX"
                  className="flex-1 bg-canvas border border-edge rounded-xl px-3 py-2.5 text-body text-light placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                />
                <Button variant="primary" size="sm" onClick={handleAreaSearch} disabled={areaLoading}>
                  {areaLoading ? '…' : 'Go'}
                </Button>
              </div>
              {areaError && <p className="text-caption text-danger mt-2">{areaError}</p>}
            </Card>
          )}

          {/* Nominatim confirmed label + re-enter option */}
          {locationState === 'confirmed' && nearbyLabel && (
            <p className="text-caption text-muted mb-3">
              Near:{' '}
              <span className="text-light font-medium">
                {nearbyLabel.split(',').slice(0, 2).join(',')}
              </span>
              {' — not right? '}
              <button
                onClick={() => { setLocationState('denied'); setNearbyCoords(null); setNearbyLabel(null); setAreaInput('') }}
                className="text-accent hover:underline focus:outline-none"
              >
                Try again
              </button>
            </p>
          )}

          {/* Feed — loading skeleton or cards */}
          {(locationState === 'granted' || locationState === 'confirmed') && (
            nearbyLoading && nearbyReports.length === 0 ? (
              <div className="flex items-center justify-center py-10 gap-3">
                <div className="w-6 h-6 border-2 border-edge border-t-accent rounded-full animate-spin" />
                <span className="text-caption text-muted">Finding nearby reports…</span>
              </div>
            ) : nearbyReports.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-3xl mb-2" aria-hidden="true">🌿</p>
                <p className="text-body font-semibold text-light mb-1">No hazards reported near you</p>
                <p className="text-caption text-muted">— great sign!</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {nearbyReports.map(r => (
                  <button
                    key={r.id}
                    onClick={() => navigate('/results', { state: { view: 'map', lat: parseFloat(r.latitude), lng: parseFloat(r.longitude) } })}
                    className="w-full text-left focus:outline-none"
                  >
                    <Card className="p-3 flex items-center gap-3 hover:border-accent/30 transition-colors active:scale-[0.99]">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-body text-light font-semibold truncate">{r.hazard_type}</span>
                          <PriorityBadge level={r.severity} />
                        </div>
                        <p className="text-caption text-muted">
                          {formatDistance(parseFloat(r.distance_km))} · {timeAgo(r.created_at)}
                        </p>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-muted shrink-0" aria-hidden="true">
                        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Card>
                  </button>
                ))}
              </div>
            )
          )}
        </section>

      </main>

      {/* Fixed bottom navigation */}
      <BottomNav />
    </div>
  )
}
