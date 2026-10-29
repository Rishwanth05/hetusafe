import { render, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AuthProvider, useAuth } from '../context/AuthContext'

// ── Module mocks ─────────────────────────────────────────────────────────────

const mockRequestNotificationPermission = vi.fn()
vi.mock('../firebase', () => ({
  requestNotificationPermission: (...args) => mockRequestNotificationPermission(...args),
  messaging: {},
  onMessageListener: vi.fn(),
}))

const mockClientPost = vi.fn()
const mockInitializeAuth = vi.fn()
vi.mock('../api/client', () => ({
  default: { post: (...args) => mockClientPost(...args) },
  setAccessToken: vi.fn(),
  getAccessToken: vi.fn(),
  initializeAuth: (...args) => mockInitializeAuth(...args),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function TestConsumer({ onReady }) {
  const { authReady, user } = useAuth()
  if (authReady && onReady) onReady({ user })
  return null
}

function renderProvider(onReady) {
  return render(
    <AuthProvider>
      <TestConsumer onReady={onReady} />
    </AuthProvider>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuthContext — session restore FCM refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('refreshToken', 'stored-refresh-token')
    mockInitializeAuth.mockResolvedValue({ user: { id: 1, name: 'Test' }, accessToken: 'at' })
    mockClientPost.mockResolvedValue({ data: { message: 'ok' } })
    // jsdom does not implement Notification; set a plain stub so the typeof check works
    global.Notification = { permission: 'default' }
  })

  afterEach(() => {
    localStorage.clear()
    delete global.Notification
  })

  it('posts FCM token on restore when Notification.permission is granted', async () => {
    global.Notification = { permission: 'granted' }
    mockRequestNotificationPermission.mockResolvedValue('test-fcm-token')

    let resolved = false
    renderProvider(() => { resolved = true })

    await waitFor(() => expect(resolved).toBe(true))
    await waitFor(() => expect(mockClientPost).toHaveBeenCalledWith(
      '/auth/fcm-token',
      { token: 'test-fcm-token' }
    ))
  })

  it('skips FCM refresh when Notification.permission is default', async () => {
    global.Notification = { permission: 'default' }

    let resolved = false
    renderProvider(() => { resolved = true })

    await waitFor(() => expect(resolved).toBe(true))
    // Give any fire-and-forget microtasks a chance to run
    await new Promise((r) => setTimeout(r, 50))

    expect(mockRequestNotificationPermission).not.toHaveBeenCalled()
    expect(mockClientPost).not.toHaveBeenCalled()
  })

  it('skips FCM refresh when Notification.permission is denied', async () => {
    global.Notification = { permission: 'denied' }

    let resolved = false
    renderProvider(() => { resolved = true })

    await waitFor(() => expect(resolved).toBe(true))
    await new Promise((r) => setTimeout(r, 50))

    expect(mockRequestNotificationPermission).not.toHaveBeenCalled()
    expect(mockClientPost).not.toHaveBeenCalled()
  })

  it('authReady still fires even when FCM token refresh fails', async () => {
    global.Notification = { permission: 'granted' }
    mockRequestNotificationPermission.mockRejectedValue(new Error('FCM error'))

    let capturedAuthReady = false
    renderProvider(() => { capturedAuthReady = true })

    await waitFor(() => expect(capturedAuthReady).toBe(true), { timeout: 3000 })
  })

  it('authReady still fires when initializeAuth fails (no FCM attempt)', async () => {
    mockInitializeAuth.mockRejectedValue(new Error('refresh failed'))

    let capturedAuthReady = false
    renderProvider(() => { capturedAuthReady = true })

    await waitFor(() => expect(capturedAuthReady).toBe(true), { timeout: 3000 })
    expect(mockRequestNotificationPermission).not.toHaveBeenCalled()
  })
})
