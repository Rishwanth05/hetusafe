import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import client from '../api/client'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [form, setForm] = useState({ new_password: '', confirm_password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new link.')
    }
  }, [token])

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

  const inputStyle = {
    width: '100%', padding: '12px 16px',
    border: '1.5px solid #e2e8f0', borderRadius: '10px',
    fontSize: '15px', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', background: '#16a34a', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px' }}>🔑</div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>Reset Password</h1>
          <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>Enter your new password below</p>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>Password Reset!</h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Your password has been updated. Please log in with your new password.</p>
              <button
                onClick={() => navigate('/login')}
                style={{ width: '100%', padding: '12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
              >
                Go to Login
              </button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>New Password</label>
                <input
                  type="password"
                  placeholder="At least 8 characters, include a letter and number"
                  value={form.new_password}
                  onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#16a34a'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Repeat your new password"
                  value={form.confirm_password}
                  onChange={e => setForm(f => ({ ...f, confirm_password: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#16a34a'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '14px', marginBottom: '16px' }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !token}
                style={{ width: '100%', padding: '13px', background: loading ? '#86efac' : '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}