import { useEffect, useState } from 'react'

const DEFAULT_RADIUS = 25 // matches AreaFilterPanel radius slider default

/**
 * Detects the user's location on mount via:
 *   1. GPS (navigator.geolocation) — precise, requires user permission
 *   2. IP geolocation (ipapi.co) — city-level fallback, no API key required
 *
 * Returns:
 *   locationSource  — 'detecting' | 'gps' | 'ip' | 'unavailable'
 *   detectedLocation — { lat, lng, label, radius } once resolved, or null
 *
 * The component is responsible for deciding whether to apply detectedLocation
 * (e.g. skip if the user already has a manual filter active).
 */
export function useAutoLocation() {
  const [locationSource, setLocationSource]     = useState('detecting')
  const [detectedLocation, setDetectedLocation] = useState(null)

  useEffect(() => {
    let cancelled = false
    let settled   = false

    const succeed = (lat, lng, label, source) => {
      if (settled || cancelled) return
      settled = true
      setLocationSource(source)
      setDetectedLocation({ lat, lng, label, radius: DEFAULT_RADIUS })
    }

    const giveUp = () => {
      if (settled || cancelled) return
      settled = true
      setLocationSource('unavailable')
    }

    const tryIp = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/')
        const d   = await res.json()
        if (d.latitude && d.longitude) {
          succeed(
            parseFloat(d.latitude),
            parseFloat(d.longitude),
            d.city || d.region || 'your area',
            'ip',
          )
        } else {
          giveUp()
        }
      } catch {
        giveUp()
      }
    }

    // No Geolocation API — go straight to IP fallback
    if (!navigator?.geolocation) {
      tryIp()
      return () => { cancelled = true }
    }

    // If the permission prompt hasn't resolved within 5 s, start IP fallback
    // so the page isn't stuck on "Detecting…" while the browser modal sits idle.
    const permTimer = setTimeout(() => {
      if (!settled) tryIp()
    }, 5000)

    navigator.geolocation.getCurrentPosition(
      pos => {
        clearTimeout(permTimer)
        succeed(pos.coords.latitude, pos.coords.longitude, 'Your Location', 'gps')
      },
      () => {
        clearTimeout(permTimer)
        if (!settled) tryIp()
      },
      { timeout: 10000, maximumAge: 300000 },
    )

    return () => {
      cancelled = true
      clearTimeout(permTimer)
    }
  }, [])

  return { locationSource, detectedLocation }
}
