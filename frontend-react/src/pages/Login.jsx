import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import { Card, Button } from '../components/ui'

const INPUT_CLS = 'w-full bg-elevated border border-edge rounded-xl px-4 py-3 text-body text-light placeholder:text-muted focus:outline-none focus:border-accent transition-colors'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  /* ── All existing state (unchanged) ──────────────────────────────────── */
  const [step, setStep]                   = useState('credentials')
  const [email, setEmail]                 = useState('')
  const [password, setPassword]           = useState('')
  const [otp, setOtp]                     = useState('')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [showPassword, setShowPassword]   = useState(false)

  /* ── All existing handlers (unchanged) ──────────────────────────────── */
  const startCooldown = () => {
    setResendCooldown(60)
    const t = setInterval(() => {
      setResendCooldown(s => { if (s <= 1) { clearInterval(t); return 0 } return s - 1 })
    }, 1000)
  }

  const handleCredentials = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await client.post('/auth/login', { email, password })
      setStep('otp')
      startCooldown()
    } catch (err) {
      const data = err.response?.data
      if (data?.needsVerification) {
        setError('Please verify your email first. Check your inbox.')
      } else {
        setError(data?.message || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOTP = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await client.post('/auth/verify-login', { email, otp })
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
      await client.post('/auth/resend-otp', { email, purpose: 'login' })
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
            <span className="text-xl font-bold text-light tracking-tight">Hetusafe</span>
          </div>

          {/* ── Step: credentials ─────────────────────────────────────── */}
          {step === 'credentials' && (
            <>
              <h1 className="text-section font-bold text-light mb-1">Welcome back</h1>
              <p className="text-caption text-muted mb-6">Sign in to your account</p>

              <form onSubmit={handleCredentials} className="space-y-3">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className={INPUT_CLS}
                />
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className={`${INPUT_CLS} pr-10`}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 p-0 leading-none text-muted hover:text-light focus:outline-none cursor-pointer"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>

                {error && (
                  <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-caption text-danger">
                    {error}
                  </div>
                )}

                <Button type="submit" variant="primary" className="w-full mt-1" disabled={loading}>
                  {loading ? 'Sending OTP…' : 'Continue →'}
                </Button>
              </form>

              <p className="text-center text-caption text-muted mt-5">
                Don't have an account?{' '}
                <Link to="/signup" className="text-accent font-semibold hover:underline">
                  Sign up
                </Link>
              </p>
              <p className="text-center mt-2">
                <Link to="/forgot-password" className="text-caption text-muted hover:text-light transition-colors">
                  Forgot your password?
                </Link>
              </p>
            </>
          )}

          {/* ── Step: OTP ─────────────────────────────────────────────── */}
          {step === 'otp' && (
            <>
              <h1 className="text-section font-bold text-light mb-1">Check your email</h1>
              <p className="text-caption text-muted mb-6">
                We sent a 6-digit code to <strong className="text-light">{email}</strong>
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
                  {loading ? 'Verifying…' : 'Verify & Sign In'}
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

                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setOtp(''); setError('') }}
                  className="w-full text-caption text-muted hover:text-light transition-colors py-1 focus:outline-none"
                >
                  ← Change email
                </button>
              </form>
            </>
          )}

        </Card>
      </div>
    </div>
  )
}
