import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Don't show if user already dismissed
    if (localStorage.getItem('pwa_install_dismissed')) return

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShow(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem('pwa_install_dismissed', '1')
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', bottom: '24px', left: '50%',
      transform: 'translateX(-50%)', zIndex: 9999,
      background: '#fff', borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
      border: '1px solid #e2e8f0',
      padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: '16px',
      maxWidth: '420px', width: 'calc(100vw - 48px)',
      animation: 'slideUp 0.3s ease',
    }}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '22px' }}>
        🛡️
      </div>

      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px', margin: '0 0 2px' }}>
          Install Hetusafe
        </p>
        <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
          Add to home screen for quick access
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={handleDismiss}
          style={{ padding: '8px 12px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          style={{ padding: '8px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}
        >
          Install
        </button>
      </div>
    </div>
  )
}