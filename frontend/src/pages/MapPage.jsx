import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import audioManager from '../services/audioManager'

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

export default function MapPage({ state, onEnterArena, nickname, hasNickname, onSubmitNickname, audioMuted, onToggleAudioMute }) {
  const mapRef = useRef(null)
  const encounterLayerRef = useRef(null)
  const previousSettingsOpenRef = useRef(null)
  const [settingsOpen, setSettingsOpen] = useState(!hasNickname)
  const [nicknameValue, setNicknameValue] = useState(nickname || '')
  const [error, setError] = useState('')

  useEffect(() => {
    setNicknameValue(nickname || '')
  }, [nickname])

  useEffect(() => {
    if (!hasNickname) {
      setSettingsOpen(true)
      return
    }
    setSettingsOpen(false)
  }, [hasNickname])

  useEffect(() => {
    mapRef.current = L.map('map').setView([20, 0], 2)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(mapRef.current)
    encounterLayerRef.current = L.layerGroup().addTo(mapRef.current)

    return () => {
      mapRef.current.remove()
    }
  }, [onEnterArena])

  useEffect(() => {
    if (!mapRef.current || !encounterLayerRef.current) return

    const bosses = Array.isArray(state?.bosses) && state.bosses.length > 0
      ? state.bosses
      : (state?.boss ? [state.boss] : [])

    encounterLayerRef.current.clearLayers()

    bosses.forEach((boss, index) => {
      const spawn = boss.spawn || { lat: 48.8566, lng: 2.3522 }
      const target = boss.target || { lat: 48.8566, lng: 2.3522 }
      const pos = boss.currentPosition || spawn
      const hue = (index * 57) % 360
      const routeColor = `hsl(${hue} 95% 68%)`

      L.polyline(
        [
          [spawn.lat, spawn.lng],
          [target.lat, target.lng]
        ],
        {
          color: routeColor,
          weight: 4,
          opacity: 0.92,
          dashArray: '10 8'
        }
      ).addTo(encounterLayerRef.current)

      L.marker([spawn.lat, spawn.lng], {
        icon: L.divIcon({ className: 'city-marker city-marker-small', html: `<div class="city-icon">${iconForCity(spawn.city, 'spawn')}</div>` })
      })
        .bindTooltip(`Depart: ${spawn.city || 'Spawn'}`)
        .addTo(encounterLayerRef.current)

      L.marker([target.lat, target.lng], {
        icon: L.divIcon({ className: 'city-marker city-marker-small', html: `<div class="city-icon">${iconForCity(target.city, 'target')}</div>` })
      })
        .bindTooltip(`Arrivee: ${target.city || 'Cible'}`)
        .addTo(encounterLayerRef.current)

      const bossMarker = L.marker([pos.lat, pos.lng], {
        icon: L.divIcon({ className: 'boss-marker', html: `<div class="boss-icon">${boss.emoji || '👾'}</div>` })
      })
        .bindTooltip(`${boss.name || 'Boss'} • ${Math.max(0, Math.round(boss.hp || 0))} PV`)
        .addTo(encounterLayerRef.current)

      bossMarker.on('click', () => {
        audioManager.play('enterArena')
        onEnterArena(boss.id)
      })
    })
  }, [state?.boss, state?.bosses, onEnterArena])

  useEffect(() => {
    if (previousSettingsOpenRef.current === null) {
      previousSettingsOpenRef.current = settingsOpen
      return
    }

    if (settingsOpen !== previousSettingsOpenRef.current) {
      audioManager.play(settingsOpen ? 'modalOpen' : 'modalClose')
    }

    previousSettingsOpenRef.current = settingsOpen
  }, [settingsOpen])

  const handleNicknameSubmit = (e) => {
    e.preventDefault()
    const ok = onSubmitNickname(nicknameValue)
    if (!ok) {
      setError('Entre un pseudo valide (1 a 24 caracteres).')
      return
    }

    setError('')
    audioManager.play('nicknameSaved')
    setSettingsOpen(false)
  }

  return React.createElement(
    'div',
    { className: 'map-page' },
    React.createElement(
      'div',
      { className: 'map-toolbar' },
      React.createElement(
        'button',
        {
          className: `audio-toggle-btn ${audioMuted ? '' : 'audio-toggle-enabled'}`.trim(),
          type: 'button',
          onClick: onToggleAudioMute
        },
        audioMuted ? '🔇 Son coupe' : '🔊 Son actif'
      ),
      React.createElement(
        'button',
        {
          className: 'map-settings-btn',
          type: 'button',
          onClick: () => setSettingsOpen(true)
        },
        React.createElement('i', { className: 'bi bi-gear-fill', 'aria-hidden': 'true' }),
        ' Parametres'
      )
    ),
    React.createElement(
      'div',
      { className: 'hud' },
      React.createElement('div', { className: 'instructions' }, `🗺️ ${nickname ? `${nickname}, ` : ''}clique le boss pour commencer un combat`),
      React.createElement('div', { className: 'instructions-sub' }, 'Repere les points de depart et d arrivee pour anticiper l invasion.')
    ),
    React.createElement('div', { className: 'map-frame-overlay', 'aria-hidden': 'true' }),
    settingsOpen && React.createElement(
      'div',
      { className: 'map-modal-backdrop', role: 'presentation' },
      React.createElement(
        'div',
        {
          className: 'map-modal-card',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-labelledby': 'map-nickname-title'
        },
        React.createElement('div', { id: 'map-nickname-title', className: 'map-modal-title' }, hasNickname ? 'Parametres joueur' : 'Choisir un pseudo'),
        React.createElement(
          'div',
          { className: 'map-modal-subtitle' },
          hasNickname
            ? 'Modifie ton pseudo sans quitter la carte.'
            : 'Entre un pseudo avant de rejoindre la bataille.'
        ),
        React.createElement(
          'form',
          { className: 'map-modal-form', onSubmit: handleNicknameSubmit },
          React.createElement('input', {
            className: 'home-input',
            value: nicknameValue,
            maxLength: 24,
            placeholder: 'Ex: Capitaine_Nova',
            onChange: (e) => setNicknameValue(e.target.value)
          }),
          React.createElement(
            'div',
            { className: 'audio-status-note' },
            !audioMuted
              ? 'Les evenements audio du combat sont actifs des que le navigateur autorise la lecture.'
              : 'Active l audio depuis la barre en haut pour entendre les alertes, impacts et evenements de bataille.'
          ),
          error && React.createElement('div', { className: 'home-error' }, error),
          React.createElement(
            'div',
            { className: 'map-modal-actions' },
            hasNickname && React.createElement(
              'button',
              {
                type: 'button',
                className: 'home-ghost-btn',
                onClick: () => {
                  setNicknameValue(nickname || '')
                  setError('')
                  setSettingsOpen(false)
                }
              },
              'Annuler'
            ),
            React.createElement(
              'button',
              { type: 'submit', className: 'home-submit-btn' },
              hasNickname ? 'Enregistrer' : 'Valider'
            )
          )
        )
      )
    ),
    React.createElement('div', { id: 'map', style: { height: '100vh' } })
  )
}
