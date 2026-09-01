import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/* ==========================================================================
   DATA
============================================================================ */

const HAZARD_CATEGORIES = [
  'Pothole / Road Damage',
  'Broken Street Light',
  'Fallen Tree / Branch',
  'Flooding / Drainage Issue',
  'Abandoned Vehicle',
  'Graffiti / Vandalism',
  'Illegal Dumping',
  'Gas Leak / Utility Hazard',
  'Structural Damage',
  'Environmental Hazard',
  'Other',
]

const FEATURES = [
  {
    icon: '⌖',
    title: 'Real-time map',
    desc: 'See nearby hazards live with severity, clustering, and location context.',
  },
  {
    icon: '◎',
    title: 'Photo proof',
    desc: 'Add photos to make reports easier for the community to verify.',
  },
  {
    icon: '◉',
    title: 'Instant alerts',
    desc: 'Know when an important safety issue is reported near you.',
  },
  {
    icon: '◇',
    title: 'Trust & verification',
    desc: 'Community verification helps keep local information reliable.',
  },
  {
    icon: '↗',
    title: 'Resolution tracking',
    desc: 'Follow a report from submission through verification and resolution.',
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Spot it',
    desc: 'See something unsafe? Open Hetusafe and capture what is happening.',
  },
  {
    step: '02',
    title: 'Report it',
    desc: 'Add the location, category, severity, details, and photo proof.',
  },
  {
    step: '03',
    title: 'Track it',
    desc: 'Follow verification and resolution updates as the report progresses.',
  },
]

const HERO_IMAGE = '/images/hetusafe-hero-bg.jpg'
const COMMUNITY_IMAGE = '/images/hetusafe-community-cta.jpg'

const MAP_MARKERS = [
  { x: '16%', y: '26%', color: '#ef4444', count: '12' },
  { x: '38%', y: '63%', color: '#f59e0b', count: '7' },
  { x: '67%', y: '42%', color: '#7c3aed', count: '4' },
  { x: '81%', y: '71%', color: '#16a34a', count: '3' },
  { x: '53%', y: '26%', color: '#f59e0b', count: '' },
  { x: '29%', y: '39%', color: '#ef4444', count: '' },
  { x: '86%', y: '25%', color: '#7c3aed', count: '' },
]

/* ==========================================================================
   COUNT-UP
============================================================================ */

function useCountUp(target, duration = 1800, start = false) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!start || !target) return

    const step = target / (duration / 16)
    let current = 0

    const timer = setInterval(() => {
      current = Math.min(current + step, target)
      setCount(Math.floor(current))

      if (current >= target) {
        clearInterval(timer)
      }
    }, 16)

    return () => clearInterval(timer)
  }, [target, duration, start])

  return count
}

/* ==========================================================================
   ICONS
============================================================================ */

function ShieldLogo({ size = 40 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      aria-hidden="true"
    >
      <rect width="56" height="56" rx="15" fill="#1DB954" />

      <path
        d="M28 9.5L13.5 15.8V27.8C13.5 36.5 19.8 44.2 28 46.4C36.2 44.2 42.5 36.5 42.5 27.8V15.8L28 9.5Z"
        fill="white"
      />

      <path
        d="M21.5 28.1L25.8 32.4L34.7 23.7"
        stroke="#19A94B"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 10H16M11 5L16 10L11 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ==========================================================================
   HERO PHONE
============================================================================ */

function MapPin({ className, children }) {
  return (
    <div className={`phone-pin ${className}`}>
      <span>{children}</span>
    </div>
  )
}

function HeroPhone() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="floating-hazard floating-hazard-purple">
        !
      </div>

      <div className="floating-hazard floating-hazard-orange">
        ⚡
      </div>

      <div className="phone-ground-shadow" />

      <div className="phone-device">
        <div className="phone-frame">
          <div className="phone-island" />

          <div className="phone-screen">
            <div className="phone-header">
              <div className="phone-brand">
                <ShieldLogo size={18} />
                <span>Hetusafe</span>
              </div>

              <span className="phone-more">•••</span>
            </div>

            <div className="phone-map">
              <div className="phone-park park-one" />
              <div className="phone-park park-two" />

              <div className="phone-road road-one" />
              <div className="phone-road road-two" />
              <div className="phone-road road-three" />
              <div className="phone-road road-four" />
              <div className="phone-road road-five" />

              <MapPin className="phone-pin-red">!</MapPin>
              <MapPin className="phone-pin-orange">⌁</MapPin>
              <MapPin className="phone-pin-purple">●</MapPin>
              <MapPin className="phone-pin-green">✓</MapPin>
            </div>

            <div className="phone-report">
              <div className="phone-report-image">
                <div className="phone-pothole" />
              </div>

              <div className="phone-report-body">
                <div className="phone-report-title">
                  <div>
                    <strong>Open pothole</strong>
                    <small>Bell Street · Downtown</small>
                  </div>

                  <span>High</span>
                </div>

                <div className="phone-meta">
                  <small>12m ago</small>
                  <small>0.2 mi</small>
                </div>
              </div>
            </div>

            <div className="phone-nav">
              <span>⌖</span>
              <span>▱</span>
              <span className="phone-plus">+</span>
              <span>◇</span>
              <span>○</span>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-marker">
        <div className="hero-marker-inner">
          <svg viewBox="0 0 58 58" fill="none">
            <path
              d="M29 7L13 14V27.5C13 37.1 20.1 45.8 29 48C37.9 45.8 45 37.1 45 27.5V14L29 7Z"
              fill="white"
            />

            <path
              d="M21.5 28.5L26 33L36 23"
              stroke="#1DB954"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   MAP
============================================================================ */

function RecentReport({
  color,
  title,
  meta,
  emoji,
}) {
  return (
    <div className="recent-report">
      <span
        className="recent-status"
        style={{
          background: color,
          boxShadow: `0 0 14px ${color}`,
        }}
      />

      <div className="recent-report-copy">
        <strong>{title}</strong>
        <small>{meta}</small>
      </div>

      <span className="recent-image">
        {emoji}
      </span>
    </div>
  )
}

function MapLegend({ color, label }) {
  return (
    <div className="map-legend-item">
      <span style={{ background: color }} />
      {label}
    </div>
  )
}

function LiveMapPreview({
  onExplore,
}) {
  return (
    <div
      className="live-map"
      data-reveal
    >
      <div className="live-map-copy">
        <span className="section-tag section-tag-dark">
          Live map
        </span>

        <h2>
          See what's
          <br />
          happening around
          <br />
          you, <em>live.</em>
        </h2>

        <p>
          Explore real-time hazard reports from your
          community with clear, color-coded severity.
        </p>

        <button
          className="dark-outline-button"
          onClick={onExplore}
        >
          Explore live map

          <span>
            <ArrowIcon />
          </span>
        </button>
      </div>

      <div className="map-world">
        <div className="map-block block-1" />
        <div className="map-block block-2" />
        <div className="map-block block-3" />
        <div className="map-block block-4" />
        <div className="map-block block-5" />

        <div className="map-road map-road-h map-road-h-1" />
        <div className="map-road map-road-h map-road-h-2" />
        <div className="map-road map-road-h map-road-h-3" />

        <div className="map-road map-road-v map-road-v-1" />
        <div className="map-road map-road-v map-road-v-2" />
        <div className="map-road map-road-v map-road-v-3" />

        {MAP_MARKERS.map((marker, index) => (
          <div
            className="map-marker"
            key={`${marker.x}-${marker.y}-${index}`}
            style={{
              left: marker.x,
              top: marker.y,
              '--marker-color': marker.color,
            }}
          >
            <span className="map-marker-pulse" />

            <span className="map-marker-core">
              {marker.count || '•'}
            </span>
          </div>
        ))}
      </div>

      <div className="recent-reports">
        <div className="recent-title">
          <strong>Recent reports</strong>
          <span>Live</span>
        </div>

        <RecentReport
          color="#ef4444"
          title="Open manhole"
          meta="5m ago · High"
          emoji="🕳️"
        />

        <RecentReport
          color="#f59e0b"
          title="Broken street light"
          meta="12m ago · Medium"
          emoji="💡"
        />

        <RecentReport
          color="#ef4444"
          title="Road damage"
          meta="18m ago · High"
          emoji="🚧"
        />

        <RecentReport
          color="#22c55e"
          title="Garbage overflow"
          meta="25m ago · Low"
          emoji="🗑️"
        />
      </div>

      <div className="map-legend">
        <MapLegend
          color="#ef4444"
          label="Critical"
        />

        <MapLegend
          color="#f97316"
          label="High"
        />

        <MapLegend
          color="#fbbf24"
          label="Medium"
        />

        <MapLegend
          color="#22c55e"
          label="Low"
        />

        <MapLegend
          color="#7c3aed"
          label="Resolved"
        />
      </div>
    </div>
  )
}

/* ==========================================================================
   STATS
============================================================================ */

function StatCard({
  value,
  label,
  animate,
  tone,
  icon,
}) {
  const count = useCountUp(
    value,
    2200,
    animate,
  )

  return (
    <article className={`stat-card stat-${tone}`}>
      <div className="stat-top">
        <span className="stat-icon">
          {icon}
        </span>

        <span className="stat-live">
          Live
        </span>
      </div>

      <strong className="stat-number">
        {count.toLocaleString()}
      </strong>

      <span className="stat-label">
        {label}
      </span>

      <svg
        className="stat-line"
        viewBox="0 0 180 50"
        preserveAspectRatio="none"
      >
        <path
          d="M2 42 C22 38,30 22,49 28 C69 35,76 14,96 20 C117 27,125 9,145 15 C160 19,170 8,178 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />

        <path
          d="M2 42 C22 38,30 22,49 28 C69 35,76 14,96 20 C117 27,125 9,145 15 C160 19,170 8,178 6"
          fill="none"
          stroke="currentColor"
          strokeOpacity=".12"
          strokeWidth="13"
          strokeLinecap="round"
        />
      </svg>
    </article>
  )
}

/* ==========================================================================
   CITY
============================================================================ */

function Building({
  className,
}) {
  return (
    <div className={`mini-building ${className}`}>
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  )
}

function MiniTree({
  className,
}) {
  return (
    <div className={`mini-tree ${className}`}>
      <span />
    </div>
  )
}

function CityAlert({
  className,
  color,
  title,
  subtitle,
  icon,
}) {
  return (
    <div
      className={`city-alert ${className}`}
      style={{
        '--alert-color': color,
      }}
    >
      <div className="city-alert-pin">
        <span>{icon}</span>
      </div>

      <div className="city-alert-card">
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </div>
    </div>
  )
}

function CommunityCity() {
  return (
    <div
      className="city-scene"
      data-reveal
      data-delay="2"
    >
      <div className="city-glow" />

      <div className="city-board">
        <div className="city-main-road" />
        <div className="city-cross-road" />
        <div className="city-water" />

        <Building className="building-1" />
        <Building className="building-2" />
        <Building className="building-3" />
        <Building className="building-4" />
        <Building className="building-5" />
        <Building className="building-6" />

        <MiniTree className="tree-1" />
        <MiniTree className="tree-2" />
        <MiniTree className="tree-3" />
        <MiniTree className="tree-4" />
        <MiniTree className="tree-5" />
        <MiniTree className="tree-6" />
        <MiniTree className="tree-7" />

        <CityAlert
          className="alert-1"
          color="#e94343"
          title="Open manhole"
          subtitle="High risk"
          icon="!"
        />

        <CityAlert
          className="alert-2"
          color="#f59e0b"
          title="Broken street light"
          subtitle="Needs attention"
          icon="⚡"
        />

        <CityAlert
          className="alert-3"
          color="#e9ab25"
          title="Road damage"
          subtitle="Medium risk"
          icon="⌁"
        />

        <CityAlert
          className="alert-4"
          color="#2fb85d"
          title="Garbage overflow"
          subtitle="Low risk"
          icon="✓"
        />
      </div>
    </div>
  )
}

/* ==========================================================================
   MAIN
============================================================================ */

export default function Landing() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState(null)
  const [statsVisible, setStatsVisible] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const statsRef = useRef(null)

  /* ------------------------------------------------------------------------
     LIVE STATS
  ------------------------------------------------------------------------ */

  useEffect(() => {
    fetch(
      `${import.meta.env.VITE_API_URL}/api/v1/public/stats`,
    )
      .then((r) => r.json())
      .then(setStats)
      .catch(() =>
        setStats({
          total_reports: 2400,
          total_users: 840,
          resolved_count: 1780,
          areas_covered: 312,
        }),
      )
  }, [])

  /* ------------------------------------------------------------------------
     NAV SCROLL STATE
  ------------------------------------------------------------------------ */

  useEffect(() => {
    const onScroll = () => {
      setScrolled(
        window.scrollY > 20,
      )
    }

    window.addEventListener(
      'scroll',
      onScroll,
      { passive: true },
    )

    return () =>
      window.removeEventListener(
        'scroll',
        onScroll,
      )
  }, [])

  /* ------------------------------------------------------------------------
     STAT ANIMATION
  ------------------------------------------------------------------------ */

  useEffect(() => {
    const observer =
      new IntersectionObserver(
        ([entry]) => {
          if (
            entry.isIntersecting
          ) {
            setStatsVisible(true)
          }
        },
        {
          threshold: 0.25,
        },
      )

    if (statsRef.current) {
      observer.observe(
        statsRef.current,
      )
    }

    return () =>
      observer.disconnect()
  }, [])

  /* ------------------------------------------------------------------------
     SCROLL REVEALS
  ------------------------------------------------------------------------ */

  useEffect(() => {
    const elements =
      document.querySelectorAll(
        '[data-reveal]',
      )

    if (!elements.length) return

    const observer =
      new IntersectionObserver(
        (entries) => {
          entries.forEach(
            (entry) => {
              if (
                entry.isIntersecting
              ) {
                entry.target.setAttribute(
                  'data-revealed',
                  '',
                )

                observer.unobserve(
                  entry.target,
                )
              }
            },
          )
        },
        {
          threshold: 0.08,
          rootMargin:
            '0px 0px -30px 0px',
        },
      )

    elements.forEach(
      (element) =>
        observer.observe(element),
    )

    return () =>
      observer.disconnect()
  }, [])

  return (
    <div className="hetusafe-landing">
      <style>{`

/* ==========================================================================
   RESET
============================================================================ */

:root {
  --green: #1db954;
  --green-dark: #118b3c;
  --green-light: #46db78;

  --ink: #101828;
  --muted: #667085;
  --cream: #faf9f5;

  --max-width: 1320px;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  width: 100%;
  max-width: 100%;
  margin: 0;

  scroll-behavior: smooth;

  overflow-x: clip;
}

body {
  width: 100%;
  max-width: 100%;
  min-width: 0;

  margin: 0;

  overflow-x: clip;
}

#root {
  width: 100%;
  max-width: 100%;
  min-width: 0;

  overflow-x: clip;
}

img,
video,
canvas {
  max-width: 100%;
}

button,
a {
  font: inherit;
}

button {
  -webkit-tap-highlight-color: transparent;
}

.hetusafe-landing {
  width: 100%;
  max-width: 100%;
  min-width: 0;

  min-height: 100vh;

  overflow-x: clip;

  color: var(--ink);

  background:
    radial-gradient(
      circle at 10% 45%,
      rgba(29,185,84,.035),
      transparent 28%
    ),
    var(--cream);

  font-family:
    Inter,
    "DM Sans",
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.content-shell {
  width:
    min(
      var(--max-width),
      calc(100% - 88px)
    );

  margin-inline: auto;
}

/* ==========================================================================
   NAV
============================================================================ */

.landing-nav {
  position: fixed;

  z-index: 1000;

  top: 0;
  left: 0;
  right: 0;

  height: 74px;

  padding:
    0
    clamp(
      22px,
      5vw,
      78px
    );

  display: flex;
  align-items: center;
  justify-content: space-between;

  transition:
    background 250ms ease,
    backdrop-filter 250ms ease,
    box-shadow 250ms ease;
}

.landing-nav.is-scrolled {
  color: var(--ink);

  background:
    rgba(
      255,
      255,
      255,
      .89
    );

  backdrop-filter:
    blur(20px);

  box-shadow:
    0 1px 0
    rgba(
      15,
      23,
      42,
      .08
    );
}

.nav-brand {
  min-width: 0;

  display: flex;
  align-items: center;

  gap: 10px;

  color: white;

  font-size: 19px;
  font-weight: 850;
  letter-spacing: -.5px;
}

.is-scrolled .nav-brand {
  color: var(--ink);
}

.nav-center {
  display: flex;
  align-items: center;

  gap: 35px;
}

.nav-center a {
  position: relative;

  color:
    rgba(
      255,
      255,
      255,
      .88
    );

  text-decoration: none;

  font-size: 13px;
  font-weight: 650;
}

.is-scrolled
.nav-center a {
  color: #475467;
}

.nav-center a::after {
  content: "";

  position: absolute;

  left: 0;
  right: 100%;
  bottom: -7px;

  height: 2px;

  background:
    var(--green);

  transition:
    right 200ms ease;
}

.nav-center a:hover::after {
  right: 0;
}

.nav-actions {
  display: flex;
  align-items: center;

  gap: 10px;

  flex-shrink: 0;
}

.nav-button {
  min-height: 40px;

  padding:
    0
    18px;

  border-radius: 10px;

  border: 0;

  cursor: pointer;

  font-size: 13px;
  font-weight: 750;

  transition:
    transform 200ms ease,
    box-shadow 200ms ease;
}

.nav-button:hover {
  transform:
    translateY(-2px);
}

.nav-login {
  color: white;

  background:
    rgba(
      4,
      13,
      9,
      .2
    );

  border:
    1px solid
    rgba(
      255,
      255,
      255,
      .25
    );

  backdrop-filter:
    blur(12px);
}

.is-scrolled
.nav-login {
  color: var(--ink);

  background: white;

  border-color:
    #d9dedb;
}

.nav-primary {
  color: white;

  background:
    linear-gradient(
      135deg,
      #2ac861,
      #159e48
    );

  box-shadow:
    0 9px 24px
    rgba(
      29,
      185,
      84,
      .23
    );
}

/* ==========================================================================
   HERO
============================================================================ */

.hero {
  position: relative;

  isolation: isolate;

  min-height: 760px;
  height:
    min(
      820px,
      100vh
    );

  display: flex;
  align-items: center;

  overflow: hidden;

  color: white;

  background:
    linear-gradient(
      90deg,
      rgba(3,11,14,.9)
      0%,
      rgba(3,12,14,.67)
      38%,
      rgba(5,12,14,.27)
      70%,
      rgba(6,13,15,.14)
      100%
    ),
    linear-gradient(
      180deg,
      rgba(0,0,0,.07),
      rgba(0,0,0,.2)
    ),
    url("${HERO_IMAGE}")
    center /
    cover
    no-repeat;
}

.hero::after {
  content: "";

  position: absolute;

  z-index: -1;

  inset:
    auto
    0
    0;

  height: 24%;

  background:
    linear-gradient(
      transparent,
      rgba(3,11,13,.35)
    );
}

.hero-noise {
  position: absolute;

  inset: 0;

  pointer-events: none;

  opacity: .13;

  background-image:
    radial-gradient(
      rgba(
        255,
        255,
        255,
        .24
      )
      .5px,
      transparent
      .6px
    );

  background-size:
    4px
    4px;

  mix-blend-mode:
    overlay;
}

.hero-inner {
  width:
    min(
      1400px,
      calc(100% - 90px)
    );

  margin-inline: auto;

  padding-top: 65px;

  display: grid;

  grid-template-columns:
    minmax(0,.89fr)
    minmax(0,1.11fr);

  align-items: center;

  gap: 22px;
}

.hero-copy {
  position: relative;

  z-index: 20;

  min-width: 0;
}

.hero-kicker {
  display: inline-flex;
  align-items: center;

  gap: 8px;

  max-width: 100%;

  margin-bottom: 23px;

  padding:
    7px
    12px;

  color: #bdf4cf;

  border-radius: 999px;

  border:
    1px solid
    rgba(
      80,
      222,
      130,
      .25
    );

  background:
    rgba(
      8,
      37,
      21,
      .47
    );

  backdrop-filter:
    blur(14px);

  font-size: 12px;
  font-weight: 750;
}

.hero-kicker::before {
  content: "";

  width: 7px;
  height: 7px;

  flex: 0 0 7px;

  border-radius: 50%;

  background:
    #43df77;

  box-shadow:
    0 0 15px
    #43df77;
}

.hero h1 {
  max-width: 630px;

  margin: 0;

  color: white;

  font-size:
    clamp(
      52px,
      5.8vw,
      88px
    );

  font-weight: 900;

  line-height: .97;

  letter-spacing:
    -4.7px;

  text-wrap: balance;

  text-shadow:
    0 7px 32px
    rgba(
      0,
      0,
      0,
      .22
    );
}

.hero-green {
  position: relative;

  display: inline-block;

  color:
    #42d975;
}

.hero-green::after {
  content: "";

  position: absolute;

  left: 8%;
  right: -2%;

  bottom: -10px;

  height: 9px;

  border:
    solid
    #42d975;

  border-width:
    4px
    0
    0;

  border-radius: 50%;

  transform:
    rotate(-3deg);
}

.hero-description {
  max-width: 535px;

  margin:
    30px
    0
    30px;

  color:
    rgba(
      245,
      248,
      247,
      .84
    );

  font-size: 17px;

  line-height: 1.68;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;

  gap: 13px;
}

.hero-button {
  min-height: 52px;

  padding:
    0
    22px;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  gap: 10px;

  border: 0;

  border-radius: 11px;

  cursor: pointer;

  font-size: 14px;
  font-weight: 800;

  transition:
    transform 210ms ease,
    box-shadow 210ms ease;
}

.hero-button:hover {
  transform:
    translateY(-3px);
}

.hero-button-primary {
  color: white;

  background:
    linear-gradient(
      135deg,
      #2ecc68,
      #159f49
    );

  box-shadow:
    0 14px 32px
    rgba(
      21,
      159,
      73,
      .31
    );
}

.hero-button-secondary {
  color: white;

  background:
    rgba(
      7,
      15,
      17,
      .31
    );

  border:
    1px solid
    rgba(
      255,
      255,
      255,
      .28
    );

  backdrop-filter:
    blur(13px);
}

.hero-points {
  margin-top: 27px;

  display: flex;
  flex-wrap: wrap;

  gap:
    10px
    18px;
}

.hero-point {
  display: inline-flex;
  align-items: center;

  gap: 7px;

  color:
    rgba(
      255,
      255,
      255,
      .77
    );

  font-size: 11px;
  font-weight: 650;
}

.hero-point-icon {
  width: 22px;
  height: 22px;

  flex:
    0
    0
    22px;

  display: grid;
  place-items: center;

  border-radius: 50%;

  color: #4dde81;

  border:
    1px solid
    rgba(
      71,
      224,
      128,
      .25
    );

  background:
    rgba(
      20,
      75,
      43,
      .43
    );
}

.hero-trust {
  width: fit-content;

  min-width: 320px;

  margin-top: 37px;

  padding:
    11px
    15px;

  display: flex;
  align-items: center;

  gap: 16px;

  border-radius: 12px;

  background:
    rgba(
      7,
      14,
      17,
      .5
    );

  border:
    1px solid
    rgba(
      255,
      255,
      255,
      .13
    );

  backdrop-filter:
    blur(14px);

  box-shadow:
    0 15px 38px
    rgba(
      0,
      0,
      0,
      .15
    );
}

.hero-trust > span {
  color:
    rgba(
      255,
      255,
      255,
      .83
    );

  font-size: 12px;
  font-weight: 750;
}

.trust-avatars {
  display: flex;
  align-items: center;
}

.avatar {
  width: 31px;
  height: 31px;

  margin-left: -8px;

  display: grid;
  place-items: center;

  border-radius: 50%;

  color: white;

  border:
    2px solid
    rgba(
      15,
      24,
      21,
      .95
    );

  font-size: 9px;
  font-weight: 850;
}

.avatar:first-child {
  margin-left: 0;
}

.avatar-1 {
  background:
    linear-gradient(
      145deg,
      #a8785c,
      #493a33
    );
}

.avatar-2 {
  background:
    linear-gradient(
      145deg,
      #768dac,
      #243449
    );
}

.avatar-3 {
  background:
    linear-gradient(
      145deg,
      #d29373,
      #614136
    );
}

.avatar-4 {
  background:
    linear-gradient(
      145deg,
      #71a885,
      #254635
    );
}

.avatar-count {
  min-height: 25px;

  margin-left: -5px;

  padding:
    0
    8px;

  display: flex;
  align-items: center;

  border-radius: 999px;

  color: white;

  background:
    rgba(
      255,
      255,
      255,
      .16
    );

  font-size: 9px;
  font-weight: 800;
}

/* ==========================================================================
   HERO VISUAL
============================================================================ */

.hero-visual {
  position: relative;

  width: 100%;
  max-width: 690px;

  height: 620px;

  margin-left: auto;

  perspective: 1400px;
}

.phone-ground-shadow {
  position: absolute;

  width: 390px;
  height: 78px;

  right: 30px;
  bottom: 55px;

  border-radius: 50%;

  background:
    rgba(
      0,
      0,
      0,
      .48
    );

  filter:
    blur(26px);

  transform:
    rotate(-11deg);
}

.phone-device {
  position: absolute;

  z-index: 7;

  top: 35px;
  right: 96px;

  width: 314px;
  height: 594px;

  animation:
    phoneFloat
    6s
    ease-in-out
    infinite;
}

.phone-frame {
  position: relative;

  width: 100%;
  height: 100%;

  padding: 9px;

  border-radius: 47px;

  background:
    linear-gradient(
      120deg,
      #f0f2f2,
      #52575b 18%,
      #121518 47%,
      #c9cdce 76%,
      #373b3e
    );

  box-shadow:
    -17px 20px 46px
    rgba(
      0,
      0,
      0,
      .48
    ),
    inset
    0
    0
    0
    2px
    rgba(
      255,
      255,
      255,
      .25
    );
}

.phone-island {
  position: absolute;

  z-index: 15;

  top: 15px;
  left: 50%;

  width: 82px;
  height: 23px;

  transform:
    translateX(-50%);

  border-radius: 999px;

  background: #0c0f11;
}

.phone-screen {
  position: relative;

  width: 100%;
  height: 100%;

  overflow: hidden;

  border-radius: 39px;

  background: #f4f6f2;
}

.phone-header {
  height: 61px;

  padding:
    21px
    15px
    8px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  background:
    rgba(
      255,
      255,
      255,
      .94
    );
}

.phone-brand {
  display: flex;
  align-items: center;

  gap: 6px;

  color: #27312c;

  font-size: 11px;
  font-weight: 850;
}

.phone-more {
  color: #6f7873;

  font-size: 10px;
}

.phone-map {
  position: relative;

  height: 330px;

  overflow: hidden;

  background:
    #edf0eb;
}

.phone-map::before {
  content: "";

  position: absolute;

  inset: 0;

  background:
    linear-gradient(
      90deg,
      transparent
      0
      24%,
      rgba(
        187,
        197,
        191,
        .27
      )
      24%
      26%,
      transparent
      26%
      64%,
      rgba(
        187,
        197,
        191,
        .27
      )
      64%
      67%,
      transparent
      67%
    ),
    linear-gradient(
      0deg,
      transparent
      0
      34%,
      rgba(
        187,
        197,
        191,
        .27
      )
      34%
      36%,
      transparent
      36%
      69%,
      rgba(
        187,
        197,
        191,
        .27
      )
      69%
      72%,
      transparent
      72%
    );
}

.phone-road {
  position: absolute;

  z-index: 2;

  border-radius: 99px;

  background: white;

  box-shadow:
    0
    0
    0
    1px
    rgba(
      150,
      163,
      155,
      .11
    );
}

.road-one {
  width: 410px;
  height: 15px;

  top: 147px;
  left: -55px;

  transform:
    rotate(-14deg);
}

.road-two {
  width: 390px;
  height: 11px;

  top: 78px;
  left: -40px;

  transform:
    rotate(10deg);
}

.road-three {
  width: 14px;
  height: 365px;

  top: -15px;
  left: 151px;

  transform:
    rotate(17deg);
}

.road-four {
  width: 10px;
  height: 340px;

  top: -10px;
  left: 69px;

  transform:
    rotate(-7deg);
}

.road-five {
  width: 11px;
  height: 330px;

  top: 5px;
  right: 49px;

  transform:
    rotate(-13deg);
}

.phone-park {
  position: absolute;

  z-index: 1;

  border-radius: 10px;

  background:
    radial-gradient(
      circle,
      #83c593
      0
      3px,
      transparent
      4px
    ),
    #d7ead9;

  background-size:
    13px
    13px;
}

.park-one {
  width: 95px;
  height: 65px;

  top: 25px;
  left: 17px;
}

.park-two {
  width: 84px;
  height: 56px;

  right: 15px;
  bottom: 22px;
}

.phone-pin {
  position: absolute;

  z-index: 6;

  width: 34px;
  height: 34px;

  display: grid;
  place-items: center;

  border-radius:
    50%
    50%
    50%
    0;

  transform:
    rotate(-45deg);

  color: white;

  box-shadow:
    0
    7px
    16px
    rgba(
      0,
      0,
      0,
      .2
    );
}

.phone-pin span {
  transform:
    rotate(45deg);

  font-size: 10px;
  font-weight: 900;
}

.phone-pin-red {
  top: 51px;
  right: 53px;

  background: #ef4444;
}

.phone-pin-orange {
  top: 162px;
  left: 91px;

  background: #f59e0b;
}

.phone-pin-purple {
  top: 124px;
  right: 33px;

  background: #7c3aed;
}

.phone-pin-green {
  bottom: 31px;
  left: 128px;

  background: #20ad57;
}

.phone-report {
  position: absolute;

  z-index: 12;

  left: 14px;
  right: 14px;

  bottom: 59px;

  overflow: hidden;

  border-radius: 18px;

  background: white;

  box-shadow:
    0
    15px
    32px
    rgba(
      0,
      0,
      0,
      .18
    );
}

.phone-report-image {
  position: relative;

  height: 75px;

  overflow: hidden;

  background:
    linear-gradient(
      #696765,
      #4c4a48
    );
}

.phone-report-image::before,
.phone-report-image::after {
  content: "";

  position: absolute;

  width: 200px;
  height: 20px;

  left: -20px;

  background: #7e7a76;

  transform:
    rotate(-5deg);
}

.phone-report-image::before {
  top: 9px;
}

.phone-report-image::after {
  top: 47px;
}

.phone-pothole {
  position: absolute;

  z-index: 3;

  left: 50%;
  top: 28px;

  width: 90px;
  height: 31px;

  transform:
    translateX(-50%);

  border-radius: 50%;

  background:
    radial-gradient(
      ellipse,
      #111
      0
      35%,
      #302d2a
      36%
      60%,
      #5a5651
      61%
      70%,
      transparent
      71%
    );
}

.phone-report-body {
  padding:
    11px
    12px
    10px;
}

.phone-report-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;

  gap: 8px;
}

.phone-report-title > div {
  display: flex;
  flex-direction: column;

  gap: 3px;
}

.phone-report-title strong {
  color: #18221d;

  font-size: 11px;
}

.phone-report-title small {
  color: #8a948f;

  font-size: 8px;
}

.phone-report-title > span {
  padding:
    4px
    8px;

  color: white;

  border-radius: 7px;

  background: #ef4444;

  font-size: 8px;
  font-weight: 800;
}

.phone-meta {
  margin-top: 9px;

  display: flex;
  justify-content: space-between;

  color: #8a948f;

  font-size: 8px;
}

.phone-nav {
  position: absolute;

  left: 0;
  right: 0;
  bottom: 0;

  height: 53px;

  display: flex;
  align-items: center;
  justify-content: space-around;

  color: #69736e;

  background: white;

  border-top:
    1px solid
    #ecefeb;
}

.phone-plus {
  width: 36px;
  height: 36px;

  margin-top: -18px;

  display: grid;
  place-items: center;

  border-radius: 50%;

  color: white;

  background:
    var(--green);

  box-shadow:
    0
    7px
    17px
    rgba(
      29,
      185,
      84,
      .35
    );

  font-size: 21px;
}

.hero-marker {
  position: absolute;

  z-index: 10;

  right: 0;
  bottom: 54px;

  width: 148px;
  height: 176px;

  border-radius:
    75px
    75px
    83px
    83px;

  transform:
    rotate(6deg);

  background:
    linear-gradient(
      145deg,
      #59e284,
      #22bb57
      42%,
      #078639
    );

  box-shadow:
    -12px
    22px
    35px
    rgba(
      0,
      0,
      0,
      .32
    ),
    inset
    8px
    9px
    18px
    rgba(
      255,
      255,
      255,
      .2
    );
}

.hero-marker::after {
  content: "";

  position: absolute;

  left: 50%;
  bottom: -25px;

  width: 72px;
  height: 33px;

  transform:
    translateX(-50%);

  border-radius: 50%;

  background:
    rgba(
      0,
      0,
      0,
      .27
    );

  filter:
    blur(11px);
}

.hero-marker-inner {
  position: absolute;

  top: 40px;
  left: 50%;

  width: 86px;
  height: 86px;

  transform:
    translateX(-50%);

  display: grid;
  place-items: center;

  border-radius: 27px;

  background:
    rgba(
      255,
      255,
      255,
      .18
    );
}

.hero-marker svg {
  width: 68px;
}

.floating-hazard {
  position: absolute;

  z-index: 4;

  width: 52px;
  height: 52px;

  display: grid;
  place-items: center;

  border-radius:
    50%
    50%
    50%
    0;

  transform:
    rotate(-45deg);

  color: white;

  font-weight: 900;

  box-shadow:
    0
    13px
    27px
    rgba(
      0,
      0,
      0,
      .25
    );

  animation:
    markerFloat
    4.5s
    ease-in-out
    infinite;
}

.floating-hazard-purple {
  top: 150px;
  left: 80px;

  background: #8b5cf6;
}

.floating-hazard-orange {
  top: 230px;
  right: 10px;

  background: #f59e0b;

  animation-delay: 1s;
}

/* ==========================================================================
   COMMON SECTIONS
============================================================================ */

.section-tag {
  min-height: 25px;

  padding:
    0
    10px;

  display: inline-flex;
  align-items: center;

  border-radius: 999px;

  color: #159447;

  background: #e8f7ed;

  font-size: 10px;
  font-weight: 900;

  letter-spacing: .07em;

  text-transform: uppercase;
}

.section-tag-dark {
  color: #52dd80;

  background:
    rgba(
      37,
      170,
      80,
      .14
    );

  border:
    1px solid
    rgba(
      50,
      200,
      100,
      .17
    );
}

/* ==========================================================================
   HOW IT WORKS
============================================================================ */

.how-section {
  padding:
    105px
    0
    70px;

  background:
    radial-gradient(
      circle at 48% 0,
      rgba(
        29,
        185,
        84,
        .04
      ),
      transparent
      30%
    );
}

.how-layout {
  display: grid;

  grid-template-columns:
    .72fr
    1.28fr;

  align-items: center;

  gap: 85px;
}

.how-copy {
  max-width: 365px;
}

.how-copy h2 {
  margin:
    15px
    0
    0;

  color: #111827;

  font-size:
    clamp(
      38px,
      4vw,
      58px
    );

  line-height: 1.02;

  letter-spacing:
    -2.6px;
}

.how-copy p {
  margin:
    20px
    0
    0;

  color: #6a756e;

  font-size: 16px;

  line-height: 1.7;
}

.hand-line {
  width: 48px;
  height: 18px;

  margin-top: 22px;

  border-top:
    3px solid
    #41c96d;

  border-radius: 50%;

  transform:
    rotate(-9deg);
}

.steps {
  position: relative;

  display: grid;

  grid-template-columns:
    repeat(
      3,
      minmax(
        0,
        1fr
      )
    );

  gap: 31px;

  padding-top: 28px;
}

.steps::before {
  content: "";

  position: absolute;

  z-index: 0;

  left: 13%;
  right: 12%;
  top: 66px;

  border-top:
    2px dashed
    rgba(
      45,
      197,
      98,
      .34
    );
}

.step-card {
  position: relative;

  z-index: 2;

  min-width: 0;

  min-height: 238px;

  padding:
    64px
    24px
    25px;

  border-radius: 25px;

  border:
    1px solid
    #e7ebe6;

  background:
    rgba(
      255,
      255,
      255,
      .94
    );

  box-shadow:
    0
    18px
    38px
    rgba(
      29,
      49,
      36,
      .07
    );

  transition:
    transform 260ms ease,
    box-shadow 260ms ease;
}

.step-card:nth-child(2) {
  transform:
    translateY(-10px);
}

.step-card:hover {
  transform:
    translateY(-7px);

  box-shadow:
    0
    27px
    48px
    rgba(
      29,
      49,
      36,
      .11
    );
}

.step-icon {
  position: absolute;

  top: -22px;
  left: 24px;

  width: 53px;
  height: 53px;

  display: grid;
  place-items: center;

  color: white;

  border-radius: 16px;

  background:
    var(--step-color);

  box-shadow:
    0
    13px
    23px
    rgba(
      20,
      110,
      55,
      .13
    );

  font-size: 20px;
  font-weight: 900;
}

.step-number {
  position: absolute;

  top: 17px;
  right: 18px;

  color: #edf1ee;

  font-size: 34px;
  font-weight: 950;

  letter-spacing: -2px;
}

.step-card h3 {
  margin:
    0
    0
    11px;

  color: #18231d;

  font-size: 17px;
  font-weight: 850;
}

.step-card p {
  margin: 0;

  color: #7b8580;

  font-size: 13px;

  line-height: 1.65;
}

/* ==========================================================================
   LIVE MAP
============================================================================ */

.map-section {
  padding:
    65px
    0
    80px;
}

.live-map {
  position: relative;

  width: 100%;

  min-height: 470px;

  overflow: hidden;

  border-radius: 27px;

  color: white;

  background:
    radial-gradient(
      circle at 58% 45%,
      rgba(
        27,
        38,
        37,
        .96
      ),
      transparent
      44%
    ),
    #090e0f;

  box-shadow:
    0
    35px
    70px
    rgba(
      14,
      25,
      21,
      .14
    );
}

.live-map-copy {
  position: absolute;

  z-index: 20;

  top: 62px;
  left: 44px;

  width: 280px;
}

.live-map-copy h2 {
  margin:
    16px
    0
    17px;

  color: white;

  font-size:
    clamp(
      37px,
      4vw,
      53px
    );

  line-height: .99;

  letter-spacing:
    -2.6px;
}

.live-map-copy h2 em {
  color: #39d872;

  font-style: normal;
}

.live-map-copy p {
  max-width: 245px;

  margin:
    0
    0
    25px;

  color: #a9b4ae;

  font-size: 13px;

  line-height: 1.63;
}

.dark-outline-button {
  min-height: 44px;

  padding:
    0
    15px;

  display: inline-flex;
  align-items: center;

  gap: 13px;

  color: white;

  border-radius: 10px;

  border:
    1px solid
    rgba(
      255,
      255,
      255,
      .22
    );

  background:
    rgba(
      0,
      0,
      0,
      .14
    );

  cursor: pointer;

  font-size: 12px;
  font-weight: 760;
}

.dark-outline-button span {
  width: 26px;
  height: 26px;

  display: grid;
  place-items: center;

  border-radius: 50%;

  background:
    rgba(
      255,
      255,
      255,
      .08
    );
}

.map-world {
  position: absolute;

  z-index: 3;

  inset:
    0
    220px
    0
    300px;

  overflow: hidden;
}

.map-block {
  position: absolute;

  border:
    1px solid
    rgba(
      255,
      255,
      255,
      .035
    );

  background:
    rgba(
      255,
      255,
      255,
      .016
    );
}

.block-1 {
  left: 12%;
  top: 9%;

  width: 29%;
  height: 27%;
}

.block-2 {
  left: 49%;
  top: 7%;

  width: 35%;
  height: 26%;
}

.block-3 {
  left: 7%;
  top: 52%;

  width: 31%;
  height: 35%;
}

.block-4 {
  left: 44%;
  top: 44%;

  width: 24%;
  height: 42%;
}

.block-5 {
  right: 2%;
  top: 44%;

  width: 22%;
  height: 36%;
}

.map-road {
  position: absolute;

  z-index: 2;

  background:
    rgba(
      255,
      255,
      255,
      .065
    );
}

.map-road-h {
  left: -20%;

  width: 140%;
  height: 16px;
}

.map-road-h-1 {
  top: 31%;

  transform:
    rotate(2deg);
}

.map-road-h-2 {
  top: 62%;

  transform:
    rotate(-3deg);
}

.map-road-h-3 {
  top: 83%;

  transform:
    rotate(5deg);
}

.map-road-v {
  top: -20%;

  width: 15px;
  height: 140%;
}

.map-road-v-1 {
  left: 27%;

  transform:
    rotate(4deg);
}

.map-road-v-2 {
  left: 57%;

  transform:
    rotate(-3deg);
}

.map-road-v-3 {
  left: 82%;

  transform:
    rotate(6deg);
}

.map-marker {
  position: absolute;

  z-index: 10;

  transform:
    translate(
      -50%,
      -50%
    );
}

.map-marker-core {
  position: relative;

  z-index: 5;

  width: 35px;
  height: 35px;

  display: grid;
  place-items: center;

  border-radius: 50%;

  color: white;

  background:
    var(
      --marker-color
    );

  border:
    3px solid
    rgba(
      10,
      14,
      15,
      .9
    );

  box-shadow:
    0 0 0 2px
      var(
        --marker-color
      ),
    0 0 25px
      var(
        --marker-color
      );

  font-size: 11px;
  font-weight: 900;
}

.map-marker-pulse {
  position: absolute;

  inset: -10px;

  border-radius: 50%;

  border:
    2px solid
    var(
      --marker-color
    );

  animation:
    mapPulse
    2.6s
    ease-out
    infinite;
}

.recent-reports {
  position: absolute;

  z-index: 20;

  top: 25px;
  right: 22px;
  bottom: 53px;

  width: 222px;

  padding:
    20px
    16px;

  overflow: hidden;

  border-radius: 19px;

  border:
    1px solid
    rgba(
      255,
      255,
      255,
      .065
    );

  background:
    rgba(
      12,
      18,
      18,
      .84
    );

  backdrop-filter:
    blur(18px);
}

.recent-title {
  margin-bottom: 16px;

  display: flex;
  justify-content: space-between;

  color: white;

  font-size: 11px;
}

.recent-title span {
  color: #45d977;

  font-size: 9px;
  font-weight: 800;
}

.recent-report {
  min-width: 0;

  padding:
    11px
    0;

  display: grid;

  grid-template-columns:
    8px
    minmax(0,1fr)
    36px;

  align-items: center;

  gap: 9px;

  border-bottom:
    1px solid
    rgba(
      255,
      255,
      255,
      .055
    );
}

.recent-status {
  width: 7px;
  height: 7px;

  border-radius: 50%;
}

.recent-report-copy {
  min-width: 0;
}

.recent-report-copy strong,
.recent-report-copy small {
  display: block;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;
}

.recent-report-copy strong {
  color: #eef2ef;

  font-size: 10px;
}

.recent-report-copy small {
  margin-top: 3px;

  color: #737c77;

  font-size: 8px;
}

.recent-image {
  width: 36px;
  height: 32px;

  display: grid;
  place-items: center;

  border-radius: 7px;

  background: #242a27;

  font-size: 16px;
}

.map-legend {
  position: absolute;

  z-index: 25;

  left: 320px;
  bottom: 17px;

  display: flex;
  flex-wrap: wrap;

  gap: 12px;
}

.map-legend-item {
  display: flex;
  align-items: center;

  gap: 5px;

  color: #929c97;

  font-size: 8px;
}

.map-legend-item span {
  width: 6px;
  height: 6px;

  border-radius: 50%;
}

/* ==========================================================================
   IMPACT
============================================================================ */

.impact-section {
  padding:
    55px
    0
    70px;
}

.impact-layout {
  display: grid;

  grid-template-columns:
    .55fr
    1.45fr;

  gap: 85px;

  align-items: center;
}

.impact-heading h2 {
  margin:
    14px
    0
    0;

  color: #111827;

  font-size:
    clamp(
      38px,
      4vw,
      48px
    );

  line-height: 1;

  letter-spacing:
    -2.2px;
}

.stats-grid {
  min-width: 0;

  display: grid;

  grid-template-columns:
    repeat(
      4,
      minmax(
        0,
        1fr
      )
    );

  gap: 14px;
}

.stat-card {
  position: relative;

  min-width: 0;
  min-height: 190px;

  padding: 19px;

  overflow: hidden;

  border-radius: 18px;

  border:
    1px solid
    rgba(
      19,
      27,
      23,
      .055
    );

  transition:
    transform 220ms ease,
    box-shadow 220ms ease;
}

.stat-card:hover {
  transform:
    translateY(-5px);

  box-shadow:
    0
    20px
    42px
    rgba(
      17,
      40,
      25,
      .08
    );
}

.stat-green {
  color: #159947;

  background:
    linear-gradient(
      150deg,
      #eaf8ee,
      #f6fcf8
    );
}

.stat-lime {
  color: #64a828;

  background:
    linear-gradient(
      150deg,
      #f1f9e8,
      #fafdf6
    );
}

.stat-purple {
  color: #6c4bd9;

  background:
    linear-gradient(
      150deg,
      #f3efff,
      #fbfaff
    );
}

.stat-blue {
  color: #2484de;

  background:
    linear-gradient(
      150deg,
      #edf7ff,
      #fafcff
    );
}

.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-icon {
  width: 27px;
  height: 27px;

  display: grid;
  place-items: center;

  border-radius: 8px;

  background:
    rgba(
      255,
      255,
      255,
      .67
    );

  font-size: 12px;
}

.stat-live {
  opacity: .67;

  font-size: 8px;
  font-weight: 850;
}

.stat-number {
  display: block;

  margin-top: 13px;

  font-size: 30px;

  letter-spacing:
    -1.2px;
}

.stat-label {
  display: block;

  margin-top: 3px;

  color: #657169;

  font-size: 9px;
  font-weight: 650;
}

.stat-line {
  position: absolute;

  left: 18px;
  right: 18px;
  bottom: 16px;

  width:
    calc(
      100% - 36px
    );

  height: 48px;
}

/* ==========================================================================
   FEATURES / CITY
============================================================================ */

.community-section {
  position: relative;

  padding:
    70px
    0
    90px;

  overflow: hidden;
}

.community-layout {
  display: grid;

  grid-template-columns:
    .43fr
    1.57fr;

  align-items: center;

  gap: 28px;
}

.features-copy {
  position: relative;

  z-index: 20;
}

.features-copy h2 {
  max-width: 300px;

  margin:
    14px
    0
    25px;

  color: #111827;

  font-size:
    clamp(
      39px,
      4vw,
      50px
    );

  line-height: 1.02;

  letter-spacing:
    -2.4px;
}

.feature-list {
  display: flex;
  flex-direction: column;

  gap: 16px;
}

.feature-item {
  min-width: 0;

  display: grid;

  grid-template-columns:
    38px
    minmax(0,1fr);

  align-items: start;

  gap: 12px;
}

.feature-icon {
  width: 38px;
  height: 38px;

  display: grid;
  place-items: center;

  color: #179c4b;

  border-radius: 10px;

  background: white;

  border:
    1px solid
    #e7e9e6;

  box-shadow:
    0
    8px
    22px
    rgba(
      25,
      70,
      39,
      .07
    );

  font-weight: 900;
}

.feature-item strong {
  display: block;

  margin-bottom: 3px;

  color: #18231d;

  font-size: 12px;
}

.feature-item p {
  max-width: 245px;

  margin: 0;

  color: #838c87;

  font-size: 10px;

  line-height: 1.55;
}

/* ==========================================================================
   CITY
============================================================================ */

.city-scene {
  position: relative;

  width: 100%;
  min-width: 0;

  height: 570px;

  perspective: 1100px;
}

.city-glow {
  position: absolute;

  inset:
    7%
    1%
    3%
    5%;

  border-radius: 50%;

  background:
    radial-gradient(
      ellipse,
      rgba(
        132,
        190,
        122,
        .24
      ),
      transparent
      68%
    );

  filter:
    blur(15px);
}

.city-board {
  position: absolute;

  left: 50%;
  top: 50%;

  width: min(780px, 88vw);
  aspect-ratio: 780 / 470;

  transform:
    translate(
      -50%,
      -50%
    )
    rotateX(58deg)
    rotateZ(-36deg);

  transform-style:
    preserve-3d;

  border-radius: 34px;

  background:
    linear-gradient(
      135deg,
      #e9e4d4,
      #f1eee2
      45%,
      #dce5d4
    );

  box-shadow:
    30px
    45px
    70px
    rgba(
      29,
      52,
      34,
      .17
    );
}

.city-main-road,
.city-cross-road {
  position: absolute;

  z-index: 4;

  background: #34383a;

  box-shadow:
    inset
    0
    0
    0
    4px
    #454a4c;
}

.city-main-road {
  left: -4%;
  top: 47%;

  width: 108%;
  height: 14%;
}

.city-main-road::after {
  content: "";

  position: absolute;

  left: 0;
  right: 0;
  top: 49%;

  height: 2px;

  background:
    repeating-linear-gradient(
      90deg,
      #ead588
      0
      22px,
      transparent
      22px
      39px
    );
}

.city-cross-road {
  top: -12%;
  left: 52%;

  width: 9%;
  height: 124%;
}

.city-cross-road::after {
  content: "";

  position: absolute;

  top: 0;
  bottom: 0;
  left: 49%;

  width: 2px;

  background:
    repeating-linear-gradient(
      0deg,
      #ead588
      0
      22px,
      transparent
      22px
      39px
    );
}

.city-water {
  position: absolute;

  z-index: 2;

  left: -3%;
  right: -3%;
  bottom: 4%;

  height: 14%;

  border-radius: 45%;

  background:
    repeating-linear-gradient(
      -17deg,
      rgba(
        255,
        255,
        255,
        .22
      )
      0
      5px,
      transparent
      5px
      16px
    ),
    #76c8df;
}

.mini-building {
  position: absolute;

  z-index: 8;

  width: 11%;
  min-width: 52px;

  aspect-ratio: 1 / .85;

  padding: 10px;

  display: grid;

  grid-template-columns:
    repeat(
      2,
      1fr
    );

  gap: 7px;

  background:
    linear-gradient(
      #fffdf4,
      #eae5d8
    );

  box-shadow:
    0
    10px
    18px
    rgba(
      0,
      0,
      0,
      .16
    );

  transform:
    translateZ(40px);
}

.mini-building::before {
  content: "";

  position: absolute;

  top: -18px;
  left: 8px;

  width: 100%;
  height: 20px;

  background: #f4eee2;

  transform:
    skewX(-39deg);

  transform-origin:
    left
    bottom;
}

.mini-building span {
  min-height: 7px;

  border-radius: 2px;

  background: #9fcfd1;
}

.building-1 {
  left: 7%;
  top: 12%;
}

.building-2 {
  left: 31%;
  top: 18%;
}

.building-3 {
  right: 13%;
  top: 10%;
}

.building-4 {
  left: 11%;
  top: 68%;
}

.building-5 {
  left: 38%;
  top: 71%;
}

.building-6 {
  right: 8%;
  top: 67%;
}

.mini-tree {
  position: absolute;

  z-index: 9;

  width: 26px;
  height: 26px;

  border-radius: 50%;

  background:
    radial-gradient(
      circle at 30% 25%,
      #b9df84,
      #58a849
      55%,
      #2e7836
    );

  transform:
    translateZ(55px);
}

.mini-tree span {
  position: absolute;

  left: 11px;
  top: 21px;

  width: 5px;
  height: 18px;

  background: #876443;
}

.tree-1 {
  left: 21%;
  top: 22%;
}

.tree-2 {
  left: 47%;
  top: 17%;
}

.tree-3 {
  right: 8%;
  top: 32%;
}

.tree-4 {
  left: 5%;
  top: 47%;
}

.tree-5 {
  left: 42%;
  top: 41%;
}

.tree-6 {
  right: 18%;
  top: 53%;
}

.tree-7 {
  right: 31%;
  bottom: 10%;
}

.city-alert {
  position: absolute;

  z-index: 50;

  transform-style:
    preserve-3d;
}

.city-alert-pin {
  width: 50px;
  height: 50px;

  display: grid;
  place-items: center;

  border-radius:
    50%
    50%
    50%
    0;

  transform:
    translateZ(95px)
    rotate(-45deg);

  color: white;

  background:
    var(--alert-color);

  border:
    4px solid
    rgba(
      255,
      255,
      255,
      .85
    );

  box-shadow:
    0
    14px
    20px
    rgba(
      0,
      0,
      0,
      .2
    );
}

.city-alert-pin span {
  transform:
    rotate(45deg);

  font-weight: 950;
}

.city-alert-card {
  position: absolute;

  min-width: 145px;

  padding:
    11px
    13px;

  transform:
    translate3d(
      42px,
      -36px,
      100px
    )
    rotateZ(36deg)
    rotateX(-58deg);

  transform-origin:
    left
    center;

  border-radius: 11px;

  color: #1c2822;

  background:
    rgba(
      255,
      255,
      255,
      .96
    );

  box-shadow:
    0
    16px
    32px
    rgba(
      27,
      41,
      31,
      .15
    );
}

.city-alert-card strong,
.city-alert-card small {
  display: block;
}

.city-alert-card strong {
  font-size: 10px;
}

.city-alert-card small {
  margin-top: 4px;

  color:
    var(--alert-color);

  font-size: 8px;
  font-weight: 760;
}

.alert-1 {
  left: 29%;
  top: 35%;
}

.alert-2 {
  right: 20%;
  top: 21%;
}

.alert-3 {
  left: 47%;
  top: 68%;
}

.alert-4 {
  right: 8%;
  top: 60%;
}

/* ==========================================================================
   CATEGORIES
============================================================================ */

.categories-section {
  padding:
    25px
    0
    75px;
}

.categories-panel {
  width: 100%;

  padding: 24px;

  border-radius: 18px;

  background:
    rgba(
      255,
      255,
      255,
      .68
    );

  border:
    1px solid
    #e8eae6;

  box-shadow:
    0
    12px
    34px
    rgba(
      16,
      39,
      25,
      .035
    );
}

.categories-title {
  margin-bottom: 17px;

  color: #36a45d;

  font-size: 9px;
  font-weight: 900;

  letter-spacing: .09em;

  text-transform: uppercase;
}

.category-list {
  display: flex;
  flex-wrap: wrap;

  gap: 9px;
}

.category-chip {
  min-height: 33px;

  max-width: 100%;

  padding:
    0
    12px;

  display: inline-flex;
  align-items: center;

  gap: 7px;

  color: #566159;

  border:
    1px solid
    #e0e4df;

  border-radius: 8px;

  background: white;

  font-size: 10px;
  font-weight: 650;

  transition:
    transform 180ms ease,
    border-color 180ms ease;
}

.category-chip::before {
  content: "◆";

  color: #36ac60;

  font-size: 7px;
}

.category-chip:nth-child(3n+2)::before {
  color: #ee9e24;
}

.category-chip:nth-child(4n)::before {
  color: #7856d9;
}

.category-chip:hover {
  transform:
    translateY(-2px);

  border-color:
    rgba(
      29,
      185,
      84,
      .35
    );
}

/* ==========================================================================
   FINAL CTA
============================================================================ */

.final-section {
  padding:
    0
    0
    70px;
}

.final-cta {
  position: relative;

  min-height: 285px;

  overflow: hidden;

  display: grid;

  grid-template-columns:
    .95fr
    1.05fr;

  align-items: center;

  color: white;

  border-radius: 23px;

  background:
    linear-gradient(
      90deg,
      #159947
      0%,
      #24bd59
      42%,
      rgba(
        25,
        164,
        76,
        .46
      )
      67%,
      rgba(
        12,
        65,
        34,
        .08
      )
      100%
    ),
    url("${COMMUNITY_IMAGE}")
    84%
    45%
    /
    cover
    no-repeat;

  box-shadow:
    0
    28px
    55px
    rgba(
      21,
      98,
      48,
      .14
    );
}

.final-copy {
  position: relative;

  z-index: 5;

  padding: 48px;
}

.final-copy h2 {
  max-width: 500px;

  margin: 0;

  color: white;

  font-size:
    clamp(
      38px,
      4vw,
      58px
    );

  line-height: 1.02;

  letter-spacing:
    -2.4px;
}

.final-copy p {
  margin:
    17px
    0
    24px;

  color:
    rgba(
      255,
      255,
      255,
      .84
    );

  font-size: 13px;
}

.final-button {
  min-height: 48px;

  padding:
    0
    19px;

  display: inline-flex;
  align-items: center;

  gap: 10px;

  border: 0;

  border-radius: 10px;

  color: white;

  background: #16201b;

  box-shadow:
    0
    10px
    26px
    rgba(
      0,
      0,
      0,
      .19
    );

  cursor: pointer;

  font-size: 12px;
  font-weight: 800;

  transition:
    transform 200ms ease;
}

.final-button:hover {
  transform:
    translateY(-3px);
}

.final-button span {
  width: 23px;
  height: 23px;

  display: grid;
  place-items: center;

  color: #17201b;

  border-radius: 50%;

  background: white;
}

/* ==========================================================================
   FOOTER
============================================================================ */

.landing-footer {
  padding:
    42px
    0
    45px;

  color: #69736e;

  background: #f5f4ef;

  border-top:
    1px solid
    #e6e5df;
}

.footer-grid {
  display: grid;

  grid-template-columns:
    1.8fr
    repeat(
      3,
      1fr
    );

  gap: 48px;
}

.footer-brand {
  display: flex;
  align-items: center;

  gap: 9px;

  color: #18231d;

  font-size: 17px;
  font-weight: 900;
}

.footer-description {
  max-width: 260px;

  margin:
    13px
    0
    0;

  font-size: 11px;

  line-height: 1.65;
}

.footer-column strong {
  display: block;

  margin-bottom: 11px;

  color: #2b362f;

  font-size: 11px;
}

.footer-column a {
  display: block;

  width: fit-content;

  margin:
    8px
    0;

  color: #7c8580;

  text-decoration: none;

  font-size: 10px;
}

.footer-column a:hover {
  color: #1aa850;
}

.footer-bottom {
  margin-top: 34px;

  padding-top: 18px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  gap: 20px;

  color: #9aa19d;

  border-top:
    1px solid
    #e0e2dd;

  font-size: 9px;
}

/* ==========================================================================
   REVEALS
============================================================================ */

[data-reveal] {
  opacity: 0;

  transform:
    translateY(26px);

  transition:
    opacity
    680ms
    cubic-bezier(
      .22,
      1,
      .36,
      1
    ),
    transform
    680ms
    cubic-bezier(
      .22,
      1,
      .36,
      1
    );
}

[data-reveal][data-revealed] {
  opacity: 1;

  transform:
    translateY(0);
}

[data-delay="1"] {
  transition-delay: 100ms;
}

[data-delay="2"] {
  transition-delay: 200ms;
}

[data-delay="3"] {
  transition-delay: 300ms;
}

/* ==========================================================================
   ANIMATION
============================================================================ */

@keyframes phoneFloat {
  0%,
  100% {
    transform:
      rotateZ(8deg)
      rotateY(-9deg)
      translateY(0);
  }

  50% {
    transform:
      rotateZ(6.5deg)
      rotateY(-7deg)
      translateY(-12px);
  }
}

@keyframes mobilePhoneFloat {
  0%,
  100% {
    transform:
      translateX(-50%)
      rotateZ(6deg)
      rotateY(-5deg)
      translateY(0);
  }

  50% {
    transform:
      translateX(-50%)
      rotateZ(4deg)
      rotateY(-4deg)
      translateY(-8px);
  }
}

@keyframes markerFloat {
  0%,
  100% {
    margin-top: 0;
  }

  50% {
    margin-top: -11px;
  }
}

@keyframes mapPulse {
  0% {
    opacity: .72;

    transform:
      scale(.62);
  }

  75%,
  100% {
    opacity: 0;

    transform:
      scale(2.2);
  }
}

/* ==========================================================================
   1180
============================================================================ */

@media (max-width: 1180px) {

  .hero-inner {
    width:
      min(
        calc(100% - 48px),
        1180px
      );

    grid-template-columns:
      minmax(0,.95fr)
      minmax(0,1.05fr);
  }

  .content-shell {
    width:
      min(
        calc(100% - 48px),
        1180px
      );
  }

  .hero h1 {
    font-size:
      clamp(
        48px,
        6vw,
        72px
      );
  }

  .hero-visual {
    max-width: 590px;
  }

  .how-layout {
    gap: 48px;
  }

  .impact-layout {
    grid-template-columns: 1fr;

    gap: 35px;
  }

  .impact-heading {
    text-align: center;
  }

}

/* ==========================================================================
   TABLET
============================================================================ */

@media (max-width: 960px) {

  .nav-center {
    display: none;
  }

  .hero {
    min-height: auto;
    height: auto;

    padding-bottom: 28px;
  }

  .hero-inner {
    width:
      min(
        calc(100% - 40px),
        760px
      );

    padding-top: 115px;

    grid-template-columns: 1fr;

    gap: 25px;
  }

  .hero-copy {
    max-width: 680px;
  }

  .hero-visual {
    width: 100%;
    max-width: 650px;

    margin-inline: auto;
  }

  .how-layout {
    grid-template-columns: 1fr;

    gap: 58px;
  }

  .how-copy {
    max-width: 600px;

    margin-inline: auto;

    text-align: center;
  }

  .hand-line {
    margin:
      22px
      auto
      0;
  }

  .steps {
    max-width: 760px;

    margin-inline: auto;
  }

  .live-map {
    min-height: 650px;
  }

  .live-map-copy {
    top: 35px;
    left: 34px;
  }

  .map-world {
    inset:
      215px
      225px
      0
      0;
  }

  .recent-reports {
    top: 215px;
  }

  .map-legend {
    left: 35px;
  }

  .stats-grid {
    grid-template-columns:
      repeat(
        2,
        minmax(
          0,
          1fr
        )
      );
  }

  .community-layout {
    grid-template-columns: 1fr;

    gap: 35px;
  }

  .features-copy {
    text-align: center;
  }

  .features-copy h2 {
    max-width: 620px;

    margin-inline: auto;
  }

  .feature-list {
    width: min(700px,100%);

    margin-inline: auto;

    display: grid;

    grid-template-columns:
      repeat(
        2,
        minmax(
          0,
          1fr
        )
      );

    text-align: left;
  }

  .feature-item p {
    max-width: none;
  }

  .city-scene {
    max-width: 760px;

    margin-inline: auto;
  }

  .footer-grid {
    grid-template-columns:
      1.5fr
      repeat(
        3,
        1fr
      );

    gap: 30px;
  }

}

/* ==========================================================================
   MOBILE
============================================================================ */

@media (max-width: 720px) {

  html,
  body,
  #root,
  .hetusafe-landing {
    width: 100%;
    max-width: 100%;

    overflow-x: clip;
  }

  .content-shell {
    width:
      calc(
        100% - 32px
      );

    max-width: 100%;
  }

  /* NAV */

  .landing-nav {
    width: 100%;

    height: 68px;

    padding:
      0
      16px;
  }

  .nav-brand {
    gap: 7px;

    font-size: 16px;
  }

  .nav-brand svg {
    width: 30px;
    height: 30px;
  }

  .nav-login {
    display: none;
  }

  .nav-primary {
    min-height: 38px;

    padding:
      0
      13px;

    white-space: nowrap;

    font-size: 11px;
  }

  /* HERO */

  .hero {
    width: 100%;

    min-height: auto;
    height: auto;

    padding:
      0
      env(
        safe-area-inset-right
      )
      0
      env(
        safe-area-inset-left
      );

    background-position:
      56%
      center;
  }

  .hero::before {
    content: "";

    position: absolute;

    z-index: -1;

    inset: 0;

    background:
      linear-gradient(
        180deg,
        rgba(
          4,
          13,
          17,
          .76
        )
        0%,
        rgba(
          4,
          13,
          17,
          .63
        )
        45%,
        rgba(
          4,
          13,
          17,
          .78
        )
        100%
      );
  }

  .hero-inner {
    width:
      calc(
        100% - 32px
      );

    max-width: 520px;

    margin-inline: auto;

    padding:
      103px
      0
      25px;

    display: flex;
    flex-direction: column;

    gap: 28px;
  }

  .hero-copy {
    width: 100%;
    max-width: 100%;
  }

  .hero-kicker {
    max-width: 100%;

    margin-bottom: 20px;

    padding:
      6px
      10px;

    white-space: normal;

    font-size: 10px;

    line-height: 1.25;
  }

  .hero h1 {
    width: 100%;
    max-width: 100%;

    font-size:
      clamp(
        42px,
        12vw,
        58px
      );

    line-height: .98;

    letter-spacing:
      -2.8px;
  }

  .hero-green::after {
    bottom: -7px;

    border-width:
      3px
      0
      0;
  }

  .hero-description {
    width: 100%;
    max-width: 100%;

    margin:
      25px
      0;

    font-size: 14px;

    line-height: 1.65;
  }

  .hero-actions {
    width: 100%;

    display: grid;

    grid-template-columns: 1fr;

    gap: 10px;
  }

  .hero-button {
    width: 100%;

    min-width: 0;

    min-height: 50px;
  }

  .hero-points {
    width: 100%;

    margin-top: 20px;

    display: grid;

    grid-template-columns:
      repeat(
        3,
        minmax(
          0,
          1fr
        )
      );

    gap: 8px;
  }

  .hero-point {
    min-width: 0;

    justify-content: center;

    font-size: 8px;

    line-height: 1.2;

    text-align: center;
  }

  .hero-point-icon {
    width: 20px;
    height: 20px;

    flex:
      0
      0
      20px;
  }

  .hero-trust {
    width: 100%;
    min-width: 0;

    margin-top: 21px;

    padding: 12px;

    justify-content:
      space-between;

    gap: 10px;
  }

  .hero-trust > span {
    font-size: 10px;
  }

  .avatar {
    width: 28px;
    height: 28px;
  }

  /*
   * IMPORTANT:
   * This is viewport sized.
   * No 620px min-width.
   */

  .hero-visual {
    position: relative;

    width: 100%;
    max-width: 430px;

    height: 430px;

    margin-inline: auto;

    overflow: hidden;

    perspective: 900px;
  }

  .phone-ground-shadow {
    width: 245px;
    height: 55px;

    right: 50%;
    bottom: 29px;

    transform:
      translateX(50%)
      rotate(-10deg);

    filter:
      blur(18px);
  }

  .phone-device {
    top: 15px;

    left: 50%;
    right: auto;

    width: 215px;
    height: 408px;

    margin-left: -22px;

    animation:
      mobilePhoneFloat
      5s
      ease-in-out
      infinite;
  }

  .phone-frame {
    padding: 6px;

    border-radius: 33px;
  }

  .phone-screen {
    border-radius: 28px;
  }

  .phone-island {
    top: 10px;

    width: 55px;
    height: 16px;
  }

  .phone-header {
    height: 44px;

    padding:
      14px
      10px
      5px;
  }

  .phone-brand {
    gap: 4px;

    font-size: 8px;
  }

  .phone-brand svg {
    width: 14px;
    height: 14px;
  }

  .phone-map {
    height: 225px;
  }

  .phone-map .road-one {
    width: 290px;
    height: 11px;

    top: 100px;
  }

  .phone-map .road-two {
    width: 270px;
    height: 8px;

    top: 55px;
  }

  .phone-map .road-three {
    width: 10px;
    height: 250px;

    left: 105px;
  }

  .phone-map .road-four {
    width: 7px;
    height: 230px;

    left: 48px;
  }

  .phone-map .road-five {
    width: 8px;
    height: 220px;

    right: 34px;
  }

  .phone-park {
    transform:
      scale(.7);

    transform-origin:
      top
      left;
  }

  .phone-pin {
    width: 25px;
    height: 25px;
  }

  .phone-pin span {
    font-size: 8px;
  }

  .phone-pin-red {
    top: 38px;
    right: 40px;
  }

  .phone-pin-orange {
    top: 110px;
    left: 62px;
  }

  .phone-pin-purple {
    top: 84px;
    right: 26px;
  }

  .phone-pin-green {
    bottom: 22px;
    left: 88px;
  }

  .phone-report {
    left: 10px;
    right: 10px;

    bottom: 42px;

    border-radius: 12px;
  }

  .phone-report-image {
    height: 50px;
  }

  .phone-report-body {
    padding:
      7px
      8px;
  }

  .phone-report-title strong {
    font-size: 8px;
  }

  .phone-report-title small {
    font-size: 6px;
  }

  .phone-report-title > span {
    padding:
      3px
      5px;

    font-size: 6px;
  }

  .phone-nav {
    height: 38px;

    font-size: 9px;
  }

  .phone-plus {
    width: 27px;
    height: 27px;

    margin-top: -12px;

    font-size: 16px;
  }

  .hero-marker {
    right: 4%;
    bottom: 28px;

    width: 96px;
    height: 116px;

    border-radius:
      48px
      48px
      54px
      54px;
  }

  .hero-marker-inner {
    top: 28px;

    width: 58px;
    height: 58px;

    border-radius: 19px;
  }

  .hero-marker svg {
    width: 46px;
  }

  .floating-hazard {
    width: 38px;
    height: 38px;

    font-size: 10px;
  }

  .floating-hazard-purple {
    top: 108px;
    left: 8%;
  }

  .floating-hazard-orange {
    top: 145px;
    right: 3%;
  }

  /* HOW */

  .how-section {
    padding:
      72px
      0
      60px;
  }

  .how-layout {
    grid-template-columns: 1fr;

    gap: 45px;
  }

  .how-copy {
    width: 100%;
    max-width: 100%;

    text-align: center;
  }

  .how-copy h2 {
    font-size:
      clamp(
        34px,
        10vw,
        46px
      );

    letter-spacing:
      -1.8px;
  }

  .how-copy p {
    font-size: 14px;
  }

  .hand-line {
    margin:
      22px
      auto
      0;
  }

  .steps {
    width: 100%;
    max-width: 430px;

    margin-inline: auto;

    padding-top: 20px;

    grid-template-columns: 1fr;

    gap: 38px;
  }

  .steps::before {
    left: 43px;
    right: auto;

    top: 20px;
    bottom: 20px;

    width: 1px;
    height: auto;

    border: 0;

    border-left:
      2px dashed
      rgba(
        45,
        197,
        98,
        .25
      );
  }

  .step-card {
    width: 100%;
    min-width: 0;

    min-height: 190px;

    padding:
      53px
      20px
      22px;

    border-radius: 20px;
  }

  .step-card:nth-child(2),
  .step-card:hover {
    transform: none;
  }

  .step-icon {
    left: 20px;

    width: 46px;
    height: 46px;

    border-radius: 14px;

    font-size: 18px;
  }

  /* MAP */

  .map-section {
    padding:
      20px
      0
      65px;
  }

  .live-map {
    width: 100%;

    min-height: 760px;

    border-radius: 22px;
  }

  .live-map-copy {
    position: relative;

    top: auto;
    left: auto;

    width: 100%;

    padding:
      32px
      24px
      0;
  }

  .live-map-copy h2 {
    margin:
      15px
      0;

    font-size:
      clamp(
        35px,
        10vw,
        44px
      );

    letter-spacing:
      -1.8px;
  }

  .live-map-copy p {
    max-width: 100%;
  }

  .map-world {
    inset:
      290px
      0
      220px
      0;

    width: 100%;
  }

  .recent-reports {
    top: auto;

    left: 16px;
    right: 16px;

    bottom: 52px;

    width: auto;
    height: 184px;

    padding:
      15px
      13px;

    display: grid;

    grid-template-columns:
      repeat(
        2,
        minmax(
          0,
          1fr
        )
      );

    gap:
      0
      12px;
  }

  .recent-title {
    grid-column:
      1 / -1;

    margin-bottom: 0;
  }

  .recent-report {
    padding:
      6px
      0;
  }

  .recent-report:nth-last-child(-n+2) {
    display: none;
  }

  .map-legend {
    left: 16px;
    right: 16px;

    bottom: 16px;

    justify-content: center;

    gap: 8px;
  }

  /* IMPACT */

  .impact-section {
    padding:
      45px
      0
      55px;
  }

  .impact-layout {
    gap: 28px;
  }

  .impact-heading h2 {
    font-size:
      clamp(
        34px,
        10vw,
        44px
      );
  }

  .stats-grid {
    width: 100%;

    grid-template-columns:
      repeat(
        2,
        minmax(
          0,
          1fr
        )
      );

    gap: 10px;
  }

  .stat-card {
    min-width: 0;

    min-height: 165px;

    padding: 16px;

    border-radius: 15px;
  }

  .stat-number {
    font-size: 25px;
  }

  /* FEATURES */

  .community-section {
    padding:
      55px
      0;
  }

  .community-layout {
    width: 100%;

    grid-template-columns: 1fr;

    gap: 20px;
  }

  .features-copy {
    width: 100%;

    text-align: center;
  }

  .features-copy h2 {
    max-width: 100%;

    margin-bottom: 28px;

    font-size:
      clamp(
        35px,
        10vw,
        46px
      );
  }

  .feature-list {
    width: 100%;
    max-width: 480px;

    margin-inline: auto;

    display: grid;

    grid-template-columns: 1fr;

    gap: 14px;

    text-align: left;
  }

  .feature-item {
    width: 100%;

    padding: 11px;

    border-radius: 13px;

    border:
      1px solid
      #e6ebe5;

    background:
      rgba(
        255,
        255,
        255,
        .72
      );
  }

  .feature-item p {
    max-width: 100%;
  }

  /*
   * Important:
   * no 800px mobile min-width.
   */

  .city-scene {
    width: 100%;
    max-width: 440px;

    height: 410px;

    margin-inline: auto;

    overflow: hidden;
  }

  .city-board {
    width: 720px;

    transform:
      translate(
        -50%,
        -50%
      )
      scale(.54)
      rotateX(58deg)
      rotateZ(-36deg);
  }

  /* CATEGORIES */

  .categories-section {
    padding:
      0
      0
      55px;
  }

  .categories-panel {
    padding: 18px;

    border-radius: 15px;
  }

  .category-list {
    gap: 7px;
  }

  .category-chip {
    min-height: 31px;

    padding:
      0
      10px;

    white-space: normal;

    font-size: 9px;
  }

  /* CTA */

  .final-section {
    padding-bottom: 45px;
  }

  .final-cta {
    min-height: 440px;

    display: flex;
    align-items: flex-end;

    border-radius: 20px;

    background:
      linear-gradient(
        180deg,
        rgba(
          7,
          62,
          30,
          .08
        )
        0%,
        rgba(
          20,
          156,
          70,
          .42
        )
        45%,
        rgba(
          20,
          156,
          70,
          .97
        )
        72%
      ),
      url("${COMMUNITY_IMAGE}")
      58%
      20%
      /
      cover
      no-repeat;
  }

  .final-copy {
    width: 100%;

    padding:
      30px
      24px;
  }

  .final-copy h2 {
    max-width: 100%;

    font-size:
      clamp(
        34px,
        10vw,
        46px
      );

    letter-spacing:
      -1.8px;
  }

  /* FOOTER */

  .landing-footer {
    padding:
      38px
      0;
  }

  .footer-grid {
    grid-template-columns:
      repeat(
        2,
        minmax(
          0,
          1fr
        )
      );

    gap:
      30px
      20px;
  }

  .footer-main {
    grid-column:
      1 / -1;
  }

}

/* ==========================================================================
   SMALL MOBILE
============================================================================ */

@media (max-width: 480px) {

  .landing-nav {
    padding:
      0
      14px;
  }

  .nav-primary {
    padding:
      0
      11px;

    font-size: 10px;
  }

  .content-shell,
  .hero-inner {
    width:
      calc(
        100% - 28px
      );
  }

  .hero-inner {
    padding-top: 96px;
  }

  .hero h1 {
    font-size:
      clamp(
        40px,
        12vw,
        52px
      );

    letter-spacing:
      -2.4px;
  }

  .hero-description {
    font-size: 13px;
  }

  .hero-points {
    grid-template-columns: 1fr;
  }

  .hero-point {
    justify-content: flex-start;
  }

  .hero-trust {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-visual {
    height: 385px;
  }

  .phone-device {
    width: 195px;
    height: 370px;

    margin-left: -18px;
  }

  .hero-marker {
    right: 2%;

    width: 82px;
    height: 100px;
  }

  .hero-marker-inner {
    top: 24px;

    width: 50px;
    height: 50px;
  }

  .hero-marker svg {
    width: 40px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-card {
    min-height: 180px;
  }

  .recent-reports {
    grid-template-columns: 1fr;
  }

  .recent-report:nth-of-type(n+3) {
    display: none;
  }

  .city-scene {
    height: 360px;
  }

  .city-board {
    transform:
      translate(
        -50%,
        -50%
      )
      scale(.47)
      rotateX(58deg)
      rotateZ(-36deg);
  }

  .footer-grid {
    grid-template-columns: 1fr;
  }

  .footer-main {
    grid-column: auto;
  }

  .footer-bottom {
    align-items: flex-start;
    flex-direction: column;
  }

}

/* ==========================================================================
   VERY SMALL MOBILE
============================================================================ */

@media (max-width: 360px) {

  .content-shell,
  .hero-inner {
    width:
      calc(
        100% - 24px
      );
  }

  .nav-brand {
    font-size: 14px;
  }

  .nav-primary {
    padding:
      0
      9px;
  }

  .hero h1 {
    font-size: 39px;
  }

  .hero-visual {
    height: 350px;
  }

  .phone-device {
    width: 175px;
    height: 332px;

    margin-left: -15px;
  }

  .hero-marker {
    width: 74px;
    height: 90px;
  }

  .city-scene {
    height: 320px;
  }

  .city-board {
    transform:
      translate(
        -50%,
        -50%
      )
      scale(.40)
      rotateX(58deg)
      rotateZ(-36deg);
  }

}

/* ==========================================================================
   REDUCED MOTION
============================================================================ */

@media (prefers-reduced-motion: reduce) {

  *,
  *::before,
  *::after {
    scroll-behavior:
      auto !important;

    animation-duration:
      .01ms !important;

    animation-iteration-count:
      1 !important;

    transition-duration:
      .01ms !important;
  }

  [data-reveal],
  [data-reveal][data-revealed] {
    opacity: 1;

    transform: none;

    transition: none;
  }

}

      `}</style>

      {/* ================================================================
          NAV
      ================================================================= */}

      <nav
        className={
          `landing-nav ${
            scrolled
              ? 'is-scrolled'
              : ''
          }`
        }
      >
        <div className="nav-brand">
          <ShieldLogo size={36} />

          <span>
            Hetusafe
          </span>
        </div>

        <div className="nav-center">
          <a href="#how-it-works">
            How it works
          </a>

          <a href="#live-map">
            Live map
          </a>

          <a href="#features">
            Features
          </a>

          <a href="#impact">
            Impact
          </a>
        </div>

        <div className="nav-actions">
          {user ? (
            <button
              className="nav-button nav-primary"
              onClick={() =>
                navigate(
                  '/dashboard',
                )
              }
            >
              Go to Dashboard
            </button>
          ) : (
            <>
              <button
                className="nav-button nav-login"
                onClick={() =>
                  navigate(
                    '/login',
                  )
                }
              >
                Log in
              </button>

              <button
                className="nav-button nav-primary"
                onClick={() =>
                  navigate(
                    '/signup',
                  )
                }
              >
                Get started
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ================================================================
          HERO
      ================================================================= */}

      <section className="hero">
        <div className="hero-noise" />

        <div className="hero-inner">
          <div className="hero-copy">
            <div className="hero-kicker">
              Powered by community.
              Driven by safety.
            </div>

            <h1>
              Your city.
              <br />

              Safer{' '}

              <span className="hero-green">
                together.
              </span>
            </h1>

            <p className="hero-description">
              Report hazards in seconds,
              track updates in real time,
              and help your community stay
              safer.
            </p>

            <div className="hero-actions">
              <button
                className="hero-button hero-button-primary"
                onClick={() =>
                  navigate(
                    user
                      ? '/report'
                      : '/signup',
                  )
                }
              >
                Report a hazard

                <ArrowIcon />
              </button>

              <button
                className="hero-button hero-button-secondary"
                onClick={() =>
                  navigate(
                    user
                      ? '/dashboard'
                      : '/login',
                  )
                }
              >
                Explore live map

                <ArrowIcon />
              </button>
            </div>

            <div className="hero-points">
              <span className="hero-point">
                <span className="hero-point-icon">
                  ↯
                </span>

                Real-time updates
              </span>

              <span className="hero-point">
                <span className="hero-point-icon">
                  ✓
                </span>

                Community verified
              </span>

              <span className="hero-point">
                <span className="hero-point-icon">
                  ◎
                </span>

                Works anywhere
              </span>
            </div>

            <div className="hero-trust">
              <span>
                Trusted by communities
              </span>

              <div className="trust-avatars">
                <span className="avatar avatar-1">
                  A
                </span>

                <span className="avatar avatar-2">
                  R
                </span>

                <span className="avatar avatar-3">
                  M
                </span>

                <span className="avatar avatar-4">
                  S
                </span>

                <span className="avatar-count">
                  {stats?.total_users
                    ? `${stats.total_users.toLocaleString()}+`
                    : '...'}
                </span>
              </div>
            </div>
          </div>

          <HeroPhone />
        </div>
      </section>

      {/* ================================================================
          HOW IT WORKS
      ================================================================= */}

      <section
        className="how-section"
        id="how-it-works"
      >
        <div className="content-shell how-layout">
          <div
            className="how-copy"
            data-reveal
          >
            <span className="section-tag">
              How it works
            </span>

            <h2>
              Three simple steps,
              <br />
              big impact
            </h2>

            <p>
              Anyone can make their city
              safer in just a few taps.
            </p>

            <div className="hand-line" />
          </div>

          <div className="steps">
            {HOW_IT_WORKS.map(
              (
                {
                  step,
                  title,
                  desc,
                },
                index,
              ) => {
                const colors = [
                  '#2dbd62',
                  '#f59e0b',
                  '#7c4ed8',
                ]

                const icons = [
                  '⌖',
                  '➤',
                  '✓',
                ]

                return (
                  <article
                    className="step-card"
                    key={step}
                    data-reveal
                    data-delay={String(
                      index + 1,
                    )}
                    style={{
                      '--step-color':
                        colors[index],
                    }}
                  >
                    <div className="step-icon">
                      {icons[index]}
                    </div>

                    <span className="step-number">
                      {step}
                    </span>

                    <h3>
                      {index + 1}.{' '}
                      {title}
                    </h3>

                    <p>
                      {desc}
                    </p>
                  </article>
                )
              },
            )}
          </div>
        </div>
      </section>

      {/* ================================================================
          LIVE MAP
      ================================================================= */}

      <section
        className="map-section"
        id="live-map"
      >
        <div className="content-shell">
          <LiveMapPreview
            onExplore={() =>
              navigate(
                user
                  ? '/dashboard'
                  : '/login',
              )
            }
          />
        </div>
      </section>

      {/* ================================================================
          IMPACT
      ================================================================= */}

      <section
        className="impact-section"
        id="impact"
        ref={statsRef}
      >
        <div className="content-shell impact-layout">
          <div
            className="impact-heading"
            data-reveal
          >
            <span className="section-tag">
              Live impact
            </span>

            <h2>
              Real numbers.
              <br />
              Real change.
            </h2>
          </div>

          <div className="stats-grid">
            <StatCard
              value={
                stats?.total_reports
                ?? 0
              }
              label="Hazards reported"
              animate={statsVisible}
              tone="green"
              icon="⌖"
            />

            <StatCard
              value={
                stats?.resolved_count
                ?? 0
              }
              label="Issues resolved"
              animate={statsVisible}
              tone="lime"
              icon="✓"
            />

            <StatCard
              value={
                stats?.total_users
                ?? 0
              }
              label="Community members"
              animate={statsVisible}
              tone="purple"
              icon="♙"
            />

            <StatCard
              value={
                stats?.areas_covered
                ?? 0
              }
              label="Areas covered"
              animate={statsVisible}
              tone="blue"
              icon="◎"
            />
          </div>
        </div>
      </section>

      {/* ================================================================
          FEATURES
      ================================================================= */}

      <section
        className="community-section"
        id="features"
      >
        <div className="content-shell community-layout">
          <div
            className="features-copy"
            data-reveal
          >
            <span className="section-tag">
              Powerful features
            </span>

            <h2>
              Built for your community
            </h2>

            <div className="feature-list">
              {FEATURES.map(
                ({
                  icon,
                  title,
                  desc,
                }) => (
                  <div
                    className="feature-item"
                    key={title}
                  >
                    <span className="feature-icon">
                      {icon}
                    </span>

                    <div>
                      <strong>
                        {title}
                      </strong>

                      <p>
                        {desc}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>

          <CommunityCity />
        </div>
      </section>

      {/* ================================================================
          CATEGORIES
      ================================================================= */}

      <section className="categories-section">
        <div className="content-shell">
          <div
            className="categories-panel"
            data-reveal
          >
            <div className="categories-title">
              Hazards we cover
            </div>

            <div className="category-list">
              {HAZARD_CATEGORIES.map(
                (category) => (
                  <span
                    className="category-chip"
                    key={category}
                  >
                    {category}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          CTA
      ================================================================= */}

      <section className="final-section">
        <div className="content-shell">
          <div
            className="final-cta"
            data-reveal
          >
            <div className="final-copy">
              <h2>
                Let's build a safer
                <br />
                neighbourhood,
                together.
              </h2>

              <p>
                Join your community in
                making local streets safer.
              </p>

              <button
                className="final-button"
                onClick={() =>
                  navigate(
                    user
                      ? '/report'
                      : '/signup',
                  )
                }
              >
                {user
                  ? 'Report a hazard now'
                  : 'Create your free account'}

                <span>
                  <ArrowIcon />
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          FOOTER
      ================================================================= */}

      <footer className="landing-footer">
        <div className="content-shell">
          <div className="footer-grid">
            <div className="footer-main">
              <div className="footer-brand">
                <ShieldLogo size={30} />

                Hetusafe
              </div>

              <p className="footer-description">
                A community-powered platform
                for reporting, verifying,
                and tracking local safety
                hazards.
              </p>
            </div>

            <div className="footer-column">
              <strong>
                Product
              </strong>

              <a href="#how-it-works">
                How it works
              </a>

              <a href="#live-map">
                Live map
              </a>

              <a href="#features">
                Features
              </a>
            </div>

            <div className="footer-column">
              <strong>
                Community
              </strong>

              <a href="#impact">
                Impact
              </a>

              <a href="/login">
                Sign in
              </a>

              <a href="/signup">
                Get started
              </a>
            </div>

            <div className="footer-column">
              <strong>
                Legal
              </strong>

              <a href="/privacy">
                Privacy policy
              </a>

              <a href="/terms">
                Terms of service
              </a>
            </div>
          </div>

          <div className="footer-bottom">
            <span>
              © 2026 Hetusafe.
              All rights reserved.
            </span>

            <span>
              Safer cities.
              Stronger communities.
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}