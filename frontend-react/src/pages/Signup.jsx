import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import { Card, Button } from '../components/ui'

const INPUT_CLS = 'w-full bg-elevated border border-edge rounded-xl px-4 py-3 text-body text-light placeholder:text-muted focus:outline-none focus:border-accent transition-colors'

export default function Signup() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  /* ── All existing state (unchanged) ──────────────────────────────────── */
  const [step, setStep]                   = useState('details') // 'details' | 'otp'
  const [form, setForm]                   = useState({ name: '', email: '', password: '' })
  const [otp, setOtp]                     = useState('')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  /* ── All existing handlers (unchanged) ──────────────────────────────── */
  const startCooldown = () => {
    setResendCooldown(60)
    const t = setInterval(() => {
      setResendCooldown(s => { if (s <= 1) { clearInterval(t); return 0 } return s - 1 })
    }, 1000)
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (!/[a-zA-Z]/.test(form.password)) { setError('Password must contain at least one letter'); return }
    if (!/[0-9]/.test(form.password)) { setError('Password must contain at least one number'); return }
    setLoading(true)
    try {
      await client.post('/auth/signup', form)
      setStep('otp')
      startCooldown()
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  const handleOTP = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await client.post('/auth/verify-email', { email: form.email, otp })
      login(data.user, data.accessToken, data.refreshToken)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    try {
      await client.post('/auth/resend-otp', { email: form.email, purpose: 'verify' })
      startCooldown()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend')
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

          {/* ── Step: details ─────────────────────────────────────────── */}
          {step === 'details' && (
            <>
              <h1 className="text-section font-bold text-light mb-1">Create your account</h1>
              <p className="text-caption text-muted mb-6">Join your community safety network</p>

              <form onSubmit={handleSignup} className="space-y-3">
                <input
                  type="text"
                  placeholder="Full name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  className={INPUT_CLS}
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  className={INPUT_CLS}
                />
                <input
                  type="password"
                  placeholder="Password (min 8 chars, include a letter and number)"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  className={INPUT_CLS}
                />

                {error && (
                  <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-caption text-danger">
                    {error}
                  </div>
                )}

                <Button type="submit" variant="primary" className="w-full mt-1" disabled={loading}>
                  {loading ? 'Creating account…' : 'Create account →'}
                </Button>
              </form>

              <p className="text-center text-caption text-muted mt-5">
                Already have an account?{' '}
                <Link to="/login" className="text-accent font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}

          {/* ── Step: OTP ─────────────────────────────────────────────── */}
          {step === 'otp' && (
            <>
              <h1 className="text-section font-bold text-light mb-1">Verify your email</h1>
              <p className="text-caption text-muted mb-6">
                We sent a 6-digit code to <strong className="text-light">{form.email}</strong>
              </p>

              <form onSubmit={handleOTP} className="space-y-3">
                <input
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  className={INPUT_CLS}
                  style={{ textAlign: 'center', fontSize: '28px', letterSpacing: '8px', fontWeight: '700' }}
                />

                {error && (
                  <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-caption text-danger">
                    {error}
                  </div>
                )}

                <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                  {loading ? 'Verifying…' : 'Verify Email ✅'}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </Button>
              </form>
            </>
          )}

        </Card>
      </div>
    </div>
  )
}
