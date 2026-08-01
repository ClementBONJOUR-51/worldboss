import React, { useEffect, useMemo, useState } from 'react'
import audioManager from '../services/audioManager'

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

export default function EndPage({ playerId, playerNickname, matchEndData, onBackHome, onBackMap, audioMuted, onToggleAudioMute }) {
  const [countdown, setCountdown] = useState(120)

  useEffect(() => {
    setCountdown(120)
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1))
    }, 1000)
    const redirect = setTimeout(() => {
      onBackHome()
    }, 120000)

    return () => {
      clearInterval(timer)
      clearTimeout(redirect)
    }
  }, [matchEndData?.endedAt, onBackHome])

  useEffect(() => {
    if (countdown > 0 && countdown <= 5) {
      audioManager.play('endCountdown')
    }
  }, [countdown])

  const outcome = matchEndData?.outcome || 'victory'
  const isDefeat = outcome === 'defeat'
  const state = matchEndData?.state || {}
  const contributions = state?.contributions || {}
  const connectedPlayers = Array.isArray(state?.connectedPlayers) ? state.connectedPlayers : []
  const playerNicknames = state?.playerNicknames || {}
  const playerEmotes = state?.playerEmotes || {}
  const structures = state?.structures || {}
  const time = matchEndData?.time || {}
  const damageTotals = matchEndData?.damageTotals || {}

  const allPlayers = useMemo(() => {
    const ids = new Set([...connectedPlayers, ...Object.keys(contributions)])
    return Array.from(ids)
  }, [connectedPlayers, contributions])

  const rankedPlayers = useMemo(() => {
    return allPlayers
      .map((pid) => ({
        id: pid,
        nickname: playerNicknames[pid] || (pid === playerId && playerNickname) || `Joueur-${String(pid).slice(0, 6)}`,
        damage: Math.max(0, Number(contributions[pid] || 0)),
        emote: playerEmotes[pid] || '🪖'
      }))
      .sort((a, b) => b.damage - a.damage)
  }, [allPlayers, contributions, playerEmotes, playerId, playerNickname, playerNicknames])

  const myRank = rankedPlayers.findIndex((item) => item.id === playerId)
  const myDamage = myRank >= 0 ? rankedPlayers[myRank].damage : 0

  const title = isDefeat ? 'Capitale perdue' : 'Boss neutralise'
  const subtitle = isDefeat
    ? 'Le boss est arrive a destination avant elimination.'
    : 'L escouade a elimine le boss avant son arrivee.'

  return React.createElement(
    'div',
    { className: `end-page ${isDefeat ? 'end-page-defeat' : 'end-page-victory'}` },
    React.createElement(
      'div',
      { className: 'end-card' },
      React.createElement('div', { className: 'end-kicker' }, isDefeat ? 'Defeat' : 'Victory'),
      React.createElement('h1', { className: 'end-title' }, title),
      React.createElement('p', { className: 'end-subtitle' }, subtitle),

      React.createElement(
        'div',
        { className: 'end-stats-grid' },
        React.createElement('div', { className: 'end-stat' }, `Joueurs: ${connectedPlayers.length}`),
        React.createElement('div', { className: 'end-stat' }, `Mon rang: ${myRank >= 0 ? `#${myRank + 1}` : 'N/A'}`),
        React.createElement('div', { className: 'end-stat' }, `Mes degats: ${Math.floor(myDamage)}`),
        React.createElement('div', { className: 'end-stat' }, `Temps ecoule: ${formatDuration(time.elapsedMs)}`),
        React.createElement('div', { className: 'end-stat' }, `Temps restant: ${formatDuration(time.remainingMs)}`),
        React.createElement('div', { className: 'end-stat' }, `Actif/Passif: ${Math.floor(damageTotals.active || 0)} / ${Math.floor(damageTotals.passive || 0)}`)
      ),

      React.createElement(
        'div',
        { className: 'end-structures' },
        React.createElement('div', { className: 'end-block-title' }, 'Niveaux structures'),
        React.createElement(
          'div',
          { className: 'end-structures-row' },
          React.createElement('span', null, `🏭 ${structures?.ammoFactory?.level ?? 0}`),
          React.createElement('span', null, `⛺ ${structures?.frontlineCamp?.level ?? 0}`),
          React.createElement('span', null, `🎯 ${structures?.trainingCenter?.level ?? 0}`),
          React.createElement('span', null, `🧨 ${structures?.artilleryBattery?.level ?? 0}`),
          React.createElement('span', null, `🏛️ ${structures?.headquarters?.level ?? 0}`)
        )
      ),

      React.createElement(
        'div',
        { className: 'end-players' },
        React.createElement('div', { className: 'end-block-title' }, 'Escouade complete'),
        React.createElement(
          'div',
          { className: 'end-player-list' },
          rankedPlayers.map((item, index) => {
            const icon = isDefeat ? '💀' : item.emote
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '•'
            return React.createElement(
              'div',
              {
                key: item.id,
                className: `end-player-row ${item.id === playerId ? 'end-player-row-self' : ''}`
              },
              React.createElement('span', { className: 'end-player-medal' }, medal),
              React.createElement('span', { className: 'end-player-icon' }, icon),
              React.createElement('span', { className: 'end-player-name' }, item.nickname),
              React.createElement('span', { className: 'end-player-damage' }, `${Math.floor(item.damage)} dmg`)
            )
          })
        )
      ),

      React.createElement(
        'div',
        { className: 'end-actions' },
        React.createElement(
          'button',
          {
            className: `audio-toggle-btn ${audioMuted ? '' : 'audio-toggle-enabled'}`.trim(),
            type: 'button',
            onClick: onToggleAudioMute
          },
          audioMuted ? '🔇 Son coupe' : '🔊 Son actif'
        ),
        React.createElement('button', { className: 'end-btn-primary', onClick: onBackHome }, 'Retour accueil'),
        React.createElement('button', { className: 'end-btn-secondary', onClick: onBackMap }, 'Retour carte'),
        React.createElement('div', { className: 'end-countdown' }, `Retour auto dans ${countdown}s`)
      )
    )
  )
}
