import React, { useEffect, useRef } from 'react'
import L from 'leaflet'

function iconForCity(city, kind) {
  const normalized = String(city || '').toLowerCase()
  if (kind === 'spawn') {
    if (normalized.includes('atlant')) return '🌊'
    if (normalized.includes('pacifique')) return '⛴️'
    if (normalized.includes('arctique')) return '🧊'
    return '🏰'
  }

  if (normalized.includes('paris')) return '🗼'
  if (normalized.includes('tokyo')) return '🗾'
  if (normalized.includes('new york')) return '🗽'
  if (normalized.includes('rio')) return '🗿'
  if (normalized.includes('cairo')) return '🕌'
  if (normalized.includes('sydney')) return '🌉'
  if (normalized.includes('rome')) return '🏛️'
  return '🏙️'
}

export default function MapPage({ state, onEnterArena, nickname }) {
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const routeRef = useRef(null)
  const spawnMarkerRef = useRef(null)
  const targetMarkerRef = useRef(null)

  useEffect(() => {
    mapRef.current = L.map('map').setView([20, 0], 2)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(mapRef.current)

    const bossIcon = L.divIcon({
      className: 'boss-marker',
      html: '<div class="boss-icon">🦑</div>'
    })
    markerRef.current = L.marker([48.8566, 2.3522], { icon: bossIcon }).addTo(mapRef.current)
    spawnMarkerRef.current = L.marker([48.8566, 2.3522], {
      icon: L.divIcon({ className: 'city-marker', html: '<div class="city-icon">🏰</div>' })
    }).addTo(mapRef.current)
    targetMarkerRef.current = L.marker([48.8566, 2.3522], {
      icon: L.divIcon({ className: 'city-marker', html: '<div class="city-icon">🏛️</div>' })
    }).addTo(mapRef.current)
    routeRef.current = L.polyline(
      [
        [48.8566, 2.3522],
        [48.8566, 2.3522]
      ],
      {
        color: '#00f5ff',
        weight: 5,
        opacity: 0.95,
        dashArray: '10 8'
      }
    ).addTo(mapRef.current)

    markerRef.current.on('click', () => {
      onEnterArena()
    })

    return () => {
      mapRef.current.remove()
    }
  }, [onEnterArena])

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !routeRef.current || !state?.boss) return

    const boss = state.boss
    const spawn = boss.spawn || { lat: 48.8566, lng: 2.3522 }
    const target = boss.target || { lat: 48.8566, lng: 2.3522 }
    const pos = boss.currentPosition || spawn

    routeRef.current.setLatLngs([
      [spawn.lat, spawn.lng],
      [target.lat, target.lng]
    ])

    markerRef.current.setLatLng([pos.lat, pos.lng])
    if (spawnMarkerRef.current) {
      const spawnIcon = iconForCity(spawn.city, 'spawn')
      spawnMarkerRef.current.setIcon(L.divIcon({ className: 'city-marker', html: `<div class="city-icon">${spawnIcon}</div>` }))
      spawnMarkerRef.current.setLatLng([spawn.lat, spawn.lng])
      spawnMarkerRef.current.bindTooltip(`Depart: ${spawn.city || 'Spawn'}`)
    }
    if (targetMarkerRef.current) {
      const destinationIcon = iconForCity(target.city, 'target')
      targetMarkerRef.current.setIcon(L.divIcon({ className: 'city-marker', html: `<div class="city-icon">${destinationIcon}</div>` }))
      targetMarkerRef.current.setLatLng([target.lat, target.lng])
      targetMarkerRef.current.bindTooltip(`Arrivee: ${target.city || 'Cible'}`)
    }
  }, [state?.boss])

  return React.createElement(
    'div',
    { className: 'map-page' },
    React.createElement(
      'div',
      { className: 'hud' },
      React.createElement('div', { className: 'instructions' }, `🗺️ ${nickname ? `${nickname}, ` : ''}clique le boss pour commencer un combat`),
      React.createElement('div', { className: 'instructions-sub' }, 'Repere les points de depart et d arrivee pour anticiper l invasion.')
    ),
    React.createElement('div', { className: 'map-frame-overlay', 'aria-hidden': 'true' }),
    React.createElement('div', { id: 'map', style: { height: '100vh' } })
  )
}
