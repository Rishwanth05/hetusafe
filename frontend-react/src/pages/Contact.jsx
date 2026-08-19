import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import NotificationCenter from '../components/NotificationCenter'
import { AppDrawer, BottomNav, Card, Button } from '../components/ui'

const INPUT_CLS = 'w-full bg-elevated border border-edge rounded-xl px-4 py-3 text-body text-light placeholder:text-muted focus:outline-none focus:border-accent transition-colors'
const LABEL_CLS = 'block text-caption text-muted font-semibold mb-1.5'

export default function Contact() {
  const { user } = useAuth()
  const navigate = useNavigate()

  /* ── All existing state (unchanged) ──────────────────────────────────── */
  const [form, setForm]     = useState({ name: user?.name || '', email: '', subject: '', message: '' })
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  /* ── Top-bar / drawer state ───────────────────────────────────────────── */
  const [menuOpen, setMenuOpen]       = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const navMenuRef = useRef(null)
  const drawerRef  = useRef(null)

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

  /* ── Form submission handler (unchanged) ─────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatus('')
    try {
      await client.post('/contact/send', form)
      setStatus('success')
      setForm(f => ({ ...f, subject: '', message: '' }))
    } catch {
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas">

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <header
        ref={navMenuRef}
        className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-xl border-b border-edge"
      >
        <div className="flex items-center justify-between h-14 px-4 max-w-2xl mx-auto">
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
            <span className="text-[17px] font-bold text-light tracking-tight">Contact Us</span>
          </div>

          <NotificationCenter externalCount={unreadCount} />
        </div>
      </header>

      <AppDrawer open={menuOpen} onClose={() => setMenuOpen(false)} drawerRef={drawerRef} />

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">

        {/* Page header */}
        <div className="text-center mt-10 mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/15 border border-accent/30 text-3xl mb-4" aria-hidden="true">
            💬
          </div>
          <h1 className="text-hero text-light mb-2">We're here to help</h1>
          <p className="text-body text-muted">Have a question or feedback? We'd love to hear from you.</p>
        </div>

        {/* Form card */}
        <Card className="p-6 mb-4">

          {/* Success banner */}
          {status === 'success' && (
            <div className="flex items-center gap-3 bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 text-body text-accent mb-6">
              ✅ Message sent! We'll get back to you soon.
            </div>
          )}

          {/* Error banner */}
          {status === 'error' && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-body text-danger mb-6">
              ❌ Something went wrong. Please try again.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name + Email row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Your Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  className={INPUT_CLS}
                />
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className={LABEL_CLS}>Subject</label>
              <input
                type="text"
                placeholder="What is this about?"
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                required
                className={INPUT_CLS}
              />
            </div>

            {/* Message */}
            <div>
              <label className={LABEL_CLS}>Message</label>
              <textarea
                placeholder="Tell us what's on your mind…"
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                required
                rows={6}
                className={`${INPUT_CLS} resize-y`}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Sending…' : '✉️ Send Message'}
            </Button>
          </form>
        </Card>

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '📧', title: 'Email Us',       desc: 'arishwanthreddy@gmail.com' },
            { icon: '⏱️', title: 'Response Time',  desc: 'Within 24 hours'          },
          ].map(({ icon, title, desc }) => (
            <Card key={title} className="p-5 text-center">
              <div className="text-3xl mb-2" aria-hidden="true">{icon}</div>
              <p className="text-body font-semibold text-light mb-1">{title}</p>
              <p className="text-caption text-muted">{desc}</p>
            </Card>
          ))}
        </div>

      </main>

      <BottomNav />
    </div>
  )
}
