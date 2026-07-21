import React, { useEffect, useMemo, useRef, useState } from 'react'

function TypewriterLine({ text }) {
  const [visibleChars, setVisibleChars] = useState(0)

  useEffect(() => {
    setVisibleChars(0)
    let i = 0
    const timer = setInterval(() => {
      i += 1
      setVisibleChars(i)
      if (i >= text.length) {
        clearInterval(timer)
      }
    }, 11)

    return () => clearInterval(timer)
  }, [text])

  return React.createElement('div', { className: 'terminal-line' }, text.slice(0, visibleChars))
}

export default function TerminalChat({ messages, playerId, onSend }) {
  const [draft, setDraft] = useState('')
  const [showRecentOnly, setShowRecentOnly] = useState(true)
  const scrollRef = useRef(null)

  const shownMessages = useMemo(() => {
    if (!Array.isArray(messages)) return []
    if (!showRecentOnly) return messages
    return messages.slice(Math.max(0, messages.length - 18))
  }, [messages, showRecentOnly])

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [shownMessages])

  const handleSubmit = (e) => {
    e.preventDefault()
    const text = String(draft || '').trim()
    if (!text) return
    onSend(text)
    setDraft('')
  }

  return React.createElement(
    'section',
    { className: 'terminal-chat' },
    React.createElement(
      'div',
      { className: 'terminal-header' },
      React.createElement('span', null, 'NET-OPS // TERMINAL-87'),
      React.createElement(
        'button',
        {
          className: 'terminal-toggle-btn',
          type: 'button',
          onClick: () => setShowRecentOnly((prev) => !prev)
        },
        showRecentOnly ? 'Recent' : 'All'
      )
    ),
    React.createElement(
      'div',
      { className: 'terminal-screen', ref: scrollRef },
      shownMessages.length === 0
        ? React.createElement('div', { className: 'terminal-empty' }, '> canal en attente...')
        : shownMessages.map((msg) => {
            const mine = msg.playerId === playerId
            const lineText = msg.kind === 'emote'
              ? `[${msg.nickname || 'Unknown'}] ${msg.text || ''}`
              : `[${msg.nickname || 'Unknown'}] ${msg.text || ''}`
            return React.createElement(
              'div',
              { key: msg.id || `${msg.playerId}-${msg.createdAt}`, className: `terminal-row ${mine ? 'terminal-row-self' : ''} ${msg.kind === 'emote' ? 'terminal-row-emote' : ''}`.trim() },
              React.createElement(TypewriterLine, { text: lineText })
            )
          })
    ),
    React.createElement(
      'form',
      { className: 'terminal-form', onSubmit: handleSubmit },
      React.createElement('span', { className: 'terminal-prompt' }, '>'),
      React.createElement('input', {
        className: 'terminal-input',
        value: draft,
        maxLength: 140,
        onChange: (e) => setDraft(e.target.value)
      }),
      React.createElement(
        'button',
        { className: 'terminal-send-btn', type: 'submit', title: 'Envoyer', 'aria-label': 'Envoyer' },
        React.createElement('i', { className: 'bi bi-caret-right-fill', 'aria-hidden': 'true' })
      )
    )
  )
}
