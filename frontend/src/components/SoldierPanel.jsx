import React from 'react'

export default function SoldierPanel({
  title,
  playerIds,
  contributions,
  playerEmotes,
  currentPlayerId,
  className = '',
  center = false,
  onSelfClick,
  emoteMenuOpen = false,
  emoteChoices = [],
  currentPlayerEmote = '🪖',
  onSelectEmote
}) {
  const renderSoldiers = () => {
    if (!playerIds || playerIds.length === 0) {
      return React.createElement('div', { className: 'soldiers-empty' }, 'Aucun soldat')
    }

    return playerIds.map((pid) => {
      const dmg = contributions?.[pid] || 0
      const emote = playerEmotes?.[pid] || '🪖'
      const isCurrent = currentPlayerId && pid === currentPlayerId
      const clickHandler = isCurrent && typeof onSelfClick === 'function' ? () => onSelfClick(pid) : undefined
      return React.createElement(
        'div',
        {
          key: pid,
          className: `soldier ${isCurrent ? 'soldier-current soldier-clickable' : ''}`.trim(),
          onClick: clickHandler,
          title: `${pid.slice(0, 8)}...: ${dmg} dmg`
        },
        isCurrent && emoteMenuOpen && React.createElement(
          'div',
          {
            className: 'soldier-emote-popover',
            onClick: (e) => e.stopPropagation()
          },
          React.createElement('div', { className: 'soldier-emote-popover-title' }, 'Emotes'),
          React.createElement(
            'div',
            { className: 'soldier-emote-popover-grid' },
            emoteChoices.map((choice) => {
              const active = currentPlayerEmote === choice
              return React.createElement(
                'button',
                {
                  key: choice,
                  className: `emote-btn ${active ? 'emote-btn-active' : ''}`,
                  onClick: () => typeof onSelectEmote === 'function' && onSelectEmote(choice),
                  title: `Choisir ${choice}`
                },
                choice
              )
            })
          )
        ),
        React.createElement('span', { className: 'soldier-emote soldier-emote-walk' }, emote),
        isCurrent && React.createElement('span', { className: 'soldier-self-tag' }, 'MOI')
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
