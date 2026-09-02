import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const SEVERITY_COLORS = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#7c3aed',
}

function reportsToGeoJSON(reports) {
  return {
    type: 'FeatureCollection',
    features: reports
      .filter(r => r.latitude && r.longitude)
      .map(r => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [parseFloat(r.longitude), parseFloat(r.latitude)] },
        properties: {
          id: r.id,
          hazard_type: r.hazard_type,
          severity: r.severity,
          description: r.description,
          created_at: r.created_at,
          name: r.name,
          status: r.status,
          color: SEVERITY_COLORS[r.severity] || '#6b7280',
          severity_rank: { critical: 4, high: 3, medium: 2, low: 1 }[r.severity] || 1,
        },
      })),
  }
}

export default function Map({ reports = [], onLocationSelect, center = [-98.5, 39.5], zoom = 4, showHeatmapToggle = false, focusCoords = null }) {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const [isHeatmap, setIsHeatmap] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  // Init map
  useEffect(() => {
    if (mapRef.current) return

    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center,
      zoom,
    })

    mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right')

    if (onLocationSelect) {
      mapRef.current.on('click', (e) => {
        onLocationSelect({ lat: e.lngLat.lat, lng: e.lngLat.lng })
      })
    }

    mapRef.current.on('load', () => {
      // MAP1 — GeoJSON source with clustering enabled
      mapRef.current.addSource('reports', {
        type: 'geojson',
        data: reportsToGeoJSON([]),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
        clusterProperties: {
          max_severity: ['max', ['get', 'severity_rank']],
        },
      })

      // MAP1 — Cluster circles
      mapRef.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'reports',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step', ['get', 'point_count'],
            '#22c55e', 5,
            '#f59e0b', 15,
            '#ef4444'
          ],
          'circle-radius': [
            'step', ['get', 'point_count'],
            20, 5, 28, 15, 36
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.9,
        },
      })

      // MAP1 — Cluster count labels
      mapRef.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'reports',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold'],
          'text-size': 13,
        },
        paint: { 'text-color': '#fff' },
      })

      // MAP1 — Individual pins (unclustered)
      mapRef.current.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'reports',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.95,
        },
      })

      // MAP2 — Heatmap layer (hidden by default)
      mapRef.current.addLayer({
        id: 'heatmap-layer',
        type: 'heatmap',
        source: 'reports',
        maxzoom: 15,
        layout: { visibility: 'none' },
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'severity_rank'], 1, 0.2, 4, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, '#22c55e',
            0.4, '#f59e0b',
            0.6, '#ef4444',
            1, '#7c3aed'
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 20, 15, 40],
          'heatmap-opacity': 0.85,
        },
      })

      // MAP1 — Click cluster to zoom in
      mapRef.current.on('click', 'clusters', (e) => {
        const features = mapRef.current.queryRenderedFeatures(e.point, { layers: ['clusters'] })
        const clusterId = features[0].properties.cluster_id
        mapRef.current.getSource('reports').getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return
          mapRef.current.easeTo({ center: features[0].geometry.coordinates, zoom })
        })
      })

      // MAP1 — Popup on individual pin click
      mapRef.current.on('click', 'unclustered-point', (e) => {
        const props = e.features[0].properties
        const coords = e.features[0].geometry.coordinates.slice()

        const date = new Date(props.created_at)
        const localDate = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        const localTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        const diff = (Date.now() - date) / 1000
        const timeAgo = diff < 60 ? 'just now'
          : diff < 3600 ? `${Math.floor(diff / 60)} min ago`
          : diff < 86400 ? `${Math.floor(diff / 3600)} hr ago`
          : `${Math.floor(diff / 86400)} days ago`

        if (popupRef.current) popupRef.current.remove()

        popupRef.current = new maplibregl.Popup({ offset: 12 })
          .setLngLat(coords)
          .setHTML(`
            <div style="font-family:Inter,sans-serif;min-width:210px">
              <strong style="font-size:14px;color:#F5F5F5">${props.hazard_type}</strong><br/>
              <span style="font-size:12px;color:#9CA3AF;text-transform:capitalize">Severity: ${props.severity}</span><br/>
              <p style="font-size:13px;color:#D1D5DB;margin:6px 0 4px">${props.description?.slice(0, 80) || ''}${props.description?.length > 80 ? '…' : ''}</p>
              <hr style="margin:6px 0;border:none;border-top:1px solid #2A332E"/>
              <span style="font-size:12px;color:#9CA3AF">📅 ${localDate}</span><br/>
              <span style="font-size:12px;color:#9CA3AF">⏰ ${localTime} · ${timeAgo}</span><br/>
              ${props.name ? `<span style="font-size:12px;color:#9CA3AF">👤 ${props.name}</span>` : ''}
            </div>
          `)
          .addTo(mapRef.current)
      })

      // Cursor changes
      mapRef.current.on('mouseenter', 'clusters', () => { mapRef.current.getCanvas().style.cursor = 'pointer' })
      mapRef.current.on('mouseleave', 'clusters', () => { mapRef.current.getCanvas().style.cursor = '' })
      mapRef.current.on('mouseenter', 'unclustered-point', () => { mapRef.current.getCanvas().style.cursor = 'pointer' })
      mapRef.current.on('mouseleave', 'unclustered-point', () => { mapRef.current.getCanvas().style.cursor = '' })

      setMapReady(true)
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  // Fly to a specific report when focusCoords changes (e.g. from a push notification deep-link)
  useEffect(() => {
    if (!mapReady || !mapRef.current || !focusCoords) return
    mapRef.current.flyTo({ center: [focusCoords.lng, focusCoords.lat], zoom: 15, duration: 900 })
  }, [focusCoords, mapReady])

  // Update GeoJSON data when reports change
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    try {
      const source = mapRef.current.getSource('reports')
      if (source) source.setData(reportsToGeoJSON(reports))
      if (reports.length > 0) {
        const lngs = reports.filter(r => r.longitude).map(r => parseFloat(r.longitude))
        const lats = reports.filter(r => r.latitude).map(r => parseFloat(r.latitude))
        if (lngs.length > 0 && lats.length > 0) {
          const bounds = [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)]
          ]
          mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 800 })
        }
      }
    } catch(err) {
      console.error('Map setData/fitBounds error:', err)
    }
  }, [reports, mapReady])

  // MAP2 — Toggle heatmap vs cluster layers
  const toggleHeatmap = () => {
    if (!mapRef.current) return
    const next = !isHeatmap
    setIsHeatmap(next)
    mapRef.current.setLayoutProperty('heatmap-layer', 'visibility', next ? 'visible' : 'none')
    mapRef.current.setLayoutProperty('clusters', 'visibility', next ? 'none' : 'visible')
    mapRef.current.setLayoutProperty('cluster-count', 'visibility', next ? 'none' : 'visible')
    mapRef.current.setLayoutProperty('unclustered-point', 'visibility', next ? 'none' : 'visible')
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* MAP2 — Heatmap toggle button */}
      {showHeatmapToggle && (
        <button
          onClick={toggleHeatmap}
          style={{
            position: 'absolute', top: '12px', left: '12px', zIndex: 10,
            padding: '8px 14px', borderRadius: '8px', fontSize: '13px',
            fontWeight: '600', cursor: 'pointer', border: 'none',
            background: isHeatmap ? '#7c3aed' : '#fff',
            color: isHeatmap ? '#fff' : '#0f172a',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'all 0.2s',
          }}
        >
          {isHeatmap ? '🔥 Heatmap' : '📍 Pins'}
        </button>
      )}
    </div>
  )
}