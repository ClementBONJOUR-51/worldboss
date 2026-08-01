import React from 'react'

export default function SoldierPanel({
  title,
  playerIds,
  contributions,
  playerEmotes,
  playerStates,
  currentPlayerId,
  className = '',
  center = false,
  onSelfClick,
  emoteMenuOpen = false,
  emoteChoices = [],
  currentPlayerEmote = '🪖',
  onSelectEmote,
  warningActive = false,
  ghostBurstsByPlayer = {},
  injuredEmoji = '😵',
  ghostEmoji = '👻'
}) {
  const renderSoldiers = () => {
    if (!playerIds || playerIds.length === 0) {
      return React.createElement('div', { className: 'soldiers-empty' }, 'Aucun soldat')
    }

    return playerIds.map((pid) => {
      const dmg = contributions?.[pid] || 0
      const playerState = playerStates?.[pid] || null
      const isInjured = playerState?.status === 'injured'
      const emote = isInjured ? injuredEmoji : (playerEmotes?.[pid] || '🪖')
      const isCurrent = currentPlayerId && pid === currentPlayerId
      const hasGhostBurst = Boolean(ghostBurstsByPlayer?.[pid])
      const clickHandler = isCurrent && !isInjured && typeof onSelfClick === 'function' ? () => onSelfClick(pid) : undefined
      return React.createElement(
        'div',
        {
          key: pid,
          className: `soldier ${isCurrent ? 'soldier-current soldier-clickable' : ''} ${isInjured ? 'soldier-injured' : ''} ${hasGhostBurst ? 'soldier-ghost-active' : ''}`.trim(),
          onClick: clickHandler,
          title: `${pid.slice(0, 8)}...: ${dmg} dmg${isInjured ? ' // Blesse' : ''}`
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
        hasGhostBurst && React.createElement('span', { className: 'soldier-ghost-burst', 'aria-hidden': 'true' }, ghostEmoji),
        isCurrent && React.createElement('span', { className: 'soldier-self-tag' }, 'MOI')
      )
    })
  }

  return React.createElement(
    'div',
    { className: `soldier-side ${className} ${warningActive ? 'soldier-side-warning' : ''}`.trim() },
    React.createElement('div', { className: 'soldier-side-title' }, title),
    React.createElement(
      'div',
      { className: `soldiers-lane ${center ? 'soldiers-lane-bottom' : ''}`.trim() },
      renderSoldiers()
    )
  )
}
