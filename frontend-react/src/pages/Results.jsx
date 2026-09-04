import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import Map from '../components/Map'
import client from '../api/client'
import NotificationCenter from '../components/NotificationCenter'
import { Button, BottomNav, AppDrawer } from '../components/ui'
import { useAutoLocation } from '../hooks/useAutoLocation'

function getDistanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function Results() {
  const [searchParams] = useSearchParams()

  const [reports, setReports]     = useState([])
  const [filtered, setFiltered]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [severity, setSeverity]     = useState('')
  const [hazardType, setHazardType] = useState('')
  const [areaFilter, setAreaFilter] = useState(null)
  const [focusCoords, setFocusCoords] = useState(null)
  const [mapLocationInput, setMapLocationInput] = useState('')
  const [mapSearching, setMapSearching]         = useState(false)
  const [autoSet, setAutoSet]       = useState(false)

  const [menuOpen, setMenuOpen]     = useState(false)
  const navMenuRef = useRef(null)
  const drawerRef  = useRef(null)
  const [unreadCount, setUnreadCount] = useState(0)

  // Auto-location: GPS first, IP-geolocation fallback
  const { locationSource, detectedLocation } = useAutoLocation()
  // Ref keeps the latest areaFilter readable inside the effect without
  // adding it to deps (we only want to apply auto-location once on mount).
  const areaFilterRef = useRef(areaFilter)
  areaFilterRef.current = areaFilter
  const appliedAuto = useRef(false)

  const focusId = searchParams.get('focus')

  useEffect(() => {
    client.get('/reports/all')
      .then(({ data }) => { setReports(data); setFiltered(data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Deep-link: ?focus=<reportId> — fly the map to that pin.
  useEffect(() => {
    if (loading || !reports.length || !focusId) return
    const report = reports.find(r => String(r.id) === focusId)
    if (!report) return
    setFocusCoords({ lng: parseFloat(report.longitude), lat: parseFloat(report.latitude) })
  }, [loading, reports, focusId])

  // Apply auto-detected location as the default map centre/filter.
  // Skips if the user has already set a manual area filter.
  useEffect(() => {
    if (!detectedLocation || appliedAuto.current) return
    appliedAuto.current = true
    if (areaFilterRef.current) return
    setAreaFilter(detectedLocation)
    setAutoSet(true)
  }, [detectedLocation])

  useEffect(() => {
    let result = reports
    if (areaFilter) {
      result = result.filter(r => {
        if (!r.latitude || !r.longitude) return false
        return getDistanceMiles(areaFilter.lat, areaFilter.lng, parseFloat(r.latitude), parseFloat(r.longitude)) <= areaFilter.radius
      })
    }
    if (hazardType) result = result.filter(r => r.hazard_type === hazardType)
    if (severity)   result = result.filter(r => r.severity    === severity)
    setFiltered(result)
  }, [hazardType, severity, reports, areaFilter])

  const uniqueHazards = [...new Set(reports.map(r => r.hazard_type))]

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

  const handleMapLocationSearch = async () => {
    const q = mapLocationInput.trim()
    if (!q) return
    setMapSearching(true)
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`)
      const data = await res.json()
      if (!data.length) return
      setAreaFilter({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), radius: 25, label: data[0].display_name.split(',')[0] })
      setAutoSet(false)
    } catch {}
    finally { setMapSearching(false) }
  }

  return (
    <div className="min-h-screen bg-canvas">

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <header
        ref={navMenuRef}
        className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-xl border-b border-edge"
        style={{ '--navbar-h': '3.5rem' }}
      >
        <div className="flex items-center justify-between h-14 px-4 max-w-6xl mx-auto">

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

          <div className="flex items-center gap-2">
            <svg width="26" height="26" viewBox="0 0 56 56" fill="none" aria-hidden="true">
              <rect width="56" height="56" rx="16" fill="#22C55E"/>
              <path d="M28 10L14 16V28C14 36.4 20.2 44.2 28 46C35.8 44.2 42 36.4 42 28V16L28 10Z" fill="white"/>
              <path d="M22 28L26 32L34 24" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[17px] font-bold text-light tracking-tight">Hetusafe</span>
          </div>

          <NotificationCenter externalCount={unreadCount} />
        </div>
      </header>

      <AppDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        drawerRef={drawerRef}
      />

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">

        <div className="mt-8 mb-6">
          <h1 className="text-section font-bold text-light mb-1">Hazard Map</h1>
          <p className="text-caption text-muted">
            {filtered.length} report{filtered.length !== 1 ? 's' : ''} shown
            {areaFilter && (
              <span> within <strong className="text-light">{areaFilter.radius} miles</strong> of <strong className="text-light">{areaFilter.label}</strong></span>
            )}
          </p>
          {locationSource === 'detecting' && (
            <p className="text-caption text-muted mt-1">📡 Detecting your location…</p>
          )}
          {autoSet && areaFilter && locationSource !== 'detecting' && (
            <p className="text-caption text-accent mt-1">
              📍 Showing reports near <strong>{areaFilter.label}</strong>
              {locationSource === 'ip' && <span className="text-muted"> (approximate)</span>}
            </p>
          )}
        </div>

        <div className="space-y-3 mb-6">

          {/* Location search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg viewBox="0 0 24 24" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" aria-hidden="true">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search location…"
                value={mapLocationInput}
                onChange={e => setMapLocationInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleMapLocationSearch()}
                className="w-full bg-elevated border border-edge rounded-xl pl-9 pr-4 py-2.5 text-body text-light placeholder:text-muted focus:outline-none focus:border-accent"
              />
            </div>
            <Button variant="primary" size="sm" onClick={handleMapLocationSearch} disabled={mapSearching}>
              {mapSearching ? '…' : 'Go'}
            </Button>
            {areaFilter && (
              <Button variant="secondary" size="sm" onClick={() => { setAreaFilter(null); setMapLocationInput(''); setAutoSet(false) }}>
                Clear
              </Button>
            )}
          </div>

          {/* Active area label */}
          {areaFilter && (
            <p className="text-caption text-accent px-1">
              📍 Near <strong>{areaFilter.label}</strong> · {areaFilter.radius} mi · {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </p>
          )}

          {/* Hazard type dropdown + severity filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <select
                value={hazardType}
                onChange={e => setHazardType(e.target.value)}
                className="appearance-none bg-elevated border border-edge rounded-xl px-3 py-1.5 text-caption text-light focus:outline-none focus:border-accent pr-6"
              >
                <option value="">All Types</option>
                {uniqueHazards.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none text-xs">▾</span>
            </div>
            <span className="w-px h-4 bg-edge shrink-0" aria-hidden="true" />
            {[
              { label: 'All',      value: '',         activeCls: 'border-accent bg-accent/10 text-accent',              idleCls: 'border-edge bg-elevated text-muted hover:border-accent/40 hover:text-light' },
              { label: 'Critical', value: 'critical', activeCls: 'border-[#9333ea] bg-[#9333ea]/10 text-[#9333ea]',     idleCls: 'border-edge bg-elevated text-muted hover:border-[#9333ea]/40 hover:text-[#9333ea]' },
              { label: 'High',     value: 'high',     activeCls: 'border-danger bg-danger/10 text-danger',              idleCls: 'border-edge bg-elevated text-muted hover:border-danger/40 hover:text-danger' },
              { label: 'Medium',   value: 'medium',   activeCls: 'border-warn bg-warn/10 text-warn',                    idleCls: 'border-edge bg-elevated text-muted hover:border-warn/40 hover:text-warn' },
              { label: 'Low',      value: 'low',      activeCls: 'border-accent bg-accent/10 text-accent',              idleCls: 'border-edge bg-elevated text-muted hover:border-accent/40 hover:text-accent' },
            ].map(pill => (
              <button
                key={pill.label}
                type="button"
                onClick={() => setSeverity(pill.value)}
                className={`px-3 py-1.5 rounded-full border text-caption font-semibold transition-all focus:outline-none ${
                  severity === pill.value ? pill.activeCls : pill.idleCls
                }`}
              >
                {pill.label}
              </button>
            ))}
            <span className="text-caption text-muted ml-auto">{filtered.length} report{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Map canvas */}
          <div
            className="rounded-2xl overflow-hidden border border-edge"
            style={{ height: 'clamp(400px, 55vh, 600px)' }}
          >
            {loading
              ? <div className="h-full flex items-center justify-center bg-surface text-muted text-body">Loading…</div>
              : <Map
                  reports={filtered}
                  zoom={areaFilter ? 10 : 5}
                  center={areaFilter ? [areaFilter.lng, areaFilter.lat] : undefined}
                  showHeatmapToggle
                  focusCoords={focusCoords}
                />
            }
          </div>

          {/* Legend */}
          <div className="flex items-center gap-x-4 gap-y-1 flex-wrap px-1">
            {[
              { label: 'Critical', color: '#9333ea' },
              { label: 'High',     color: '#ef4444' },
              { label: 'Medium',   color: '#f59e0b' },
              { label: 'Low',      color: '#22c55e' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-caption text-muted">{label}</span>
              </div>
            ))}
            <span className="text-caption text-muted ml-auto">Click a pin for details</span>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
