import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { useAutoLocation } from '../useAutoLocation'

const makeGeoError = (code) => {
  const err = { code }
  err.PERMISSION_DENIED = 1
  err.POSITION_UNAVAILABLE = 2
  err.TIMEOUT = 3
  return err
}

const mockGeolocation = (impl) => {
  Object.defineProperty(global.navigator, 'geolocation', {
    configurable: true,
    value: impl,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  Object.defineProperty(global.navigator, 'geolocation', {
    configurable: true,
    value: undefined,
  })
})

describe('useAutoLocation', () => {
  it('resolves to ip source when PERMISSION_DENIED and IP lookup succeeds', async () => {
    mockGeolocation({
      getCurrentPosition: vi.fn((_success, error) => {
        error(makeGeoError(1)) // PERMISSION_DENIED
      }),
    })

    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: () => Promise.resolve({ latitude: '30.0', longitude: '-90.0', city: 'New Orleans' }),
    })

    const { result } = renderHook(() => useAutoLocation())

    await waitFor(() => expect(result.current.locationSource).toBe('ip'), { timeout: 3000 })

    expect(result.current.detectedLocation).toMatchObject({
      lat: 30.0,
      lng: -90.0,
      label: 'New Orleans',
    })
  })

  it('resolves to unavailable when PERMISSION_DENIED and IP lookup fails', async () => {
    mockGeolocation({
      getCurrentPosition: vi.fn((_success, error) => {
        error(makeGeoError(1)) // PERMISSION_DENIED
      }),
    })

    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useAutoLocation())

    await waitFor(() => expect(result.current.locationSource).toBe('unavailable'), { timeout: 3000 })

    expect(result.current.detectedLocation).toBeNull()
  })

  it('falls back to IP after the 5 s permTimer when the prompt never resolves', async () => {
    // getCurrentPosition never calls success or error — simulates the browser modal sitting idle
    mockGeolocation({ getCurrentPosition: vi.fn() })

    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: () => Promise.resolve({ latitude: '40.7', longitude: '-74.0', city: 'New York' }),
    })

    vi.useFakeTimers()
    const { result } = renderHook(() => useAutoLocation())

    // Advance past the 5 s permTimer inside act so React processes state updates
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5100)
    })

    expect(result.current.locationSource).toBe('ip')
    vi.useRealTimers()
  })
})
