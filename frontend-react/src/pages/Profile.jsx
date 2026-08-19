import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import NotificationCenter from '../components/NotificationCenter'
import { AppDrawer, BottomNav, Card, Button, PriorityBadge } from '../components/ui'

/* ── Shared dark input style (replaces old light inputStyle) ─────────────── */
const INPUT_CLS = 'w-full bg-canvas border border-edge rounded-xl px-4 py-3 text-body text-light placeholder:text-muted focus:outline-none focus:border-accent transition-colors'

const LABEL_CLS = 'block text-caption text-muted font-semibold mb-1.5 uppercase tracking-wider'

/* ── Tier colours (for the trust-score pill) ────────────────────────────── */
const TIER_COLOR = {
  Hero:     { bg: 'bg-yellow-500/15  border-yellow-500/30  text-yellow-400'  },
  Guardian: { bg: 'bg-accent/15      border-accent/30      text-accent'       },
  Trusted:  { bg: 'bg-blue-500/15    border-blue-500/30    text-blue-400'     },
  Reporter: { bg: 'bg-[#7c3aed]/15   border-[#7c3aed]/30   text-[#a78bfa]'   },
  Newcomer: { bg: 'bg-elevated       border-edge           text-muted'        },
}

export default function Profile() {
  const { user, login } = useAuth()
  const navigate = useNavigate()

  /* ── All existing state (unchanged) ──────────────────────────────────── */
  const [profile, setProfile] = useState(null)
  const [myReports, setMyReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameMsg, setNameMsg] = useState('')

  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')

  const [deleteStep, setDeleteStep] = useState(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteComment, setDeleteComment] = useState('')
  const [deleteOtp, setDeleteOtp] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleteMsg, setDeleteMsg] = useState('')

  const [contacts, setContacts] = useState([])
  const [showAddContact, setShowAddContact] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: '' })

  /* ── Top-bar / drawer state ───────────────────────────────────────────── */
  const [menuOpen, setMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const navMenuRef = useRef(null)
  const drawerRef  = useRef(null)

  /* ── All existing useEffects (unchanged) ─────────────────────────────── */
  useEffect(() => {
    client.get('/auth/emergency-contacts')
      .then(({ data }) => setContacts(data))
      .catch(() => {})

    Promise.all([
      client.get('/auth/me'),
      client.get('/auth/my-reports'),
    ]).then(([profileRes, reportsRes]) => {
      setProfile(profileRes.data)
      setMyReports(reportsRes.data)
      setNewName(profileRes.data.name)
    }).catch(console.error)
      .finally(() => setLoading(false))
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
  const handleUpdateName = async () => {
    if (!newName.trim()) return
    setNameLoading(true); setNameMsg('')
    try {
      const { data } = await client.put('/auth/update-name', { name: newName })
      const token = localStorage.getItem('token')
      login(data.user, token)
      setProfile(p => ({ ...p, name: data.user.name }))
      setNameMsg('✅ Name updated!')
      setEditingName(false)
    } catch (err) {
      setNameMsg('❌ ' + (err.response?.data?.message || 'Failed'))
    } finally {
      setNameLoading(false)
    }
  }

  const handleChangePassword = async () => {
    setPwError(''); setPwMsg('')
    if (!pwForm.old_password || !pwForm.new_password || !pwForm.confirm) { setPwError('All fields are required'); return }
    if (pwForm.new_password !== pwForm.confirm) { setPwError('New passwords do not match'); return }
    if (pwForm.new_password.length < 8) { setPwError('Password must be at least 8 characters'); return }
    if (!/[a-zA-Z]/.test(pwForm.new_password)) { setPwError('Password must contain at least one letter'); return }
    if (!/[0-9]/.test(pwForm.new_password)) { setPwError('Password must contain at least one number'); return }
    setPwLoading(true)
    try {
      await client.put('/auth/change-password', { old_password: pwForm.old_password, new_password: pwForm.new_password })
      setPwMsg('✅ Password changed successfully!')
      setPwForm({ old_password: '', new_password: '', confirm: '' })
    } catch (err) {
      setPwError('❌ ' + (err.response?.data?.message || 'Failed'))
    } finally {
      setPwLoading(false)
    }
  }

  const handleRequestDeleteOTP = async () => {
    setDeleteLoading(true); setDeleteError('')
    try {
      await client.post('/auth/request-delete')
      setDeleteStep('otp')
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to send code')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteOtp || deleteOtp.length !== 6) { setDeleteError('Enter the 6-digit code'); return }
    setDeleteLoading(true); setDeleteError('')
    try {
      await client.delete('/auth/delete-account', { data: { otp: deleteOtp, reason: deleteReason, comments: deleteComment || undefined } })
      localStorage.clear()
      window.location.href = '/login'
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Deletion failed')
      setDeleteLoading(false)
    }
  }

  const saveContact = () => {
    if (!newContact.name || !newContact.phone) return
    const updated = [...contacts, { ...newContact, id: Date.now() }]
    setContacts(updated)
    client.put('/auth/emergency-contacts', { contacts: updated }).catch(() => {})
    setNewContact({ name: '', phone: '', relation: '' })
    setShowAddContact(false)
  }

  const deleteContact = (id) => {
    const updated = contacts.filter(c => c.id !== id)
    setContacts(updated)
    client.put('/auth/emergency-contacts', { contacts: updated }).catch(() => {})
  }

  /* ── Derived values (unchanged) ─────────────────────────────────────── */
  const initials       = (profile?.name || user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const totalReports   = myReports.length
  const resolvedReports = myReports.filter(r => r.status === 'resolved').length
  const activeReports  = myReports.filter(r => r.status !== 'resolved').length
  const tierCls        = TIER_COLOR[profile?.badge_tier] || TIER_COLOR.Newcomer

  /* ── Loading state ───────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-edge border-t-accent rounded-full animate-spin" />
          <p className="text-body text-muted">Loading profile…</p>
        </div>
      </div>
    )
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-canvas">

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <header
        ref={navMenuRef}
        className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-xl border-b border-edge"
      >
        <div className="flex items-center justify-between h-14 px-4 max-w-3xl mx-auto">

          {/* Hamburger */}
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

          {/* Logo */}
          <div className="flex items-center gap-2">
            <svg width="26" height="26" viewBox="0 0 56 56" fill="none" aria-hidden="true">
              <rect width="56" height="56" rx="16" fill="#22C55E"/>
              <path d="M28 10L14 16V28C14 36.4 20.2 44.2 28 46C35.8 44.2 42 36.4 42 28V16L28 10Z" fill="white"/>
              <path d="M22 28L26 32L34 24" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[17px] font-bold text-light tracking-tight">My Profile</span>
          </div>

          {/* Notification bell */}
          <NotificationCenter externalCount={unreadCount} />
        </div>
      </header>

      {/* ── App drawer ────────────────────────────────────────────────── */}
      <AppDrawer open={menuOpen} onClose={() => setMenuOpen(false)} drawerRef={drawerRef} />

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">

        {/* ── Profile hero card ─────────────────────────────────────── */}
        <Card className="mt-6 mb-4 p-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-accent/15 border-2 border-accent/40 flex items-center justify-center text-2xl font-bold text-accent shrink-0 select-none">
              {initials}
            </div>
            {/* Info */}
            <div className="min-w-0 flex-1">
              <h1 className="text-section font-bold text-light truncate">{profile?.name}</h1>
              <p className="text-caption text-muted truncate mt-0.5">{profile?.email}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-caption text-muted">
                  Member since {new Date(profile?.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                {profile?.badge_tier && (
                  <span className={`text-caption font-semibold border px-2 py-0.5 rounded-full whitespace-nowrap ${tierCls.bg}`}>
                    ⭐ {profile.badge_tier}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* ── Stats grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total Reports', value: totalReports,    icon: '📋', cls: 'text-light'      },
            { label: 'Resolved',      value: resolvedReports, icon: '✅', cls: 'text-accent'     },
            { label: 'Active',        value: activeReports,   icon: '🔴', cls: 'text-danger'     },
            { label: 'Trust Score',   value: profile?.trust_score || 100, icon: '⭐', cls: 'text-[#a78bfa]' },
          ].map(({ label, value, icon, cls }) => (
            <Card key={label} className="p-4 text-center">
              <div className="text-2xl mb-1" aria-hidden="true">{icon}</div>
              <p className={`text-2xl font-bold ${cls}`}>{value}</p>
              <p className="text-caption text-muted mt-0.5">{label}</p>
            </Card>
          ))}
        </div>

        {/* ── Tab bar ───────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-surface border border-edge rounded-2xl p-1 mb-5 overflow-x-auto">
          {[
            { id: 'overview',  label: '👤 Overview'  },
            { id: 'reports',   label: '📋 Reports'   },
            { id: 'security',  label: '🔒 Security'  },
            { id: 'emergency', label: '🚨 Emergency' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 min-w-[72px] py-2 px-3 rounded-xl text-caption font-semibold transition-all whitespace-nowrap focus:outline-none ${
                activeTab === t.id
                  ? 'bg-elevated text-light shadow-sm'
                  : 'text-muted hover:text-light'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════
            OVERVIEW TAB
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <Card className="p-5 space-y-5">
            <h2 className="text-section font-bold text-light">Profile Information</h2>

            {/* Display Name */}
            <div>
              <label className={LABEL_CLS}>Display Name</label>
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUpdateName()}
                    className={`${INPUT_CLS} flex-1`}
                    autoFocus
                  />
                  <Button variant="primary" size="sm" onClick={handleUpdateName} disabled={nameLoading}>
                    {nameLoading ? 'Saving…' : 'Save'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => { setEditingName(false); setNewName(profile?.name) }}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-elevated border border-edge rounded-xl px-4 py-3">
                  <span className="text-body text-light font-medium">{profile?.name}</span>
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-caption text-accent font-semibold hover:underline focus:outline-none"
                  >
                    Edit ✏️
                  </button>
                </div>
              )}
              {nameMsg && (
                <p className={`text-caption mt-1.5 ${nameMsg.startsWith('✅') ? 'text-accent' : 'text-danger'}`}>
                  {nameMsg}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className={LABEL_CLS}>Email Address</label>
              <div className="flex items-center justify-between bg-elevated border border-edge rounded-xl px-4 py-3">
                <span className="text-body text-light">{profile?.email}</span>
                <span className="text-caption text-muted">Cannot be changed</span>
              </div>
            </div>

            {/* Role */}
            <div>
              <label className={LABEL_CLS}>Account Role</label>
              <div className="bg-elevated border border-edge rounded-xl px-4 py-3">
                <span className="text-caption font-semibold text-accent bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-full capitalize">
                  {profile?.role || 'user'}
                </span>
              </div>
            </div>

            {/* Member Since */}
            <div>
              <label className={LABEL_CLS}>Member Since</label>
              <div className="bg-elevated border border-edge rounded-xl px-4 py-3">
                <span className="text-body text-light">
                  {new Date(profile?.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Trust Score */}
            <div>
              <label className={LABEL_CLS}>Trust Score &amp; Badge</label>
              <div className="bg-[#7c3aed]/10 border border-[#7c3aed]/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-body font-bold text-[#a78bfa] bg-[#7c3aed]/20 border border-[#7c3aed]/30 px-3 py-1 rounded-full">
                    {profile?.badge_tier || 'Newcomer'}
                  </span>
                  <span className="text-xl font-bold text-[#a78bfa]">
                    {profile?.trust_score || 100} pts
                  </span>
                </div>
                <div className="h-2 bg-[#7c3aed]/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#7c3aed] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((profile?.trust_score || 100) / 10, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  {['Newcomer', 'Reporter', 'Trusted', 'Guardian', 'Hero'].map(t => (
                    <span
                      key={t}
                      className={`text-[10px] ${profile?.badge_tier === t ? 'text-[#a78bfa] font-bold' : 'text-muted'}`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <p className="text-caption text-muted mt-2.5">
                  +10 pts per report · +25 pts per resolution · −20 pts if rejected
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════
            MY REPORTS TAB
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'reports' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-section font-bold text-light">My Reports ({myReports.length})</h2>
              <Button variant="primary" size="sm" onClick={() => navigate('/report')}>+ New Report</Button>
            </div>

            {myReports.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="text-5xl mb-4" aria-hidden="true">📋</div>
                <p className="text-section font-semibold text-light mb-2">No reports yet</p>
                <p className="text-body text-muted mb-6">Start contributing to community safety</p>
                <Button variant="primary" onClick={() => navigate('/report')}>Report First Hazard</Button>
              </Card>
            ) : (
              myReports.map(r => {
                const isResolved = r.status === 'resolved'
                return (
                  <Card
                    key={r.id}
                    className={isResolved ? 'border-accent/30' : ''}
                  >
                    <div className="flex items-center gap-4 p-4">
                      {/* Thumbnail */}
                      {r.image_url
                        ? <img
                            src={r.image_url}
                            alt="hazard"
                            className="w-14 h-14 object-cover rounded-xl shrink-0"
                          />
                        : <div className="w-14 h-14 bg-elevated rounded-xl flex items-center justify-center text-2xl shrink-0" aria-hidden="true">
                            🚧
                          </div>
                      }

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <strong className="text-body text-light font-bold truncate">{r.hazard_type}</strong>
                          <PriorityBadge level={r.severity} />
                          {isResolved && (
                            <span className="text-caption font-semibold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
                              ✅ Resolved
                            </span>
                          )}
                        </div>
                        <p className="text-caption text-muted mb-1 leading-relaxed">
                          {r.description?.slice(0, 80)}{r.description?.length > 80 ? '…' : ''}
                        </p>
                        <p className="text-caption text-muted">
                          {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>

                      {/* Status pill */}
                      <span className={`text-caption font-semibold px-2.5 py-1 rounded-full border shrink-0 ${
                        isResolved
                          ? 'text-accent bg-accent/10 border-accent/20'
                          : 'text-warn bg-warn/10 border-warn/20'
                      }`}>
                        {isResolved ? 'Resolved' : 'Active'}
                      </span>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            SECURITY TAB
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'security' && (
          <div className="space-y-4">

            {/* Change password */}
            <Card className="p-5">
              <h2 className="text-section font-bold text-light mb-1">Change Password</h2>
              <p className="text-caption text-muted mb-5">
                At least 8 characters, one letter and one number.
              </p>

              <div className="space-y-4">
                {[
                  { label: 'Current Password',      key: 'old_password', placeholder: '••••••••' },
                  { label: 'New Password',           key: 'new_password', placeholder: 'Min 8 chars, include a letter and number' },
                  { label: 'Confirm New Password',   key: 'confirm',      placeholder: 'Repeat new password' },
                ].map(f => (
                  <div key={f.key}>
                    <label className={LABEL_CLS}>{f.label}</label>
                    <input
                      type="password"
                      placeholder={f.placeholder}
                      value={pwForm[f.key]}
                      onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className={INPUT_CLS}
                    />
                  </div>
                ))}
              </div>

              {pwError && (
                <div className="mt-4 bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-body text-danger">
                  {pwError}
                </div>
              )}
              {pwMsg && (
                <div className="mt-4 bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 text-body text-accent">
                  {pwMsg}
                </div>
              )}

              <Button
                variant="primary"
                className="w-full mt-5"
                onClick={handleChangePassword}
                disabled={pwLoading}
              >
                {pwLoading ? 'Changing…' : '🔒 Change Password'}
              </Button>
            </Card>

            {/* ── Danger zone — account deletion ──────────────────── */}
            <Card className="p-5 border-danger/30">
              <h3 className="text-section font-bold text-danger mb-1">⚠️ Delete Account</h3>
              <p className="text-caption text-muted mb-4">
                Permanently delete your account. Your reports will be anonymized and kept for community safety.
              </p>

              {!deleteStep && (
                <button
                  onClick={() => setDeleteStep('confirm')}
                  className="px-4 py-2.5 bg-danger/10 text-danger border border-danger/30 rounded-xl text-body font-semibold hover:bg-danger/20 transition-colors focus:outline-none"
                >
                  Delete My Account
                </button>
              )}

              {deleteStep === 'confirm' && (
                <div className="bg-danger/10 border border-danger/30 rounded-xl p-4">
                  <p className="text-body text-danger font-semibold mb-2">Are you sure? This cannot be undone.</p>
                  <p className="text-caption text-muted mb-4">Your reports will be anonymised and kept for community safety records.</p>
                  <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => setDeleteStep(null)}>Cancel</Button>
                    <button
                      onClick={() => setDeleteStep('reason')}
                      className="flex-1 py-2.5 bg-danger text-canvas rounded-xl text-body font-semibold hover:opacity-90 transition-opacity focus:outline-none"
                    >
                      Continue →
                    </button>
                  </div>
                </div>
              )}

              {deleteStep === 'reason' && (
                <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 space-y-4">
                  <div>
                    <p className="text-body text-danger font-semibold mb-1">Before you go, could you tell us why?</p>
                    <p className="text-caption text-muted">Completely optional — helps us improve.</p>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { value: 'no_longer_needed',      label: 'I no longer need the app'    },
                      { value: 'privacy_concerns',      label: 'Privacy concerns'             },
                      { value: 'too_many_notifications',label: 'Too many notifications'       },
                      { value: 'better_alternative',    label: 'Found a better alternative'  },
                      { value: 'technical_issues',      label: 'Technical issues'            },
                      { value: 'other',                 label: 'Other'                        },
                    ].map(opt => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-3 cursor-pointer text-body text-light"
                      >
                        <input
                          type="radio"
                          name="deleteReason"
                          value={opt.value}
                          checked={deleteReason === opt.value}
                          onChange={e => setDeleteReason(e.target.value)}
                          style={{ accentColor: '#EF4444', width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                  <div>
                    <label className="block text-caption text-muted font-semibold mb-1.5">
                      Additional comments <span className="font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={deleteComment}
                      onChange={e => setDeleteComment(e.target.value.slice(0, 500))}
                      placeholder="Tell us more…"
                      rows={3}
                      className="w-full bg-canvas border border-danger/30 rounded-xl px-4 py-3 text-body text-light placeholder:text-muted focus:outline-none focus:border-danger resize-y"
                    />
                    <p className="text-caption text-muted mt-1 text-right">{deleteComment.length}/500</p>
                  </div>
                  {deleteError && <p className="text-caption text-danger">{deleteError}</p>}
                  <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => { setDeleteStep('confirm'); setDeleteError('') }}>
                      ← Back
                    </Button>
                    <button
                      onClick={handleRequestDeleteOTP}
                      disabled={deleteLoading}
                      className="flex-1 py-2.5 bg-danger text-canvas rounded-xl text-body font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity focus:outline-none"
                    >
                      {deleteLoading ? 'Sending…' : 'Continue to verification'}
                    </button>
                  </div>
                </div>
              )}

              {deleteStep === 'otp' && (
                <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-body text-danger font-semibold">Enter the 6-digit code sent to your email</p>
                    <p className="text-caption text-muted">This is your final confirmation step.</p>
                  </div>
                  <input
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={deleteOtp}
                    onChange={e => setDeleteOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-canvas border border-danger/30 rounded-xl px-4 py-3 text-[22px] text-light text-center font-bold tracking-[8px] focus:outline-none focus:border-danger"
                  />
                  {deleteError && <p className="text-caption text-danger">{deleteError}</p>}
                  <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => { setDeleteStep(null); setDeleteOtp(''); setDeleteError('') }}>
                      Cancel
                    </Button>
                    <button
                      onClick={handleConfirmDelete}
                      disabled={deleteLoading}
                      className="flex-1 py-2.5 bg-danger text-canvas rounded-xl text-body font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity focus:outline-none"
                    >
                      {deleteLoading ? 'Deleting…' : 'Permanently Delete'}
                    </button>
                  </div>
                </div>
              )}

              {deleteMsg && <p className="text-caption text-danger mt-3">{deleteMsg}</p>}
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            EMERGENCY CONTACTS TAB
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'emergency' && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-section font-bold text-light">Emergency Contacts</h2>
                <p className="text-caption text-muted mt-1">Shared with the Emergency page</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="secondary" size="sm" onClick={() => navigate('/emergency')}>
                  🚨 Emergency Page
                </Button>
                <Button variant="primary" size="sm" onClick={() => setShowAddContact(true)}>
                  + Add
                </Button>
              </div>
            </div>

            {/* Add contact form */}
            {showAddContact && (
              <Card className="p-4 border-accent/40">
                <h3 className="text-body font-bold text-light mb-4">Add Emergency Contact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Full Name',     key: 'name',     type: 'text', placeholder: 'e.g. Mom'           },
                    { label: 'Phone Number',  key: 'phone',    type: 'tel',  placeholder: '+1 234 567 8900'     },
                    { label: 'Relation',      key: 'relation', type: 'text', placeholder: 'e.g. Mother'         },
                  ].map(f => (
                    <div key={f.key}>
                      <label className={LABEL_CLS}>{f.label}</label>
                      <input
                        type={f.type}
                        placeholder={f.placeholder}
                        value={newContact[f.key]}
                        onChange={e => setNewContact(p => ({ ...p, [f.key]: e.target.value }))}
                        className={INPUT_CLS}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowAddContact(false)}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={saveContact}>Save Contact</Button>
                </div>
              </Card>
            )}

            {/* Empty state */}
            {contacts.length === 0 && !showAddContact ? (
              <Card className="p-12 text-center">
                <div className="text-5xl mb-4" aria-hidden="true">👥</div>
                <p className="text-section font-semibold text-light mb-2">No emergency contacts yet</p>
                <p className="text-body text-muted mb-6">Add people to reach in case of emergency</p>
                <Button variant="primary" onClick={() => setShowAddContact(true)}>+ Add First Contact</Button>
              </Card>
            ) : (
              contacts.map(c => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-xl shrink-0" aria-hidden="true">
                      👤
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body text-light font-bold truncate">{c.name}</p>
                      <p className="text-caption text-accent font-semibold">{c.phone}</p>
                      {c.relation && <p className="text-caption text-muted">{c.relation}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <a
                        href={`tel:${c.phone}`}
                        className="text-caption font-semibold text-canvas bg-accent px-3 py-2 rounded-xl hover:opacity-90 transition-opacity"
                      >
                        📞 Call
                      </a>
                      <button
                        onClick={() => deleteContact(c.id)}
                        className="text-caption font-semibold text-danger bg-danger/10 border border-danger/30 px-3 py-2 rounded-xl hover:bg-danger/20 transition-colors focus:outline-none"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

      </main>

      <BottomNav />
    </div>
  )
}
