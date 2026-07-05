import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Map from '../components/Map'
import client from '../api/client'

const severityColor = {
  low: { bg: '#dcfce7', text: '#16a34a' },
  medium: { bg: '#fef9c3', text: '#ca8a04' },
  high: { bg: '#fee2e2', text: '#dc2626' },
  critical: { bg: '#f3e8ff', text: '#9333ea' },
}

const badgeConfig = {
  Hero:     { bg: '#fef9c3', color: '#854d0e', icon: '🏆' },
  Guardian: { bg: '#dcfce7', color: '#15803d', icon: '🛡️' },
  Trusted:  { bg: '#dbeafe', color: '#1d4ed8', icon: '✓' },
  Reporter: { bg: '#f3e8ff', color: '#7c3aed', icon: '📝' },
  Newcomer: { bg: '#f1f5f9', color: '#94a3b8', icon: '' },
}

function ReporterBadge({ name, badge_tier, trust_score }) {
  if (!name) return null
  const cfg = badgeConfig[badge_tier] || badgeConfig.Newcomer
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: cfg.color, flexShrink: 0 }}>
        {name[0].toUpperCase()}
      </div>
      <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '500' }}>{name}</span>
      {badge_tier && badge_tier !== 'Newcomer' && (
        <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px', background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap' }}>
          {cfg.icon} {badge_tier}
        </span>
      )}
      {trust_score != null && (
        <span style={{ fontSize: '10px', color: '#7c3aed', fontWeight: '600', background: '#faf5ff', padding: '2px 6px', borderRadius: '20px', border: '1px solid #e9d5ff', whiteSpace: 'nowrap' }}>
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
  const [proof, setProof] = useState(null)
  const [preview, setPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!proof) { setError('Please take a proof photo'); return }
    setSubmitting(true)
    setError('')
    const fd = new FormData()
    fd.append('report_id', report.id)
    fd.append('proof', proof)
    try {
      const response = await client.post('/reports/resolve', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      onResolved(report.id, response.data.proofUrl)
      onClose()
    } catch (err) {
      const errData = err.response?.data?.error
      const errMsg = typeof errData === 'string' ? errData : errData?.message
      setError(errMsg || err.response?.data?.message || 'Failed to resolve report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>Mark as Resolved</h2>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>Upload proof that <strong>{report.hazard_type}</strong> has been fixed.</p>
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px', color: '#92400e', fontSize: '13px', marginBottom: '20px' }}>
          ⚠️ This photo will be visible to all users. Community members can flag false submissions.
        </div>
        {report.image_url && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>BEFORE</p>
            <img src={report.image_url?.startsWith('http') ? report.image_url : `${import.meta.env.VITE_API_URL || ''}${report.image_url}`} alt="before" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }} />
          </div>
        )}
        <div onClick={() => document.getElementById('proof-input').click()}
          style={{ border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '28px', textAlign: 'center', cursor: 'pointer', background: preview ? '#000' : '#f8fafc', marginBottom: '20px', minHeight: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#16a34a'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
          {preview
            ? <img src={preview} alt="proof" style={{ maxHeight: '140px', borderRadius: '8px', objectFit: 'contain' }} />
            : <div><div style={{ fontSize: '28px', marginBottom: '8px' }}>📸</div><p style={{ color: '#64748b', fontWeight: '500', fontSize: '14px' }}>Take AFTER photo with camera</p><p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>Camera only — gallery blocked for verification</p></div>}
          <input id="proof-input" type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
            onChange={e => { const file = e.target.files[0]; if (file) { setProof(file); setPreview(URL.createObjectURL(file)) } }} />
        </div>
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '14px', marginBottom: '16px' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: '#fff', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ flex: 2, padding: '12px', background: submitting ? '#86efac' : '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer' }}>
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

  const total = votes.confirmed + votes.disputed
  const confirmedPct = total > 0 ? Math.round((votes.confirmed / total) * 100) : 0
  const disputedPct = total > 0 ? Math.round((votes.disputed / total) * 100) : 0

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '640px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', margin: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Resolution Proof</h2>
            <p style={{ color: '#64748b', fontSize: '13px', marginTop: '2px' }}>{report.hazard_type} • {report.severity} severity</p>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', color: '#64748b', fontSize: '14px', fontWeight: '600' }}>✕ Close</button>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#dcfce7', borderRadius: '20px', padding: '4px 12px', marginBottom: '20px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
          <span style={{ color: '#16a34a', fontSize: '13px', fontWeight: '600' }}>Marked as Resolved</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
              <p style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Before</p>
            </div>
            {report.image_url
              ? <img src={report.image_url?.startsWith('http') ? report.image_url : `${import.meta.env.VITE_API_URL || ''}${report.image_url}`} alt="before" style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '10px', border: '2px solid #fee2e2' }} />
              : <div style={{ width: '100%', height: '180px', background: '#f1f5f9', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px', border: '2px solid #e2e8f0' }}>No photo</div>}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
              <p style={{ fontSize: '12px', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>After</p>
            </div>
            {report.proof_url
              ? <img src={report.proof_url?.startsWith('http') ? report.proof_url : `${import.meta.env.VITE_API_URL || ''}${report.proof_url}`} alt="after" style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '10px', border: '2px solid #bbf7d0' }} />
              : <div style={{ width: '100%', height: '180px', background: '#f0fdf4', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', fontSize: '13px', border: '2px solid #bbf7d0' }}>Proof loading…</div>}
          </div>
        </div>
        <div style={{ height: '1px', background: '#e2e8f0', marginBottom: '24px' }} />
        <div>
          <p style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>Community Verification</p>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Does this proof look legitimate to you?</p>
          {!votes.userVote ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <button onClick={() => handleVote('confirmed')} style={{ padding: '14px', borderRadius: '12px', cursor: 'pointer', border: '2px solid #bbf7d0', background: '#f0fdf4', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#dcfce7'; e.currentTarget.style.borderColor = '#16a34a' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#bbf7d0' }}>
                <span style={{ fontSize: '24px' }}>👍</span>
                <span style={{ fontWeight: '700', color: '#16a34a', fontSize: '14px' }}>Looks Resolved</span>
                <span style={{ color: '#64748b', fontSize: '12px' }}>Proof is legitimate</span>
              </button>
              <button onClick={() => handleVote('disputed')} style={{ padding: '14px', borderRadius: '12px', cursor: 'pointer', border: '2px solid #fecaca', background: '#fef2f2', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#dc2626' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca' }}>
                <span style={{ fontSize: '24px' }}>🚩</span>
                <span style={{ fontWeight: '700', color: '#dc2626', fontSize: '14px' }}>False Report</span>
                <span style={{ color: '#64748b', fontSize: '12px' }}>This looks fake</span>
              </button>
            </div>
          ) : (
            <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', background: votes.userVote === 'confirmed' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${votes.userVote === 'confirmed' ? '#bbf7d0' : '#fecaca'}`, color: votes.userVote === 'confirmed' ? '#16a34a' : '#dc2626', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>
              {votes.userVote === 'confirmed' ? '👍 You confirmed this resolution' : '🚩 You flagged this as false'}
            </div>
          )}
          {total > 0 && (
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>{total} community vote{total !== 1 ? 's' : ''}</span>
                {votes.disputed > votes.confirmed && votes.disputed >= 2 && (
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: '20px' }}>⚠️ Under Review</span>
                )}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#16a34a' }}>👍 Confirmed</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{votes.confirmed} ({confirmedPct}%)</span>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${confirmedPct}%`, background: '#16a34a', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#dc2626' }}>🚩 Disputed</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{votes.disputed} ({disputedPct}%)</span>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${disputedPct}%`, background: '#dc2626', borderRadius: '4px', transition: 'width 0.5s ease' }} />
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
  const [mode, setMode] = useState('city')
  const [city, setCity] = useState('')
  const [radius, setRadius] = useState(25)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  const handleApply = async () => {
    if (mode === 'city') {
      if (!city.trim()) { setError('Enter a city name'); return }
      setSearching(true); setError('')
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`)
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
    <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: active ? '1.5px solid #16a34a' : '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>📍</span>
          <div>
            <p style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>Filter by Area</p>
            <p style={{ fontSize: '12px', color: '#64748b' }}>Show reports within a specific location</p>
          </div>
        </div>
        {active && <button onClick={onClear} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>✕ Clear Area</button>}
      </div>
      <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '4px', marginBottom: '16px', width: 'fit-content' }}>
        {[{ id: 'city', label: '🏙️ Search City' }, { id: 'radius', label: '📡 My Location' }].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: 'none', background: mode === m.id ? '#fff' : 'transparent', color: mode === m.id ? '#0f172a' : '#64748b', boxShadow: mode === m.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
            {m.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {mode === 'city' && (
          <div style={{ flex: 2, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>City / Area Name</label>
            <input type="text" placeholder="e.g. Hyderabad, Mumbai, Kansas City…" value={city}
              onChange={e => setCity(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleApply()}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#16a34a'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
          </div>
        )}
        {mode === 'radius' && (
          <div style={{ flex: 2, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Using your current GPS location</label>
            <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', fontSize: '14px', fontWeight: '500' }}>📡 Will use device location</div>
          </div>
        )}
        <div style={{ flex: 1, minWidth: '160px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Radius: <span style={{ color: '#16a34a' }}>{radius} miles</span></label>
          <input type="range" min={5} max={200} step={5} value={radius} onChange={e => setRadius(Number(e.target.value))} style={{ width: '100%', accentColor: '#16a34a' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}><span>5 mi</span><span>200 mi</span></div>
        </div>
        <button onClick={handleApply} disabled={searching} style={{ padding: '10px 20px', background: searching ? '#86efac' : '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: searching ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
          {searching ? 'Searching…' : '🔍 Apply'}
        </button>
      </div>
      {error && <div style={{ marginTop: '10px', color: '#dc2626', fontSize: '13px', background: '#fef2f2', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fecaca' }}>{error}</div>}
    </div>
  )
}

export default function Results() {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ hazard_type: '', severity: '', search: '' })
  const [view, setView] = useState('grid')
  const [resolveTarget, setResolveTarget] = useState(null)
  const [viewProofTarget, setViewProofTarget] = useState(null)
  const [areaFilter, setAreaFilter] = useState(null)
  const [showAreaPanel, setShowAreaPanel] = useState(false)

  useEffect(() => {
    client.get('/reports/all')
      .then(({ data }) => { setReports(data); setFiltered(data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let result = reports
    if (areaFilter) {
      result = result.filter(r => {
        if (!r.latitude || !r.longitude) return false
        return getDistanceMiles(areaFilter.lat, areaFilter.lng, parseFloat(r.latitude), parseFloat(r.longitude)) <= areaFilter.radius
      })
    }
    if (filters.hazard_type) result = result.filter(r => r.hazard_type === filters.hazard_type)
    if (filters.severity) result = result.filter(r => r.severity === filters.severity)
    if (filters.search) result = result.filter(r =>
      r.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
      r.hazard_type?.toLowerCase().includes(filters.search.toLowerCase())
    )
    setFiltered(result)
  }, [filters, reports, areaFilter])

  const handleResolved = (reportId, proofUrl) => {
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved', proof_url: proofUrl } : r))
    // Re-fetch fresh data from server to sync proof_url
    client.get('/reports/all')
      .then(res => setReports(res.data))
      .catch(() => {}) // silent fail — patch above already covers UI
  }

  const uniqueHazards = [...new Set(reports.map(r => r.hazard_type))]

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {resolveTarget && <ResolveModal report={resolveTarget} onClose={() => setResolveTarget(null)} onResolved={handleResolved} />}
      {viewProofTarget && <BeforeAfterModal report={viewProofTarget} onClose={() => setViewProofTarget(null)} />}

      <nav style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="32" height="32" viewBox="0 0 56 56" fill="none">
            <rect width="56" height="56" rx="16" fill="#16a34a"/>
            <path d="M28 10L14 16V28C14 36.4 20.2 44.2 28 46C35.8 44.2 42 36.4 42 28V16L28 10Z" fill="white"/>
            <path d="M22 28L26 32L34 24" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontWeight: '700', fontSize: '18px', color: '#0f172a' }}>Project SAVE</span>
        </div>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'transparent', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </nav>

      <div style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', padding: '32px 24px', textAlign: 'center', color: '#fff' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '6px' }}>Reported Hazards</h1>
        <p style={{ opacity: 0.85, fontSize: '15px' }}>
          {filtered.length} report{filtered.length !== 1 ? 's' : ''} found
          {areaFilter && <span> within <strong>{areaFilter.radius} miles</strong> of <strong>{areaFilter.label}</strong></span>}
        </p>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>

        <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={() => setShowAreaPanel(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s', background: showAreaPanel || areaFilter ? '#16a34a' : '#fff', color: showAreaPanel || areaFilter ? '#fff' : '#374151', border: showAreaPanel || areaFilter ? 'none' : '1.5px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            📍 {areaFilter ? `Near ${areaFilter.label} (${areaFilter.radius}mi)` : 'Filter by Area'}
          </button>
          {areaFilter && <span style={{ fontSize: '13px', color: '#64748b' }}>Showing {filtered.length} of {reports.length} reports</span>}
        </div>

        {showAreaPanel && <AreaFilterPanel active={!!areaFilter} onApply={(a) => { setAreaFilter(a); setShowAreaPanel(false) }} onClear={() => setAreaFilter(null)} />}

        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 2, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Search</label>
            <input type="text" placeholder="Search by hazard or description…" value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#16a34a'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Hazard Type</label>
            <select value={filters.hazard_type} onChange={e => setFilters(f => ({ ...f, hazard_type: e.target.value }))}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#fff' }}>
              <option value="">All Types</option>
              {uniqueHazards.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Severity</label>
            <select value={filters.severity} onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#fff' }}>
              <option value="">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          {(filters.hazard_type || filters.severity || filters.search) && (
            <button onClick={() => setFilters({ hazard_type: '', severity: '', search: '' })}
              style={{ padding: '10px 16px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
              Clear Filters
            </button>
          )}
          <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
            {['grid', 'map'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', background: view === v ? '#16a34a' : '#fff', color: view === v ? '#fff' : '#64748b', border: view === v ? 'none' : '1.5px solid #e2e8f0' }}>
                {v === 'grid' ? '⊞ Grid' : '🗺 Map'}
              </button>
            ))}
          </div>
        </div>

        {view === 'map' && (
          <div style={{ height: '600px', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {loading ? <p>Loading…</p> : <Map reports={filtered} zoom={areaFilter ? 10 : 5} center={areaFilter ? [areaFilter.lng, areaFilter.lat] : undefined} />}
          </div>
        )}

        {view === 'grid' && (
          loading ? (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Loading reports…</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <p style={{ fontSize: '18px', fontWeight: '600' }}>No reports found</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>
                {areaFilter ? `No reports within ${areaFilter.radius} miles of ${areaFilter.label}` : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {filtered.map(r => {
                const s = severityColor[r.severity] || severityColor.low
                const isResolved = r.status === 'resolved'
                const votes = (() => {
                  try { return JSON.parse(localStorage.getItem(`votes_${r.id}`)) || { confirmed: 0, disputed: 0 } }
                  catch { return { confirmed: 0, disputed: 0 } }
                })()
                const isDisputed = votes.disputed >= 2 && votes.disputed > votes.confirmed
                const distLabel = areaFilter && r.latitude && r.longitude
                  ? `${getDistanceMiles(areaFilter.lat, areaFilter.lng, parseFloat(r.latitude), parseFloat(r.longitude)).toFixed(1)} mi away`
                  : null

                return (
                  <div key={r.id} style={{ background: '#fff', borderRadius: '12px', border: isResolved ? (isDisputed ? '1px solid #fecaca' : '1px solid #bbf7d0') : '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}
                  >
                    {r.image_url
                      ? <img src={r.image_url?.startsWith('http') ? r.image_url : `${import.meta.env.VITE_API_URL || ''}${r.image_url}`} alt="hazard" style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '160px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>No Photo</div>}

                    {isResolved && (
                      <div style={{ background: isDisputed ? '#fef2f2' : '#f0fdf4', borderBottom: `1px solid ${isDisputed ? '#fecaca' : '#bbf7d0'}`, padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: isDisputed ? '#dc2626' : '#16a34a', fontSize: '13px', fontWeight: '600' }}>{isDisputed ? '⚠️ Under Review' : '✅ Resolved'}</span>
                        <button onClick={() => setViewProofTarget(r)} style={{ background: 'transparent', border: 'none', color: isDisputed ? '#dc2626' : '#16a34a', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}>View Proof →</button>
                      </div>
                    )}

                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>{r.hazard_type}</strong>
                        <span style={{ background: s.bg, color: s.text, padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize' }}>{r.severity}</span>
                      </div>
                      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '12px', lineHeight: '1.5' }}>
                        {r.description?.slice(0, 100)}{r.description?.length > 100 ? '…' : ''}
                      </p>

                      {/* Reporter + trust badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                          {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {distLabel && <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>📍 {distLabel}</span>}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <ReporterBadge name={r.name} badge_tier={r.badge_tier} trust_score={r.trust_score} />
                      </div>

                      {isResolved && (votes.confirmed > 0 || votes.disputed > 0) && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                          <span style={{ background: '#dcfce7', color: '#16a34a', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>👍 {votes.confirmed}</span>
                          <span style={{ background: '#fee2e2', color: '#dc2626', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>🚩 {votes.disputed}</span>
                        </div>
                      )}
                      {!isResolved && (
                        <button onClick={() => setResolveTarget(r)} style={{ width: '100%', padding: '9px', background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #16a34a', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                          ✅ Mark as Resolved
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>
    </div>
  )
}