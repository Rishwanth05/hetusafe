import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import { Card, Button } from '../components/ui'

const INPUT_CLS = 'w-full bg-elevated border border-edge rounded-xl px-4 py-3 text-body text-light placeholder:text-muted focus:outline-none focus:border-accent transition-colors'

export default function ForgotPassword() {
  const navigate = useNavigate()

  /* ── All existing state (unchanged) ──────────────────────────────────── */
  const [email, setEmail]         = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  /* ── All existing handlers (unchanged) ──────────────────────────────── */
  const handleSubmit = async () => {
    if (!email.trim()) { setError('Please enter your email'); return }
    setLoading(true)
    setError('')
    try {
      await client.post('/auth/forgot-password', { email })
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <Card className="p-8">

          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-7">
            <svg width="32" height="32" viewBox="0 0 56 56" fill="none" aria-hidden="true">
              <rect width="56" height="56" rx="16" fill="#22C55E"/>
              <path d="M28 10L14 16V28C14 36.4 20.2 44.2 28 46C35.8 44.2 42 36.4 42 28V16L28 10Z" fill="white"/>
              <path d="M22 28L26 32L34 24" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-xl font-bold text-light tracking-tight">Project SAVE</span>
          </div>

          {/* ── Success state ─────────────────────────────────────────── */}
          {submitted ? (
            <div className="text-center">
              <div className="text-5xl mb-4" aria-hidden="true">📧</div>
              <h1 className="text-section font-bold text-light mb-2">Check your email</h1>
              <p className="text-caption text-muted mb-6 leading-relaxed">
                If <strong className="text-light">{email}</strong> is registered, a reset link has been sent. It expires in 15 minutes.
              </p>
              <Button variant="primary" className="w-full" onClick={() => navigate('/login')}>
                Back to Login
              </Button>
            </div>
          ) : (
            /* ── Form state ───────────────────────────────────────────── */
            <>
              <h1 className="text-section font-bold text-light mb-1">Forgot password?</h1>
              <p className="text-caption text-muted mb-6">
                Enter your email and we'll send a reset link
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-caption text-muted font-semibold mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    className={INPUT_CLS}
                  />
                </div>

                {error && (
                  <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-caption text-danger">
                    {error}
                  </div>
                )}

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </Button>

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => navigate('/login')}
                >
                  ← Back to Login
                </Button>
              </div>
            </>
          )}

        </Card>
      </div>
    </div>
  )
}
