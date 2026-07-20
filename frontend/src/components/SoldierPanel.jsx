import React from 'react'

export default function SoldierPanel({ title, playerIds, contributions, playerEmotes, currentPlayerId, className = '', center = false }) {
  const renderSoldiers = () => {
    if (!playerIds || playerIds.length === 0) {
      return React.createElement('div', { className: 'soldiers-empty' }, 'Aucun soldat')
    }

    return playerIds.map((pid) => {
      const dmg = contributions?.[pid] || 0
      const emote = playerEmotes?.[pid] || '🪖'
      const isCurrent = currentPlayerId && pid === currentPlayerId
      return React.createElement(
        'div',
        {
          key: pid,
          className: `soldier ${isCurrent ? 'soldier-current' : ''}`,
          title: `${pid.slice(0, 8)}...: ${dmg} dmg`
        },
        emote
      )
    })
  }

  return React.createElement(
    'div',
    { className: `soldier-side ${className}`.trim() },
    React.createElement('div', { className: 'soldier-side-title' }, title),
    React.createElement(
      'div',
      { className: `soldiers-lane ${center ? 'soldiers-lane-bottom' : ''}`.trim() },
      renderSoldiers()
    )
  )
}
