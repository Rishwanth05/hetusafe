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
    desc: 'Live updates and smart clustering to focus on what matters.',
  },
  {
    icon: '◎',
    title: 'Photo proof',
    desc: 'Attach up to 3 photos for better community verification.',
  },
  {
    icon: '◉',
    title: 'Instant alerts',
    desc: 'Get notified when important hazards appear near you.',
  },
  {
    icon: '◇',
    title: 'Trust & verification',
    desc: 'Community-powered verification keeps reports accurate.',
  },
  {
    icon: '↗',
    title: 'Analytics dashboard',
    desc: 'Resolution trends and useful community insights.',
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Spot it',
    desc: 'See something unsafe? Open Hetusafe and capture it.',
  },
  {
    step: '02',
    title: 'Report it',
    desc: 'Add a few details, photos, severity, and location.',
  },
  {
    step: '03',
    title: 'Track it',
    desc: 'Follow verification and resolution updates in real time.',
  },
]

const HERO_IMAGE = '/images/hetusafe-hero-bg.jpg'

const COMMUNITY_IMAGE = '/images/hetusafe-community-cta.jpg'

/* ==========================================================================
   COUNT-UP HOOK
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
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
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

function HeroPhone() {
  return (
    <div className="hero-device-scene">
      <div className="hero-pin hero-pin-orange">
        <span>!</span>
      </div>

      <div className="hero-pin hero-pin-purple">
        <span>⌁</span>
      </div>

      <div className="hero-phone-shadow" />

      <div className="hero-phone">
        <div className="hero-phone-frame">
          <div className="phone-speaker" />

          <div className="phone-screen">
            <div className="phone-topbar">
              <div className="phone-brand">
                <ShieldLogo size={19} />
                <span>Hetusafe</span>
              </div>

              <div className="phone-top-icons">
                <span>⌕</span>
                <span>•••</span>
              </div>
            </div>

            <div className="phone-map">
              <div className="map-road road-one" />
              <div className="map-road road-two" />
              <div className="map-road road-three" />
              <div className="map-road road-four" />
              <div className="map-road road-five" />
              <div className="map-road road-six" />

              <div className="mini-park park-one" />
              <div className="mini-park park-two" />

              <PhoneMapPin
                className="phone-map-pin map-pin-red"
                label="!"
              />
              <PhoneMapPin
                className="phone-map-pin map-pin-orange"
                label="⌁"
              />
              <PhoneMapPin
                className="phone-map-pin map-pin-purple"
                label="●"
              />
              <PhoneMapPin
                className="phone-map-pin map-pin-green"
                label="✓"
              />
            </div>

            <div className="phone-report-card">
              <div className="phone-report-photo">
                <div className="pothole-hole" />
              </div>

              <div className="phone-report-content">
                <div className="phone-report-head">
                  <div>
                    <strong>Open pothole</strong>
                    <span>Bell Street · Downtown</span>
                  </div>

                  <span className="risk-badge">High</span>
                </div>

                <div className="phone-report-meta">
                  <span>12m ago</span>
                  <span>0.2 mi</span>
                </div>
              </div>
            </div>

            <div className="phone-bottom-nav">
              <span>⌖</span>
              <span>▱</span>
              <button aria-label="Report">
                +
              </button>
              <span>♢</span>
              <span>○</span>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-shield-marker">
        <div className="marker-face">
          <svg viewBox="0 0 58 58" fill="none">
            <path
              d="M29 7L13 14V27.5C13 37.1 20.1 45.8 29 48C37.9 45.8 45 37.1 45 27.5V14L29 7Z"
              fill="white"
            />
            <path
              d="M21.5 28.5L26 33L36 23"
              stroke="#1DB954"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}

function PhoneMapPin({ className, label }) {
  return (
    <div className={className}>
      <span>{label}</span>
    </div>
  )
}

/* ==========================================================================
   LIVE MAP
============================================================================ */

const MAP_MARKERS = [
  { x: '15%', y: '28%', color: '#EA4335', count: '12' },
  { x: '40%', y: '64%', color: '#F59E0B', count: '7' },
  { x: '69%', y: '45%', color: '#7C3AED', count: '4' },
  { x: '79%', y: '71%', color: '#16A34A', count: '3' },
  { x: '54%', y: '27%', color: '#F59E0B', count: '' },
  { x: '33%', y: '38%', color: '#EA4335', count: '' },
  { x: '87%', y: '28%', color: '#7C3AED', count: '' },
]

function LiveMapPreview() {
  return (
    <div className="live-map-window" data-reveal>
      <div className="live-map-copy">
        <span className="eyebrow eyebrow-dark">Live map</span>

        <h2>
          See what's
          <br />
          happening around
          <br />
          you, <em>live.</em>
        </h2>

        <p>
          Explore real-time hazard reports from your community with clear,
          color-coded severity.
        </p>

        <button className="outline-dark-button">
          Explore live map
          <span>
            <ArrowIcon />
          </span>
        </button>
      </div>

      <div className="map-canvas">
        <div className="city-road horizontal road-h1" />
        <div className="city-road horizontal road-h2" />
        <div className="city-road horizontal road-h3" />
        <div className="city-road vertical road-v1" />
        <div className="city-road vertical road-v2" />
        <div className="city-road vertical road-v3" />

        <div className="city-block block-a" />
        <div className="city-block block-b" />
        <div className="city-block block-c" />
        <div className="city-block block-d" />
        <div className="city-block block-e" />

        {MAP_MARKERS.map((marker, index) => (
          <div
            key={index}
            className="map-glow-marker"
            style={{
              left: marker.x,
              top: marker.y,
              '--marker': marker.color,
            }}
          >
            <div className="marker-pulse" />

            <div className="marker-core">
              {marker.count || '•'}
            </div>
          </div>
        ))}
      </div>

      <div className="recent-panel">
        <div className="recent-panel-header">
          <strong>Recent reports</strong>
          <button>View all</button>
        </div>

        <RecentReport
          color="#EF4444"
          title="Open manhole"
          meta="5m ago · High"
          emoji="🕳️"
        />

        <RecentReport
          color="#F59E0B"
          title="Broken street light"
          meta="12m ago · Medium"
          emoji="💡"
        />

        <RecentReport
          color="#EF4444"
          title="Road damage"
          meta="18m ago · High"
          emoji="🚧"
        />

        <RecentReport
          color="#22C55E"
          title="Garbage overflow"
          meta="25m ago · Low"
          emoji="🗑️"
        />
      </div>

      <div className="map-legend">
        <Legend color="#EF4444" text="Critical" />
        <Legend color="#F97316" text="High" />
        <Legend color="#FBBF24" text="Medium" />
        <Legend color="#22C55E" text="Low" />
        <Legend color="#7C3AED" text="Resolved" />
      </div>
    </div>
  )
}

function RecentReport({ color, title, meta, emoji }) {
  return (
    <div className="recent-row">
      <div
        className="recent-dot"
        style={{
          background: color,
          boxShadow: `0 0 14px ${color}`,
        }}
      />

      <div className="recent-copy">
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>

      <div className="recent-thumb">{emoji}</div>
    </div>
  )
}

function Legend({ color, text }) {
  return (
    <div className="legend-item">
      <span style={{ background: color }} />
      {text}
    </div>
  )
}

/* ==========================================================================
   STAT CARD
============================================================================ */

function StatCard({
  value,
  label,
  animate,
  tone,
  icon,
}) {
  const count = useCountUp(value, 2200, animate)

  return (
    <article className={`impact-card impact-${tone}`}>
      <div className="impact-card-top">
        <span className="impact-icon">{icon}</span>
        <span className="impact-trend">Live</span>
      </div>

      <strong className="impact-number">
        {count.toLocaleString()}
      </strong>

      <span className="impact-label">{label}</span>

      <div className="impact-chart">
        <svg viewBox="0 0 180 52" preserveAspectRatio="none">
          <path
            d="M2 42 C22 38, 30 21, 49 28 C69 35, 74 13, 96 20 C118 27, 124 8, 145 15 C160 18, 168 9, 178 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M2 42 C22 38, 30 21, 49 28 C69 35, 74 13, 96 20 C118 27, 124 8, 145 15 C160 18, 168 9, 178 6"
            fill="none"
            stroke="currentColor"
            strokeOpacity=".16"
            strokeWidth="14"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </article>
  )
}

/* ==========================================================================
   ISOMETRIC COMMUNITY
============================================================================ */

function CommunityCity() {
  return (
    <div className="community-city" data-reveal data-delay="2">
      <div className="iso-glow" />

      <div className="city-platform">
        <div className="iso-road iso-road-main" />
        <div className="iso-road iso-road-cross" />

        <div className="water-strip" />

        <Building
          className="building b1"
          floors={4}
        />
        <Building
          className="building b2"
          floors={3}
        />
        <Building
          className="building b3"
          floors={5}
        />
        <Building
          className="building b4"
          floors={3}
        />
        <Building
          className="building b5"
          floors={4}
        />
        <Building
          className="building b6"
          floors={2}
        />
        <Building
          className="building b7"
          floors={4}
        />

        <div className="tree tree-1" />
        <div className="tree tree-2" />
        <div className="tree tree-3" />
        <div className="tree tree-4" />
        <div className="tree tree-5" />
        <div className="tree tree-6" />
        <div className="tree tree-7" />
        <div className="tree tree-8" />
        <div className="tree tree-9" />

        <CityHazard
          className="city-hazard hazard-red"
          title="Open manhole"
          subtitle="High risk"
          icon="!"
        />

        <CityHazard
          className="city-hazard hazard-orange"
          title="Broken street light"
          subtitle="Needs attention"
          icon="⚡"
        />

        <CityHazard
          className="city-hazard hazard-yellow"
          title="Road damage"
          subtitle="Medium risk"
          icon="⌁"
        />

        <CityHazard
          className="city-hazard hazard-green"
          title="Garbage overflow"
          subtitle="Low risk"
          icon="✓"
        />
      </div>
    </div>
  )
}

function Building({ className, floors }) {
  return (
    <div className={className}>
      <div className="building-roof" />

      <div className="building-front">
        {Array.from({ length: floors * 2 }).map((_, index) => (
          <span key={index} />
        ))}
      </div>

      <div className="building-side" />
    </div>
  )
}

function CityHazard({
  className,
  title,
  subtitle,
  icon,
}) {
  return (
    <div className={className}>
      <div className="city-pin">
        <span>{icon}</span>
      </div>

      <div className="hazard-tooltip">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
    </div>
  )
}

/* ==========================================================================
   LANDING PAGE
============================================================================ */

export default function Landing() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState(null)
  const [statsVisible, setStatsVisible] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const statsRef = useRef(null)

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/v1/public/stats`)
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

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', onScroll)

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true)
        }
      },
      { threshold: 0.3 },
    )

    if (statsRef.current) {
      observer.observe(statsRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const elements = document.querySelectorAll('[data-reveal]')

    if (!elements.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-revealed', '')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -30px 0px',
      },
    )

    elements.forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  }, [])

  return (
    <div className="hetusafe-landing">
      <style>{`
        :root {
          --green: #1db954;
          --green-dark: #138a3d;
          --green-soft: #e8f8ed;
          --ink: #0d192a;
          --muted: #667085;
          --cream: #fbfaf6;
          --line: #e8e8e4;
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
        }

        button,
        a {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        .hetusafe-landing {
          min-height: 100vh;
          overflow-x: hidden;
          background:
            radial-gradient(
              circle at 12% 42%,
              rgba(29, 185, 84, 0.035),
              transparent 28%
            ),
            #fbfaf6;
          color: var(--ink);
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

        /* ================================================================
           NAVIGATION
        ================================================================= */

        .landing-nav {
          position: fixed;
          z-index: 1000;
          top: 0;
          left: 0;
          right: 0;
          height: 74px;
          padding: 0 clamp(22px, 5vw, 78px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition:
            background 260ms ease,
            box-shadow 260ms ease,
            backdrop-filter 260ms ease;
        }

        .landing-nav.is-scrolled {
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(20px);
          box-shadow: 0 1px 0 rgba(15, 23, 42, 0.08);
        }

        .nav-brand {
          display: inline-flex;
          align-items: center;
          gap: 11px;
          color: white;
          font-weight: 850;
          font-size: 20px;
          letter-spacing: -0.55px;
          transition: color 240ms ease;
        }

        .landing-nav.is-scrolled .nav-brand {
          color: var(--ink);
        }

        .nav-center {
          display: flex;
          align-items: center;
          gap: 38px;
        }

        .nav-center a {
          position: relative;
          font-size: 13px;
          font-weight: 650;
          color: rgba(255, 255, 255, 0.88);
          text-decoration: none;
          transition: color 200ms ease;
        }

        .landing-nav.is-scrolled .nav-center a {
          color: #475467;
        }

        .nav-center a::after {
          content: "";
          position: absolute;
          left: 0;
          right: 100%;
          bottom: -7px;
          height: 2px;
          border-radius: 4px;
          background: var(--green);
          transition: right 220ms ease;
        }

        .nav-center a:hover::after {
          right: 0;
        }

        .nav-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .nav-button {
          min-height: 40px;
          padding: 0 18px;
          border-radius: 10px;
          cursor: pointer;
          border: 0;
          font-weight: 750;
          font-size: 13px;
          transition:
            transform 220ms ease,
            box-shadow 220ms ease,
            background 220ms ease;
        }

        .nav-button:hover {
          transform: translateY(-2px);
        }

        .nav-login {
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: rgba(0, 0, 0, 0.12);
          backdrop-filter: blur(9px);
        }

        .landing-nav.is-scrolled .nav-login {
          color: var(--ink);
          background: #fff;
          border-color: #dadde3;
        }

        .nav-primary {
          color: white;
          background: linear-gradient(135deg, #24c861, #159f49);
          box-shadow: 0 8px 22px rgba(29, 185, 84, 0.22);
        }

        /* ================================================================
           HERO
        ================================================================= */

        .hero {
          position: relative;
          min-height: 760px;
          height: min(810px, 100vh);
          display: flex;
          align-items: center;
          overflow: hidden;
          isolation: isolate;
          color: #fff;
          background:
            linear-gradient(
              90deg,
              rgba(5, 14, 17, 0.88) 0%,
              rgba(5, 13, 16, 0.65) 39%,
              rgba(7, 15, 18, 0.25) 70%,
              rgba(6, 14, 16, 0.15) 100%
            ),
            linear-gradient(
              180deg,
              rgba(0, 0, 0, 0.08),
              rgba(0, 0, 0, 0.2)
            ),
            url("${HERO_IMAGE}") center/cover no-repeat;
        }

        .hero::after {
          content: "";
          position: absolute;
          inset: auto 0 0;
          height: 22%;
          z-index: -1;
          background:
            linear-gradient(
              180deg,
              transparent,
              rgba(5, 13, 16, 0.35)
            );
        }

        .hero-noise {
          position: absolute;
          inset: 0;
          opacity: 0.16;
          pointer-events: none;
          background-image:
            radial-gradient(
              rgba(255, 255, 255, 0.25) 0.5px,
              transparent 0.6px
            );
          background-size: 4px 4px;
          mix-blend-mode: overlay;
        }

        .hero-inner {
          width: min(1400px, calc(100% - 90px));
          margin: 0 auto;
          padding-top: 66px;
          display: grid;
          grid-template-columns: minmax(400px, 0.87fr) minmax(520px, 1.13fr);
          align-items: center;
          gap: 20px;
        }

        .hero-copy {
          position: relative;
          z-index: 10;
          padding-top: 22px;
        }

        .hero-kicker {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 22px;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(10, 30, 20, 0.48);
          border: 1px solid rgba(109, 239, 154, 0.24);
          backdrop-filter: blur(14px);
          color: #b8f5cc;
          font-size: 12px;
          font-weight: 760;
        }

        .hero-kicker::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #45e479;
          box-shadow: 0 0 16px #45e479;
        }

        .hero h1 {
          margin: 0;
          max-width: 610px;
          color: white;
          font-size: clamp(52px, 5.7vw, 86px);
          font-weight: 900;
          letter-spacing: -4.8px;
          line-height: 0.97;
          text-wrap: balance;
          text-shadow: 0 5px 30px rgba(0, 0, 0, 0.22);
        }

        .hero h1 .hero-green {
          position: relative;
          display: inline-block;
          color: #42d975;
        }

        .hero h1 .hero-green::after {
          content: "";
          position: absolute;
          left: 8%;
          right: -2%;
          bottom: -10px;
          height: 8px;
          border: solid #42d975;
          border-width: 4px 0 0;
          border-radius: 50%;
          transform: rotate(-3deg);
          opacity: 0.9;
        }

        .hero-description {
          margin: 29px 0 30px;
          max-width: 530px;
          color: rgba(245, 248, 247, 0.83);
          font-size: 17px;
          line-height: 1.68;
        }

        .hero-actions {
          display: flex;
          gap: 13px;
          flex-wrap: wrap;
        }

        .hero-button {
          min-height: 52px;
          padding: 0 22px;
          border: 0;
          border-radius: 11px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 800;
          transition:
            transform 220ms ease,
            box-shadow 220ms ease,
            background 220ms ease;
        }

        .hero-button:hover {
          transform: translateY(-3px);
        }

        .hero-button-primary {
          color: white;
          background:
            linear-gradient(135deg, #2dcc6a, #159f49);
          box-shadow:
            0 14px 32px rgba(21, 159, 73, 0.32),
            inset 0 1px rgba(255, 255, 255, 0.22);
        }

        .hero-button-secondary {
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.29);
          background: rgba(9, 15, 18, 0.3);
          backdrop-filter: blur(14px);
        }

        .hero-points {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px 18px;
          margin-top: 28px;
        }

        .hero-point {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: rgba(255, 255, 255, 0.77);
          font-size: 11px;
          font-weight: 650;
        }

        .hero-point-icon {
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #4dde81;
          border: 1px solid rgba(71, 224, 128, 0.25);
          background: rgba(20, 75, 43, 0.43);
        }

        .hero-trust {
          margin-top: 38px;
          width: fit-content;
          min-width: 320px;
          min-height: 61px;
          padding: 11px 15px;
          display: flex;
          align-items: center;
          gap: 17px;
          border-radius: 12px;
          background: rgba(9, 15, 18, 0.48);
          border: 1px solid rgba(255, 255, 255, 0.13);
          backdrop-filter: blur(15px);
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.12);
        }

        .hero-trust > span {
          color: rgba(255, 255, 255, 0.84);
          font-size: 12px;
          font-weight: 750;
        }

        .trust-avatars {
          display: flex;
          align-items: center;
        }

        .avatar-circle {
          width: 32px;
          height: 32px;
          margin-left: -8px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          border: 2px solid rgba(18, 25, 29, 0.88);
          color: white;
          font-size: 11px;
          font-weight: 800;
          background:
            linear-gradient(
              145deg,
              var(--avatar1),
              var(--avatar2)
            );
        }

        .avatar-circle:first-child {
          margin-left: 0;
        }

        .avatar-count {
          padding: 5px 8px;
          margin-left: -5px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.16);
          color: white;
          font-size: 10px;
          font-weight: 800;
        }

        /* ================================================================
           HERO PHONE
        ================================================================= */

        .hero-device-scene {
          position: relative;
          height: 620px;
          min-width: 620px;
          perspective: 1400px;
        }

        .hero-phone-shadow {
          position: absolute;
          z-index: 0;
          width: 400px;
          height: 90px;
          right: 38px;
          bottom: 62px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.48);
          filter: blur(26px);
          transform: rotate(-12deg);
        }

        .hero-phone {
          position: absolute;
          z-index: 6;
          top: 40px;
          right: 100px;
          width: 314px;
          height: 595px;
          transform:
            rotateZ(8deg)
            rotateY(-9deg)
            rotateX(2deg);
          transform-style: preserve-3d;
          animation: phoneFloat 6s ease-in-out infinite;
        }

        .hero-phone-frame {
          position: relative;
          width: 100%;
          height: 100%;
          padding: 9px;
          border-radius: 47px;
          background:
            linear-gradient(
              120deg,
              #e9ecec 0%,
              #4a4f54 18%,
              #121518 46%,
              #c7cbcb 74%,
              #363a3d 100%
            );
          box-shadow:
            -16px 18px 45px rgba(0, 0, 0, 0.48),
            inset 0 0 0 2px rgba(255, 255, 255, 0.28);
        }

        .phone-screen {
          position: relative;
          height: 100%;
          overflow: hidden;
          border-radius: 39px;
          background: #f7f8f6;
        }

        .phone-speaker {
          position: absolute;
          z-index: 10;
          top: 15px;
          left: 50%;
          width: 82px;
          height: 23px;
          transform: translateX(-50%);
          border-radius: 999px;
          background: #0d1012;
        }

        .phone-topbar {
          height: 60px;
          padding: 20px 15px 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.93);
        }

        .phone-brand {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #263238;
          font-size: 11px;
          font-weight: 850;
        }

        .phone-top-icons {
          display: flex;
          gap: 7px;
          color: #59636b;
          font-size: 10px;
        }

        .phone-map {
          position: relative;
          height: 330px;
          overflow: hidden;
          background:
            linear-gradient(
              90deg,
              transparent 0 24%,
              rgba(192, 200, 196, 0.28) 24% 26%,
              transparent 26% 64%,
              rgba(192, 200, 196, 0.28) 64% 67%,
              transparent 67%
            ),
            linear-gradient(
              0deg,
              transparent 0 34%,
              rgba(183, 193, 188, 0.28) 34% 36%,
              transparent 36% 69%,
              rgba(183, 193, 188, 0.28) 69% 72%,
              transparent 72%
            ),
            #edf0eb;
        }

        .phone-map::before {
          content: "";
          position: absolute;
          inset: 0;
          opacity: 0.43;
          background-image:
            linear-gradient(
              32deg,
              transparent 46%,
              white 46% 49%,
              #d5dcd6 49% 52%,
              transparent 52%
            );
          background-size: 90px 90px;
        }

        .map-road {
          position: absolute;
          z-index: 2;
          border-radius: 999px;
          background: white;
          box-shadow:
            0 0 0 1px rgba(153, 165, 158, 0.13);
        }

        .road-one {
          width: 420px;
          height: 16px;
          top: 145px;
          left: -60px;
          transform: rotate(-14deg);
        }

        .road-two {
          width: 390px;
          height: 11px;
          top: 77px;
          left: -50px;
          transform: rotate(10deg);
        }

        .road-three {
          width: 15px;
          height: 360px;
          left: 155px;
          top: -12px;
          transform: rotate(17deg);
        }

        .road-four {
          width: 9px;
          height: 330px;
          left: 68px;
          top: -10px;
          transform: rotate(-7deg);
        }

        .road-five {
          width: 12px;
          height: 310px;
          right: 48px;
          top: 18px;
          transform: rotate(-13deg);
        }

        .road-six {
          width: 380px;
          height: 10px;
          top: 250px;
          left: -30px;
          transform: rotate(5deg);
        }

        .mini-park {
          position: absolute;
          z-index: 1;
          border-radius: 8px;
          background:
            radial-gradient(
              circle,
              #8bc99a 0 3px,
              transparent 4px
            ),
            #d5ead9;
          background-size: 13px 13px;
        }

        .park-one {
          width: 95px;
          height: 64px;
          left: 17px;
          top: 24px;
        }

        .park-two {
          width: 85px;
          height: 55px;
          right: 14px;
          bottom: 20px;
        }

        .phone-map-pin {
          position: absolute;
          z-index: 6;
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          color: white;
          box-shadow:
            0 6px 14px rgba(0, 0, 0, 0.2),
            inset 0 1px 1px rgba(255, 255, 255, 0.34);
        }

        .phone-map-pin span {
          transform: rotate(45deg);
          font-size: 11px;
          font-weight: 900;
        }

        .map-pin-red {
          top: 52px;
          right: 53px;
          background: #ef4444;
        }

        .map-pin-orange {
          top: 162px;
          left: 91px;
          background: #f59e0b;
        }

        .map-pin-purple {
          top: 125px;
          right: 34px;
          background: #7c3aed;
        }

        .map-pin-green {
          bottom: 32px;
          left: 127px;
          background: #20ad57;
        }

        .phone-report-card {
          position: absolute;
          z-index: 9;
          left: 14px;
          right: 14px;
          bottom: 60px;
          overflow: hidden;
          border-radius: 18px;
          background: white;
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.18);
        }

        .phone-report-photo {
          position: relative;
          height: 74px;
          background:
            linear-gradient(
              180deg,
              rgba(0, 0, 0, 0),
              rgba(0, 0, 0, 0.17)
            ),
            #595756;
        }

        .phone-report-photo::before,
        .phone-report-photo::after {
          content: "";
          position: absolute;
          width: 180px;
          height: 20px;
          left: -20px;
          background: #777573;
          transform: rotate(-5deg);
        }

        .phone-report-photo::before {
          top: 10px;
        }

        .phone-report-photo::after {
          top: 45px;
        }

        .pothole-hole {
          position: absolute;
          z-index: 3;
          width: 89px;
          height: 30px;
          left: 50%;
          top: 28px;
          transform: translateX(-50%);
          border-radius: 50%;
          background:
            radial-gradient(
              ellipse,
              #111 0 35%,
              #302c29 36% 59%,
              #5a5550 60% 69%,
              transparent 70%
            );
        }

        .phone-report-content {
          padding: 11px 12px 10px;
        }

        .phone-report-head {
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .phone-report-head > div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .phone-report-head strong {
          color: #182028;
          font-size: 11px;
        }

        .phone-report-head span {
          color: #8c9499;
          font-size: 8px;
        }

        .risk-badge {
          align-self: flex-start;
          padding: 4px 8px;
          border-radius: 7px;
          color: #fff !important;
          background: #ef4444;
          font-size: 8px !important;
          font-weight: 800;
        }

        .phone-report-meta {
          margin-top: 9px;
          display: flex;
          justify-content: space-between;
          color: #8b9297;
          font-size: 8px;
        }

        .phone-bottom-nav {
          position: absolute;
          inset: auto 0 0;
          height: 53px;
          display: flex;
          align-items: center;
          justify-content: space-around;
          color: #647078;
          background: white;
          border-top: 1px solid #edf0ee;
        }

        .phone-bottom-nav button {
          width: 36px;
          height: 36px;
          margin-top: -18px;
          border: 0;
          border-radius: 50%;
          cursor: pointer;
          color: white;
          background: var(--green);
          box-shadow: 0 6px 16px rgba(29, 185, 84, 0.35);
          font-size: 22px;
        }

        .hero-shield-marker {
          position: absolute;
          z-index: 9;
          right: 3px;
          bottom: 55px;
          width: 148px;
          height: 177px;
          border-radius: 74px 74px 82px 82px;
          transform: rotate(6deg);
          background:
            linear-gradient(
              145deg,
              #59e284 0%,
              #22bb57 42%,
              #078639 100%
            );
          box-shadow:
            -12px 22px 35px rgba(0, 0, 0, 0.32),
            inset 8px 9px 18px rgba(255, 255, 255, 0.2),
            inset -9px -12px 18px rgba(0, 79, 33, 0.26);
        }

        .hero-shield-marker::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -27px;
          width: 72px;
          height: 35px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.26);
          filter: blur(11px);
        }

        .marker-face {
          position: absolute;
          width: 86px;
          height: 86px;
          left: 50%;
          top: 40px;
          display: grid;
          place-items: center;
          transform: translateX(-50%);
          border-radius: 27px;
          background: rgba(255, 255, 255, 0.18);
        }

        .marker-face svg {
          width: 68px;
          filter: drop-shadow(0 5px 7px rgba(0, 0, 0, 0.15));
        }

        .hero-pin {
          position: absolute;
          z-index: 3;
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          color: white;
          font-weight: 900;
          backdrop-filter: blur(8px);
          box-shadow:
            0 0 40px currentColor,
            0 12px 25px rgba(0, 0, 0, 0.28);
          animation: markerFloat 4.4s ease-in-out infinite;
        }

        .hero-pin span {
          transform: rotate(45deg);
        }

        .hero-pin-orange {
          right: 13px;
          top: 230px;
          color: #f59e0b;
          background: #f59e0b;
        }

        .hero-pin-purple {
          left: 80px;
          top: 148px;
          color: #8b5cf6;
          background: #8b5cf6;
          animation-delay: 1.1s;
        }

        /* ================================================================
           SECTION COMMON
        ================================================================= */

        .content-shell {
          width: min(1320px, calc(100% - 88px));
          margin: 0 auto;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          min-height: 25px;
          padding: 0 10px;
          border-radius: 999px;
          color: #159447;
          background: #e8f7ed;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.065em;
          text-transform: uppercase;
        }

        .section-title {
          margin: 16px 0 0;
          font-size: clamp(38px, 4.2vw, 62px);
          line-height: 1.03;
          letter-spacing: -2.8px;
          font-weight: 900;
          color: #101828;
        }

        .section-copy {
          margin: 20px 0 0;
          color: #667085;
          font-size: 16px;
          line-height: 1.72;
        }

        /* ================================================================
           HOW IT WORKS
        ================================================================= */

        .how-section {
          padding: 105px 0 65px;
          overflow-x: hidden;
          background:
            radial-gradient(
              circle at 48% 0,
              rgba(29, 185, 84, 0.04),
              transparent 30%
            ),
            #fbfaf6;
        }

        .how-layout {
          display: grid;
          grid-template-columns: 0.74fr 1.26fr;
          align-items: center;
          gap: 85px;
        }

        .how-intro {
          max-width: 360px;
        }

        .how-intro .section-title {
          font-size: clamp(38px, 4vw, 58px);
        }

        .hand-stroke {
          width: 45px;
          height: 18px;
          margin-top: 22px;
          border-top: 3px solid #41c96d;
          border-radius: 50%;
          transform: rotate(-9deg);
        }

        .steps-track {
          position: relative;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          padding-top: 28px;
        }

        .steps-track::before {
          content: "";
          position: absolute;
          z-index: 0;
          left: 13%;
          right: 12%;
          top: 66px;
          height: 2px;
          border-top: 2px dashed rgba(45, 197, 98, 0.36);
        }

        .step-card {
          position: relative;
          z-index: 2;
          min-height: 238px;
          padding: 64px 24px 25px;
          border: 1px solid #e9ebe7;
          border-radius: 26px;
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.97),
              rgba(255, 255, 255, 0.92)
            );
          box-shadow:
            0 17px 36px rgba(28, 46, 35, 0.07),
            0 2px 8px rgba(13, 33, 21, 0.04);
          transition:
            transform 280ms ease,
            box-shadow 280ms ease;
        }

        .step-card:nth-child(2) {
          transform: translateY(-10px);
        }

        .step-card:hover {
          transform: translateY(-8px) rotate(-0.4deg);
          box-shadow: 0 28px 50px rgba(28, 46, 35, 0.12);
        }

        .step-card:nth-child(2):hover {
          transform: translateY(-18px) rotate(0.4deg);
        }

        .step-icon {
          position: absolute;
          top: -22px;
          left: 24px;
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          color: white;
          background: var(--stepColor);
          box-shadow:
            0 13px 22px color-mix(
              in srgb,
              var(--stepColor) 25%,
              transparent
            );
          font-size: 21px;
          font-weight: 900;
        }

        .step-number {
          position: absolute;
          top: 17px;
          right: 18px;
          color: #eff2ef;
          font-size: 34px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -2px;
        }

        .step-card h3 {
          margin: 0 0 11px;
          color: #17221d;
          font-size: 17px;
          font-weight: 850;
        }

        .step-card p {
          margin: 0;
          color: #7a8580;
          font-size: 13px;
          line-height: 1.65;
        }

        /* ================================================================
           LIVE MAP
        ================================================================= */

        .map-section {
          padding: 65px 0 80px;
        }

        .live-map-window {
          position: relative;
          min-height: 470px;
          overflow: hidden;
          border-radius: 27px;
          background:
            radial-gradient(
              circle at 58% 45%,
              rgba(27, 38, 37, 0.95),
              transparent 43%
            ),
            #0a0f10;
          box-shadow:
            0 35px 70px rgba(14, 25, 21, 0.15),
            inset 0 0 0 1px rgba(255, 255, 255, 0.06);
        }

        .live-map-copy {
          position: absolute;
          z-index: 10;
          top: 64px;
          left: 44px;
          width: 280px;
          color: white;
        }

        .eyebrow-dark {
          color: #52dd80;
          background: rgba(37, 170, 80, 0.14);
          border: 1px solid rgba(50, 200, 100, 0.17);
        }

        .live-map-copy h2 {
          margin: 16px 0 17px;
          color: white;
          font-size: clamp(37px, 4vw, 53px);
          line-height: 0.99;
          letter-spacing: -2.6px;
        }

        .live-map-copy h2 em {
          color: #39d872;
          font-style: normal;
        }

        .live-map-copy p {
          max-width: 245px;
          margin: 0 0 25px;
          color: #aab4af;
          font-size: 13px;
          line-height: 1.62;
        }

        .outline-dark-button {
          min-height: 44px;
          padding: 0 15px;
          display: inline-flex;
          align-items: center;
          gap: 13px;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.15);
          cursor: pointer;
          font-size: 12px;
          font-weight: 760;
        }

        .outline-dark-button span {
          width: 26px;
          height: 26px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
        }

        .map-canvas {
          position: absolute;
          z-index: 2;
          inset: 0 220px 0 300px;
          overflow: hidden;
          opacity: 0.95;
          background:
            linear-gradient(
              120deg,
              rgba(255, 255, 255, 0.018) 25%,
              transparent 25% 50%,
              rgba(255, 255, 255, 0.012) 50% 75%,
              transparent 75%
            );
          background-size: 95px 95px;
        }

        .city-block {
          position: absolute;
          border: 1px solid rgba(255, 255, 255, 0.04);
          background: rgba(255, 255, 255, 0.017);
        }

        .block-a {
          left: 12%;
          top: 10%;
          width: 29%;
          height: 27%;
        }

        .block-b {
          left: 50%;
          top: 8%;
          width: 34%;
          height: 25%;
        }

        .block-c {
          left: 7%;
          top: 52%;
          width: 31%;
          height: 35%;
        }

        .block-d {
          left: 45%;
          top: 43%;
          width: 23%;
          height: 43%;
        }

        .block-e {
          right: 2%;
          top: 45%;
          width: 22%;
          height: 36%;
        }

        .city-road {
          position: absolute;
          z-index: 2;
          background: rgba(255, 255, 255, 0.065);
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.025),
            inset 0 0 22px rgba(255, 255, 255, 0.015);
        }

        .city-road.horizontal {
          left: -20%;
          width: 140%;
          height: 16px;
        }

        .city-road.vertical {
          top: -20%;
          width: 15px;
          height: 140%;
        }

        .road-h1 {
          top: 31%;
          transform: rotate(2deg);
        }

        .road-h2 {
          top: 62%;
          transform: rotate(-3deg);
        }

        .road-h3 {
          top: 83%;
          transform: rotate(5deg);
        }

        .road-v1 {
          left: 27%;
          transform: rotate(4deg);
        }

        .road-v2 {
          left: 57%;
          transform: rotate(-3deg);
        }

        .road-v3 {
          left: 82%;
          transform: rotate(6deg);
        }

        .map-glow-marker {
          position: absolute;
          z-index: 8;
          transform: translate(-50%, -50%);
        }

        .marker-core {
          position: relative;
          z-index: 4;
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: white;
          background: var(--marker);
          border: 3px solid rgba(12, 15, 16, 0.86);
          box-shadow:
            0 0 0 2px var(--marker),
            0 0 28px color-mix(
              in srgb,
              var(--marker) 75%,
              transparent
            );
          font-size: 12px;
          font-weight: 900;
        }

        .marker-pulse {
          position: absolute;
          z-index: 1;
          inset: -10px;
          border: 2px solid var(--marker);
          border-radius: 50%;
          animation: mapPulse 2.6s ease-out infinite;
        }

        .recent-panel {
          position: absolute;
          z-index: 12;
          top: 25px;
          right: 22px;
          bottom: 53px;
          width: 222px;
          padding: 20px 16px;
          border: 1px solid rgba(255, 255, 255, 0.065);
          border-radius: 19px;
          background: rgba(13, 18, 19, 0.84);
          backdrop-filter: blur(18px);
          box-shadow: -15px 0 35px rgba(0, 0, 0, 0.12);
        }

        .recent-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
          color: white;
          font-size: 11px;
        }

        .recent-panel-header button {
          color: #4dda7c;
          border: 0;
          background: transparent;
          cursor: pointer;
          font-size: 9px;
          font-weight: 750;
        }

        .recent-row {
          display: grid;
          grid-template-columns: 9px 1fr 37px;
          align-items: center;
          gap: 9px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.055);
        }

        .recent-row:last-child {
          border-bottom: 0;
        }

        .recent-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .recent-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .recent-copy strong {
          overflow: hidden;
          color: #eef2ef;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .recent-copy span {
          color: #6e7873;
          font-size: 8px;
        }

        .recent-thumb {
          width: 36px;
          height: 32px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border-radius: 7px;
          background: #252b29;
          font-size: 17px;
        }

        .map-legend {
          position: absolute;
          z-index: 13;
          left: 320px;
          bottom: 17px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .legend-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #929b97;
          font-size: 8px;
        }

        .legend-item span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        /* ================================================================
           IMPACT
        ================================================================= */

        .impact-section {
          padding: 55px 0 70px;
        }

        .impact-layout {
          display: grid;
          grid-template-columns: 0.55fr 1.45fr;
          gap: 90px;
          align-items: center;
        }

        .impact-heading {
          max-width: 310px;
        }

        .impact-heading h2 {
          margin: 14px 0 0;
          color: #111827;
          font-size: 43px;
          line-height: 1;
          letter-spacing: -2.1px;
        }

        .impact-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .impact-card {
          position: relative;
          min-height: 190px;
          padding: 20px;
          overflow: hidden;
          border: 1px solid rgba(19, 27, 23, 0.055);
          border-radius: 18px;
          box-shadow: 0 12px 35px rgba(17, 40, 25, 0.05);
          transition:
            transform 250ms ease,
            box-shadow 250ms ease;
        }

        .impact-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 42px rgba(17, 40, 25, 0.09);
        }

        .impact-green {
          color: #159947;
          background:
            linear-gradient(150deg, #eaf8ee, #f5fcf7);
        }

        .impact-lime {
          color: #63a726;
          background:
            linear-gradient(150deg, #f1f9e8, #fafdf6);
        }

        .impact-purple {
          color: #6d4bdd;
          background:
            linear-gradient(150deg, #f3efff, #fbfaff);
        }

        .impact-blue {
          color: #2484de;
          background:
            linear-gradient(150deg, #edf7ff, #fafcff);
        }

        .impact-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 26px;
        }

        .impact-icon {
          width: 27px;
          height: 27px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.64);
          font-size: 12px;
          font-weight: 900;
        }

        .impact-trend {
          color: currentColor;
          opacity: 0.65;
          font-size: 8px;
          font-weight: 800;
        }

        .impact-number {
          display: block;
          margin-top: 13px;
          font-size: 30px;
          letter-spacing: -1.2px;
        }

        .impact-label {
          display: block;
          margin-top: 3px;
          color: #647067;
          font-size: 9px;
          font-weight: 650;
        }

        .impact-chart {
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 16px;
          height: 48px;
        }

        .impact-chart svg {
          width: 100%;
          height: 100%;
        }

        /* ================================================================
           COMMUNITY FEATURES
        ================================================================= */

        .community-section {
          position: relative;
          padding: 70px 0 90px;
          overflow: hidden;
        }

        .community-layout {
          display: grid;
          grid-template-columns: 0.44fr 1.56fr;
          gap: 25px;
          align-items: center;
        }

        .feature-copy-column {
          position: relative;
          z-index: 10;
        }

        .feature-copy-column h2 {
          margin: 14px 0 24px;
          max-width: 290px;
          font-size: 48px;
          line-height: 1.02;
          letter-spacing: -2.3px;
        }

        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 17px;
        }

        .feature-row {
          display: grid;
          grid-template-columns: 38px 1fr;
          gap: 12px;
          align-items: start;
        }

        .feature-icon-box {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: #179c4b;
          background: white;
          border: 1px solid #e7e9e6;
          box-shadow: 0 8px 22px rgba(25, 70, 39, 0.07);
          font-size: 18px;
          font-weight: 900;
        }

        .feature-row strong {
          display: block;
          margin-bottom: 3px;
          color: #17221d;
          font-size: 12px;
        }

        .feature-row p {
          margin: 0;
          max-width: 240px;
          color: #838c87;
          font-size: 10px;
          line-height: 1.55;
        }

        /* ================================================================
           ISOMETRIC CITY
        ================================================================= */

        .community-city {
          position: relative;
          min-height: 570px;
          perspective: 1100px;
        }

        .iso-glow {
          position: absolute;
          inset: 7% 0 3% 4%;
          border-radius: 50%;
          background:
            radial-gradient(
              ellipse,
              rgba(130, 188, 121, 0.25),
              transparent 68%
            );
          filter: blur(14px);
        }

        .city-platform {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 780px;
          height: 470px;
          transform:
            translate(-50%, -50%)
            rotateX(61deg)
            rotateZ(-38deg);
          transform-style: preserve-3d;
          border-radius: 34px;
          background:
            linear-gradient(
              135deg,
              #e9e4d4,
              #f1eee2 45%,
              #dde5d4
            );
          box-shadow:
            30px 45px 70px rgba(29, 52, 34, 0.18);
        }

        .iso-road {
          position: absolute;
          z-index: 3;
          background: #323538;
          box-shadow:
            inset 0 0 0 3px #464a4d,
            inset 0 0 0 5px #26292b;
        }

        .iso-road::after {
          content: "";
          position: absolute;
          inset: 48% 0 auto;
          height: 2px;
          background:
            repeating-linear-gradient(
              90deg,
              #e9d488 0 22px,
              transparent 22px 39px
            );
        }

        .iso-road-main {
          left: -4%;
          top: 48%;
          width: 108%;
          height: 66px;
        }

        .iso-road-cross {
          left: 52%;
          top: -13%;
          width: 66px;
          height: 126%;
          transform: rotate(0deg);
        }

        .iso-road-cross::after {
          inset: 0 auto 0 48%;
          width: 2px;
          height: auto;
          background:
            repeating-linear-gradient(
              0deg,
              #e9d488 0 22px,
              transparent 22px 39px
            );
        }

        .water-strip {
          position: absolute;
          z-index: 2;
          left: -3%;
          right: -3%;
          bottom: 4%;
          height: 68px;
          border-radius: 45%;
          background:
            repeating-linear-gradient(
              -17deg,
              rgba(255, 255, 255, 0.22) 0 5px,
              transparent 5px 16px
            ),
            #75c8df;
          box-shadow:
            inset 0 0 24px rgba(34, 140, 180, 0.18);
        }

        .building {
          position: absolute;
          z-index: 5;
          width: 86px;
          height: 72px;
          transform-style: preserve-3d;
        }

        .building-front {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          padding: 10px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 7px 9px;
          background:
            linear-gradient(
              180deg,
              #fffdf4,
              #eae5d8
            );
          box-shadow: 0 10px 18px rgba(0, 0, 0, 0.16);
        }

        .building-front span {
          min-height: 8px;
          border-radius: 2px;
          background: #9fd0d2;
          box-shadow: inset 0 0 0 1px rgba(25, 70, 79, 0.12);
        }

        .building-side {
          position: absolute;
          top: -14px;
          right: -24px;
          width: 24px;
          height: calc(100% + 14px);
          background: #d2cbbd;
          transform: skewY(-30deg);
        }

        .building-roof {
          position: absolute;
          z-index: 4;
          top: -27px;
          left: 12px;
          width: 99%;
          height: 28px;
          background: #f4eee2;
          transform: skewX(-40deg);
          transform-origin: left bottom;
          box-shadow:
            inset 0 0 0 1px rgba(110, 99, 80, 0.08);
        }

        .b1 {
          left: 7%;
          top: 13%;
          transform: translateZ(65px);
        }

        .b2 {
          left: 31%;
          top: 18%;
          transform: translateZ(50px);
        }

        .b3 {
          right: 13%;
          top: 10%;
          transform: translateZ(80px);
        }

        .b4 {
          left: 11%;
          top: 68%;
          transform: translateZ(48px);
        }

        .b5 {
          left: 37%;
          top: 72%;
          transform: translateZ(68px);
        }

        .b6 {
          right: 25%;
          top: 68%;
          transform: translateZ(40px);
        }

        .b7 {
          right: 6%;
          top: 67%;
          transform: translateZ(64px);
        }

        .tree {
          position: absolute;
          z-index: 7;
          width: 27px;
          height: 27px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle at 30% 25%,
              #b9df84,
              #58a849 55%,
              #2e7836
            );
          transform: translateZ(54px);
          box-shadow:
            0 12px 10px rgba(28, 76, 37, 0.15);
        }

        .tree::after {
          content: "";
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
          left: 41%;
          top: 42%;
        }

        .tree-6 {
          right: 18%;
          top: 52%;
        }

        .tree-7 {
          left: 25%;
          bottom: 8%;
        }

        .tree-8 {
          right: 32%;
          bottom: 9%;
        }

        .tree-9 {
          right: 8%;
          bottom: 15%;
        }

        .city-hazard {
          position: absolute;
          z-index: 40;
          transform-style: preserve-3d;
        }

        .city-pin {
          position: absolute;
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border-radius: 50% 50% 50% 0;
          transform:
            translateZ(100px)
            rotate(-45deg);
          color: white;
          background: var(--hazard-color);
          border: 4px solid rgba(255, 255, 255, 0.82);
          box-shadow:
            0 0 0 4px color-mix(
              in srgb,
              var(--hazard-color) 16%,
              transparent
            ),
            0 14px 20px rgba(0, 0, 0, 0.22);
        }

        .city-pin span {
          transform: rotate(45deg);
          font-size: 16px;
          font-weight: 950;
        }

        .hazard-tooltip {
          position: absolute;
          z-index: 50;
          min-width: 150px;
          padding: 12px 14px;
          border-radius: 11px;
          transform:
            translate3d(45px, -37px, 105px)
            rotateZ(38deg)
            rotateX(-59deg);
          transform-origin: left center;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 16px 32px rgba(27, 41, 31, 0.15);
          border: 1px solid rgba(18, 34, 23, 0.06);
        }

        .hazard-tooltip strong,
        .hazard-tooltip span {
          display: block;
        }

        .hazard-tooltip strong {
          color: #1c2822;
          font-size: 10px;
        }

        .hazard-tooltip span {
          margin-top: 4px;
          color: var(--hazard-color);
          font-size: 8px;
          font-weight: 760;
        }

        .hazard-red {
          --hazard-color: #e94444;
          left: 30%;
          top: 36%;
        }

        .hazard-orange {
          --hazard-color: #f29b1d;
          right: 20%;
          top: 22%;
        }

        .hazard-yellow {
          --hazard-color: #efae25;
          left: 47%;
          top: 68%;
        }

        .hazard-green {
          --hazard-color: #35b85c;
          right: 8%;
          top: 61%;
        }

        /* ================================================================
           HAZARD CHIPS
        ================================================================= */

        .categories-section {
          padding: 30px 0 75px;
        }

        .categories-panel {
          padding: 24px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.66);
          border: 1px solid #eaeae6;
          box-shadow: 0 12px 34px rgba(16, 39, 25, 0.035);
        }

        .categories-label {
          margin-bottom: 17px;
          color: #36a45d;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .category-list {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .category-chip {
          min-height: 33px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #536058;
          border: 1px solid #e2e5e1;
          border-radius: 8px;
          background: white;
          font-size: 10px;
          font-weight: 650;
          transition:
            transform 200ms ease,
            border-color 200ms ease,
            box-shadow 200ms ease;
        }

        .category-chip::before {
          content: "◆";
          color: #37ad60;
          font-size: 7px;
        }

        .category-chip:nth-child(3n + 2)::before {
          color: #ee9e24;
        }

        .category-chip:nth-child(4n)::before {
          color: #7856d9;
        }

        .category-chip:hover {
          transform: translateY(-2px);
          border-color: rgba(29, 185, 84, 0.35);
          box-shadow: 0 8px 18px rgba(26, 91, 44, 0.07);
        }

        /* ================================================================
           FINAL CTA
        ================================================================= */

        .final-cta-section {
          padding: 0 0 70px;
        }

        .final-cta {
          position: relative;
          min-height: 285px;
          overflow: hidden;
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          border-radius: 23px;
          color: white;
          background:
            linear-gradient(
              90deg,
              #159947 0%,
              #24bd59 42%,
              rgba(25, 164, 76, 0.45) 67%,
              rgba(12, 65, 34, 0.08) 100%
            ),
            url("${COMMUNITY_IMAGE}") 84% 45% / cover no-repeat;
          box-shadow: 0 28px 55px rgba(21, 98, 48, 0.14);
        }

        .final-cta::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(
              circle at 45% 10%,
              rgba(255, 255, 255, 0.17),
              transparent 32%
            );
        }

        .final-copy {
          position: relative;
          z-index: 4;
          padding: 48px;
          align-self: center;
        }

        .final-copy h2 {
          margin: 0;
          max-width: 500px;
          color: white;
          font-size: clamp(38px, 4.2vw, 58px);
          line-height: 1.02;
          letter-spacing: -2.4px;
        }

        .final-copy p {
          margin: 17px 0 24px;
          color: rgba(255, 255, 255, 0.83);
          font-size: 13px;
        }

        .final-button {
          min-height: 48px;
          padding: 0 19px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: white;
          border: 0;
          border-radius: 10px;
          cursor: pointer;
          background: #16201b;
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.19);
          font-size: 12px;
          font-weight: 800;
          transition:
            transform 220ms ease,
            box-shadow 220ms ease;
        }

        .final-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 30px rgba(0, 0, 0, 0.24);
        }

        .final-button span {
          width: 23px;
          height: 23px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #17201b;
          background: white;
        }

        /* ================================================================
           FOOTER
        ================================================================= */

        .landing-footer {
          padding: 42px 0 46px;
          color: #667085;
          background: #f6f5f0;
          border-top: 1px solid #e8e7e2;
        }

        .footer-inner {
          display: grid;
          grid-template-columns: 1.8fr repeat(3, 1fr);
          gap: 50px;
        }

        .footer-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #18231d;
          font-size: 17px;
          font-weight: 900;
        }

        .footer-description {
          max-width: 250px;
          margin: 13px 0 0;
          font-size: 11px;
          line-height: 1.6;
        }

        .footer-column strong {
          display: block;
          margin-bottom: 11px;
          color: #2a352f;
          font-size: 11px;
        }

        .footer-column a {
          display: block;
          width: fit-content;
          margin: 8px 0;
          color: #7b847f;
          text-decoration: none;
          font-size: 10px;
        }

        .footer-column a:hover {
          color: #1ba950;
        }

        .footer-bottom {
          margin-top: 35px;
          padding-top: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-top: 1px solid #e2e3df;
          color: #9aa19d;
          font-size: 9px;
        }

        /* ================================================================
           REVEALS + ANIMATION
        ================================================================= */

        [data-reveal] {
          opacity: 0;
          transform: translateY(28px);
          transition:
            opacity 700ms cubic-bezier(0.22, 1, 0.36, 1),
            transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        [data-reveal][data-revealed] {
          opacity: 1;
          transform: translateY(0);
        }

        [data-reveal][data-delay="1"] {
          transition-delay: 110ms;
        }

        [data-reveal][data-delay="2"] {
          transition-delay: 220ms;
        }

        [data-reveal][data-delay="3"] {
          transition-delay: 330ms;
        }

        @keyframes phoneFloat {
          0%,
          100% {
            transform:
              rotateZ(8deg)
              rotateY(-9deg)
              rotateX(2deg)
              translateY(0);
          }

          50% {
            transform:
              rotateZ(6.5deg)
              rotateY(-7deg)
              rotateX(3deg)
              translateY(-12px);
          }
        }

        @keyframes markerFloat {
          0%,
          100% {
            margin-top: 0;
          }

          50% {
            margin-top: -12px;
          }
        }

        @keyframes mapPulse {
          0% {
            opacity: 0.72;
            transform: scale(0.62);
          }

          75% {
            opacity: 0;
            transform: scale(2.2);
          }

          100% {
            opacity: 0;
            transform: scale(2.2);
          }
        }

        /* ================================================================
           RESPONSIVE
        ================================================================= */

        @media (max-width: 1180px) {
          .nav-center {
            gap: 23px;
          }

          .hero-inner {
            grid-template-columns: 0.9fr 1.1fr;
            width: calc(100% - 55px);
          }

          .hero h1 {
            font-size: clamp(48px, 6vw, 72px);
          }

          .hero-device-scene {
            transform: scale(0.88);
            transform-origin: right center;
          }

          .content-shell {
            width: calc(100% - 55px);
          }

          .how-layout {
            gap: 50px;
          }

          .impact-layout {
            grid-template-columns: 1fr;
            gap: 34px;
          }

          .impact-heading {
            max-width: none;
            text-align: center;
          }

          .community-layout {
            grid-template-columns: 0.48fr 1.52fr;
          }

          .community-city {
            transform: scale(0.88);
            transform-origin: left center;
            margin-right: -100px;
          }
        }

        @media (max-width: 960px) {
          .nav-center {
            display: none;
          }

          .hero {
            min-height: 960px;
            height: auto;
          }

          .hero-inner {
            grid-template-columns: 1fr;
            padding: 120px 0 10px;
          }

          .hero-copy {
            max-width: 680px;
          }

          .hero-device-scene {
            width: 700px;
            max-width: 100%;
            margin: -15px auto 0;
            transform: scale(0.9);
            transform-origin: center top;
          }

          .how-layout {
            grid-template-columns: 1fr;
          }

          .how-intro {
            max-width: 600px;
            text-align: center;
            margin: 0 auto;
          }

          .hand-stroke {
            margin: 22px auto 0;
          }

          .live-map-window {
            min-height: 660px;
          }

          .live-map-copy {
            top: 35px;
            left: 34px;
          }

          .map-canvas {
            inset: 220px 225px 0 0;
          }

          .recent-panel {
            top: 220px;
          }

          .map-legend {
            left: 35px;
          }

          .impact-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .community-layout {
            grid-template-columns: 1fr;
          }

          .feature-copy-column {
            text-align: center;
          }

          .feature-copy-column h2 {
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
          }

          .feature-list {
            max-width: 690px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            text-align: left;
          }

          .community-city {
            width: 900px;
            max-width: 100%;
            margin: 0 auto;
            transform: scale(0.82);
            transform-origin: center center;
          }

          .footer-inner {
            grid-template-columns: 1.5fr repeat(3, 1fr);
            gap: 30px;
          }
        }

        @media (max-width: 720px) {
          .landing-nav {
            height: 66px;
            padding: 0 18px;
          }

          .nav-brand {
            font-size: 17px;
          }

          .nav-brand svg {
            width: 31px;
            height: 31px;
          }

          .nav-login {
            display: none;
          }

          .nav-primary {
            min-height: 37px;
            padding: 0 13px;
          }

          .hero {
            min-height: 900px;
          }

          .hero-inner,
          .content-shell {
            width: calc(100% - 34px);
          }

          .hero-inner {
            overflow: hidden;
            padding-top: 92px;
          }

          .hero h1 {
            font-size: clamp(45px, 14vw, 66px);
            letter-spacing: -3.3px;
          }

          .hero-description {
            font-size: 15px;
          }

          .hero-trust {
            min-width: 0;
            width: 100%;
          }

          .hero-device-scene {
            min-width: 620px;
            margin-left: 50%;
            transform:
              translateX(-50%)
              scale(0.68);
            transform-origin: top center;
          }

          .how-section {
            padding-top: 75px;
          }

          .steps-track {
            grid-template-columns: 1fr;
            gap: 42px;
            max-width: 420px;
            margin: 0 auto;
          }

          .steps-track::before {
            left: 49px;
            right: auto;
            top: 30px;
            bottom: 30px;
            width: 2px;
            height: auto;
            border-top: 0;
            border-left: 2px dashed rgba(45, 197, 98, 0.3);
          }

          .step-card:nth-child(2) {
            transform: none;
          }

          .live-map-window {
            min-height: 820px;
          }

          .live-map-copy {
            right: 27px;
            width: auto;
          }

          .live-map-copy h2 {
            font-size: 41px;
          }

          .map-canvas {
            inset: 300px 0 210px;
          }

          .recent-panel {
            top: auto;
            left: 20px;
            right: 20px;
            bottom: 48px;
            width: auto;
            height: 178px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0 17px;
          }

          .recent-panel-header {
            grid-column: 1 / -1;
            margin-bottom: 0;
          }

          .recent-row {
            padding: 5px 0;
          }

          .recent-row:nth-last-child(-n + 2) {
            display: none;
          }

          .map-legend {
            left: 24px;
            right: 24px;
            bottom: 15px;
            justify-content: center;
          }

          .impact-grid {
            grid-template-columns: 1fr 1fr;
          }

          .impact-card {
            min-height: 176px;
          }

          .feature-list {
            grid-template-columns: 1fr;
          }

          .community-city {
            min-width: 800px;
            margin-left: 50%;
            transform:
              translateX(-50%)
              scale(0.68);
            transform-origin: top center;
            margin-bottom: -145px;
          }

          .categories-section {
            padding-top: 0;
          }

          .final-cta {
            min-height: 450px;
            grid-template-columns: 1fr;
            align-items: end;
            background:
              linear-gradient(
                180deg,
                rgba(8, 80, 37, 0.2) 10%,
                rgba(25, 177, 79, 0.97) 64%
              ),
              url("${COMMUNITY_IMAGE}") 56% 30% / cover no-repeat;
          }

          .final-copy {
            padding: 31px 27px 34px;
          }

          .footer-inner {
            grid-template-columns: 1fr 1fr;
          }

          .footer-brand-column {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 480px) {
          .nav-primary {
            font-size: 11px;
          }

          .hero-actions {
            width: 100%;
          }

          .hero-button {
            width: 100%;
          }

          .hero-points {
            gap: 10px;
          }

          .hero-trust {
            align-items: flex-start;
            flex-direction: column;
          }

          .impact-grid {
            grid-template-columns: 1fr;
          }

          .impact-card {
            min-height: 190px;
          }

          .footer-inner {
            grid-template-columns: 1fr;
          }

          .footer-brand-column {
            grid-column: auto;
          }

          .footer-bottom {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
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

      <nav className={`landing-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="nav-brand">
          <ShieldLogo size={36} />
          <span>Hetusafe</span>
        </div>

        <div className="nav-center">
          <a href="#how-it-works">How it works</a>
          <a href="#live-map">Live map</a>
          <a href="#features">Features</a>
          <a href="#impact">Impact</a>
        </div>

        <div className="nav-actions">
          {user ? (
            <button
              className="nav-button nav-primary"
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard
            </button>
          ) : (
            <>
              <button
                className="nav-button nav-login"
                onClick={() => navigate('/login')}
              >
                Log in
              </button>

              <button
                className="nav-button nav-primary"
                onClick={() => navigate('/signup')}
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
              Powered by community. Driven by safety.
            </div>

            <h1>
              Your city.
              <br />
              Safer <span className="hero-green">together.</span>
            </h1>

            <p className="hero-description">
              Report hazards in seconds, track updates in real time, and help
              your community stay safer.
            </p>

            <div className="hero-actions">
              <button
                className="hero-button hero-button-primary"
                onClick={() =>
                  navigate(user ? '/report' : '/signup')
                }
              >
                Report a hazard
                <ArrowIcon />
              </button>

              <button
                className="hero-button hero-button-secondary"
                onClick={() =>
                  navigate(user ? '/dashboard' : '/login')
                }
              >
                Explore live map
                <ArrowIcon />
              </button>
            </div>

            <div className="hero-points">
              <span className="hero-point">
                <span className="hero-point-icon">↯</span>
                Real-time updates
              </span>

              <span className="hero-point">
                <span className="hero-point-icon">✓</span>
                Community verified
              </span>

              <span className="hero-point">
                <span className="hero-point-icon">◎</span>
                Works anywhere
              </span>
            </div>

            <div className="hero-trust">
              <span>Trusted by communities</span>

              <div className="trust-avatars">
                <div
                  className="avatar-circle"
                  style={{
                    '--avatar1': '#5c4639',
                    '--avatar2': '#c18a68',
                  }}
                >
                  A
                </div>

                <div
                  className="avatar-circle"
                  style={{
                    '--avatar1': '#263a55',
                    '--avatar2': '#7891b2',
                  }}
                >
                  R
                </div>

                <div
                  className="avatar-circle"
                  style={{
                    '--avatar1': '#69423a',
                    '--avatar2': '#d19477',
                  }}
                >
                  M
                </div>

                <div
                  className="avatar-circle"
                  style={{
                    '--avatar1': '#244633',
                    '--avatar2': '#68a57c',
                  }}
                >
                  S
                </div>

                <span className="avatar-count">
                  {stats?.total_users ? `${stats.total_users.toLocaleString()}+` : '...'}
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
          <div className="how-intro" data-reveal>
            <span className="eyebrow">How it works</span>

            <h2 className="section-title">
              Three simple steps,
              <br />
              big impact
            </h2>

            <p className="section-copy">
              Anyone can make their city safer in just a few taps.
            </p>

            <div className="hand-stroke" />
          </div>

          <div className="steps-track">
            {HOW_IT_WORKS.map(
              ({ step, title, desc }, index) => {
                const colors = [
                  '#2dbd62',
                  '#f59e0b',
                  '#7c4ed8',
                ]

                const icons = ['⌖', '➤', '✓']

                return (
                  <article
                    key={step}
                    className="step-card"
                    data-reveal
                    data-delay={String(index + 1)}
                    style={{
                      '--stepColor': colors[index],
                    }}
                  >
                    <div className="step-icon">
                      {icons[index]}
                    </div>

                    <span className="step-number">
                      {step}
                    </span>

                    <h3>
                      {index + 1}. {title}
                    </h3>

                    <p>{desc}</p>
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
          <LiveMapPreview />
        </div>
      </section>

      {/* ================================================================
          LIVE IMPACT
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
            <span className="eyebrow">
              Live impact
            </span>

            <h2>
              Real numbers.
              <br />
              Real change.
            </h2>
          </div>

          <div className="impact-grid">
            <StatCard
              value={stats?.total_reports ?? 0}
              label="Hazards reported"
              animate={statsVisible}
              tone="green"
              icon="⌖"
            />

            <StatCard
              value={stats?.resolved_count ?? 0}
              label="Issues resolved"
              animate={statsVisible}
              tone="lime"
              icon="✓"
            />

            <StatCard
              value={stats?.total_users ?? 0}
              label="Community members"
              animate={statsVisible}
              tone="purple"
              icon="♙"
            />

            <StatCard
              value={stats?.areas_covered ?? 0}
              label="Areas covered"
              animate={statsVisible}
              tone="blue"
              icon="◎"
            />
          </div>
        </div>
      </section>

      {/* ================================================================
          FEATURES + CITY
      ================================================================= */}

      <section
        className="community-section"
        id="features"
      >
        <div className="content-shell community-layout">
          <div
            className="feature-copy-column"
            data-reveal
          >
            <span className="eyebrow">
              Powerful features
            </span>

            <h2>
              Built for your community
            </h2>

            <div className="feature-list">
              {FEATURES.map(
                ({ icon, title, desc }) => (
                  <div
                    className="feature-row"
                    key={title}
                  >
                    <div className="feature-icon-box">
                      {icon}
                    </div>

                    <div>
                      <strong>{title}</strong>
                      <p>{desc}</p>
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
            <div className="categories-label">
              Hazards we cover
            </div>

            <div className="category-list">
              {HAZARD_CATEGORIES.map((category) => (
                <span
                  className="category-chip"
                  key={category}
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          CTA
      ================================================================= */}

      <section className="final-cta-section">
        <div className="content-shell">
          <div
            className="final-cta"
            data-reveal
          >
            <div className="final-copy">
              <h2>
                Let's build a safer
                <br />
                neighbourhood, together.
              </h2>

              <p>
                Join your community in making local streets safer.
              </p>

              <button
                className="final-button"
                onClick={() =>
                  navigate(user ? '/report' : '/signup')
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
          <div className="footer-inner">
            <div className="footer-brand-column">
              <div className="footer-brand">
                <ShieldLogo size={30} />
                Hetusafe
              </div>

              <p className="footer-description">
                A community-powered platform for reporting,
                verifying, and tracking local safety hazards.
              </p>
            </div>

            <div className="footer-column">
              <strong>Product</strong>
              <a href="#how-it-works">How it works</a>
              <a href="#live-map">Live map</a>
              <a href="#features">Features</a>
            </div>

            <div className="footer-column">
              <strong>Community</strong>
              <a href="#impact">Impact</a>
              <a href="/login">Sign in</a>
              <a href="/signup">Get started</a>
            </div>

            <div className="footer-column">
              <strong>Legal</strong>
              <a href="/privacy">Privacy policy</a>
              <a href="/terms">Terms of service</a>
            </div>
          </div>

          <div className="footer-bottom">
            <span>
              © 2026 Hetusafe. All rights reserved.
            </span>

            <span>
              Safer cities. Stronger communities.
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}