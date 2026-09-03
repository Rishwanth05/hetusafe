import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const SECTIONS = [
  { id: 'acceptance', title: 'Acceptance of Terms' },
  { id: 'service', title: 'Description of Service' },
  { id: 'accounts', title: 'User Accounts' },
  { id: 'content', title: 'User-Generated Content' },
  { id: 'prohibited', title: 'Prohibited Uses' },
  { id: 'payments', title: 'Pricing' },
  { id: 'liability', title: 'Limitation of Liability' },
  { id: 'termination', title: 'Termination' },
  { id: 'governing', title: 'Governing Law' },
  { id: 'contact', title: 'Contact' },
]

export default function Terms() {
  const navigate = useNavigate()
  const [active, setActive] = useState('acceptance')

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
            <h1 style={{ fontSize: '38px', fontWeight: '900', letterSpacing: '-1px', marginBottom: '10px' }}>Terms of Service</h1>
            <p style={{ color: '#64748b', fontSize: '14px' }}>Last updated: 3 September 2026 · Effective: 3 September 2026</p>
          </div>

          <Section id="acceptance" title="Acceptance of Terms">
            <p>By creating an account or using HetuSafe ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.</p>
            <p>These Terms constitute a legally binding agreement between you and HetuSafe. We reserve the right to update these Terms at any time. Continued use after changes constitutes acceptance.</p>
          </Section>

          <Section id="service" title="Description of Service">
            <p>HetuSafe is a community hazard reporting platform that allows residents to:</p>
            <ul>
              <li>Submit geo-tagged reports of public safety hazards</li>
              <li>View hazard reports on an interactive map</li>
              <li>Track the resolution status of submitted reports</li>
              <li>Receive notifications about hazards in their area</li>
            </ul>
            <p>The Service is provided "as is." We do not guarantee reports will be acted upon by any government authority. HetuSafe is not a substitute for emergency services — call 911 for life-threatening emergencies.</p>
            <Callout>🚨 In case of an emergency, call 911 immediately. Do not submit a report as a substitute for emergency services.</Callout>
          </Section>

          <Section id="accounts" title="User Accounts">
            <p>To use most features of the Service, you must register for an account. By registering, you agree to:</p>
            <ul>
              <li>Provide accurate, complete, and current information</li>
              <li>Maintain the security of your password — never share it with others</li>
              <li>Notify us immediately of any unauthorised account access</li>
              <li>Accept responsibility for all activity that occurs under your account</li>
            </ul>
            <p>You must be at least 13 years old to create an account. Accounts are personal and non-transferable. We reserve the right to suspend or delete accounts that violate these Terms.</p>
          </Section>

          <Section id="content" title="User-Generated Content">
            <p>When you submit a report, photo, or any other content to the Service ("User Content"), you:</p>
            <ul>
              <li>Retain ownership of your content</li>
              <li>Grant HetuSafe a worldwide, non-exclusive, royalty-free licence to store, display, and distribute your content as part of operating the Service</li>
              <li>Confirm the content is accurate to the best of your knowledge</li>
              <li>Accept that report locations and hazard descriptions are visible to other authenticated users of the platform</li>
            </ul>
            <SubHeading>Content standards</SubHeading>
            <p>All submitted content must be:</p>
            <ul>
              <li>Truthful and not misleading</li>
              <li>Related to a genuine public safety hazard</li>
              <li>Free of personal attacks, hate speech, or discriminatory content</li>
              <li>Free of content that violates any applicable law</li>
            </ul>
          </Section>

          <Section id="prohibited" title="Prohibited Uses">
            <p>You may not use the Service to:</p>
            <ul>
              <li>Submit false, fabricated, or malicious hazard reports</li>
              <li>Harass, threaten, or intimidate other users</li>
              <li>Upload content that infringes intellectual property rights</li>
              <li>Attempt to gain unauthorised access to the Service or its infrastructure</li>
              <li>Use automated bots, scrapers, or scripts without prior written consent</li>
              <li>Circumvent security features, rate limits, or access controls</li>
              <li>Impersonate government officials or HetuSafe staff</li>
              <li>Upload content containing malware, viruses, or malicious code</li>
            </ul>
            <p>Violations may result in immediate account termination and, where applicable, reporting to law enforcement.</p>
          </Section>

          <Section id="payments" title="Pricing">
            <p>The Service is currently provided at no charge. HetuSafe does not collect or process payment information. We reserve the right to introduce optional paid features in the future; if pricing changes, we will provide advance notice to existing users. Contact us at arishwanthreddy@gmail.com with any questions.</p>
          </Section>

          <Section id="liability" title="Limitation of Liability">
            <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND. TO THE EXTENT PERMITTED BY APPLICABLE LAW, HETUSAFE AND ITS OPERATORS DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>
            <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, HETUSAFE AND ITS OPERATORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES — INCLUDING LOSS OF PROFITS, LOSS OF DATA, LOSS OF GOODWILL, OR OTHER INTANGIBLE LOSSES — ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. THIS INCLUDES, WITHOUT LIMITATION, ANY HARM ARISING FROM RELIANCE ON REPORT ACCURACY, FAILURE OF ANY AUTHORITY TO ACT ON A REPORT, OR SERVICE INTERRUPTIONS BEYOND OUR REASONABLE CONTROL.</p>
            <p>OUR TOTAL CUMULATIVE LIABILITY FOR ALL CLAIMS ARISING UNDER THESE TERMS SHALL NOT EXCEED $100 USD.</p>
            <p>HetuSafe is an informational platform. We do not guarantee the accuracy, completeness, or timeliness of any submitted report, and we are not responsible for any action or inaction by any government authority in response to a report.</p>
          </Section>

          <Section id="termination" title="Termination">
            <p>You may delete your account at any time via Profile → Delete Account. We may terminate or suspend your account immediately, without prior notice, if we determine you have violated these Terms.</p>
            <p>Upon termination, your right to use the Service ceases immediately. We may retain anonymised report data (with your personal identifiers removed) as permitted by our Privacy Policy.</p>
          </Section>

          <Section id="governing" title="Governing Law">
            <p>These Terms shall be governed by and construed in accordance with the laws of the United States. Any disputes shall be resolved through binding arbitration under the American Arbitration Association rules, except that either party may seek injunctive relief in a court of competent jurisdiction.</p>
            <p>If any provision of these Terms is found to be unenforceable, the remaining provisions shall continue in full force.</p>
          </Section>

          <Section id="contact" title="Contact">
            <p>For questions about these Terms:</p>
            <ul>
              <li><strong>Email:</strong> arishwanthreddy@gmail.com</li>
              <li><strong>Response time:</strong> Within 5 business days</li>
            </ul>
          </Section>

          <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/privacy')} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 18px', color: '#94a3b8', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Privacy Policy →
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
    <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '10px', padding: '14px 16px', color: '#fca5a5', fontSize: '14px' }}>
      {children}
    </div>
  )
}
