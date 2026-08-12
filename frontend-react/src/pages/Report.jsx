import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import client from '../api/client'

const HAZARD_TYPES_FALLBACK = [
  'Pothole', 'Broken Street Light', 'Flooding', 'Fallen Tree',
  'Gas Leak', 'Exposed Wire', 'Road Damage', 'Broken Sidewalk',
  'Illegal Dumping', 'Graffiti / Vandalism', 'Others',
]

const SEVERITIES = [
  { value: 'low', label: 'Low', color: '#16a34a', bg: '#dcfce7', desc: 'Minor issue, not urgent' },
  { value: 'medium', label: 'Medium', color: '#ca8a04', bg: '#fef9c3', desc: 'Needs attention soon' },
  { value: 'high', label: 'High', color: '#dc2626', bg: '#fee2e2', desc: 'Urgent, people at risk' },
  { value: 'critical', label: 'Critical', color: '#9333ea', bg: '#f3e8ff', desc: 'Immediate danger' },
]

function LocationMap({ lat, lng, onLocationSelect }) {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if (mapRef.current) return
    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [lng || -98.5, lat || 39.5],
      zoom: lat ? 13 : 4,
    })
    mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right')
    mapRef.current.on('click', (e) => {
      const { lat, lng } = e.lngLat
      onLocationSelect({ lat, lng })
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat])
      } else {
        markerRef.current = new maplibregl.Marker({ color: '#16a34a', draggable: true })
          .setLngLat([lng, lat]).addTo(mapRef.current)
        markerRef.current.on('dragend', () => {
          const pos = markerRef.current.getLngLat()
          onLocationSelect({ lat: pos.lat, lng: pos.lng })
        })
      }
    })
    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !lat || !lng) return
    mapRef.current.flyTo({ center: [lng, lat], zoom: 14 })
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat])
    } else {
      markerRef.current = new maplibregl.Marker({ color: '#16a34a', draggable: true })
        .setLngLat([lng, lat]).addTo(mapRef.current)
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current.getLngLat()
        onLocationSelect({ lat: pos.lat, lng: pos.lng })
      })
    }
  }, [lat, lng])

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
}

export default function Report() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState(HAZARD_TYPES_FALLBACK)
  const [form, setForm] = useState({
    hazard_type: '', severity: '', description: '',
    latitude: '', longitude: '', location_method: 'gps',
    custom_description: '',
  })
  const [address, setAddress] = useState({ street: '', city: '', state: '', landmark: '' })
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [duplicateWarning, setDuplicateWarning] = useState(null)

  useEffect(() => {
    const CACHE_KEY = 'master:categories'
    const TTL = 60 * 60 * 1000
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const { data, ts } = JSON.parse(cached)
        if (Date.now() - ts < TTL) {
          setCategories(data.map(c => c.name))
          return
        }
      }
    } catch {}
    client.get('/master/categories')
      .then(({ data }) => {
        setCategories(data.map(c => c.name))
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
      })
      .catch(() => setCategories(HAZARD_TYPES_FALLBACK))
  }, [])

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
      const data = await res.json()
      if (data && data.address) {
        setAddress(a => ({
          ...a,
          street: [data.address.house_number, data.address.road].filter(Boolean).join(' '),
          city: data.address.city || data.address.town || data.address.village || '',
          state: data.address.state || '',
        }))
      }
    } catch { }
  }

  const handleGPS = () => {
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm(f => ({
          ...f,
          latitude: coords.latitude.toFixed(6),
          longitude: coords.longitude.toFixed(6),
          location_method: 'gps',
        }))
        reverseGeocode(coords.latitude, coords.longitude)
        setGpsLoading(false)
      },
      () => {
        setError('GPS unavailable. Please enter your address or click the map.')
        setGpsLoading(false)
      }
    )
  }

  const handleAddressGeocode = async () => {
    const query = `${address.street} ${address.city} ${address.state}`.trim()
    if (!query) { setError('Please enter at least a city and state'); return }
    setError('')
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`)
      const data = await res.json()
      if (data.length === 0) { setError('Address not found. Try being more specific.'); return }
      setForm(f => ({
        ...f,
        latitude: parseFloat(data[0].lat).toFixed(6),
        longitude: parseFloat(data[0].lon).toFixed(6),
        location_method: 'address',
      }))
    } catch {
      setError('Could not look up address. Please try again.')
    }
  }

  const checkDuplicate = async (lat, lng, hazard_type) => {
    if (!lat || !lng || !hazard_type) return false
    try {
      const { data } = await client.post('/reports/check-duplicate', {
        latitude: lat, longitude: lng, hazard_type,
      })
      if (data.isDuplicate) {
        setDuplicateWarning(data.existing)
        return true
      }
    } catch { }
    return false
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) { setImage(file); setImagePreview(URL.createObjectURL(file)) }
  }

  const handleSubmit = async () => {
    if (!form.latitude || !form.longitude) { setError('Please set a location'); return }
    if (!image) { setError('Please upload a photo before submitting'); return }

    // DUP1 — check for duplicate before submitting
    if (!duplicateWarning) {
      const isDup = await checkDuplicate(form.latitude, form.longitude, form.hazard_type)
      if (isDup) return
    }

    setSubmitting(true)
    setError('')
    const fd = new FormData()
    fd.append('user_id', user.id)
    fd.append('hazard_type', form.hazard_type)
    fd.append('severity', form.severity)
    fd.append('description', form.description)
    fd.append('latitude', form.latitude)
    fd.append('longitude', form.longitude)
    fd.append('location_method', form.location_method)
    if (form.hazard_type === 'Others') fd.append('custom_description', form.custom_description.trim())
    if (image) fd.append('image', image)
    try {
      await client.post('/reports/create', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px',
    border: '1.5px solid #e2e8f0', borderRadius: '10px',
    fontSize: '15px', outline: 'none', background: '#fff',
    transition: 'border-color 0.2s',
  }

  const labelStyle = {
    display: 'block', fontSize: '13px',
    fontWeight: '600', color: '#374151', marginBottom: '6px',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <nav style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
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

      <div style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', padding: '40px 24px', textAlign: 'center', color: '#fff' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>Report a Hazard</h1>
        <p style={{ opacity: 0.85, fontSize: '16px' }}>Help keep your community safe</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
          {['Hazard Details', 'Location', 'Photo & Submit'].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: step > i + 1 ? '#fff' : step === i + 1 ? '#fff' : 'rgba(255,255,255,0.3)', color: step >= i + 1 ? '#16a34a' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700' }}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '13px', opacity: step === i + 1 ? 1 : 0.7 }}>{s}</span>
              {i < 2 && <div style={{ width: '32px', height: '2px', background: 'rgba(255,255,255,0.3)', margin: '0 4px' }} />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Step 1 */}
        {step === 1 && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: '#0f172a' }}>Hazard Details</h2>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Hazard Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {categories.map(t => (
                  <button key={t} type="button"
                    onClick={() => setForm(f => ({ ...f, hazard_type: t, custom_description: '' }))}
                    style={{ padding: '10px 8px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', textAlign: 'center', border: form.hazard_type === t ? '2px solid #16a34a' : '1.5px solid #e2e8f0', background: form.hazard_type === t ? '#dcfce7' : '#fff', color: form.hazard_type === t ? '#16a34a' : '#374151', transition: 'all 0.15s' }}>
                    {t}
                  </button>
                ))}
              </div>
              {form.hazard_type === 'Others' && (
                <div style={{ marginTop: '12px' }}>
                  <label style={labelStyle}>Describe the hazard type <span style={{ color: '#dc2626' }}>*</span></label>
                  <input type="text" placeholder="e.g. Broken Fence, Collapsed Wall, Sinkhole…" maxLength={100}
                    value={form.custom_description}
                    onChange={e => setForm(f => ({ ...f, custom_description: e.target.value }))}
                    style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #16a34a', borderRadius: '10px', fontSize: '15px', outline: 'none', background: '#f0fdf4' }} />
                  <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>Required when selecting Others</p>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Severity Level</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {SEVERITIES.map(s => (
                  <button key={s.value} type="button" onClick={() => setForm(f => ({ ...f, severity: s.value }))}
                    style={{ padding: '14px 16px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', border: form.severity === s.value ? `2px solid ${s.color}` : '1.5px solid #e2e8f0', background: form.severity === s.value ? s.bg : '#fff', transition: 'all 0.15s' }}>
                    <div style={{ fontWeight: '600', color: s.color, fontSize: '14px' }}>{s.label}</div>
                    <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Description</label>
              <textarea placeholder="Describe the hazard in detail…" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
                onFocus={e => e.target.style.borderColor = '#16a34a'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </div>

            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '14px', marginBottom: '16px' }}>{error}</div>}

            <button type="button" onClick={() => {
              if (!form.hazard_type) { setError('Please select a hazard type'); return }
              if (form.hazard_type === 'Others' && !form.custom_description?.trim()) { setError('Please describe the hazard type'); return }
              if (!form.severity) { setError('Please select a severity level'); return }
              if (!form.description.trim()) { setError('Please add a description'); return }
              setError(''); setStep(2)
            }} style={{ width: '100%', padding: '14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
              Continue to Location →
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#0f172a' }}>Pin the Location</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>Use GPS, enter your address, or click the map</p>

            <button type="button" onClick={handleGPS} disabled={gpsLoading} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: gpsLoading ? '#f1f5f9' : '#f0fdf4', border: '1.5px solid #16a34a', borderRadius: '8px', color: '#16a34a', fontWeight: '600', fontSize: '14px', cursor: gpsLoading ? 'not-allowed' : 'pointer', marginBottom: '20px', width: '100%', justifyContent: 'center' }}>
              {gpsLoading ? (
                <><div style={{ width: '14px', height: '14px', border: '2px solid #16a34a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Getting location…<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></>
              ) : '📍 Auto-detect My Location (GPS)'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>or enter address manually</span>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Street Address</label>
                <input type="text" placeholder="e.g. 123 Main Street" value={address.street}
                  onChange={e => setAddress(a => ({ ...a, street: e.target.value }))} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#16a34a'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <div style={{ flex: 2 }}>
                  <label style={labelStyle}>City</label>
                  <input type="text" placeholder="e.g. Kansas City" value={address.city}
                    onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#16a34a'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>State</label>
                  <input type="text" placeholder="e.g. MO" value={address.state}
                    onChange={e => setAddress(a => ({ ...a, state: e.target.value }))} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#16a34a'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Nearby Landmark <span style={{ color: '#94a3b8', fontWeight: '400' }}>(optional)</span></label>
                <input type="text" placeholder="e.g. In front of Walmart…" value={address.landmark}
                  onChange={e => setAddress(a => ({ ...a, landmark: e.target.value }))} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#16a34a'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <button type="button" onClick={handleAddressGeocode} style={{ width: '100%', padding: '11px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                🔍 Find Location on Map
              </button>
            </div>

            {form.latitude && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', color: '#16a34a', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ✅ Location set{address.street ? ` — ${address.street}, ${address.city}` : ` — ${form.latitude}, ${form.longitude}`} · drag pin to adjust
              </div>
            )}

            <div style={{ height: '380px', borderRadius: '12px', overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
              <LocationMap lat={parseFloat(form.latitude)} lng={parseFloat(form.longitude)}
                onLocationSelect={({ lat, lng }) => setForm(f => ({ ...f, latitude: lat.toFixed(6), longitude: lng.toFixed(6), location_method: 'map' }))} />
            </div>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '8px' }}>💡 Click anywhere on the map to drop a pin — or drag the pin to adjust</p>

            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '14px', margin: '16px 0' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button type="button" onClick={() => setStep(1)} style={{ flex: 1, padding: '14px', background: '#fff', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', cursor: 'pointer' }}>← Back</button>
              <button type="button" onClick={() => {
                if (!form.latitude || !form.longitude) { setError('Please set a location first'); return }
                setError(''); setStep(3)
              }} style={{ flex: 2, padding: '14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                Continue to Photo →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#0f172a' }}>Photo & Submit</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Add a photo to help authorities identify the hazard faster</p>

            <div onClick={() => document.getElementById('photo-input').click()}
              style={{ border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '40px', textAlign: 'center', cursor: 'pointer', background: imagePreview ? '#000' : '#f8fafc', marginBottom: '24px', overflow: 'hidden', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#16a34a'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
              {imagePreview
                ? <img src={imagePreview} alt="preview" style={{ maxHeight: '200px', borderRadius: '8px', objectFit: 'contain' }} />
                : <div><div style={{ fontSize: '40px', marginBottom: '12px' }}>📷</div><p style={{ color: '#64748b', fontWeight: '500' }}>Click to upload a photo</p><p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>PNG, JPG up to 10MB</p></div>}
              <input id="photo-input" type="file" accept="image/*" capture="environment" onChange={handleImageChange} style={{ display: 'none' }} />
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Report Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  ['Hazard', form.hazard_type === 'Others' ? `Others — ${form.custom_description}` : form.hazard_type],
                  ['Severity', form.severity],
                  ['Address', address.street ? `${address.street}, ${address.city}` : `${form.latitude}, ${form.longitude}`],
                  ['Landmark', address.landmark || 'None provided'],
                  ['Photo', image ? image.name : 'No photo'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p style={{ color: '#94a3b8', fontSize: '12px' }}>{k}</p>
                    <p style={{ color: '#0f172a', fontSize: '14px', fontWeight: '500', textTransform: 'capitalize' }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* DUP1 — Duplicate warning */}
            {duplicateWarning && (
              <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <p style={{ fontWeight: '700', color: '#92400e', fontSize: '14px', marginBottom: '6px' }}>⚠️ Similar report already exists</p>
                <p style={{ color: '#78350f', fontSize: '13px', marginBottom: '12px' }}>
                  A <strong>{duplicateWarning.hazard_type}</strong> was reported within 50 metres in the last 24 hours.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => navigate('/results')} style={{ flex: 1, padding: '10px', background: '#fff', color: '#92400e', border: '1.5px solid #fde68a', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                    View Existing
                  </button>
                  <button type="button" onClick={() => { setDuplicateWarning(null); handleSubmit() }} style={{ flex: 1, padding: '10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                    Submit Anyway
                  </button>
                </div>
              </div>
            )}

            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '14px', marginBottom: '16px' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={() => setStep(2)} style={{ flex: 1, padding: '14px', background: '#fff', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', cursor: 'pointer' }}>← Back</button>
              <button type="button" onClick={handleSubmit} disabled={submitting} style={{ flex: 2, padding: '14px', background: submitting ? '#86efac' : '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Submitting…' : '🚨 Submit Report'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}