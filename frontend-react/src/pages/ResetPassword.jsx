import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import client from '../api/client'
import { Card, Button } from '../components/ui'

const INPUT_CLS = 'w-full bg-elevated border border-edge rounded-xl px-4 py-3 text-body text-light placeholder:text-muted focus:outline-none focus:border-accent transition-colors'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  /* ── All existing state (unchanged) ──────────────────────────────────── */
  const [form, setForm]       = useState({ new_password: '', confirm_password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)

  /* ── All existing effects (unchanged) ────────────────────────────────── */
  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new link.')
    }
  }, [token])

  /* ── All existing handlers (unchanged) ──────────────────────────────── */
  const handleSubmit = async () => {
    if (!form.new_password || !form.confirm_password) { setError('Both fields required'); return }
    if (form.new_password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (!/[a-zA-Z]/.test(form.new_password)) { setError('Password must contain at least one letter'); return }
    if (!/[0-9]/.test(form.new_password)) { setError('Password must contain at least one number'); return }
    if (form.new_password !== form.confirm_password) { setError('Passwords do not match'); return }
    setLoading(true)
    setError('')
    try {
      await client.post('/auth/reset-password', { token, new_password: form.new_password })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Please try again.')
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
          {success ? (
            <div className="text-center">
              <div className="text-5xl mb-4" aria-hidden="true">✅</div>
              <h1 className="text-section font-bold text-light mb-2">Password reset!</h1>
              <p className="text-caption text-muted mb-6 leading-relaxed">
                Your password has been updated. Please log in with your new password.
              </p>
              <Button variant="primary" className="w-full" onClick={() => navigate('/login')}>
                Go to Login
              </Button>
            </div>
          ) : (
            /* ── Form state ───────────────────────────────────────────── */
            <>
              <h1 className="text-section font-bold text-light mb-1">Reset password</h1>
              <p className="text-caption text-muted mb-6">Enter your new password below</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-caption text-muted font-semibold mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="At least 8 characters, include a letter and number"
                    value={form.new_password}
                    onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
                    className={INPUT_CLS}
                  />
                </div>

                <div>
                  <label className="block text-caption text-muted font-semibold mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Repeat your new password"
                    value={form.confirm_password}
                    onChange={e => setForm(f => ({ ...f, confirm_password: e.target.value }))}
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
                  disabled={loading || !token}
                >
                  {loading ? 'Resetting…' : 'Reset Password'}
                </Button>
              </div>
            </>
          )}

        </Card>
      </div>
    </div>
  )
}
