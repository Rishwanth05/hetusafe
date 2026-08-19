/**
 * AppDrawer — shared authenticated side-drawer used by every page that has a top bar.
 *
 * Props:
 *   open      — controlled visibility (boolean)
 *   onClose   — called on backdrop click or item selection
 *   drawerRef — forwarded to the panel div so the parent's outside-click useEffect
 *               can distinguish clicks inside the drawer from clicks in open space
 *
 * Owns its own useAuth / useNavigate so callers don't need to thread those down.
 *
 * TODO: the top bar's hamburger button and its navMenuRef should also be extracted
 * here (or into a shared AppHeader component) so this component is fully standalone.
 * Deferred to avoid touching page-level header markup across all pages in one go.
 */
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AppDrawer({ open, onClose, drawerRef }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const initials = (user?.name || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleLogout = () => {
    logout()
    navigate('/login')
    onClose()
  }

  const menuItems = [
    { label: 'Dashboard',     path: '/dashboard',   icon: '🏠' },
    { label: 'Report Hazard', path: '/report',      icon: '📝' },
    { label: 'View Map',      path: '/results',     icon: '🗺️', state: { view: 'map' } },
    { label: 'Emergency',     path: '/emergency',   icon: '🚨' },
    { label: 'Leaderboard',   path: '/leaderboard', icon: '🏆' },
    { label: 'Contact',       path: '/contact',     icon: '📞' },
    { label: 'Profile',       path: '/profile',     icon: '👤' },
    ...(user?.role === 'admin' ? [{ label: 'Admin', path: '/admin', icon: '⚙️' }] : []),
  ]

  if (!open) return null

  return (
    /*
      Starts at top-14 (56px — below the sticky header) so the header and its
      hamburger button remain fully visible and tappable while the drawer is open.
      z-[60] must be above BottomNav (z-50); the drawer never overlaps the header
      (z-40) vertically since it starts exactly where the header ends.
    */
    <div
      className="fixed inset-x-0 top-14 bottom-0 z-[60] flex"
      aria-label="Site navigation"
    >
      {/* Drawer panel
          overflow-y-auto is on the NAV, not here. Putting it on the panel with
          flex-1 on the nav causes browsers to let the nav grow to its content
          size, pushing logout below the scroll boundary and making it unreachable.
          The logout section must be a pinned flex footer, never inside the scroll. */}
      <div
        ref={drawerRef}
        className="w-72 bg-elevated border-r border-edge flex flex-col"
      >
        {/* User identity */}
        <div className="px-5 py-5 border-b border-edge">
          <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center text-accent font-bold text-sm mb-2">
            {initials}
          </div>
          <p className="text-body font-semibold text-light truncate">
            {user?.name || 'User'}
          </p>
          {user?.email && (
            <p className="text-caption text-muted truncate">{user.email}</p>
          )}
        </div>

        {/* Nav links — flex-1 + min-h-0 lets this shrink below its content size;
            overflow-y-auto makes it scroll when items exceed available space.
            Without min-h-0 the nav ignores overflow-y-auto and grows unconstrained. */}
        <nav className="flex-1 min-h-0 overflow-y-auto py-2">
          {menuItems.map(({ label, path, icon, state }) => (
            <button
              key={path}
              onClick={() => { navigate(path, { state }); onClose() }}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-body text-left text-muted hover:text-light hover:bg-surface transition-colors"
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-edge p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-body text-danger rounded-xl hover:bg-danger/10 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0" aria-hidden="true">
              <path
                d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Tap-to-close backdrop */}
      <div
        className="flex-1 bg-canvas/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
    </div>
  )
}
