import React, { useState, useRef, useEffect, useCallback } from 'react'
import HomePage from './pages/HomePage'
import MapPage from './pages/MapPage'
import ArenaPage from './pages/ArenaPage'
import EndPage from './pages/EndPage'
import { AUDIO_MUTED_STORAGE_KEY, AUDIO_STORAGE_KEY } from './config/audioConfig'
import audioManager from './services/audioManager'
import createSocket from './socket'
import './styles.css'

function readNicknameCookie() {
  if (typeof document === 'undefined') return ''

  const cookies = String(document.cookie || '').split(';')
  for (const entry of cookies) {
    const trimmed = entry.trim()
    if (!trimmed.startsWith('wb.nickname=')) continue

    try {
      return decodeURIComponent(trimmed.slice('wb.nickname='.length))
    } catch {
      return trimmed.slice('wb.nickname='.length)
    }
  }

  return ''
}

function readStoredNickname() {
  if (typeof window === 'undefined') return ''

  const localValue = window.localStorage.getItem('wb.nickname') || ''
  if (localValue) return localValue

  return readNicknameCookie()
}

function persistNickname(value) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('wb.nickname', value)
  }

  if (typeof document !== 'undefined') {
    document.cookie = `wb.nickname=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`
  }
}

function readStoredAudioMuted() {
  if (typeof window === 'undefined') return true

  const mutedStored = window.localStorage.getItem(AUDIO_MUTED_STORAGE_KEY)
  if (mutedStored !== null) {
    return mutedStored === 'true'
  }

  // Compatibilite avec l ancien stockage base sur "enabled".
  const legacyEnabledStored = window.localStorage.getItem(AUDIO_STORAGE_KEY)
  if (legacyEnabledStored !== null) {
    return legacyEnabledStored !== 'true'
  }

  return false
}

function persistAudioMuted(value) {
  if (typeof window !== 'undefined') {
    const muted = Boolean(value)
    window.localStorage.setItem(AUDIO_MUTED_STORAGE_KEY, String(muted))
    window.localStorage.setItem(AUDIO_STORAGE_KEY, String(!muted))
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('map')
  const [state, setState] = useState(null)
  const [playerId, setPlayerId] = useState(null)
  const [playerNickname, setPlayerNickname] = useState(() => {
    return readStoredNickname()
  })
  const [matchEndData, setMatchEndData] = useState(null)
  const [audioMuted, setAudioMuted] = useState(() => readStoredAudioMuted())
  const [chatMessages, setChatMessages] = useState([])
  const [qteGrantEvent, setQteGrantEvent] = useState(null)
  const [qteResultEvent, setQteResultEvent] = useState(null)
  const [clickResultEvent, setClickResultEvent] = useState(null)
  const [combatTickEvent, setCombatTickEvent] = useState(null)
  const [bossAttackWarningEvent, setBossAttackWarningEvent] = useState(null)
  const [bossAttackResolvedEvent, setBossAttackResolvedEvent] = useState(null)
  const socket = useRef(null)
  const playerIdRef = useRef(null)

  useEffect(() => {
    playerIdRef.current = playerId
  }, [playerId])

  useEffect(() => {
    audioManager.setMuted(audioMuted)
  }, [audioMuted])

  useEffect(() => {
    if (audioMuted || typeof window === 'undefined') return undefined

    let disposed = false
    const unlockAudio = () => {
      if (disposed) return
      audioManager.unlock()
    }

    window.addEventListener('pointerdown', unlockAudio, { once: true })
    window.addEventListener('keydown', unlockAudio, { once: true })

    return () => {
      disposed = true
      window.removeEventListener('pointerdown', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
    }
  }, [audioMuted])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handleStorage = (event) => {
      if (event.key !== AUDIO_MUTED_STORAGE_KEY && event.key !== AUDIO_STORAGE_KEY) return
      setAudioMuted(readStoredAudioMuted())
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

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
      if (msg.type === 'dead') {
        setState(msg.data)
        audioManager.play('bossDeath')
      }
      if (msg.type === 'match_end') {
        setMatchEndData(msg.data)
        setCurrentPage('end')
        audioManager.play(msg.data?.outcome === 'defeat' ? 'matchDefeat' : 'matchVictory')
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
      if (msg.type === 'boss_attack_warning') {
        setBossAttackWarningEvent({
          ...msg.data,
          receivedAt: Date.now()
        })
      }
      if (msg.type === 'boss_attack_resolved') {
        setBossAttackResolvedEvent({
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
        if (msg.data?.playerId && msg.data.playerId !== playerIdRef.current) {
          audioManager.play('chatReceive')
        }
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

  const enterArena = useCallback((bossId) => {
    if (bossId && socket.current?.sendSelectBoss) {
      socket.current.sendSelectBoss(bossId)
    }

    if (bossId) {
      setState((prevState) => {
        if (!prevState) return prevState
        const bosses = Array.isArray(prevState.bosses) ? prevState.bosses : []
        const selectedBoss = bosses.find((boss) => boss.id === bossId)
        if (!selectedBoss) return prevState

        return {
          ...prevState,
          boss: selectedBoss,
          bossEncounter: {
            ...(prevState.bossEncounter || {}),
            primaryBossId: selectedBoss.id
          }
        }
      })
    }

    setCurrentPage('arena')
  }, [])
  const exitArena = useCallback(() => {
    audioManager.play('returnMap')
    setCurrentPage('map')
  }, [])
  const goToMap = useCallback(() => setCurrentPage('map'), [])
  const goToHome = useCallback(() => setCurrentPage('home'), [])

  const handleToggleAudioMute = useCallback(async () => {
    if (!audioMuted) {
      audioManager.play('uiToggleOff')
      audioManager.setMuted(true)
      setAudioMuted(true)
      persistAudioMuted(true)
      return
    }

    audioManager.setMuted(false)
    setAudioMuted(false)
    persistAudioMuted(false)
    await audioManager.unlock()
    audioManager.play('uiToggleOn')
  }, [audioMuted])

  const handleNicknameSubmit = useCallback((nickname) => {
    const clean = String(nickname || '').trim().slice(0, 24)
    if (!clean) return false

    setPlayerNickname(clean)
    persistNickname(clean)

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
      onContinue: goToMap,
      hasNickname: Boolean(playerNickname),
      audioMuted,
      onToggleAudioMute: handleToggleAudioMute
    })
  } else if (currentPage === 'map') {
    pageNode = React.createElement(MapPage, {
      state,
      onEnterArena: enterArena,
      nickname: playerNickname,
      hasNickname: Boolean(playerNickname),
      onSubmitNickname: handleNicknameSubmit,
      audioMuted,
      onToggleAudioMute: handleToggleAudioMute
    })
  } else if (currentPage === 'arena') {
    pageNode = React.createElement(ArenaPage, {
      state,
      playerId,
      playerNickname,
      audioMuted,
      onToggleAudioMute: handleToggleAudioMute,
      onExit: exitArena,
      socket: socket.current,
      qteGrantEvent,
      qteResultEvent,
      clickResultEvent,
      combatTickEvent,
      bossAttackWarningEvent,
      bossAttackResolvedEvent,
      chatMessages
    })
  } else {
    pageNode = React.createElement(EndPage, {
      playerId,
      playerNickname,
      matchEndData,
      onBackHome: goToHome,
      onBackMap: goToMap,
      audioMuted,
      onToggleAudioMute: handleToggleAudioMute
    })
  }

  return React.createElement('div', { className: 'app' }, pageNode)
}
