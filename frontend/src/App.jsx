import React, { useState, useRef, useEffect, useCallback } from 'react'
import MapPage from './pages/MapPage'
import ArenaPage from './pages/ArenaPage'
import createSocket from './socket'
import './styles.css'

export default function App() {
  const [currentPage, setCurrentPage] = useState('map')
  const [state, setState] = useState(null)
  const [playerId, setPlayerId] = useState(null)
  const [qteGrantEvent, setQteGrantEvent] = useState(null)
  const [qteResultEvent, setQteResultEvent] = useState(null)
  const [clickResultEvent, setClickResultEvent] = useState(null)
  const [combatTickEvent, setCombatTickEvent] = useState(null)
  const socket = useRef(null)

  useEffect(() => {
    socket.current = createSocket((msg) => {
      if (msg.type === 'welcome') setPlayerId(msg.data?.playerId || null)
      if (msg.type === 'state') setState(msg.data)
      if (msg.type === 'dead') setState(msg.data) // receive full state with connectedPlayers
      if (msg.type === 'qte_grant') {
        setQteGrantEvent({
          ...msg.data,
          receivedAt: Date.now()
        })
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

  return React.createElement(
    'div',
    { className: 'app' },
    currentPage === 'map'
      ? React.createElement(MapPage, { state, onEnterArena: enterArena, socket: socket.current })
      : React.createElement(ArenaPage, {
          state,
          playerId,
          onExit: exitArena,
          socket: socket.current,
          qteGrantEvent,
          qteResultEvent,
          clickResultEvent,
          combatTickEvent
        })
  )
}
