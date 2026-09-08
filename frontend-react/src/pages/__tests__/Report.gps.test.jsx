import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import Report from '../Report'

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-uid', email: 'test@example.com' } }),
}))

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: [
        { name: 'Pothole',     icon: null },
        { name: 'Flooding',    icon: null },
        { name: 'Fallen Tree', icon: null },
      ],
    }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

// maplibre-gl uses canvas; jsdom has none — no-op stub
vi.mock('maplibre-gl', () => ({
  default: {
    Map: class {
      constructor() {}
      addControl() {}
      on() {}
      remove() {}
      flyTo() {}
    },
    NavigationControl: class {},
    Marker: class {
      setLngLat() { return this }
      addTo() { return this }
      on() { return this }
      getLngLat() { return { lat: 0, lng: 0 } }
    },
  },
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeGeoError = (code) => {
  const err = { code }
  err.PERMISSION_DENIED = 1
  err.POSITION_UNAVAILABLE = 2
  err.TIMEOUT = 3
  return err
}

function renderReport() {
  return render(
    <MemoryRouter>
      <Report />
    </MemoryRouter>,
  )
}

async function advanceToStep2() {
  // Wait for categories to be available, then pick Pothole
  const potholeBtn = await screen.findByRole('button', { name: /pothole/i }, { timeout: 3000 })
  await userEvent.click(potholeBtn)

  // Pick Low severity (text: "Low Minor issue, not urgent")
  const severityBtns = screen.getAllByRole('button', { name: /low/i })
  await userEvent.click(severityBtns[0])

  // Fill in description
  await userEvent.type(
    screen.getByPlaceholderText(/describe the hazard in detail/i),
    'Test description',
  )

  // Advance to Step 2
  await userEvent.click(screen.getByRole('button', { name: /next: add location/i }))

  // Confirm Step 2 is shown
  return screen.findByRole('button', { name: /auto-detect my location/i }, { timeout: 3000 })
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Report — GPS error handling', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(global.navigator, 'geolocation', {
      configurable: true,
      writable: true,
      value: undefined,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a "denied" inline alert when PERMISSION_DENIED fires', async () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((_success, error) => {
          error(makeGeoError(1)) // PERMISSION_DENIED
        }),
      },
    })

    renderReport()
    const gpsBtn = await advanceToStep2()

    await userEvent.click(gpsBtn)

    const alert = await screen.findByRole('alert', {}, { timeout: 3000 })
    expect(alert).toHaveTextContent(/location access was denied/i)
    expect(alert).not.toHaveTextContent(/gps unavailable/i)
  })

  it('shows a generic "unavailable" inline alert when POSITION_UNAVAILABLE fires', async () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((_success, error) => {
          error(makeGeoError(2)) // POSITION_UNAVAILABLE
        }),
      },
    })

    renderReport()
    const gpsBtn = await advanceToStep2()

    await userEvent.click(gpsBtn)

    const alert = await screen.findByRole('alert', {}, { timeout: 3000 })
    expect(alert).toHaveTextContent(/gps unavailable/i)
    expect(alert).not.toHaveTextContent(/location access was denied/i)
  })

  it('shows a generic "unavailable" inline alert when TIMEOUT fires', async () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((_success, error) => {
          error(makeGeoError(3)) // TIMEOUT
        }),
      },
    })

    renderReport()
    const gpsBtn = await advanceToStep2()

    await userEvent.click(gpsBtn)

    const alert = await screen.findByRole('alert', {}, { timeout: 3000 })
    expect(alert).toHaveTextContent(/gps unavailable/i)
    expect(alert).not.toHaveTextContent(/location access was denied/i)
  })

  it('shows no GPS alert on the success path', async () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success) => {
          success({ coords: { latitude: 30.0, longitude: -90.0 } })
        }),
      },
    })

    // Nominatim reverse-geocode: silent empty response
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: () => Promise.resolve({}),
    })

    renderReport()
    const gpsBtn = await advanceToStep2()

    await userEvent.click(gpsBtn)

    // No alert should appear after a successful GPS fix
    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull()
    }, { timeout: 2000 })

    // Location confirmation chip should be visible
    expect(screen.getByText(/location set/i)).toBeInTheDocument()
  })
})
