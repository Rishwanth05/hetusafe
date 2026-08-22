import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import client from '../api/client'
import { Card, Button, PriorityBadge } from '../components/ui'

/* ── Constants (unchanged from original) ────────────────────────────────── */
const HAZARD_TYPES_FALLBACK = [
  'Pothole', 'Broken Street Light', 'Flooding', 'Fallen Tree',
  'Gas Leak', 'Exposed Wire', 'Road Damage', 'Broken Sidewalk',
  'Illegal Dumping', 'Graffiti / Vandalism', 'Others',
]

const SEVERITIES = [
  { value: 'low',      label: 'Low',      color: '#16a34a', bg: '#dcfce7', desc: 'Minor issue, not urgent' },
  { value: 'medium',   label: 'Medium',   color: '#ca8a04', bg: '#fef9c3', desc: 'Needs attention soon'    },
  { value: 'high',     label: 'High',     color: '#dc2626', bg: '#fee2e2', desc: 'Urgent, people at risk'  },
  { value: 'critical', label: 'Critical', color: '#9333ea', bg: '#f3e8ff', desc: 'Immediate danger'        },
]

/* ── Visual-only additions (no logic) ───────────────────────────────────── */
const HAZARD_ICON_MAP = {
  'Pothole':               '🕳️',
  'Broken Street Light':   '💡',
  'Street Light Out':      '💡',
  'Flooding':              '🌊',
  'Fallen Tree':           '🌲',
  'Gas Leak':              '⚠️',
  'Exposed Wire':          '⚡',
  'Road Damage':           '🛣️',
  'Broken Sidewalk':       '🚶',
  'Unsafe Sidewalk':       '🚶',
  'Illegal Dumping':       '🗑️',
  'Debris on Road':        '🚧',
  'Graffiti / Vandalism':  '🖌️',
  'Construction':          '🏗️',
  'Traffic Signal':        '🚦',
  'Others':                '❓',
}

const PHOTO_TIPS = [
  { icon: '🔍', text: 'Capture clear view'  },
  { icon: '☀️', text: 'Good lighting'       },
  { icon: '📐', text: 'Show full area'      },
  { icon: '👥', text: 'Avoid crowds'        },
]

// Dark-theme Tailwind classes for each severity level.
// The SEVERITIES array above is kept for its data (value, label, desc).
const SEV_STYLE = {
  low:      { active: 'border-accent bg-accent/10',     text: 'text-accent'    },
  medium:   { active: 'border-warn bg-warn/10',         text: 'text-warn'      },
  high:     { active: 'border-danger bg-danger/10',     text: 'text-danger'    },
  critical: { active: 'border-[#9333ea] bg-[#9333ea]/10', text: 'text-[#9333ea]' },
}

/* ── LocationMap — byte-for-byte identical to original ───────────────────── */
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

/* ── Success screen ─────────────────────────────────────────────────────── */
function SuccessScreen({ form, address, submittedId, navigate }) {
  const hazardLabel = form.hazard_type === 'Others'
    ? `Others — ${form.custom_description}`
    : form.hazard_type
  const locationLabel = address.street
    ? `${address.street}, ${address.city}`
    : `${form.latitude}, ${form.longitude}`

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4 py-10">

      {/* Glowing checkmark */}
      <div className="w-20 h-20 rounded-full bg-accent shadow-glow-green flex items-center justify-center mb-6">
        <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-canvas" aria-hidden="true">
          <path d="M5 12l4.5 4.5L19 7"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <h1 className="text-hero text-light text-center mb-2">Thank You!</h1>
      <p className="text-body text-muted text-center mb-8 max-w-xs">
        Your hazard report has been submitted to the Hetusafe community.
      </p>

      {/* Report summary */}
      <Card className="p-5 w-full max-w-sm mb-4">
        <p className="text-caption text-muted font-semibold uppercase tracking-widest mb-4">
          Report Summary
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-caption text-muted shrink-0">Type</span>
            <span className="text-body text-light font-medium text-right truncate">{hazardLabel || '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-caption text-muted shrink-0">Severity</span>
            {form.severity ? <PriorityBadge level={form.severity} /> : <span className="text-caption text-muted">—</span>}
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-caption text-muted shrink-0">Location</span>
            <span className="text-body text-light font-medium text-right ml-2" style={{ wordBreak: 'break-word' }}>{locationLabel || '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-caption text-muted shrink-0">Submitted</span>
            <span className="text-body text-light font-medium">Just now</span>
          </div>
          {submittedId && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-caption text-muted shrink-0">Report ID</span>
              <span className="text-caption font-mono text-muted">
                #RS{String(submittedId).padStart(3, '0')}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* What happens next */}
      <Card className="p-5 w-full max-w-sm mb-8">
        <p className="text-body text-light font-semibold mb-3">What happens next?</p>
        <div className="space-y-2.5">
          {[
            { icon: '👀', text: 'Community members will verify the hazard' },
            { icon: '🔔', text: "You'll be notified when the status changes" },
            { icon: '✅', text: 'Resolved reports require photo proof'       },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <span className="text-base shrink-0" aria-hidden="true">{icon}</span>
              <span className="text-caption text-muted">{text}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* CTAs */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        <Button variant="primary" className="w-full" onClick={() => navigate('/results')}>
          View My Report
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => navigate('/dashboard')}>
          Back to Home
        </Button>
      </div>
    </div>
  )
}

/* ── Shared dark-theme input class ──────────────────────────────────────── */
const INPUT_CLS = 'w-full bg-elevated border border-edge rounded-xl px-4 py-3 text-body text-light placeholder:text-muted focus:outline-none focus:border-accent transition-colors'

/* ── Main component ─────────────────────────────────────────────────────── */
export default function Report() {
  const { user } = useAuth()
  const navigate = useNavigate()

  /* ── All state from original (unchanged) ──────────────────────────────── */
  const [categories, setCategories] = useState(HAZARD_TYPES_FALLBACK)
  const [form, setForm] = useState({
    hazard_type: '', severity: '', description: '',
    latitude: '', longitude: '', location_method: 'gps',
    custom_description: '',
  })
  const [address, setAddress] = useState({ street: '', city: '', state: '', landmark: '' })
  const [image, setImage]           = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [error, setError]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [step, setStep]             = useState(1)
  const [duplicateWarning, setDuplicateWarning] = useState(null)

  /* ── New state for success screen ────────────────────────────────────── */
  const [submitted, setSubmitted]   = useState(false)
  const [submittedId, setSubmittedId] = useState(null)

  /* ── All useEffects from original (unchanged) ─────────────────────────── */
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

  /* ── All handlers from original (unchanged) ──────────────────────────── */
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

  // handleSubmit: API call is byte-for-byte identical to the original.
  // The only change is capturing the response to populate the success screen
  // instead of immediately navigating away.
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
      const response = await client.post('/reports/create', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSubmittedId(response.data?.id || response.data?.report?.id || null)
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Success screen ──────────────────────────────────────────────────── */
  if (submitted) {
    return (
      <SuccessScreen
        form={form}
        address={address}
        submittedId={submittedId}
        navigate={navigate}
      />
    )
  }

  /* ── Step indicator helper ───────────────────────────────────────────── */
  const STEP_LABELS = ['Details', 'Location', 'Photo']

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-canvas">

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-xl border-b border-edge">
        <div className="flex items-center justify-between h-14 px-4 max-w-2xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <svg width="26" height="26" viewBox="0 0 56 56" fill="none" aria-hidden="true">
              <rect width="56" height="56" rx="16" fill="#22C55E"/>
              <path d="M28 10L14 16V28C14 36.4 20.2 44.2 28 46C35.8 44.2 42 36.4 42 28V16L28 10Z" fill="white"/>
              <path d="M22 28L26 32L34 24" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[17px] font-bold text-light tracking-tight">Report a Hazard</span>
          </div>

          {/* Back button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="text-caption text-muted hover:text-light px-3 py-2 rounded-xl hover:bg-elevated transition-colors"
          >
            ← Back
          </button>
        </div>
      </header>

      {/* ── Step indicator ───────────────────────────────────────────── */}
      <div className="bg-surface border-b border-edge px-4 py-3">
        <div className="max-w-2xl mx-auto">

          {/* Circles + connectors */}
          <div className="flex items-center">
            {[1, 2, 3].map((n, i) => (
              <div key={n} className={`flex items-center ${i < 2 ? 'flex-1' : 'shrink-0'}`}>
                {/* Circle */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                  step > n
                    ? 'bg-accent text-canvas'
                    : step === n
                    ? 'bg-accent text-canvas'
                    : 'bg-elevated border border-edge text-muted'
                }`}>
                  {step > n ? (
                    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
                      <path d="M3 8l3.5 3.5L13 4"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : n}
                </div>
                {/* Connector line */}
                {i < 2 && (
                  <div className={`flex-1 h-px mx-2 transition-colors ${step > n ? 'bg-accent' : 'bg-edge'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Labels */}
          <div className="flex mt-1.5">
            {STEP_LABELS.map((label, i) => (
              <div
                key={label}
                className={`text-[10px] font-semibold uppercase tracking-wider ${i < 2 ? 'flex-1' : 'shrink-0'} ${
                  step >= i + 1 ? 'text-accent' : 'text-muted'
                }`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Step content ─────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-4 py-6">

        {/* ── STEP 1 — Details ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">

            {/* Hazard type */}
            <Card className="p-5">
              <h2 className="text-section font-bold text-light mb-1">What did you notice?</h2>
              <p className="text-caption text-muted mb-5">Select the type of hazard you've found</p>

              {/* Hazard type grid — 2 cols mobile, 3 cols sm+ */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, hazard_type: t, custom_description: '' }))}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition-all focus:outline-none ${
                      form.hazard_type === t
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-edge bg-elevated text-muted hover:border-accent/40 hover:text-light'
                    }`}
                  >
                    <span className="text-2xl" aria-hidden="true">
                      {HAZARD_ICON_MAP[t] || '⚠️'}
                    </span>
                    <span className="text-caption font-medium leading-tight">{t}</span>
                  </button>
                ))}
              </div>

              {/* Others custom description */}
              {form.hazard_type === 'Others' && (
                <div className="mt-4">
                  <label className="block text-caption text-muted font-semibold mb-1.5">
                    Describe the hazard type <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Broken Fence, Collapsed Wall, Sinkhole…"
                    maxLength={100}
                    value={form.custom_description}
                    onChange={e => setForm(f => ({ ...f, custom_description: e.target.value }))}
                    className="w-full bg-accent/5 border border-accent/30 rounded-xl px-4 py-3 text-body text-light placeholder:text-muted focus:outline-none focus:border-accent"
                  />
                  <p className="text-caption text-muted mt-1.5">Required when selecting Others</p>
                </div>
              )}
            </Card>

            {/* Severity */}
            <Card className="p-5">
              <h2 className="text-section font-bold text-light mb-1">How serious is it?</h2>
              <p className="text-caption text-muted mb-5">Rate the urgency of this hazard</p>

              <div className="grid grid-cols-2 gap-3">
                {SEVERITIES.map(s => {
                  const style = SEV_STYLE[s.value]
                  const isActive = form.severity === s.value
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, severity: s.value }))}
                      className={`p-4 rounded-2xl border text-left transition-all focus:outline-none ${
                        isActive
                          ? style.active
                          : 'border-edge bg-elevated hover:border-accent/30'
                      }`}
                    >
                      <span className={`text-body font-bold block mb-0.5 ${isActive ? style.text : 'text-light'}`}>
                        {s.label}
                      </span>
                      <span className="text-caption text-muted">{s.desc}</span>
                    </button>
                  )
                })}
              </div>
            </Card>

            {/* Description */}
            <Card className="p-5">
              <label className="block text-section font-bold text-light mb-1">
                Add a description
              </label>
              <p className="text-caption text-muted mb-4">Optional — more detail helps responders act faster</p>
              <textarea
                placeholder="Describe the hazard in detail…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
                className={`${INPUT_CLS} resize-y`}
              />
            </Card>

            {/* Error */}
            {error && (
              <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-body text-danger">
                {error}
              </div>
            )}

            {/* Continue */}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => {
                if (!form.hazard_type) { setError('Please select a hazard type'); return }
                if (form.hazard_type === 'Others' && !form.custom_description?.trim()) {
                  setError('Please describe the hazard type'); return
                }
                if (!form.severity) { setError('Please select a severity level'); return }
                if (!form.description.trim()) { setError('Please add a description'); return }
                setError('')
                setStep(2)
              }}
            >
              Next: Add Location →
            </Button>
          </div>
        )}

        {/* ── STEP 2 — Location ────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-section font-bold text-light mb-1">Pin the Location</h2>
              <p className="text-caption text-muted">Use GPS, enter your address, or click the map</p>
            </div>

            {/* GPS button */}
            <button
              type="button"
              onClick={handleGPS}
              disabled={gpsLoading}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-body font-semibold transition-colors border ${
                gpsLoading
                  ? 'bg-elevated border-edge text-muted cursor-not-allowed'
                  : 'bg-accent/10 border-accent text-accent hover:bg-accent/20'
              }`}
            >
              {gpsLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-muted border-t-accent rounded-full animate-spin shrink-0" />
                  Getting location…
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </>
              ) : '📍 Auto-detect My Location (GPS)'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-edge" />
              <span className="text-caption text-muted font-medium">or enter address manually</span>
              <div className="flex-1 h-px bg-edge" />
            </div>

            {/* Address fields */}
            <Card className="p-4 space-y-3">
              <div>
                <label className="block text-caption text-muted font-semibold mb-1.5">Street Address</label>
                <input
                  type="text"
                  placeholder="e.g. 123 Main Street"
                  value={address.street}
                  onChange={e => setAddress(a => ({ ...a, street: e.target.value }))}
                  className={INPUT_CLS}
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-[2]">
                  <label className="block text-caption text-muted font-semibold mb-1.5">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Kansas City"
                    value={address.city}
                    onChange={e => setAddress(a => ({ ...a, city: e.target.value }))}
                    className={INPUT_CLS}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-caption text-muted font-semibold mb-1.5">State</label>
                  <input
                    type="text"
                    placeholder="MO"
                    value={address.state}
                    onChange={e => setAddress(a => ({ ...a, state: e.target.value }))}
                    className={INPUT_CLS}
                  />
                </div>
              </div>

              <div>
                <label className="block text-caption text-muted font-semibold mb-1.5">
                  Nearby Landmark <span className="text-muted font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. In front of Walmart…"
                  value={address.landmark}
                  onChange={e => setAddress(a => ({ ...a, landmark: e.target.value }))}
                  className={INPUT_CLS}
                />
              </div>

              <button
                type="button"
                onClick={handleAddressGeocode}
                className="w-full py-3 bg-elevated border border-edge text-light rounded-xl text-body font-semibold hover:bg-surface transition-colors"
              >
                🔍 Find Location on Map
              </button>
            </Card>

            {/* Location confirmation */}
            {form.latitude && (
              <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-xl px-4 py-3">
                <span className="shrink-0" aria-hidden="true">✅</span>
                <span className="text-caption text-accent truncate">
                  Location set{address.street
                    ? ` — ${address.street}, ${address.city}`
                    : ` — ${form.latitude}, ${form.longitude}`}
                </span>
                <span className="text-caption text-muted shrink-0"> · drag pin to adjust</span>
              </div>
            )}

            {/* Map */}
            <div className="rounded-2xl overflow-hidden border border-edge" style={{ height: '380px' }}>
              <LocationMap
                lat={parseFloat(form.latitude)}
                lng={parseFloat(form.longitude)}
                onLocationSelect={({ lat, lng }) =>
                  setForm(f => ({
                    ...f,
                    latitude: lat.toFixed(6),
                    longitude: lng.toFixed(6),
                    location_method: 'map',
                  }))
                }
              />
            </div>
            <p className="text-caption text-muted">
              💡 Click anywhere on the map to drop a pin — or drag the pin to adjust
            </p>

            {/* Error */}
            {error && (
              <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-body text-danger">
                {error}
              </div>
            )}

            {/* Back + Continue */}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" size="lg" className="flex-1" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button
                variant="primary"
                size="lg"
                className="flex-[2]"
                onClick={() => {
                  if (!form.latitude || !form.longitude) {
                    setError('Please set a location first')
                    return
                  }
                  setError('')
                  setStep(3)
                }}
              >
                Next: Add Photo →
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3 — Photo ───────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-section font-bold text-light mb-1">Add a Photo</h2>
              <p className="text-caption text-muted">Help authorities identify the hazard faster</p>
            </div>

            {/* Photo capture area
                capture="environment" is preserved — camera-only, no gallery.
                This is a standing anti-fraud product rule. */}
            <div
              onClick={() => document.getElementById('photo-input').click()}
              className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[200px] overflow-hidden ${
                imagePreview ? 'border-accent/30' : 'border-edge hover:border-accent/50'
              }`}
              style={{ background: imagePreview ? '#000' : undefined }}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Photo preview"
                  className="max-h-[220px] rounded-xl object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
                  <span className="text-5xl" aria-hidden="true">📷</span>
                  <div>
                    <p className="text-body text-light font-semibold">Tap to open camera</p>
                    <p className="text-caption text-muted mt-1">Camera only · PNG / JPG up to 5 MB</p>
                  </div>
                </div>
              )}
              {/* capture="environment" — DO NOT change — camera-only anti-fraud rule */}
              <input
                id="photo-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* Photo tips — 2 cols mobile, 4 cols sm+ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PHOTO_TIPS.map(({ icon, text }) => (
                <div
                  key={text}
                  className="flex flex-col items-center gap-1.5 p-3 bg-surface border border-edge rounded-xl text-center"
                >
                  <span className="text-xl" aria-hidden="true">{icon}</span>
                  <span className="text-caption text-muted font-medium">{text}</span>
                </div>
              ))}
            </div>

            {/* Report summary */}
            <Card className="p-4">
              <p className="text-caption text-muted font-semibold uppercase tracking-widest mb-3">
                Report Summary
              </p>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                {[
                  ['Hazard',    form.hazard_type === 'Others' ? `Others — ${form.custom_description}` : form.hazard_type],
                  ['Severity',  form.severity],
                  ['Address',   address.street ? `${address.street}, ${address.city}` : `${form.latitude}, ${form.longitude}`],
                  ['Landmark',  address.landmark || 'None provided'],
                  ['Photo',     image ? image.name : 'No photo'],
                ].map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <p className="text-caption text-muted">{k}</p>
                    <p className="text-caption text-light font-medium capitalize truncate">{v || '—'}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* DUP1 — Duplicate warning */}
            {duplicateWarning && (
              <div className="bg-warn/10 border border-warn/30 rounded-2xl p-4">
                <p className="text-body text-warn font-bold mb-1">⚠️ Similar report already exists</p>
                <p className="text-caption text-muted mb-4">
                  A <strong className="text-light">{duplicateWarning.hazard_type}</strong> was reported within 50 metres in the last 24 hours.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/results')}
                    className="flex-1 py-2.5 bg-elevated border border-edge text-light rounded-xl text-caption font-semibold hover:bg-surface transition-colors"
                  >
                    View Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDuplicateWarning(null); handleSubmit() }}
                    className="flex-1 py-2.5 bg-warn text-canvas rounded-xl text-caption font-semibold hover:opacity-90 transition-opacity"
                  >
                    Submit Anyway
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-body text-danger">
                {error}
              </div>
            )}

            {/* Back + Submit */}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" size="lg" className="flex-1" onClick={() => setStep(2)}>
                ← Back
              </Button>
              <Button
                variant="primary"
                size="lg"
                className="flex-[2]"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-canvas/40 border-t-canvas rounded-full animate-spin shrink-0" />
                    Submitting…
                  </>
                ) : '🚨 Submit Report'}
              </Button>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
