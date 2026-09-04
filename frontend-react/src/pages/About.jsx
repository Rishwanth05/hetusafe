import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const LD_JSON = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Hetusafe',
  url: 'https://hetusafe.com',
  description:
    'Community hazard reporting platform helping communities report and resolve local civic hazards faster.',
  founder: {
    '@type': 'Person',
    name: 'Adamala Rishwanth Reddy',
  },
  foundingLocation: {
    '@type': 'Place',
    name: 'India',
  },
  areaServed: 'United States',
}

export default function About() {
  const navigate = useNavigate()

  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.text = JSON.stringify(LD_JSON)
    document.head.appendChild(script)
    return () => document.head.removeChild(script)
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

      {/* Content */}
      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '64px 24px 96px' }}>

        {/* Header */}
        <div style={{ marginBottom: '56px' }}>
          <div style={{ display: 'inline-block', background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)', color: '#4ade80', fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 14px', borderRadius: '999px', marginBottom: '16px' }}>About</div>
          <h1 style={{ fontSize: '38px', fontWeight: '900', letterSpacing: '-1px', marginBottom: '12px', lineHeight: '1.15' }}>About Hetusafe</h1>
          <p style={{ color: '#94a3b8', fontSize: '17px', lineHeight: '1.7' }}>
            A community safety platform built to close the gap between the hazards people see every day and the action that resolves them.
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '48px' }} />

        {/* Mission */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '16px', color: '#f1f5f9', letterSpacing: '-0.3px' }}>Our mission</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', color: '#94a3b8', fontSize: '15px', lineHeight: '1.75' }}>
            <p>
              Hetusafe exists to make civic hazard reporting fast, transparent, and actionable. When a pothole opens up, a street light fails, or floodwater blocks a road, residents deserve a direct, reliable way to flag the problem — and to see it followed through to resolution.
            </p>
            <p>
              The platform was originally motivated by a firsthand experience: unaddressed civic hazards in India that went unreported for months because there was no easy, direct channel for residents to flag them. The motivation was simple — if people could see and photograph a problem, they should be able to report it in seconds and trust that someone would act on it.
            </p>
            <p>
              Today, Hetusafe is serving a beta audience. The mission is unchanged: lower the barrier to reporting, surface hazards on a live map, and build the community verification layer that helps distinguish real problems from noise.
            </p>
          </div>
        </section>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '48px' }} />

        {/* Founder */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '16px', color: '#f1f5f9', letterSpacing: '-0.3px' }}>Founder</h2>
          <div style={{ background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.15)', borderRadius: '14px', padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(22,163,74,0.15)', border: '2px solid rgba(22,163,74,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '800', color: '#4ade80', flexShrink: 0 }}>
                AR
              </div>
              <div>
                <p style={{ fontWeight: '700', fontSize: '16px', color: '#f1f5f9', margin: 0 }}>Adamala Rishwanth Reddy</p>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '2px 0 0' }}>Founder &amp; Developer</p>
              </div>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: '1.7', margin: 0 }}>
              Hetusafe was created by Adamala Rishwanth Reddy to help communities report and resolve local hazards faster.
            </p>
          </div>
        </section>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '48px' }} />

        {/* What we do */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '20px', color: '#f1f5f9', letterSpacing: '-0.3px' }}>What Hetusafe does</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {[
              { icon: '🗺️', title: 'Live hazard map', desc: 'Reports appear instantly on a public map, clustered by severity and type.' },
              { icon: '📸', title: 'Photo verification', desc: 'Photos and before/after proof help the community validate that a hazard is real and resolved.' },
              { icon: '⭐', title: 'Trust scoring', desc: 'Reporters earn trust scores based on activity and community feedback, surfacing reliable contributors.' },
              { icon: '🔔', title: 'Proximity alerts', desc: 'Push notifications reach users near a newly reported hazard so local residents stay informed.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '22px', marginBottom: '8px' }}>{icon}</div>
                <p style={{ fontWeight: '700', fontSize: '14px', color: '#f1f5f9', marginBottom: '6px' }}>{title}</p>
                <p style={{ color: '#64748b', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA footer */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/privacy')} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 18px', color: '#94a3b8', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Privacy policy →
          </button>
          <button onClick={() => navigate('/login')} style={{ background: '#16a34a', border: 'none', borderRadius: '8px', padding: '10px 18px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
            Get started
          </button>
        </div>
      </main>
    </div>
  )
}
