import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getToken } from 'firebase/messaging'

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}))

vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(() => ({})),
  getToken: vi.fn(),
  onMessage: vi.fn(),
  isSupported: vi.fn(() => Promise.resolve(true)),
}))

let register

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getToken).mockResolvedValue('mock-fcm-token')

  register = vi.fn()
  Object.defineProperty(global.navigator, 'serviceWorker', {
    configurable: true,
    value: { register },
  })
})

afterEach(() => {
  Object.defineProperty(global.navigator, 'serviceWorker', {
    configurable: true,
    value: undefined,
  })
})

describe('requestNotificationPermission', () => {
  it('registers the Firebase SW on /firebase-cloud-messaging-push-scope', async () => {
    const mockReg = { scope: '/firebase-cloud-messaging-push-scope' }
    register.mockResolvedValue(mockReg)

    const { requestNotificationPermission } = await import('../firebase')
    await requestNotificationPermission()

    expect(register).toHaveBeenCalledWith(
      '/firebase-messaging-sw.js',
      { scope: '/firebase-cloud-messaging-push-scope' }
    )
  })

  it('passes the registration returned by register() to getToken — not serviceWorker.ready', async () => {
    const mockReg = { scope: '/firebase-cloud-messaging-push-scope', mock: true }
    register.mockResolvedValue(mockReg)

    const { requestNotificationPermission } = await import('../firebase')
    await requestNotificationPermission()

    expect(getToken).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ serviceWorkerRegistration: mockReg })
    )
    // serviceWorker.ready is never consulted — no .ready property on our mock
    expect('ready' in navigator.serviceWorker).toBe(false)
  })

  it('returns null and does not throw when register() rejects', async () => {
    register.mockRejectedValue(new Error('registration failed'))

    const { requestNotificationPermission } = await import('../firebase')
    const result = await requestNotificationPermission()

    expect(result).toBeNull()
    expect(getToken).not.toHaveBeenCalled()
  })

  it('returns null when getToken() returns an empty string', async () => {
    register.mockResolvedValue({ scope: '/firebase-cloud-messaging-push-scope' })
    vi.mocked(getToken).mockResolvedValue('')

    const { requestNotificationPermission } = await import('../firebase')
    const result = await requestNotificationPermission()

    expect(result).toBeNull()
  })
})
