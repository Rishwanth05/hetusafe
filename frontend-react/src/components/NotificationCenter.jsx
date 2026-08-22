import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'

/*
 * NotificationCenter — bell icon with unread-count badge.
 * Clicking navigates to /alerts (the full-page notification view).
 *
 * Props (both optional):
 *   externalCount — unread count controlled by the parent page's polling useEffect;
 *                   if provided, this component skips its own polling.
 *   onMarkRead    — kept for API compatibility with existing callers; no-op now that
 *                   the dropdown panel is removed.
 */
export default function NotificationCenter({ unreadCount: externalCount, onMarkRead }) {
  const navigate = useNavigate()
  const [internalUnread, setInternalUnread] = useState(0)
  const [toast, setToast]                   = useState(null)
  const toastTimer = useRef(null)
  const prevUnread = useRef(0)

  const displayCount = externalCount !== undefined ? externalCount : internalUnread

  // Only poll internally when the parent isn't supplying externalCount
  useEffect(() => {
    fetchUnread()
    if (externalCount === undefined) {
      const interval = setInterval(fetchUnread, 20000)
      return () => {
        clearInterval(interval)
        if (toastTimer.current) clearTimeout(toastTimer.current)
      }
    }
  }, [])

  async function fetchUnread() {
    try {
      const { data } = await client.get('/notifications/unread-count')
      const count = data.count ?? 0
      // Show toast on new arrivals (standalone mode only)
      if (externalCount === undefined && count > prevUnread.current && prevUnread.current !== null) {
        const { data: notifs } = await client.get('/notifications')
        if (notifs.length > 0) showToast(notifs[0])
      }
      prevUnread.current = count
      setInternalUnread(count)
    } catch {}
  }

  function showToast(notification) {
    setToast(notification)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 6000)
  }

  return (
    <>
      {/* ── Amber alert toast (kept — fires on new hazards even without the dropdown) ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: '72px', left: '50%',
          transform: 'translateX(-50%)', zIndex: 99999,
          width: 'min(520px, 95vw)',
          background: toast.severity === 'critical' ? '#7f1d1d' : '#78350f',
          border: `2px solid ${toast.severity === 'critical' ? '#ef4444' : '#f59e0b'}`,
          borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          overflow: 'hidden', animation: 'ncToastIn 0.3s ease',
        }}>
          <div style={{
            background: toast.severity === 'critical' ? '#ef4444' : '#f59e0b',
            padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ fontSize: '16px' }}>{toast.severity === 'critical' ? '🚨' : '⚠️'}</span>
            <span style={{ color: '#fff', fontWeight: '800', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {toast.severity === 'critical' ? 'Emergency Alert' : 'Hazard Alert'} — Hetusafe
            </span>
            <button
              onClick={() => { clearTimeout(toastTimer.current); setToast(null) }}
              style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', padding: '2px 8px', fontSize: '14px', minHeight: '28px', minWidth: '28px' }}
            >✕</button>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '28px', flexShrink: 0 }}>
              {toast.severity === 'critical' ? '🔴' : toast.severity === 'high' ? '🟠' : '🟡'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: '800', fontSize: '15px', marginBottom: '4px' }}>{toast.title}</div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', lineHeight: '1.5' }}>{toast.message}</div>
            </div>
          </div>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.15)' }}>
            <div style={{ height: '100%', background: toast.severity === 'critical' ? '#ef4444' : '#f59e0b', animation: 'ncDrainBar 6s linear forwards' }} />
          </div>
        </div>
      )}

      {/* ── Bell button — navigates to /alerts ───────────────────────────── */}
      <button
        onClick={() => navigate('/alerts')}
        aria-label={`Notifications${displayCount > 0 ? `, ${displayCount} unread` : ''}`}
        className="relative w-10 h-10 rounded-xl flex items-center justify-center text-muted hover:text-light hover:bg-elevated transition-colors shrink-0"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {displayCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-danger text-canvas text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-canvas">
            {displayCount > 9 ? '9+' : displayCount}
          </span>
        )}
      </button>

      <style>{`
        @keyframes ncToastIn  { from{opacity:0;transform:translateX(-50%) translateY(-12px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes ncDrainBar { from{width:100%} to{width:0%} }
      `}</style>
    </>
  )
}
