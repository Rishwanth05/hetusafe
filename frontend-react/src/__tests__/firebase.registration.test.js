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

// ── requestNotificationPermission ─────────────────────────────────────────────

describe('requestNotificationPermission', () => {
  it('registers the Firebase SW on /firebase-cloud-messaging-push-scope', async () => {
    // active: {} so waitForActiveWorker resolves immediately
    const mockReg = { active: {}, scope: '/firebase-cloud-messaging-push-scope' }
    register.mockResolvedValue(mockReg)

    const { requestNotificationPermission } = await import('../firebase')
    await requestNotificationPermission()

    expect(register).toHaveBeenCalledWith(
      '/firebase-messaging-sw.js',
      { scope: '/firebase-cloud-messaging-push-scope' }
    )
  })

  it('passes the registration returned by register() to getToken — not serviceWorker.ready', async () => {
    const mockReg = { active: {}, mockRegistration: true }
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
    register.mockResolvedValue({ active: {} })
    vi.mocked(getToken).mockResolvedValue('')

    const { requestNotificationPermission } = await import('../firebase')
    const result = await requestNotificationPermission()

    expect(result).toBeNull()
  })
})

// ── waitForActiveWorker ────────────────────────────────────────────────────────

describe('waitForActiveWorker', () => {
  it('resolves immediately when registration already has an active worker', async () => {
    const reg = { active: { state: 'activated' }, installing: null, waiting: null }

    const { waitForActiveWorker } = await import('../firebase')
    const result = await waitForActiveWorker(reg)

    expect(result).toBe(reg)
  })

  it('resolves once the installing worker fires statechange to activated', async () => {
    let stateChangeListener = null
    const worker = {
      state: 'installing',
      addEventListener: vi.fn((event, fn) => { stateChangeListener = fn }),
      removeEventListener: vi.fn(),
    }
    const reg = { active: null, installing: worker, waiting: null }

    const { waitForActiveWorker } = await import('../firebase')
    const promise = waitForActiveWorker(reg)

    // Simulate the worker finishing activation
    worker.state = 'activated'
    stateChangeListener()

    await expect(promise).resolves.toBe(reg)
    expect(worker.removeEventListener).toHaveBeenCalledWith('statechange', expect.any(Function))
  })

  it('rejects after the timeout when the worker never activates', async () => {
    vi.useFakeTimers()
    const worker = {
      state: 'installing',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    const reg = { active: null, installing: worker, waiting: null }

    const { waitForActiveWorker } = await import('../firebase')
    const promise = waitForActiveWorker(reg, 5000)

    vi.advanceTimersByTime(5001)

    await expect(promise).rejects.toThrow('timed out')
    vi.useRealTimers()
  })

  it('rejects immediately when there is no installing or waiting worker', async () => {
    const reg = { active: null, installing: null, waiting: null }

    const { waitForActiveWorker } = await import('../firebase')
    await expect(waitForActiveWorker(reg)).rejects.toThrow()
  })
})
