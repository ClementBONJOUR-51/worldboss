import React, { useState, useRef, useEffect, useCallback } from 'react'
import HomePage from './pages/HomePage'
import MapPage from './pages/MapPage'
import ArenaPage from './pages/ArenaPage'
import EndPage from './pages/EndPage'
import createSocket from './socket'
import './styles.css'

export default function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [state, setState] = useState(null)
  const [playerId, setPlayerId] = useState(null)
  const [playerNickname, setPlayerNickname] = useState(() => {
    if (typeof window === 'undefined') return ''
    return window.localStorage.getItem('wb.nickname') || ''
  })
  const [matchEndData, setMatchEndData] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [qteGrantEvent, setQteGrantEvent] = useState(null)
  const [qteResultEvent, setQteResultEvent] = useState(null)
  const [clickResultEvent, setClickResultEvent] = useState(null)
  const [combatTickEvent, setCombatTickEvent] = useState(null)
  const socket = useRef(null)
  const playerIdRef = useRef(null)

  useEffect(() => {
    playerIdRef.current = playerId
  }, [playerId])

  useEffect(() => {
    socket.current = createSocket((msg) => {
      if (msg.type === 'welcome') {
        const nextPlayerId = msg.data?.playerId || null
        setPlayerId(nextPlayerId)

        const activeQte = msg.data?.playerState?.activeQte
        if (activeQte?.qteId || activeQte?.id) {
          setQteGrantEvent({
            qteId: activeQte.qteId || activeQte.id,
            playerId: activeQte.playerId || nextPlayerId,
            tier: activeQte.tier,
            color: activeQte.color,
            expiresAt: activeQte.expiresAt,
            receivedAt: Date.now()
          })
        }

        if (playerNickname && socket.current?.sendNickname) {
          socket.current.sendNickname(playerNickname, nextPlayerId)
        }
      }
      if (msg.type === 'state') {
        setState(msg.data)
        if (Array.isArray(msg.data?.chatHistory)) {
          setChatMessages(msg.data.chatHistory)
        }
      }
      if (msg.type === 'dead') setState(msg.data)
      if (msg.type === 'match_end') {
        setMatchEndData(msg.data)
        setCurrentPage('end')
      }
      if (msg.type === 'qte_grant') {
        const targetPlayerId = msg.data?.playerId || null
        if (!targetPlayerId || targetPlayerId === playerIdRef.current) {
          setQteGrantEvent({
            ...msg.data,
            receivedAt: Date.now()
          })
        }
      }
      if (msg.type === 'qte_result') {
        setQteResultEvent({
          ...msg.data,
          receivedAt: Date.now()
        })
      }
      if (msg.type === 'click_result') {
        setClickResultEvent({
          ...msg.data,
          receivedAt: Date.now()
        })
      }
      if (msg.type === 'combat_tick') {
        setCombatTickEvent({
          ...msg.data,
          receivedAt: Date.now()
        })
      }
      if (msg.type === 'chat_message') {
        setChatMessages((prev) => {
          const next = [...prev, msg.data]
          if (next.length > 80) return next.slice(next.length - 80)
          return next
        })
      }
    })

    return () => {
      // cleanup websocket (prevents duplicate connections in React StrictMode)
      if (socket.current && typeof socket.current.close === 'function') {
        socket.current.close()
      }
      socket.current = null
    }
  }, [])

  const enterArena = useCallback(() => setCurrentPage('arena'), [])
  const exitArena = useCallback(() => setCurrentPage('map'), [])
  const goToMap = useCallback(() => setCurrentPage('map'), [])
  const goToHome = useCallback(() => setCurrentPage('home'), [])

  const handleNicknameSubmit = useCallback((nickname) => {
    const clean = String(nickname || '').trim().slice(0, 24)
    if (!clean) return false

    setPlayerNickname(clean)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('wb.nickname', clean)
    }

    if (socket.current?.sendNickname) {
      socket.current.sendNickname(clean, playerId)
    }

    setCurrentPage('map')
    return true
  }, [playerId])

  let pageNode = null

  if (currentPage === 'home') {
    pageNode = React.createElement(HomePage, {
      nickname: playerNickname,
      onSubmitNickname: handleNicknameSubmit,
      onContinue: goToMap,
      hasNickname: Boolean(playerNickname)
    })
  } else if (currentPage === 'map') {
    pageNode = React.createElement(MapPage, {
      state,
      onEnterArena: enterArena,
      nickname: playerNickname
    })
  } else if (currentPage === 'arena') {
    pageNode = React.createElement(ArenaPage, {
      state,
      playerId,
      playerNickname,
      onExit: exitArena,
      socket: socket.current,
      qteGrantEvent,
      qteResultEvent,
      clickResultEvent,
      combatTickEvent,
      chatMessages
    })
  } else {
    pageNode = React.createElement(EndPage, {
      playerId,
      playerNickname,
      matchEndData,
      onBackHome: goToHome,
      onBackMap: goToMap
    })
  }

  return React.createElement('div', { className: 'app' }, pageNode)
}
