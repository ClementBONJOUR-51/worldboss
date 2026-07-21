import React, { useMemo, useState } from 'react'

export default function HomePage({ nickname, hasNickname, onSubmitNickname, onContinue }) {
  const [value, setValue] = useState(nickname || '')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [error, setError] = useState('')

  const previewName = useMemo(() => String(value || nickname || '').trim().slice(0, 24), [value, nickname])

  const handleSubmit = (e) => {
    e.preventDefault()
    const ok = onSubmitNickname(value)
    if (!ok) {
      setError('Entre un pseudo valide (1 a 24 caracteres).')
      return
    }
    setError('')
  }

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
          className: 'home-settings-btn',
          type: 'button',
          onClick: () => setSettingsOpen((prev) => !prev)
        },
        React.createElement('i', { className: 'bi bi-gear-fill', 'aria-hidden': 'true' }),
        ' Parametres'
      )
    ),
    settingsOpen && React.createElement(
      'div',
      { className: 'home-settings-panel' },
      React.createElement('div', { className: 'home-settings-title' }, 'Renommer le pilote'),
      React.createElement(
        'form',
        {
          className: 'home-settings-form',
          onSubmit: (e) => {
            e.preventDefault()
            const ok = onSubmitNickname(value)
            if (!ok) {
              setError('Entre un pseudo valide (1 a 24 caracteres).')
              return
            }
            setError('')
            setSettingsOpen(false)
          }
        },
        React.createElement('input', {
          className: 'home-input',
          value,
          maxLength: 24,
          placeholder: 'Nouveau pseudo',
          onChange: (e) => setValue(e.target.value)
        }),
        React.createElement('button', { type: 'submit', className: 'home-submit-btn' }, 'Appliquer')
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
        'Defends ta capitale avant l arrivee du boss. Choisis ton pseudo d escouade.'
      ),
      hasNickname
        ? React.createElement(
            'div',
            { className: 'home-returning-block' },
            React.createElement('div', { className: 'home-preview' }, `Indicatif actuel: ${previewName}`),
            React.createElement(
              'button',
              { className: 'home-submit-btn', type: 'button', onClick: onContinue },
              'Retourner a la carte'
            )
          )
        : React.createElement(
            'form',
            { className: 'home-form', onSubmit: handleSubmit },
            React.createElement('label', { htmlFor: 'nickname', className: 'home-label' }, 'Pseudo'),
            React.createElement('input', {
              id: 'nickname',
              className: 'home-input',
              value,
              maxLength: 24,
              placeholder: 'Ex: Capitaine_Nova',
              onChange: (e) => setValue(e.target.value)
            }),
            error && React.createElement('div', { className: 'home-error' }, error),
            React.createElement(
              'button',
              { type: 'submit', className: 'home-submit-btn' },
              'Valider et rejoindre la carte'
            )
          ),
      previewName && React.createElement('div', { className: 'home-preview' }, `Indicatif actuel: ${previewName}`),
      hasNickname && React.createElement(
        'button',
        { className: 'home-ghost-btn', type: 'button', onClick: onContinue },
        'Continuer sans changer le pseudo'
      )
    )
  )
}
