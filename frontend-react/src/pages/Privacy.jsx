import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const SECTIONS = [
  { id: 'overview', title: 'Overview' },
  { id: 'data-collected', title: 'Data We Collect' },
  { id: 'how-we-use', title: 'How We Use It' },
  { id: 'sharing', title: 'Data Sharing' },
  { id: 'storage', title: 'Storage & Security' },
  { id: 'your-rights', title: 'Your Rights' },
  { id: 'cookies', title: 'Cookies' },
  { id: 'children', title: 'Children' },
  { id: 'changes', title: 'Policy Changes' },
  { id: 'contact', title: 'Contact Us' },
]

export default function Privacy() {
  const navigate = useNavigate()
  const [active, setActive] = useState('overview')

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id) }),
      { rootMargin: '-20% 0px -70% 0px' }
    )
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#f1f5f9', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Nav */}
      <div style={{ background: 'rgba(10,15,30,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#f1f5f9', fontFamily: 'inherit', padding: 0 }}>
          <img src="/favicon-192.png" width="24" height="24" alt="HetuSafe" style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: '700', fontSize: '15px' }}>HetuSafe</span>
        </button>
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '7px 14px', color: '#94a3b8', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
      </div>

      <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '48px 24px', display: 'flex', gap: '48px', alignItems: 'flex-start' }}>

        {/* Sticky sidebar */}
        <aside style={{ width: '200px', flexShrink: 0, position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <p style={{ color: '#475569', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>Contents</p>
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`}
              onClick={e => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
              style={{
                display: 'block', padding: '7px 12px', borderRadius: '8px', fontSize: '13px',
                fontWeight: active === s.id ? '600' : '400',
                color: active === s.id ? '#4ade80' : '#64748b',
                background: active === s.id ? 'rgba(22,163,74,0.1)' : 'transparent',
                borderLeft: `2px solid ${active === s.id ? '#16a34a' : 'transparent'}`,
                textDecoration: 'none', transition: 'all 150ms ease', cursor: 'pointer',
              }}>
              {s.title}
            </a>
          ))}
        </aside>

        {/* Content */}
        <main style={{ flex: 1, maxWidth: '720px' }}>
          <div style={{ marginBottom: '48px' }}>
            <div style={{ display: 'inline-block', background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)', color: '#4ade80', fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 14px', borderRadius: '999px', marginBottom: '16px' }}>Legal</div>
            <h1 style={{ fontSize: '38px', fontWeight: '900', letterSpacing: '-1px', marginBottom: '10px' }}>Privacy Policy</h1>
            <p style={{ color: '#64748b', fontSize: '14px' }}>Last updated: 3 September 2026 · Effective: 3 September 2026</p>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Hetusafe was created by Adamala Rishwanth Reddy to help communities report and resolve local hazards faster.</p>
          </div>

          <Section id="overview" title="Overview">
            <p>HetuSafe ("we", "our", or "us") operates the HetuSafe web application accessible at <strong>hetusafe.com</strong>. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our service.</p>
            <p>By using HetuSafe, you agree to the practices described in this policy. If you do not agree, please do not use our service.</p>
          </Section>

          <Section id="data-collected" title="Data We Collect">
            <p>We collect information you provide directly and data generated automatically when you use the app:</p>
            <SubHeading>Account information</SubHeading>
            <ul>
              <li>Name and email address (required for registration)</li>
              <li>Passwords are securely hashed and never stored in plain text</li>
              <li>Account role (user or admin)</li>
              <li>Trust score and badge tier (earned through reporting and resolution activity)</li>
              <li>Emergency contacts (name, phone, relation) — only if you choose to add them in your profile</li>
            </ul>
            <SubHeading>Report data</SubHeading>
            <ul>
              <li>Hazard type, description, and severity level</li>
              <li>GPS coordinates or manually entered address</li>
              <li>Photos and other content you choose to submit</li>
              <li>Timestamp of submission</li>
            </ul>
            <SubHeading>Usage data</SubHeading>
            <ul>
              <li>IP address and browser user-agent (collected by rate-limiting middleware)</li>
              <li>Pages visited and actions taken — collected via PostHog analytics when enabled; stored using browser localStorage, not cookies</li>
              <li>JavaScript error reports — collected via Sentry when enabled; we configure Sentry to exclude personally identifiable information from stack traces</li>
            </ul>
          </Section>

          <Section id="how-we-use" title="How We Use It">
            <p>We use collected data solely to operate and improve HetuSafe:</p>
            <ul>
              <li><strong>To provide the service</strong> — display reports on the map, send OTP emails, manage account status</li>
              <li><strong>To communicate with you</strong> — status update notifications, security alerts, OTP codes</li>
              <li><strong>To ensure security</strong> — fraud detection, rate limiting, brute-force protection</li>
              <li><strong>To improve the platform</strong> — aggregate analytics on feature usage and performance</li>
              <li><strong>To comply with law</strong> — responding to lawful requests from authorities</li>
            </ul>
            <p>We do not use your data for advertising, sell it to third parties, or build behavioural profiles for commercial use.</p>
          </Section>

          <Section id="sharing" title="Data Sharing">
            <p>We only share your data with the following categories of recipients:</p>
            <ul>
              <li><strong>Infrastructure providers</strong> — Cloud hosting, compute, and secure object storage providers used to operate the platform</li>
              <li><strong>Email delivery</strong> — Email service providers, used to send verification codes, security notifications, and respond to inquiries</li>
              <li><strong>Push notifications</strong> — Push notification service providers, used to send hazard proximity alerts to opted-in devices</li>
              <li><strong>Analytics and monitoring</strong> — Analytics and error-monitoring service providers, used to improve reliability and understand feature usage</li>
            </ul>
            <p>HetuSafe does <strong>not</strong> share report data with any government agency or third-party authority. Reports are visible only to authenticated users of the HetuSafe platform — this is the core function of the service. Your email address is never displayed publicly; your display name is shown alongside your submitted reports.</p>
            <p>HetuSafe has <strong>no payment functionality</strong>. We do not collect, process, or share any payment or financial information.</p>
          </Section>

          <Section id="storage" title="Storage & Security">
            <p>Your data is stored on servers located in the United States. We use reasonable administrative, technical, and organizational safeguards designed to protect personal information against unauthorized access, loss, misuse, or alteration.</p>
            <p>We retain your account data for as long as your account is active. Deleted accounts are removed within 30 days. Anonymised report data may be retained indefinitely for aggregate statistics.</p>
          </Section>

          <Section id="your-rights" title="Your Rights">
            <p>HetuSafe honors the following privacy rights for all users. Applicable law may grant you additional rights depending on your location.</p>
            <ul>
              <li><strong>Access</strong> — Request information about the personal data we hold about you and how it is used</li>
              <li><strong>Correction</strong> — Request that we correct inaccurate or incomplete personal data</li>
              <li><strong>Deletion</strong> — Request deletion of your account and associated personal data</li>
              <li><strong>Portability</strong> — Receive a copy of your personal data in a machine-readable format</li>
              <li><strong>Opt-out of sale</strong> — HetuSafe does not sell or share personal information for commercial or advertising purposes</li>
              <li><strong>Non-discrimination</strong> — We will not deny or degrade the Service because you exercised a privacy right</li>
            </ul>
            <SubHeading>EEA and UK residents (GDPR)</SubHeading>
            <p>If you are located in the European Economic Area or United Kingdom, you have additional rights under the General Data Protection Regulation, including the right to restrict or object to certain processing, and the right to lodge a complaint with your local supervisory authority.</p>
            <SubHeading>California residents (CCPA / CPRA)</SubHeading>
            <p>If you are a California resident, you have rights under the California Consumer Privacy Act and California Privacy Rights Act, including the right to know what personal information is collected and how it is used, the right to delete, the right to correct inaccurate personal information, and the right not to be discriminated against for exercising these rights. HetuSafe does not sell or share personal information as those terms are defined under California law.</p>
            <p>To exercise any of the above rights, use the account deletion flow in your Profile page, or contact us at <strong>arishwanthreddy@gmail.com</strong>. We will respond within 30 days.</p>
            <Callout>Account deletion is self-service. Go to Profile → Delete Account → verify with OTP. Your data is purged immediately.</Callout>
          </Section>

          <Section id="cookies" title="Cookies">
            <p>We use a minimal set of cookies:</p>
            <ul>
              <li><strong>CSRF token cookie</strong> — httpOnly, sameSite strict/none (depending on environment). Required for security. Cannot be disabled.</li>
              <li><strong>Session preferences</strong> — localStorage only, not cookies. Stores UI preferences such as cookie consent and install-prompt dismissal.</li>
              <li><strong>Analytics</strong> — PostHog, when enabled, stores session data in <strong>browser localStorage</strong> (not cookies). You can decline analytics via our cookie banner; when declined, PostHog capturing is disabled.</li>
            </ul>
            <p>We do not use advertising cookies or third-party tracking pixels.</p>
          </Section>

          <Section id="children" title="Children">
            <p>HetuSafe is not directed at children under 13 years of age. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.</p>
          </Section>

          <Section id="changes" title="Policy Changes">
            <p>We may update this Privacy Policy periodically. When we make material changes, we will update the "Last updated" date at the top of this page and, where required by law, notify you by email.</p>
            <p>Continued use of the service after changes constitutes acceptance of the updated policy.</p>
          </Section>

          <Section id="contact" title="Contact Us">
            <p>For privacy-related questions, data requests, or to report a concern:</p>
            <ul>
              <li><strong>Email:</strong> arishwanthreddy@gmail.com</li>
              <li><strong>Response time:</strong> Within 5 business days for general enquiries, within 30 days for GDPR/CCPA requests</li>
            </ul>
            <p>HetuSafe is operated independently. We are not affiliated with any government agency.</p>
          </Section>

          <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/terms')} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 18px', color: '#94a3b8', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Terms of Service →
            </button>
            <button onClick={() => navigate('/')} style={{ background: '#16a34a', border: 'none', borderRadius: '8px', padding: '10px 18px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
              Back to Home
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}

function Section({ id, title, children }) {
  return (
    <section id={id} style={{ marginBottom: '48px', scrollMarginTop: '80px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '16px', color: '#f1f5f9', letterSpacing: '-0.3px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', color: '#94a3b8', fontSize: '15px', lineHeight: '1.75' }}>
        {children}
      </div>
    </section>
  )
}

function SubHeading({ children }) {
  return <p style={{ color: '#f1f5f9', fontWeight: '600', fontSize: '14px', marginTop: '6px', marginBottom: '-6px' }}>{children}</p>
}

function Callout({ children }) {
  return (
    <div style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: '10px', padding: '14px 16px', color: '#4ade80', fontSize: '14px' }}>
      {children}
    </div>
  )
}
