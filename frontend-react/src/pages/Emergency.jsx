import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import NotificationCenter from '../components/NotificationCenter'
import { AppDrawer, BottomNav, Card, Button } from '../components/ui'

/* ══════════════════════════════════════════════════════════════════════════
   DATA — unchanged from original
══════════════════════════════════════════════════════════════════════════ */

const SAFETY_TIPS = [
  {
    type: 'Gas Leak', icon: '💨', color: '#ef4444',
    steps: ['Do NOT turn on/off any electrical switches', 'Evacuate everyone immediately', 'Leave doors open as you exit', 'Call gas emergency number from outside', 'Do not re-enter until cleared by authorities'],
  },
  {
    type: 'Flooding', icon: '🌊', color: '#3b82f6',
    steps: ['Move to higher ground immediately', 'Do not walk through moving water', 'Avoid driving through flooded roads', 'Disconnect electrical appliances', 'Call emergency services if trapped'],
  },
  {
    type: 'Fire', icon: '🔥', color: '#f97316',
    steps: ['Activate the nearest fire alarm', 'Call fire emergency number immediately', 'Evacuate using stairs, not elevators', 'Stay low to avoid smoke inhalation', 'Meet at designated assembly point'],
  },
  {
    type: 'Fallen Tree / Road Damage', icon: '🌳', color: '#22c55e',
    steps: ['Do not attempt to move large debris', 'Set up warning signals if safe', 'Report via Hetusafe immediately', 'Reroute traffic if possible', 'Call local municipality'],
  },
  {
    type: 'Exposed Wire', icon: '⚡', color: '#f59e0b',
    steps: ['Stay at least 30 feet away', 'Do not touch with any object', 'Warn others to keep clear', 'Call electric company and emergency services', 'Never drive over downed power lines'],
  },
  {
    type: 'Pothole / Road Hazard', icon: '🚧', color: '#a78bfa',
    steps: ['Slow down and navigate carefully', 'Turn on hazard lights if stopping', 'Report via Hetusafe', 'Call local road maintenance', 'Document with photo if safe'],
  },
]

const EMERGENCY_BY_COUNTRY = {
  IN: {
    name: 'India', flag: '🇮🇳',
    numbers: [
      { label: 'Police',              number: '100',   icon: '👮', color: '#ef4444' },
      { label: 'Fire',                number: '101',   icon: '🔥', color: '#f97316' },
      { label: 'Ambulance',           number: '102',   icon: '🚑', color: '#3b82f6' },
      { label: 'Disaster Management', number: '108',   icon: '🚨', color: '#a78bfa' },
      { label: 'Women Helpline',      number: '1091',  icon: '👩', color: '#ec4899' },
      { label: 'Child Helpline',      number: '1098',  icon: '👶', color: '#22c55e' },
    ],
  },
  US: {
    name: 'United States', flag: '🇺🇸',
    numbers: [
      { label: 'Police / Fire / Medical', number: '911',            icon: '🚨', color: '#ef4444' },
      { label: 'Non-Emergency Police',    number: '311',            icon: '👮', color: '#3b82f6' },
      { label: 'Poison Control',          number: '1-800-222-1222', icon: '☠️', color: '#a78bfa' },
      { label: 'Gas Emergency',           number: '1-800-427-2200', icon: '💨', color: '#f97316' },
      { label: 'Red Cross Disaster',      number: '1-800-733-2767', icon: '🏥', color: '#ef4444' },
      { label: 'Electric Emergency',      number: '1-800-375-7117', icon: '⚡', color: '#f59e0b' },
    ],
  },
  GB: {
    name: 'United Kingdom', flag: '🇬🇧',
    numbers: [
      { label: 'Emergency Services',   number: '999',           icon: '🚨', color: '#ef4444' },
      { label: 'Non-Emergency Police', number: '101',           icon: '👮', color: '#3b82f6' },
      { label: 'NHS Non-Emergency',    number: '111',           icon: '🏥', color: '#22c55e' },
      { label: 'Gas Emergency',        number: '0800 111 999',  icon: '💨', color: '#f97316' },
      { label: 'Electric Emergency',   number: '105',           icon: '⚡', color: '#f59e0b' },
      { label: 'Crimestoppers',        number: '0800 555 111',  icon: '🔍', color: '#a78bfa' },
    ],
  },
  AU: {
    name: 'Australia', flag: '🇦🇺',
    numbers: [
      { label: 'Emergency Services',     number: '000',          icon: '🚨', color: '#ef4444' },
      { label: 'Police Non-Emergency',   number: '131 444',      icon: '👮', color: '#3b82f6' },
      { label: 'Nurse On Call',          number: '1300 60 60 24',icon: '🏥', color: '#22c55e' },
      { label: 'SES Emergency',          number: '132 500',      icon: '🆘', color: '#f97316' },
      { label: 'Poisons Info',           number: '13 11 26',     icon: '☠️', color: '#a78bfa' },
      { label: 'Lifeline',               number: '13 11 14',     icon: '💙', color: '#38bdf8' },
    ],
  },
  TH: {
    name: 'Thailand', flag: '🇹🇭',
    numbers: [
      { label: 'Emergency',      number: '191',  icon: '🚨', color: '#ef4444' },
      { label: 'Fire',           number: '199',  icon: '🔥', color: '#f97316' },
      { label: 'Ambulance',      number: '1669', icon: '🚑', color: '#3b82f6' },
      { label: 'Tourist Police', number: '1155', icon: '👮', color: '#22c55e' },
      { label: 'Electricity',    number: '1129', icon: '⚡', color: '#f59e0b' },
      { label: 'Highway Police', number: '1193', icon: '🚗', color: '#a78bfa' },
    ],
  },
  CA: {
    name: 'Canada', flag: '🇨🇦',
    numbers: [
      { label: 'Emergency Services',   number: '911',            icon: '🚨', color: '#ef4444' },
      { label: 'Non-Emergency Police', number: '311',            icon: '👮', color: '#3b82f6' },
      { label: 'Poison Control',       number: '1-800-268-9017', icon: '☠️', color: '#a78bfa' },
      { label: 'Crisis Hotline',       number: '1-833-456-4566', icon: '💙', color: '#38bdf8' },
      { label: 'Gas Emergency',        number: '1-800-400-2255', icon: '💨', color: '#f97316' },
      { label: 'Red Cross',            number: '1-800-418-1111', icon: '🏥', color: '#ef4444' },
    ],
  },
  DE: {
    name: 'Germany', flag: '🇩🇪',
    numbers: [
      { label: 'Police',            number: '110',           icon: '👮', color: '#3b82f6' },
      { label: 'Fire / Ambulance',  number: '112',           icon: '🚨', color: '#ef4444' },
      { label: 'Medical On-Call',   number: '116 117',       icon: '🏥', color: '#22c55e' },
      { label: 'Poison Control',    number: '030 19240',     icon: '☠️', color: '#a78bfa' },
      { label: 'Gas Emergency',     number: '0800 0100 100', icon: '💨', color: '#f97316' },
      { label: 'Electric Emergency',number: '0800 3629477',  icon: '⚡', color: '#f59e0b' },
    ],
  },
  DEFAULT: {
    name: 'International', flag: '🌍',
    numbers: [
      { label: 'Global Emergency (GSM)', number: '112',              icon: '🚨', color: '#ef4444' },
      { label: 'International SOS',      number: '+1-215-942-8226',  icon: '🆘', color: '#f97316' },
      { label: 'WHO Emergency',          number: '+41-22-791-2111',  icon: '🏥', color: '#3b82f6' },
      { label: 'Red Cross',              number: '+41-22-730-3600',  icon: '➕', color: '#ef4444' },
      { label: 'UNHCR Emergency',        number: '+41-22-739-8111',  icon: '🌐', color: '#a78bfa' },
      { label: 'Interpol',               number: '+33-4-7244-7444',  icon: '👮', color: '#38bdf8' },
    ],
  },
}

/* ══════════════════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════════════════ */

export default function Emergency() {
  const navigate = useNavigate()

  /* ── All existing state (unchanged) ──────────────────────────────────── */
  const [contacts, setContacts]               = useState([])
  const [showAddContact, setShowAddContact]   = useState(false)
  const [newContact, setNewContact]           = useState({ name: '', phone: '', relation: '' })
  const [expandedTip, setExpandedTip]         = useState(null)
  const [sosActive, setSosActive]             = useState(false)
  const [locationSearch, setLocationSearch]   = useState('')
  const [locationSearching, setLocationSearching] = useState(false)
  const [locationError, setLocationError]     = useState('')
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [detecting, setDetecting]             = useState(true)

  /* ── Top-bar / drawer state ───────────────────────────────────────────── */
  const [menuOpen, setMenuOpen]     = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const navMenuRef = useRef(null)
  const drawerRef  = useRef(null)

  /* ── All existing useEffects (unchanged) ─────────────────────────────── */
  useEffect(() => {
    client.get('/auth/emergency-contacts')
      .then(({ data }) => setContacts(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`)
          const data = await res.json()
          const code = data.address?.country_code?.toUpperCase()
          setSelectedCountry(EMERGENCY_BY_COUNTRY[code] || { ...EMERGENCY_BY_COUNTRY.DEFAULT, name: data.address?.country || 'Your Region' })
        } catch {
          setSelectedCountry(EMERGENCY_BY_COUNTRY.DEFAULT)
        } finally {
          setDetecting(false)
        }
      },
      () => { setSelectedCountry(EMERGENCY_BY_COUNTRY.DEFAULT); setDetecting(false) }
    )
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const close = (e) => {
      if (!navMenuRef.current?.contains(e.target) && !drawerRef.current?.contains(e.target))
        setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  useEffect(() => {
    const fetchUnread = async () => {
      try { setUnreadCount((await client.get('/notifications/unread-count')).data.count) } catch {}
    }
    fetchUnread()
    const id = setInterval(fetchUnread, 20000)
    return () => clearInterval(id)
  }, [])

  /* ── All existing handlers (unchanged) ──────────────────────────────── */
  const handleLocationSearch = async () => {
    if (!locationSearch.trim()) return
    setLocationSearching(true)
    setLocationError('')
    try {
      const res    = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationSearch)}&format=json&limit=1`)
      const data   = await res.json()
      if (!data.length) { setLocationError('Location not found'); setLocationSearching(false); return }
      const revRes  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${data[0].lat}&lon=${data[0].lon}&format=json`)
      const revData = await revRes.json()
      const code    = revData.address?.country_code?.toUpperCase()
      setSelectedCountry(EMERGENCY_BY_COUNTRY[code] || { ...EMERGENCY_BY_COUNTRY.DEFAULT, name: revData.address?.country || locationSearch, flag: '🌍' })
    } catch {
      setLocationError('Failed to find location. Try again.')
    } finally {
      setLocationSearching(false)
    }
  }

  const handleRedetect = () => {
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`)
          const data = await res.json()
          const code = data.address?.country_code?.toUpperCase()
          setSelectedCountry(EMERGENCY_BY_COUNTRY[code] || { ...EMERGENCY_BY_COUNTRY.DEFAULT, name: data.address?.country || 'Your Region' })
        } catch {
          setSelectedCountry(EMERGENCY_BY_COUNTRY.DEFAULT)
        } finally { setDetecting(false) }
      },
      () => { setSelectedCountry(EMERGENCY_BY_COUNTRY.DEFAULT); setDetecting(false) }
    )
  }

  const saveContact = () => {
    if (!newContact.name || !newContact.phone) return
    const code = (newContact.countryCode || '+1').replace('-CA', '')
    const fullPhone = `${code}${newContact.phone}`
    const contactToSave = { ...newContact, phone: fullPhone, id: Date.now() }
    delete contactToSave.countryCode
    const updated = [...contacts, contactToSave]
    setContacts(updated)
    client.put('/auth/emergency-contacts', { contacts: updated }).catch(() => {})
    setNewContact({ name: '', phone: '', relation: '', countryCode: '+1' })
    setShowAddContact(false)
  }

  const deleteContact = (id) => {
    const updated = contacts.filter(c => c.id !== id)
    setContacts(updated)
    client.put('/auth/emergency-contacts', { contacts: updated }).catch(() => {})
  }

  /* ── Derived values (unchanged) ─────────────────────────────────────── */
  const emergencyNumbers = selectedCountry?.numbers || EMERGENCY_BY_COUNTRY.DEFAULT.numbers
  const sosNumber        = emergencyNumbers[0]?.number || '911'

  /* ── Shared dark input class ─────────────────────────────────────────── */
  const INPUT_CLS = 'w-full bg-canvas border border-edge rounded-xl px-4 py-3 text-body text-light placeholder:text-muted focus:outline-none focus:border-danger transition-colors'
  const LABEL_CLS = 'block text-caption text-muted font-semibold mb-1.5'

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-canvas">

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <header
        ref={navMenuRef}
        className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-xl border-b border-edge"
      >
        <div className="flex items-center justify-between h-14 px-4 max-w-4xl mx-auto">
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted hover:text-light hover:bg-elevated transition-colors shrink-0"
          >
            {menuOpen
              ? <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              : <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            }
          </button>

          <div className="flex items-center gap-2">
            <svg width="26" height="26" viewBox="0 0 56 56" fill="none" aria-hidden="true">
              <rect width="56" height="56" rx="16" fill="#22C55E"/>
              <path d="M28 10L14 16V28C14 36.4 20.2 44.2 28 46C35.8 44.2 42 36.4 42 28V16L28 10Z" fill="white"/>
              <path d="M22 28L26 32L34 24" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[17px] font-bold text-light tracking-tight">Emergency</span>
          </div>

          <NotificationCenter externalCount={unreadCount} />
        </div>
      </header>

      <AppDrawer open={menuOpen} onClose={() => setMenuOpen(false)} drawerRef={drawerRef} />

      {/* ── SOS hero ──────────────────────────────────────────────────── */}
      <div className="bg-danger/5 border-b border-danger/20 text-center px-4 py-10">
        <div className="text-5xl mb-3" aria-hidden="true">🚨</div>
        <h1 className="text-hero text-light mb-2">Emergency Center</h1>
        <p className="text-body text-muted mb-8">
          {detecting
            ? 'Detecting your location…'
            : `Showing numbers for ${selectedCountry?.flag} ${selectedCountry?.name}`}
        </p>

        {/* SOS button — danger-red, prominent */}
        <button
          onClick={() => {
            setSosActive(true)
            setTimeout(() => setSosActive(false), 3000)
            window.location.href = `tel:${sosNumber}`
          }}
          className={`inline-flex items-center gap-3 rounded-full px-10 py-4 text-xl font-black tracking-wider border-2 transition-all active:scale-95 ${
            sosActive
              ? 'bg-canvas text-danger border-danger'
              : 'bg-danger text-canvas border-danger/50'
          }`}
          style={{ boxShadow: sosActive ? 'none' : '0 0 32px rgba(239,68,68,0.45), 0 0 8px rgba(239,68,68,0.25)' }}
        >
          {sosActive ? `📞 Calling ${sosNumber}…` : `🆘 SOS — Call ${sosNumber}`}
        </button>
        <p className="text-caption text-muted mt-3">Tap to call local emergency services</p>
      </div>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-[calc(4rem+env(safe-area-inset-bottom))] space-y-8">

        {/* ── Location search ─────────────────────────────────────────── */}
        <Card className="p-5">
          <p className="text-body font-bold text-light mb-1">📍 Change Location</p>
          <p className="text-caption text-muted mb-4">
            Search any city or country to see their local emergency numbers
          </p>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <input
              type="text"
              placeholder="e.g. Mumbai, Thailand, London, Sydney…"
              value={locationSearch}
              onChange={e => setLocationSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLocationSearch()}
              className={`${INPUT_CLS} flex-1`}
            />
            <button
              onClick={handleLocationSearch}
              disabled={locationSearching}
              className="px-4 py-3 bg-danger text-canvas rounded-xl text-body font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity whitespace-nowrap focus:outline-none shrink-0"
            >
              {locationSearching ? 'Searching…' : '🔍 Search'}
            </button>
            <button
              onClick={handleRedetect}
              className="px-4 py-3 bg-accent/10 text-accent border border-accent/30 rounded-xl text-body font-semibold hover:bg-accent/20 transition-colors whitespace-nowrap focus:outline-none shrink-0"
            >
              📡 My Location
            </button>
          </div>
          {locationError && (
            <p className="text-caption text-danger mt-2">{locationError}</p>
          )}

          {/* Quick country pills */}
          <div className="flex gap-2 flex-wrap mt-4">
            {Object.entries(EMERGENCY_BY_COUNTRY).filter(([k]) => k !== 'DEFAULT').map(([code, c]) => {
              const isActive = selectedCountry?.name === c.name
              return (
                <button
                  key={code}
                  onClick={() => setSelectedCountry(c)}
                  className={`px-3 py-1.5 rounded-full border text-caption font-medium transition-all focus:outline-none ${
                    isActive
                      ? 'bg-danger/10 border-danger text-danger font-semibold'
                      : 'bg-elevated border-edge text-muted hover:border-danger/40 hover:text-light'
                  }`}
                >
                  {c.flag} {c.name}
                </button>
              )
            })}
          </div>
        </Card>

        {/* ── Emergency Numbers ────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-section font-bold text-light">📞 Emergency Numbers</h2>
            {selectedCountry && (
              <span className="text-caption font-semibold text-danger bg-danger/10 border border-danger/20 px-2.5 py-0.5 rounded-full">
                {selectedCountry.flag} {selectedCountry.name}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {emergencyNumbers.map(e => (
              <a key={e.label} href={`tel:${e.number}`} className="block no-underline group">
                <Card className="p-4 flex items-center gap-4 hover:border-edge/60 transition-all group-hover:-translate-y-0.5">
                  {/* Icon badge */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: `${e.color}18`, border: `1px solid ${e.color}35` }}
                    aria-hidden="true"
                  >
                    {e.icon}
                  </div>
                  {/* Label + number */}
                  <div className="flex-1 min-w-0">
                    <p className="text-caption text-muted mb-0.5 truncate">{e.label}</p>
                    <p className="text-xl font-bold truncate" style={{ color: e.color }}>{e.number}</p>
                  </div>
                  {/* Call indicator */}
                  <span className="text-muted text-lg shrink-0" aria-hidden="true">📞</span>
                </Card>
              </a>
            ))}
          </div>
        </section>

        {/* ── Personal Emergency Contacts ─────────────────────────────── */}
        {/* NOTE: same data source as Profile → Emergency Contacts tab    */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-section font-bold text-light">👥 My Emergency Contacts</h2>
              <p className="text-caption text-muted mt-0.5">Synced with your Profile contacts</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowAddContact(true)}>
              + Add
            </Button>
          </div>

          {/* Add contact form */}
          {showAddContact && (
            <Card className="p-4 border-accent/40 mb-4">
              <h3 className="text-body font-bold text-light mb-4">Add Emergency Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {/* Name */}
                <div>
                  <label className={LABEL_CLS}>Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Mom"
                    value={newContact.name}
                    onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))}
                    className={INPUT_CLS}
                  />
                </div>

                {/* Phone with country code */}
                <div>
                  <label className={LABEL_CLS}>Phone Number</label>
                  <div className="flex gap-2">
                    <select
                      value={newContact.countryCode || '+1'}
                      onChange={e => setNewContact(p => ({ ...p, countryCode: e.target.value }))}
                      className="bg-canvas border border-edge rounded-xl px-2 py-3 text-body text-light focus:outline-none focus:border-accent min-w-[90px]"
                    >
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+61">🇦🇺 +61</option>
                      <option value="+1-CA">🇨🇦 +1</option>
                      <option value="+49">🇩🇪 +49</option>
                      <option value="+66">🇹🇭 +66</option>
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+65">🇸🇬 +65</option>
                      <option value="+81">🇯🇵 +81</option>
                      <option value="+86">🇨🇳 +86</option>
                    </select>
                    <input
                      type="tel"
                      placeholder="234 567 8900"
                      value={newContact.phone}
                      onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))}
                      className={`${INPUT_CLS} flex-1`}
                    />
                  </div>
                </div>

                {/* Relation */}
                <div>
                  <label className={LABEL_CLS}>Relation</label>
                  <input
                    type="text"
                    placeholder="e.g. Mother, Doctor"
                    value={newContact.relation}
                    onChange={e => setNewContact(p => ({ ...p, relation: e.target.value }))}
                    className={INPUT_CLS}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowAddContact(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={saveContact}>Save Contact</Button>
              </div>
            </Card>
          )}

          {/* Empty state */}
          {contacts.length === 0 && !showAddContact ? (
            <Card className="p-10 text-center">
              <div className="text-4xl mb-3" aria-hidden="true">👥</div>
              <p className="text-body font-semibold text-light mb-1">No emergency contacts yet</p>
              <p className="text-caption text-muted">Add people to contact in case of emergency</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {contacts.map(c => (
                <Card key={c.id} className="p-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-xl shrink-0" aria-hidden="true">
                    👤
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body text-light font-bold truncate">{c.name}</p>
                    <p className="text-caption text-accent font-semibold">{c.phone}</p>
                    {c.relation && <p className="text-caption text-muted">{c.relation}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <a
                      href={`tel:${c.phone}`}
                      className="text-caption font-semibold text-canvas bg-accent px-3 py-1.5 rounded-lg text-center hover:opacity-90 transition-opacity"
                    >
                      📞 Call
                    </a>
                    <button
                      onClick={() => deleteContact(c.id)}
                      className="text-caption font-semibold text-danger bg-danger/10 border border-danger/30 px-3 py-1.5 rounded-lg hover:bg-danger/20 transition-colors focus:outline-none"
                    >
                      Remove
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ── Safety Manual ────────────────────────────────────────────── */}
        <section>
          <h2 className="text-section font-bold text-light mb-1">📖 Safety Manual</h2>
          <p className="text-caption text-muted mb-4">What to do in each type of hazard situation</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SAFETY_TIPS.map((tip, i) => {
              const isOpen = expandedTip === i
              return (
                <div
                  key={tip.type}
                  className="rounded-2xl overflow-hidden border transition-all"
                  style={{ borderColor: isOpen ? `${tip.color}50` : '#2A332E', background: '#131A17' }}
                >
                  {/* Header row */}
                  <button
                    onClick={() => setExpandedTip(isOpen ? null : i)}
                    className="w-full flex items-center gap-3 p-4 text-left focus:outline-none transition-colors"
                    style={{ background: isOpen ? `${tip.color}0d` : 'transparent' }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ background: `${tip.color}18`, border: `1px solid ${tip.color}35` }}
                      aria-hidden="true"
                    >
                      {tip.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body text-light font-bold truncate">{tip.type}</p>
                      <p className="text-caption text-muted">{tip.steps.length} safety steps</p>
                    </div>
                    <span
                      className="text-muted text-lg shrink-0 transition-transform duration-200"
                      style={{ display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      aria-hidden="true"
                    >
                      ↓
                    </span>
                  </button>

                  {/* Expanded steps */}
                  {isOpen && (
                    <div className="px-4 pb-4">
                      <div className="h-px mb-4" style={{ background: `${tip.color}25` }} />
                      <div className="space-y-3">
                        {tip.steps.map((step, si) => (
                          <div key={si} className="flex gap-3 items-start">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-caption font-bold shrink-0 mt-0.5"
                              style={{ background: `${tip.color}18`, border: `1.5px solid ${tip.color}`, color: tip.color }}
                            >
                              {si + 1}
                            </div>
                            <p className="text-body text-light leading-relaxed">{step}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => navigate('/report')}
                        className="mt-4 w-full py-2.5 rounded-xl text-body font-semibold transition-colors focus:outline-none"
                        style={{ background: `${tip.color}15`, color: tip.color, border: `1.5px solid ${tip.color}40` }}
                      >
                        🚨 Report this hazard →
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

      </main>

      <BottomNav />
    </div>
  )
}
