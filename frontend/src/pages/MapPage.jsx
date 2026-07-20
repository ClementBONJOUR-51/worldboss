import React, { useEffect, useRef } from 'react'
import L from 'leaflet'

export default function MapPage({ state, onEnterArena }) {
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const routeRef = useRef(null)

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
  }, [state?.boss])

  return React.createElement(
    'div',
    { className: 'map-page' },
    React.createElement(
      'div',
      { className: 'hud' },
      React.createElement('div', { className: 'instructions' }, '🗺️ Cliquez sur le boss pour commencer un combat')
    ),
    React.createElement('div', { id: 'map', style: { height: '100vh' } })
  )
}
