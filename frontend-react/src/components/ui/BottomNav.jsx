import { Link, useLocation } from 'react-router-dom'

/* ── Inline SVG icons (no icon-library dependency) ─────────────────────────── */
function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 22V12h6v10"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="8" y1="2" x2="8"  y2="18" stroke="currentColor" strokeWidth="2"/>
      <line x1="16" y1="6" x2="16" y2="22" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="5"  y1="12" x2="19" y2="12"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

function ReportsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
      <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function EmergencyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* ── Tab definitions (null = FAB slot) ────────────────────────────────────── */
const TABS = [
  { to: '/dashboard', label: 'Home',    Icon: HomeIcon },
  { to: '/results',   label: 'Map',     Icon: MapIcon,  state: { view: 'map' } },
  null,
  { to: '/my-reports', label: 'My Reports', Icon: ReportsIcon },
  { to: '/emergency',  label: 'Emergency',  Icon: EmergencyIcon },
]

/**
 * BottomNav — fixed 5-icon mobile nav bar.
 * The centre slot is a raised circular FAB that routes to /report.
 * Active tab gets a circular accent-green background highlight.
 *
 * Render inside a layout that wraps authenticated pages, or place it
 * in App.jsx alongside the router.
 */
export default function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-surface/95 backdrop-blur-xl border-t border-edge pb-safe"
      aria-label="Main navigation"
    >
      {/*
        grid-cols-5 gives each slot an identical 1/5-width tap zone (~75px on 375px).
        justify-around was removed because it left variable-width gaps that made
        off-centre taps miss the link element on narrow phones.
      */}
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
        {TABS.map((tab, i) => {
          /* ── FAB (centre slot) ───────────────────────────────── */
          if (tab === null) {
            return (
              <Link
                key="fab"
                to="/report"
                aria-label="Submit report"
                className="flex flex-col items-center justify-end pb-2"
              >
                {/*
                  -top-5 raises the circle above the nav border-t.
                  The Link still occupies its full grid cell so the tap
                  zone covers the entire column even below the circle.
                */}
                <span className="relative -top-5 w-14 h-14 rounded-full bg-accent flex items-center justify-center text-canvas shadow-glow-green transition-transform active:scale-95">
                  <PlusIcon />
                </span>
              </Link>
            )
          }

          /* ── Regular tab ─────────────────────────────────────── */
          const isActive = pathname === tab.to || pathname.startsWith(tab.to + '/')

          return (
            <Link
              key={tab.to}
              to={tab.to}
              state={tab.state}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-col items-center justify-end gap-0.5 pb-2"
            >
              <span className={[
                'w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-150',
                isActive ? 'bg-accent/15 text-accent' : 'text-muted',
              ].join(' ')}>
                <tab.Icon />
              </span>
              <span className={[
                'text-[10px] font-medium transition-colors duration-150',
                isActive ? 'text-accent' : 'text-muted',
              ].join(' ')}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
