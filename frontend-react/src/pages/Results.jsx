import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Map from '../components/Map'
import client from '../api/client'
import NotificationCenter from '../components/NotificationCenter'
import { Button, BottomNav, Card, PriorityBadge, AppDrawer } from '../components/ui'

/* ── Helpers kept exactly from original ─────────────────────────────────── */
const severityColor = {
  low:      { bg: '#dcfce7', text: '#16a34a' },
  medium:   { bg: '#fef9c3', text: '#ca8a04' },
  high:     { bg: '#fee2e2', text: '#dc2626' },
  critical: { bg: '#f3e8ff', text: '#9333ea' },
}

const badgeConfig = {
  Hero:     { bg: '#fef9c3', color: '#854d0e', icon: '🏆' },
  Guardian: { bg: '#dcfce7', color: '#15803d', icon: '🛡️' },
  Trusted:  { bg: '#dbeafe', color: '#1d4ed8', icon: '✓'  },
  Reporter: { bg: '#f3e8ff', color: '#7c3aed', icon: '📝' },
  Newcomer: { bg: '#f1f5f9', color: '#94a3b8', icon: ''   },
}

/* ── Sub-components (logic unchanged, dark-theme restyled) ───────────────── */

function ReporterBadge({ name, badge_tier, trust_score }) {
  if (!name) return null
  const cfg = badgeConfig[badge_tier] || badgeConfig.Newcomer
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{
        width: '22px', height: '22px', borderRadius: '50%',
        background: cfg.bg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '11px', fontWeight: '800',
        color: cfg.color, flexShrink: 0,
      }}>
        {name[0].toUpperCase()}
      </div>
      <span style={{ color: '#9CA3AF', fontSize: '12px', fontWeight: '500' }}>{name}</span>
      {badge_tier && badge_tier !== 'Newcomer' && (
        <span style={{
          fontSize: '10px', fontWeight: '700', padding: '2px 7px',
          borderRadius: '20px', background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap',
        }}>
          {cfg.icon} {badge_tier}
        </span>
      )}
      {trust_score != null && (
        <span style={{
          fontSize: '10px', color: '#a78bfa', fontWeight: '600',
          background: 'rgba(124,58,237,0.15)', padding: '2px 6px',
          borderRadius: '20px', border: '1px solid rgba(124,58,237,0.25)', whiteSpace: 'nowrap',
        }}>
          ⭐ {trust_score}
        </span>
      )}
    </div>
  )
}

function getDistanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function ResolveModal({ report, onClose, onResolved }) {
  const [proof, setProof]         = useState(null)
  const [preview, setPreview]     = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')

  const handleSubmit = async () => {
    if (!proof) { setError('Please take a proof photo'); return }
    setSubmitting(true)
    setError('')
    const fd = new FormData()
    fd.append('report_id', report.id)
    fd.append('proof', proof)
    try {
      const response = await client.post('/reports/resolve', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onResolved(report.id, response.data.proofUrl)
      onClose()
    } catch (err) {
      const errData = err.response?.data?.error
      const errMsg  = typeof errData === 'string' ? errData : errData?.message
      setError(errMsg || err.response?.data?.message || 'Failed to resolve report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
      <div style={{ background: '#1A2420', border: '1px solid #2A332E', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#F5F5F5', marginBottom: '8px' }}>Mark as Resolved</h2>
        <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '8px' }}>Upload proof that <strong style={{ color: '#F5F5F5' }}>{report.hazard_type}</strong> has been fixed.</p>
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#FCD34D', fontSize: '13px', marginBottom: '20px' }}>
          ⚠️ This photo will be visible to all users. Community members can flag false submissions.
        </div>
        {report.image_url && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#9CA3AF', marginBottom: '6px' }}>BEFORE</p>
            <img src={report.image_url?.startsWith('http') ? report.image_url : `${import.meta.env.VITE_API_URL || ''}${report.image_url}`} alt="before" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }} />
          </div>
        )}
        <div
          onClick={() => document.getElementById('proof-input').click()}
          style={{ border: '2px dashed #2A332E', borderRadius: '12px', padding: '28px', textAlign: 'center', cursor: 'pointer', background: preview ? '#000' : '#131A17', marginBottom: '20px', minHeight: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#22C55E'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#2A332E'}
        >
          {preview
            ? <img src={preview} alt="proof" style={{ maxHeight: '140px', borderRadius: '8px', objectFit: 'contain' }} />
            : <div>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📸</div>
                <p style={{ color: '#9CA3AF', fontWeight: '500', fontSize: '14px' }}>Take AFTER photo with camera</p>
                <p style={{ color: '#6B7280', fontSize: '12px', marginTop: '4px' }}>Camera only — gallery blocked for verification</p>
              </div>
          }
          <input
            id="proof-input" type="file" accept="image/*" capture="environment"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files[0]
              if (file) { setProof(file); setPreview(URL.createObjectURL(file)) }
            }}
          />
        </div>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#F87171', fontSize: '14px', marginBottom: '16px' }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: '#131A17', color: '#9CA3AF', border: '1.5px solid #2A332E', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ flex: 2, padding: '12px', background: submitting ? '#4ADE80' : '#22C55E', color: '#0A0F0D', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? 'Submitting…' : '✅ Submit Proof & Resolve'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BeforeAfterModal({ report, onClose }) {
  const [votes, setVotes] = useState({ confirmed: 0, disputed: 0, userVote: null })

  useEffect(() => {
    client.get(`/reports/${report.id}/votes`)
      .then(({ data }) => setVotes(data))
      .catch(() => {})
  }, [report.id])

  const handleVote = async (type) => {
    if (votes.userVote) return
    try {
      const { data } = await client.post(`/reports/${report.id}/vote`, { vote: type })
      setVotes(data)
    } catch {}
  }

  const total        = votes.confirmed + votes.disputed
  const confirmedPct = total > 0 ? Math.round((votes.confirmed / total) * 100) : 0
  const disputedPct  = total > 0 ? Math.round((votes.disputed  / total) * 100) : 0

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px', overflowY: 'auto' }}>
      <div style={{ background: '#1A2420', border: '1px solid #2A332E', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '640px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', margin: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#F5F5F5' }}>Resolution Proof</h2>
            <p style={{ color: '#9CA3AF', fontSize: '13px', marginTop: '2px' }}>{report.hazard_type} • {report.severity} severity</p>
          </div>
          <button onClick={onClose} style={{ background: '#131A17', border: '1px solid #2A332E', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', color: '#9CA3AF', fontSize: '14px', fontWeight: '600' }}>✕ Close</button>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(34,197,94,0.1)', borderRadius: '20px', padding: '4px 12px', marginBottom: '20px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
          <span style={{ color: '#22C55E', fontSize: '13px', fontWeight: '600' }}>Marked as Resolved</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
              <p style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Before</p>
            </div>
            {report.image_url
              ? <img src={report.image_url?.startsWith('http') ? report.image_url : `${import.meta.env.VITE_API_URL || ''}${report.image_url}`} alt="before" style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '10px', border: '2px solid rgba(220,38,38,0.4)' }} />
              : <div style={{ width: '100%', height: '180px', background: '#131A17', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: '13px', border: '2px solid #2A332E' }}>No photo</div>}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
              <p style={{ fontSize: '12px', fontWeight: '700', color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>After</p>
            </div>
            {report.proof_url
              ? <img src={report.proof_url?.startsWith('http') ? report.proof_url : `${import.meta.env.VITE_API_URL || ''}${report.proof_url}`} alt="after" style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '10px', border: '2px solid rgba(34,197,94,0.4)' }} />
              : <div style={{ width: '100%', height: '180px', background: 'rgba(34,197,94,0.05)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22C55E', fontSize: '13px', border: '2px solid rgba(34,197,94,0.2)' }}>Proof loading…</div>}
          </div>
        </div>
        <div style={{ height: '1px', background: '#2A332E', marginBottom: '24px' }} />
        <div>
          <p style={{ fontSize: '15px', fontWeight: '700', color: '#F5F5F5', marginBottom: '4px' }}>Community Verification</p>
          <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '16px' }}>Does this proof look legitimate to you?</p>
          {!votes.userVote ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <button onClick={() => handleVote('confirmed')} style={{ padding: '14px', borderRadius: '12px', cursor: 'pointer', border: '2px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.1)'; e.currentTarget.style.borderColor = '#22C55E' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.05)'; e.currentTarget.style.borderColor = 'rgba(34,197,94,0.3)' }}>
                <span style={{ fontSize: '24px' }}>👍</span>
                <span style={{ fontWeight: '700', color: '#22C55E', fontSize: '14px' }}>Looks Resolved</span>
                <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Proof is legitimate</span>
              </button>
              <button onClick={() => handleVote('disputed')} style={{ padding: '14px', borderRadius: '12px', cursor: 'pointer', border: '2px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = '#EF4444' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}>
                <span style={{ fontSize: '24px' }}>🚩</span>
                <span style={{ fontWeight: '700', color: '#EF4444', fontSize: '14px' }}>False Report</span>
                <span style={{ color: '#9CA3AF', fontSize: '12px' }}>This looks fake</span>
              </button>
            </div>
          ) : (
            <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', background: votes.userVote === 'confirmed' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${votes.userVote === 'confirmed' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: votes.userVote === 'confirmed' ? '#22C55E' : '#EF4444', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>
              {votes.userVote === 'confirmed' ? '👍 You confirmed this resolution' : '🚩 You flagged this as false'}
            </div>
          )}
          {total > 0 && (
            <div style={{ background: '#131A17', borderRadius: '12px', padding: '16px', border: '1px solid #2A332E' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#9CA3AF' }}>{total} community vote{total !== 1 ? 's' : ''}</span>
                {votes.disputed > votes.confirmed && votes.disputed >= 2 && (
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: '20px' }}>⚠️ Under Review</span>
                )}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#22C55E' }}>👍 Confirmed</span>
                  <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{votes.confirmed} ({confirmedPct}%)</span>
                </div>
                <div style={{ height: '8px', background: '#2A332E', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${confirmedPct}%`, background: '#22C55E', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#EF4444' }}>🚩 Disputed</span>
                  <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{votes.disputed} ({disputedPct}%)</span>
                </div>
                <div style={{ height: '8px', background: '#2A332E', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${disputedPct}%`, background: '#EF4444', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AreaFilterPanel({ onApply, onClear, active }) {
  const [mode, setMode]         = useState('city')
  const [city, setCity]         = useState('')
  const [radius, setRadius]     = useState(25)
  const [searching, setSearching] = useState(false)
  const [error, setError]       = useState('')

  const handleApply = async () => {
    if (mode === 'city') {
      if (!city.trim()) { setError('Enter a city name'); return }
      setSearching(true); setError('')
      try {
        const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`)
        const data = await res.json()
        if (!data.length) { setError('City not found. Try a different name.'); setSearching(false); return }
        onApply({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), radius, label: data[0].display_name.split(',')[0] })
      } catch { setError('Failed to find city. Try again.') }
      finally { setSearching(false) }
    } else {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => onApply({ lat: coords.latitude, lng: coords.longitude, radius, label: 'Your Location' }),
        () => setError('GPS unavailable. Use city search instead.')
      )
    }
  }

  return (
    <div style={{ background: '#131A17', borderRadius: '16px', padding: '20px', marginBottom: '16px', border: active ? '1.5px solid #22C55E' : '1px solid #2A332E' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>📍</span>
          <div>
            <p style={{ fontWeight: '700', fontSize: '15px', color: '#F5F5F5' }}>Filter by Area</p>
            <p style={{ fontSize: '12px', color: '#9CA3AF' }}>Show reports within a specific location</p>
          </div>
        </div>
        {active && (
          <button onClick={onClear} style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
            ✕ Clear Area
          </button>
        )}
      </div>
      <div style={{ display: 'flex', background: '#0A0F0D', borderRadius: '10px', padding: '4px', marginBottom: '16px', width: 'fit-content' }}>
        {[{ id: 'city', label: '🏙️ Search City' }, { id: 'radius', label: '📡 My Location' }].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: 'none', background: mode === m.id ? '#131A17' : 'transparent', color: mode === m.id ? '#F5F5F5' : '#9CA3AF', boxShadow: mode === m.id ? '0 1px 3px rgba(0,0,0,0.4)' : 'none', transition: 'all 0.15s' }}>
            {m.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {mode === 'city' && (
          <div style={{ flex: 2, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#9CA3AF', marginBottom: '6px' }}>City / Area Name</label>
            <input type="text" placeholder="e.g. Hyderabad, Mumbai, Kansas City…" value={city}
              onChange={e => setCity(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleApply()}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #2A332E', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#1A2420', color: '#F5F5F5' }}
              onFocus={e => e.target.style.borderColor = '#22C55E'} onBlur={e => e.target.style.borderColor = '#2A332E'} />
          </div>
        )}
        {mode === 'radius' && (
          <div style={{ flex: 2, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#9CA3AF', marginBottom: '6px' }}>Using your current GPS location</label>
            <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.05)', border: '1.5px solid rgba(34,197,94,0.2)', borderRadius: '8px', color: '#22C55E', fontSize: '14px', fontWeight: '500' }}>📡 Will use device location</div>
          </div>
        )}
        <div style={{ flex: 1, minWidth: '160px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#9CA3AF', marginBottom: '6px' }}>Radius: <span style={{ color: '#22C55E' }}>{radius} miles</span></label>
          <input type="range" min={5} max={200} step={5} value={radius} onChange={e => setRadius(Number(e.target.value))} style={{ width: '100%', accentColor: '#22C55E' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6B7280', marginTop: '2px' }}><span>5 mi</span><span>200 mi</span></div>
        </div>
        <button onClick={handleApply} disabled={searching} style={{ padding: '10px 20px', background: searching ? '#4ADE80' : '#22C55E', color: '#0A0F0D', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: searching ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
          {searching ? 'Searching…' : '🔍 Apply'}
        </button>
      </div>
      {error && (
        <div style={{ marginTop: '10px', color: '#F87171', fontSize: '13px', background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)' }}>
          {error}
        </div>
      )}
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function Results() {
  const navigate = useNavigate()
  const { state: routeState } = useLocation()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  // ── All existing state (unchanged) ─────────────────────────────────────
  const [reports, setReports]               = useState([])
  const [filtered, setFiltered]             = useState([])
  const [loading, setLoading]               = useState(true)
  const [filters, setFilters]               = useState({ hazard_type: '', severity: '', search: '' })
  const [view, setView]                     = useState(routeState?.view === 'map' ? 'map' : 'grid')
  const [resolveTarget, setResolveTarget]   = useState(null)
  const [viewProofTarget, setViewProofTarget] = useState(null)
  const [areaFilter, setAreaFilter]         = useState(null)
  const [focusCoords, setFocusCoords]       = useState(null)
  const [showAreaPanel, setShowAreaPanel]   = useState(false)
  const [mapLocationInput, setMapLocationInput] = useState('')
  const [mapSearching, setMapSearching]         = useState(false)

  // ── New state for top-bar / drawer ─────────────────────────────────────
  const [menuOpen, setMenuOpen]     = useState(false)
  const navMenuRef = useRef(null)
  const drawerRef  = useRef(null)
  const [unreadCount, setUnreadCount] = useState(0)

  // Deep-link: ?focus=<reportId> — fly the map to that pin and open proof if resolved.
  // Derived outside the effect so it's a stable primitive dep (searchParams don't change here).
  const focusId = searchParams.get('focus')

  // ── All existing useEffects (unchanged) ────────────────────────────────
  useEffect(() => {
    client.get('/reports/all')
      .then(({ data }) => { setReports(data); setFiltered(data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (loading || !reports.length || !focusId) return
    const report = reports.find(r => String(r.id) === focusId)
    if (!report) return
    setView('map')
    setFocusCoords({ lng: parseFloat(report.longitude), lat: parseFloat(report.latitude) })
    if (report.status === 'resolved') setViewProofTarget(report)
  }, [loading, reports, focusId])

  useEffect(() => {
    let result = reports
    if (areaFilter) {
      result = result.filter(r => {
        if (!r.latitude || !r.longitude) return false
        return getDistanceMiles(areaFilter.lat, areaFilter.lng, parseFloat(r.latitude), parseFloat(r.longitude)) <= areaFilter.radius
      })
    }
    if (filters.hazard_type) result = result.filter(r => r.hazard_type === filters.hazard_type)
    if (filters.severity)    result = result.filter(r => r.severity    === filters.severity)
    if (filters.search)      result = result.filter(r =>
      r.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
      r.hazard_type?.toLowerCase().includes(filters.search.toLowerCase())
    )
    setFiltered(result)
  }, [filters, reports, areaFilter])

  // ── New useEffects for menu + notifications ─────────────────────────────
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

  // ── All existing handlers (unchanged) ──────────────────────────────────
  const handleResolved = (reportId, proofUrl) => {
    setReports(prev => prev.map(r =>
      r.id === reportId ? { ...r, status: 'resolved', proof_url: proofUrl } : r
    ))
    client.get('/reports/all')
      .then(res => setReports(res.data))
      .catch(() => {})
  }

  const uniqueHazards = [...new Set(reports.map(r => r.hazard_type))]

  const handleMapLocationSearch = async () => {
    const q = mapLocationInput.trim()
    if (!q) return
    setMapSearching(true)
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`)
      const data = await res.json()
      if (!data.length) return
      setAreaFilter({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), radius: 25, label: data[0].display_name.split(',')[0] })
    } catch {}
    finally { setMapSearching(false) }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-canvas">

      {/* Modals — logic unchanged, dark-theme restyled above */}
      {resolveTarget    && <ResolveModal    report={resolveTarget}    onClose={() => setResolveTarget(null)}    onResolved={handleResolved} />}
      {viewProofTarget  && <BeforeAfterModal report={viewProofTarget}  onClose={() => setViewProofTarget(null)} />}

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <header
        ref={navMenuRef}
        className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-xl border-b border-edge"
        style={{ '--navbar-h': '3.5rem' }}
      >
        <div className="flex items-center justify-between h-14 px-4 max-w-6xl mx-auto">

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

          {/* Notification bell */}
          <NotificationCenter externalCount={unreadCount} />
        </div>
      </header>

      {/* ── Shared side drawer ────────────────────────────────────────── */}
      <AppDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        drawerRef={drawerRef}
      />

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">

        {/* Page header */}
        <div className="mt-8 mb-6">
          <h1 className="text-section font-bold text-light mb-1">Reported Hazards</h1>
          <p className="text-caption text-muted">
            {filtered.length} report{filtered.length !== 1 ? 's' : ''} found
            {areaFilter && (
              <span> within <strong className="text-light">{areaFilter.radius} miles</strong> of <strong className="text-light">{areaFilter.label}</strong></span>
            )}
          </p>
        </div>

        {/* Area filter button + count */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <Button
            variant={showAreaPanel || areaFilter ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowAreaPanel(p => !p)}
          >
            📍 {areaFilter ? `Near ${areaFilter.label} (${areaFilter.radius}mi)` : 'Filter by Area'}
          </Button>
          {areaFilter && (
            <span className="text-caption text-muted">
              Showing {filtered.length} of {reports.length} reports
            </span>
          )}
        </div>

        {showAreaPanel && (
          <AreaFilterPanel
            active={!!areaFilter}
            onApply={(a) => { setAreaFilter(a); setShowAreaPanel(false) }}
            onClear={() => setAreaFilter(null)}
          />
        )}

        {/* Search + filter bar
            flex-[2_2_180px] = grow:2, shrink:2, basis:180px (search gets more space)
            flex-[1_1_130px] = equal growth for dropdowns
            On 375px: search wraps to row 1 (full width), dropdowns share row 2. */}
        <div className="bg-surface border border-edge rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-end">

          {/* Search */}
          <div className="flex-[2_2_180px] min-w-0">
            <label className="block text-caption text-muted font-semibold mb-1.5">Search</label>
            <input
              type="text"
              placeholder="Search by hazard or description…"
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full bg-elevated border border-edge rounded-xl px-3 py-2.5 text-body text-light placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </div>

          {/* Hazard type */}
          <div className="flex-[1_1_130px] min-w-0">
            <label className="block text-caption text-muted font-semibold mb-1.5">Hazard Type</label>
            <div className="relative">
              <select
                value={filters.hazard_type}
                onChange={e => setFilters(f => ({ ...f, hazard_type: e.target.value }))}
                className="w-full appearance-none bg-elevated border border-edge rounded-xl px-3 py-2.5 text-body text-light focus:outline-none focus:border-accent pr-8"
              >
                <option value="">All Types</option>
                {uniqueHazards.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none text-xs">▾</span>
            </div>
          </div>

          {/* Severity */}
          <div className="flex-[1_1_130px] min-w-0">
            <label className="block text-caption text-muted font-semibold mb-1.5">Severity</label>
            <div className="relative">
              <select
                value={filters.severity}
                onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))}
                className="w-full appearance-none bg-elevated border border-edge rounded-xl px-3 py-2.5 text-body text-light focus:outline-none focus:border-accent pr-8"
              >
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none text-xs">▾</span>
            </div>
          </div>

          {/* Clear + Grid/Map toggle — pushed right on wide screens */}
          <div className="flex items-end gap-2 ml-auto">
            {(filters.hazard_type || filters.severity || filters.search) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setFilters({ hazard_type: '', severity: '', search: '' })}
              >
                Clear
              </Button>
            )}
            <div className="flex gap-1">
              <Button variant={view === 'grid' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('grid')}>
                ⊞ Grid
              </Button>
              <Button variant={view === 'map' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('map')}>
                🗺 Map
              </Button>
            </div>
          </div>
        </div>

        {/* ── Map view ─────────────────────────────────────────────── */}
        {view === 'map' && (
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
                <Button variant="secondary" size="sm" onClick={() => { setAreaFilter(null); setMapLocationInput('') }}>
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

            {/* Severity filter pills */}
            <div className="flex items-center gap-2 flex-wrap">
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
                  onClick={() => setFilters(f => ({ ...f, severity: pill.value }))}
                  className={`px-3 py-1.5 rounded-full border text-caption font-semibold transition-all focus:outline-none ${
                    filters.severity === pill.value ? pill.activeCls : pill.idleCls
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
        )}

        {/* Grid view */}
        {view === 'grid' && (
          loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted">
              <div className="w-10 h-10 border-2 border-edge border-t-accent rounded-full animate-spin mb-4" />
              <p className="text-body">Loading reports…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-5xl mb-4">🔍</span>
              <p className="text-section font-semibold text-light mb-2">No reports found</p>
              <p className="text-body text-muted">
                {areaFilter
                  ? `No reports within ${areaFilter.radius} miles of ${areaFilter.label}`
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(r => {
                const isResolved = r.status === 'resolved'
                const votes = (() => {
                  try { return JSON.parse(localStorage.getItem(`votes_${r.id}`)) || { confirmed: 0, disputed: 0 } }
                  catch { return { confirmed: 0, disputed: 0 } }
                })()
                const isDisputed  = votes.disputed >= 2 && votes.disputed > votes.confirmed
                const distLabel   = areaFilter && r.latitude && r.longitude
                  ? `${getDistanceMiles(areaFilter.lat, areaFilter.lng, parseFloat(r.latitude), parseFloat(r.longitude)).toFixed(1)} mi away`
                  : null

                // Override Card's default border-edge with semantic resolved/disputed colour
                const cardBorder  = isResolved
                  ? (isDisputed ? 'border-danger/40' : 'border-accent/30')
                  : ''

                return (
                  <Card key={r.id} className={cardBorder}>

                    {/* Hazard image */}
                    {r.image_url
                      ? <img
                          src={r.image_url?.startsWith('http') ? r.image_url : `${import.meta.env.VITE_API_URL || ''}${r.image_url}`}
                          alt="hazard"
                          className="w-full object-cover"
                          style={{ height: '160px' }}
                        />
                      : <div className="w-full flex items-center justify-center bg-elevated text-muted text-caption" style={{ height: '160px' }}>
                          No Photo
                        </div>
                    }

                    {/* Resolved / disputed banner */}
                    {isResolved && (
                      <div className={`flex items-center justify-between px-4 py-2 border-b ${isDisputed ? 'bg-danger/10 border-danger/20' : 'bg-accent/10 border-accent/20'}`}>
                        <span className={`text-caption font-semibold ${isDisputed ? 'text-danger' : 'text-accent'}`}>
                          {isDisputed ? '⚠️ Under Review' : '✅ Resolved'}
                        </span>
                        <button
                          onClick={() => setViewProofTarget(r)}
                          className={`text-caption font-semibold underline ${isDisputed ? 'text-danger' : 'text-accent'}`}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          View Proof →
                        </button>
                      </div>
                    )}

                    {/* Card body */}
                    <div className="p-4">

                      {/* Hazard type + severity badge */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <strong className="text-body text-light font-bold leading-snug min-w-0 truncate">
                          {r.hazard_type}
                        </strong>
                        <PriorityBadge level={r.severity} className="shrink-0" />
                      </div>

                      {/* Description */}
                      <p className="text-caption text-muted mb-3 leading-relaxed">
                        {r.description
                          ? (r.description.length > 100 ? r.description.slice(0, 100) + '…' : r.description)
                          : '—'}
                      </p>

                      {/* Date + distance */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-caption text-muted">
                          {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {distLabel && (
                          <span className="text-caption font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                            📍 {distLabel}
                          </span>
                        )}
                      </div>

                      {/* Reporter badge */}
                      <div className="mb-3">
                        <ReporterBadge name={r.name} badge_tier={r.badge_tier} trust_score={r.trust_score} />
                      </div>

                      {/* Community vote count (if resolved and voted) */}
                      {isResolved && (votes.confirmed > 0 || votes.disputed > 0) && (
                        <div className="flex gap-2 mb-3">
                          <span className="text-caption font-semibold text-accent bg-accent/10 px-2.5 py-0.5 rounded-full">👍 {votes.confirmed}</span>
                          <span className="text-caption font-semibold text-danger bg-danger/10 px-2.5 py-0.5 rounded-full">🚩 {votes.disputed}</span>
                        </div>
                      )}

                      {/* Resolve button */}
                      {!isResolved && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          onClick={() => setResolveTarget(r)}
                        >
                          ✅ Mark as Resolved
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )
        )}
      </main>

      <BottomNav />
    </div>
  )
}
