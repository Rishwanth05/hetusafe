import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/* ══════════════════════════════════════════════════════════════════════════
   DATA — unchanged from original
══════════════════════════════════════════════════════════════════════════ */

const HAZARD_CATEGORIES = [
  'Pothole / Road Damage', 'Broken Street Light', 'Fallen Tree / Branch',
  'Flooding / Drainage Issue', 'Abandoned Vehicle', 'Graffiti / Vandalism',
  'Illegal Dumping', 'Gas Leak / Utility Hazard', 'Structural Damage',
  'Environmental Hazard', 'Other',
]

const FEATURES = [
  { icon: '📍', title: 'Real-time Map',    desc: 'See every hazard plotted live on an interactive map with clustering and heatmap views.' },
  { icon: '📷', title: 'Photo Proof',      desc: 'Attach up to 3 photos per report. Camera-verified resolution prevents false closures.' },
  { icon: '🔔', title: 'Instant Alerts',   desc: 'Push notifications the moment a critical hazard is reported within 10 km of you.' },
  { icon: '🛡️', title: 'Trust Scores',    desc: 'Community-driven reputation system rewards accurate, verified reporters.' },
  { icon: '📊', title: 'Analytics',        desc: 'Resolution time trends, category breakdowns, and SLA compliance reports.' },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Spot a hazard',       desc: 'Open the app, tap Report, and drop a pin exactly where the problem is.' },
  { step: '02', title: 'Submit with proof',   desc: 'Choose a category, add photos, and describe the severity. Done in under 60 seconds.' },
  { step: '03', title: 'Track resolution',    desc: 'Watch your report move through review → in progress → resolved with status updates.' },
]

/* ══════════════════════════════════════════════════════════════════════════
   HOOKS — useCountUp unchanged from original
══════════════════════════════════════════════════════════════════════════ */

function useCountUp(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start || !target) return
    const step = target / (duration / 16)
    let current = 0
    const timer = setInterval(() => {
      current = Math.min(current + step, target)
      setCount(Math.floor(current))
      if (current >= target) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration, start])
  return count
}

/* ══════════════════════════════════════════════════════════════════════════
   STAT CARD — logic unchanged, styled to match app dark tokens
══════════════════════════════════════════════════════════════════════════ */

function StatCard({ value, label, prefix = '', suffix = '', animate }) {
  const count = useCountUp(value, 2200, animate)
  return (
    <div style={{
      textAlign: 'center',
      padding: '32px 24px',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '16px',
      backdropFilter: 'blur(12px)',
      flex: '1 1 180px',
    }}>
      <div style={{ fontSize: '42px', fontWeight: '800', color: '#4ade80', letterSpacing: '-1px' }}>
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div style={{ color: '#94a3b8', fontSize: '14px', marginTop: '6px', fontWeight: '500' }}>{label}</div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   MAP PREVIEW — NEW: SVG illustration of live hazard reporting
   Pure CSS animations, zero JS, zero new dependencies.
══════════════════════════════════════════════════════════════════════════ */

/* Hazard pins: [cx, cy, color, label, clusterCount, animDelay] */
const MAP_PINS = [
  [68,  44,  '#7c3aed', 'Gas Leak',      0, '0s'   ],
  [232, 38,  '#ef4444', 'Pothole',        0, '0.4s' ],
  [478, 55,  '#ef4444', null,             3, '0.8s' ],
  [88,  148, '#f59e0b', null,             0, '1.2s' ],
  [275, 142, '#22c55e', null,             0, '0.6s' ],
  [468, 150, '#7c3aed', 'Exposed Wire',  0, '1.5s' ],
  [62,  248, '#ef4444', null,             0, '0.9s' ],
  [258, 252, '#f59e0b', null,             0, '0.2s' ],
  [508, 248, '#22c55e', null,             0, '1.1s' ],
]

function MapPreview() {
  return (
    <div style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#080d18' }}>
      {/* Live badge */}
      <div style={{
        position: 'absolute', top: '14px', right: '14px', zIndex: 2,
        display: 'flex', alignItems: 'center', gap: '6px',
        background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(34,197,94,0.3)', borderRadius: '999px',
        padding: '4px 12px', fontSize: '12px', fontWeight: '700', color: '#4ade80',
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 2s infinite' }} />
        LIVE
      </div>

      <svg
        viewBox="0 0 600 300"
        width="100%"
        style={{ display: 'block', maxHeight: '340px' }}
        aria-label="Live hazard map preview showing reported incidents"
        role="img"
      >
        {/* ── Background ───────────────────────────────────────────── */}
        <rect width="600" height="300" fill="#080d18" />

        {/* Grid pattern */}
        <defs>
          <pattern id="mapGrid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="600" height="300" fill="url(#mapGrid)" />

        {/* ── City blocks (subtle fill between roads) ─────────────── */}
        {[
          [0,0,155,95],[165,0,180,95],[355,0,245,95],
          [0,105,155,90],[165,105,180,90],[355,105,245,90],
          [0,205,155,95],[165,205,180,95],[355,205,245,95],
        ].map(([x,y,w,h],i) => (
          <rect key={i} x={x} y={y} width={w} height={h} fill="rgba(255,255,255,0.018)" />
        ))}

        {/* ── Roads ────────────────────────────────────────────────── */}
        {/* Major horizontal */}
        <rect x="0" y="92" width="600" height="13" fill="rgba(255,255,255,0.07)" />
        <rect x="0" y="192" width="600" height="11" fill="rgba(255,255,255,0.065)" />
        {/* Major vertical */}
        <rect x="152" y="0" width="13" height="300" fill="rgba(255,255,255,0.09)" />
        <rect x="342" y="0" width="13" height="300" fill="rgba(255,255,255,0.07)" />
        {/* Road centre lines */}
        <line x1="0" y1="98.5" x2="600" y2="98.5" stroke="rgba(255,255,0,0.08)" strokeWidth="1" strokeDasharray="14 10" />
        <line x1="0" y1="197.5" x2="600" y2="197.5" stroke="rgba(255,255,0,0.06)" strokeWidth="1" strokeDasharray="14 10" />
        <line x1="158.5" y1="0" x2="158.5" y2="300" stroke="rgba(255,255,0,0.06)" strokeWidth="1" strokeDasharray="14 10" />
        <line x1="348.5" y1="0" x2="348.5" y2="300" stroke="rgba(255,255,0,0.05)" strokeWidth="1" strokeDasharray="14 10" />

        {/* ── Hazard pins ──────────────────────────────────────────── */}
        {MAP_PINS.map(([cx, cy, color, label, cluster, delay], i) => (
          <g key={i} transform={`translate(${cx},${cy})`}>
            {/* Pulse ring 1 */}
            <circle
              cx="0" cy="0" r={cluster ? 14 : 8}
              fill="none" stroke={color} strokeWidth="1.5"
              style={{
                transformBox: 'fill-box', transformOrigin: 'center',
                animation: `mapPulse 2.8s ease-out ${delay} infinite`,
                opacity: 0.8,
              }}
            />
            {/* Pulse ring 2 (offset) */}
            <circle
              cx="0" cy="0" r={cluster ? 14 : 8}
              fill="none" stroke={color} strokeWidth="1"
              style={{
                transformBox: 'fill-box', transformOrigin: 'center',
                animation: `mapPulse 2.8s ease-out calc(${delay} + 1.4s) infinite`,
                opacity: 0.5,
              }}
            />
            {/* Inner dot / cluster bubble */}
            <circle cx="0" cy="0" r={cluster ? 12 : 5} fill={color} opacity="0.92" />
            {cluster > 0 && (
              <text x="0" y="4" textAnchor="middle" fill="white" fontSize="10" fontWeight="800">{cluster}</text>
            )}
            {/* Label */}
            {label && (
              <text x="0" y={cluster ? -18 : -12} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="9.5" fontWeight="600">
                {label}
              </text>
            )}
          </g>
        ))}

        {/* ── Legend ───────────────────────────────────────────────── */}
        <g transform="translate(10, 272)">
          {[['#7c3aed','Critical'],['#ef4444','High'],['#f59e0b','Medium'],['#22c55e','Low']].map(([c,l],i) => (
            <g key={l} transform={`translate(${i * 80}, 0)`}>
              <circle cx="5" cy="5" r="4" fill={c} />
              <text x="14" y="9" fill="rgba(255,255,255,0.45)" fontSize="9">{l}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */

export default function Landing() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  /* ── All existing state (unchanged) ──────────────────────────────────── */
  const [stats, setStats]               = useState(null)
  const [statsVisible, setStatsVisible] = useState(false)
  const statsRef = useRef(null)
  const [scrolled, setScrolled]         = useState(false)

  /* ── All existing useEffects (unchanged) ─────────────────────────────── */
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/v1/public/stats`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => setStats({ total_reports: 2400, total_users: 840, resolved_count: 1780, areas_covered: 312 }))
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true) },
      { threshold: 0.3 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  /* ── NEW: single IntersectionObserver for scroll-reveal sections ─────── */
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]')
    if (!els.length) return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.setAttribute('data-revealed', '')
          obs.unobserve(entry.target)
        }
      })
    }, { threshold: 0.07, rootMargin: '0px 0px -30px 0px' })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#f1f5f9', overflowX: 'hidden' }}>

      {/* ── ALL KEYFRAMES ────────────────────────────────────────────── */}
      <style>{`
        @keyframes pulse    { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer  { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes mapPulse { 0%{transform:scale(1);opacity:0.8} 70%{transform:scale(3.2);opacity:0} 100%{transform:scale(3.2);opacity:0} }

        /* Scroll-reveal: start hidden, transition to visible on [data-revealed] */
        [data-reveal] {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 0.65s ease, transform 0.65s ease;
        }
        [data-reveal][data-revealed] {
          opacity: 1;
          transform: translateY(0);
        }
        /* Stagger children with data-delay attribute */
        [data-reveal][data-delay="1"] { transition-delay: 0.12s; }
        [data-reveal][data-delay="2"] { transition-delay: 0.24s; }
        [data-reveal][data-delay="3"] { transition-delay: 0.36s; }

        /* Respect user motion preferences — disable all animations */
        @media (prefers-reduced-motion: reduce) {
          [data-reveal], [data-reveal][data-revealed] {
            opacity: 1; transform: none; transition: none;
          }
          * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
        }

        /* Feature card hover glow */
        .feat-card {
          transition: transform 300ms ease, border-color 300ms ease,
                      background 300ms ease, box-shadow 300ms ease;
        }
        .feat-card:hover {
          transform: translateY(-4px);
          border-color: rgba(34,197,94,0.35) !important;
          background: rgba(34,197,94,0.05) !important;
          box-shadow: 0 0 24px rgba(34,197,94,0.12);
        }
        .how-card {
          transition: transform 300ms ease, border-color 300ms ease;
        }
        .how-card:hover {
          transform: translateY(-4px);
          border-color: rgba(34,197,94,0.3) !important;
        }
      `}</style>

      {/* ── NAV (unchanged) ──────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 24px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(10,15,30,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'all 300ms ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="32" height="32" viewBox="0 0 56 56" fill="none">
            <rect width="56" height="56" rx="14" fill="#16a34a"/>
            <path d="M28 10L14 16V28C14 36.4 20.2 44.2 28 46C35.8 44.2 42 36.4 42 28V16L28 10Z" fill="white"/>
            <path d="M22 28L26 32L34 24" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontWeight: '800', fontSize: '18px', letterSpacing: '-0.3px' }}>Project SAVE</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {user ? (
            <button onClick={() => navigate('/dashboard')} style={btnStyle('#16a34a')}>
              Go to Dashboard →
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')} style={btnStyle('transparent', '#94a3b8', '1px solid rgba(255,255,255,0.12)')}>
                Sign in
              </button>
              <button onClick={() => navigate('/signup')} style={btnStyle('#16a34a')}>
                Get started free
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO (existing gradient orbs + animations, unchanged) ─────── */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px 60px', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* Animated gradient orbs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', top: '15%', left: '20%', width: '500px', height: '500px',
            background: 'radial-gradient(circle, rgba(22,163,74,0.18) 0%, transparent 70%)',
            borderRadius: '50%', filter: 'blur(40px)',
            animation: 'pulse 6s ease-in-out infinite',
          }}/>
          <div style={{
            position: 'absolute', bottom: '10%', right: '15%', width: '400px', height: '400px',
            background: 'radial-gradient(circle, rgba(74,222,128,0.12) 0%, transparent 70%)',
            borderRadius: '50%', filter: 'blur(60px)',
            animation: 'pulse 8s ease-in-out infinite 2s',
          }}/>
          <div style={{
            position: 'absolute', top: '40%', right: '25%', width: '300px', height: '300px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
            borderRadius: '50%', filter: 'blur(50px)',
            animation: 'pulse 7s ease-in-out infinite 1s',
          }}/>
        </div>

        <div style={{ maxWidth: '760px', position: 'relative', zIndex: 1, animation: 'fadeUp 0.7s ease both' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.3)',
            borderRadius: '999px', padding: '6px 16px', marginBottom: '28px',
            fontSize: '13px', fontWeight: '600', color: '#4ade80',
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 2s infinite' }}/>
            Now in public beta — join your community
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: '900', lineHeight: '1.08',
            letterSpacing: '-2px', marginBottom: '24px',
            background: 'linear-gradient(135deg, #ffffff 0%, #4ade80 50%, #16a34a 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            animation: 'shimmer 4s linear infinite',
          }}>
            Your city's safety<br/>starts with one report
          </h1>

          <p style={{
            fontSize: 'clamp(16px, 2.5vw, 20px)', color: '#94a3b8', maxWidth: '560px',
            margin: '0 auto 40px', lineHeight: '1.7', fontWeight: '400',
          }}>
            Project SAVE lets anyone report street hazards in 60 seconds.
            Real-time map, photo proof, and track resolution progress in real time —
            so problems get fixed, not forgotten.
          </p>

          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate(user ? '/report' : '/signup')} style={{
              ...btnStyle('#16a34a'),
              padding: '14px 32px', fontSize: '16px', fontWeight: '700',
              boxShadow: '0 0 32px rgba(22,163,74,0.4)',
            }}>
              Report a hazard →
            </button>
            <button onClick={() => navigate(user ? '/dashboard' : '/login')} style={{
              ...btnStyle('rgba(255,255,255,0.06)', '#f1f5f9', '1px solid rgba(255,255,255,0.12)'),
              padding: '14px 32px', fontSize: '16px', fontWeight: '600',
            }}>
              View the map
            </button>
          </div>

          <p style={{ color: '#475569', fontSize: '13px', marginTop: '20px' }}>
            Free forever for citizens · No app download required
          </p>
        </div>
      </section>

      {/* ── PROBLEM STATEMENT ── scroll-reveal ───────────────────────── */}
      <section style={{ padding: '80px 24px', maxWidth: '900px', margin: '0 auto' }}>
        <div data-reveal style={{
          background: 'linear-gradient(135deg, rgba(22,163,74,0.08) 0%, rgba(10,15,30,0) 100%)',
          border: '1px solid rgba(22,163,74,0.15)',
          borderRadius: '24px', padding: 'clamp(32px, 5vw, 60px)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '20px' }}>🚧</div>
          <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: '800', marginBottom: '16px', letterSpacing: '-0.5px' }}>
            Hazards go unreported.<br/>Problems go unfixed.
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '17px', lineHeight: '1.8', maxWidth: '600px', margin: '0 auto 24px' }}>
            A pothole grows for months. A broken streetlight stays dark for weeks.
            Nobody knows who to call, calls that get made go into a void,
            and nothing changes. SAVE closes that loop.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['📞 No more hunting for hotlines', '📍 GPS-pinned reports', '✅ Verified resolution'].map(t => (
              <span key={t} style={{
                background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)',
                borderRadius: '999px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', color: '#4ade80',
              }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── scroll-reveal + staggered steps ─────────── */}
      <section style={{ padding: '80px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        <div data-reveal style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div style={sectionLabel}>How it works</div>
          <h2 style={sectionTitle}>Fixed in three steps</h2>
        </div>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {HOW_IT_WORKS.map(({ step, title, desc }, i) => (
            <div
              key={step}
              data-reveal
              data-delay={String(i + 1)}
              className="how-card"
              style={{
                flex: '1 1 280px', maxWidth: '340px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '20px', padding: '36px 28px',
                position: 'relative', overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute', top: '-10px', right: '-10px',
                fontSize: '80px', fontWeight: '900', color: 'rgba(22,163,74,0.05)', lineHeight: 1,
                userSelect: 'none', pointerEvents: 'none',
              }}>{step}</div>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'rgba(22,163,74,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', marginBottom: '20px',
                border: '1px solid rgba(22,163,74,0.25)',
              }}>
                {['📍', '📷', '✅'][i]}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '10px' }}>{title}</h3>
              <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.65' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── MAP PREVIEW — NEW ─────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', maxWidth: '900px', margin: '0 auto' }}>
        <div data-reveal style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={sectionLabel}>Live map</div>
          <h2 style={sectionTitle}>See every hazard, in real time</h2>
          <p style={{ color: '#64748b', fontSize: '16px', marginTop: '12px', maxWidth: '500px', margin: '12px auto 0' }}>
            Reports from your community appear instantly on a shared map. Color-coded by severity. Clustered for clarity.
          </p>
        </div>
        <div data-reveal data-delay="1">
          <MapPreview />
        </div>
        <div data-reveal data-delay="2" style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
          {[
            { color: '#7c3aed', label: 'Critical — immediate danger'   },
            { color: '#ef4444', label: 'High — urgent attention needed' },
            { color: '#f59e0b', label: 'Medium — needs attention'       },
            { color: '#22c55e', label: 'Low — minor issue'              },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ color: '#64748b', fontSize: '13px' }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── LIVE STATS — existing logic (statsRef + statsVisible + useCountUp) unchanged ── */}
      <section ref={statsRef} style={{ padding: '80px 24px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={sectionLabel}>Live impact</div>
          <h2 style={sectionTitle}>Real numbers, real change</h2>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <StatCard value={stats?.total_reports   ?? 0} label="Hazards reported"    animate={statsVisible} />
          <StatCard value={stats?.total_users      ?? 0} label="Community members"   animate={statsVisible} />
          <StatCard value={stats?.resolved_count   ?? 0} label="Issues resolved"     animate={statsVisible} />
          <StatCard value={stats?.areas_covered    ?? 0} label="Areas covered"       animate={statsVisible} />
        </div>
      </section>

      {/* ── FEATURES GRID ── scroll-reveal + hover glow ─────────────── */}
      <section style={{ padding: '80px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        <div data-reveal style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div style={sectionLabel}>Features</div>
          <h2 style={sectionTitle}>Everything your community needs</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {FEATURES.map(({ icon, title, desc }, i) => (
            <div
              key={title}
              data-reveal
              data-delay={String(Math.min(i + 1, 3))}
              className="feat-card"
              style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '18px', padding: '28px 24px',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '14px' }}>{icon}</div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>{title}</h3>
              <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.65' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HAZARD CATEGORIES ── scroll-reveal ───────────────────────── */}
      <section style={{ padding: '60px 24px', maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <div data-reveal>
          <p style={{ color: '#475569', fontSize: '13px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '20px' }}>
            11 hazard categories covered
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {HAZARD_CATEGORIES.map(cat => (
              <span key={cat} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: '8px', padding: '8px 14px', fontSize: '13px', color: '#94a3b8',
              }}>{cat}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── scroll-reveal ─────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
        <div data-reveal>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: '900', letterSpacing: '-1.5px', marginBottom: '16px' }}>
            Ready to make your<br/>neighbourhood safer?
          </h2>
          <p style={{ color: '#64748b', fontSize: '17px', marginBottom: '36px', lineHeight: '1.7' }}>
            Join thousands of residents already reporting hazards, holding cities accountable, and seeing real results.
          </p>
          <button onClick={() => navigate(user ? '/report' : '/signup')} style={{
            ...btnStyle('#16a34a'),
            padding: '16px 40px', fontSize: '17px', fontWeight: '700',
            boxShadow: '0 0 48px rgba(22,163,74,0.45)',
          }}>
            {user ? 'Report a hazard now →' : 'Create your free account →'}
          </button>
        </div>
      </section>

      {/* ── FOOTER (unchanged) ───────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '40px 24px', maxWidth: '1100px', margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="22" height="22" viewBox="0 0 56 56" fill="none">
            <rect width="56" height="56" rx="14" fill="#16a34a"/>
            <path d="M28 10L14 16V28C14 36.4 20.2 44.2 28 46C35.8 44.2 42 36.4 42 28V16L28 10Z" fill="white"/>
          </svg>
          <span style={{ fontWeight: '700', fontSize: '14px' }}>Project SAVE</span>
          <span style={{ color: '#334155', margin: '0 6px' }}>·</span>
          <span style={{ color: '#475569', fontSize: '13px' }}>Safety Alert &amp; Visibility Engine</span>
        </div>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {[['Privacy Policy', '/privacy'], ['Terms of Service', '/terms'], ['Sign in', '/login']].map(([label, path]) => (
            <a key={label} href={path}
              style={{ color: '#475569', fontSize: '13px', textDecoration: 'none', transition: 'color 200ms' }}
              onMouseEnter={e => e.target.style.color = '#4ade80'}
              onMouseLeave={e => e.target.style.color = '#475569'}
            >{label}</a>
          ))}
        </div>
        <p style={{ color: '#334155', fontSize: '12px', width: '100%', textAlign: 'center', marginTop: '8px' }}>
          © 2026 Project SAVE. Built for communities, by communities.
        </p>
      </footer>

    </div>
  )
}

/* ── Style constants (unchanged from original) ───────────────────────── */

const sectionLabel = {
  display: 'inline-block',
  background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)',
  color: '#4ade80', fontSize: '12px', fontWeight: '700', letterSpacing: '1px',
  textTransform: 'uppercase', padding: '4px 14px', borderRadius: '999px', marginBottom: '14px',
}

const sectionTitle = {
  fontSize: 'clamp(24px, 4vw, 42px)', fontWeight: '900', letterSpacing: '-1px',
  background: 'linear-gradient(135deg, #ffffff 30%, #94a3b8 100%)',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
}

function btnStyle(bg, color = '#fff', border = 'none') {
  return {
    background: bg, color, border,
    borderRadius: '10px', padding: '10px 20px', fontSize: '14px',
    fontWeight: '600', cursor: 'pointer',
    transition: 'all 200ms ease',
    fontFamily: 'inherit',
  }
}
