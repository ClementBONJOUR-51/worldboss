import React, { useMemo } from 'react'

export default function HomePage({ nickname, hasNickname, onContinue, audioMuted, onToggleAudioMute }) {
  const previewName = useMemo(() => String(nickname || '').trim().slice(0, 24), [nickname])

  return React.createElement(
    'div',
    { className: 'home-page' },
    React.createElement('div', { className: 'home-decor home-decor-left', 'aria-hidden': 'true' }, '🛡️'),
    React.createElement('div', { className: 'home-decor home-decor-right', 'aria-hidden': 'true' }, '⚔️'),
    React.createElement(
      'header',
      { className: 'home-header' },
      React.createElement('div', { className: 'home-header-brand' }, 'WB Command'),
      React.createElement(
        'button',
        {
          className: `audio-toggle-btn ${audioMuted ? '' : 'audio-toggle-enabled'}`.trim(),
          type: 'button',
          onClick: onToggleAudioMute
        },
        audioMuted ? '🔇 Son coupe' : '🔊 Son actif'
      )
    ),
    React.createElement(
      'div',
      { className: 'home-card' },
      React.createElement('div', { className: 'home-kicker' }, 'Commande de theatre'),
      React.createElement('h1', { className: 'home-title' }, 'WorldBoss Arena'),
      React.createElement(
        'p',
        { className: 'home-subtitle' },
        'Defends ta capitale avant l arrivee du boss. Le pseudo se configure directement sur la carte.'
      ),
      React.createElement(
        'div',
        { className: 'home-returning-block' },
        hasNickname && previewName && React.createElement('div', { className: 'home-preview' }, `Indicatif actuel: ${previewName}`),
        React.createElement(
          'button',
          { className: 'home-submit-btn', type: 'button', onClick: onContinue },
          hasNickname ? 'Retourner a la carte' : 'Ouvrir la carte'
        )
      ),
      React.createElement(
        'div',
        { className: 'audio-status-note' },
        !audioMuted
          ? 'Le son reste actif entre la carte, l arene et l ecran de fin.'
          : 'Tu peux activer le son maintenant ou plus tard depuis la carte.'
      ),
      previewName && React.createElement('div', { className: 'home-preview' }, `Indicatif actuel: ${previewName}`),
      !hasNickname && React.createElement('div', { className: 'instructions-sub' }, 'Une modal pseudo apparaitra automatiquement si aucun nom n est stocke.')
    )
  )
}
