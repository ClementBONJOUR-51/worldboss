import React, { useState, useRef, useEffect } from 'react'
import { getArenaBackgroundForBoss } from '../arenaBackgrounds'
import SoldierPanel from '../components/SoldierPanel'

export default function ArenaPage({ state, playerId, onExit, socket, qteGrantEvent, qteResultEvent, clickResultEvent, combatTickEvent }) {
  const [isFlashing, setIsFlashing] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [isLightShaking, setIsLightShaking] = useState(false)
  const [floatingDamages, setFloatingDamages] = useState([])
  const [activeQte, setActiveQte] = useState(null)
  const [qteFeedback, setQteFeedback] = useState(null)
  const [bossHpRedPercent, setBossHpRedPercent] = useState(null)
  const [bossHpWhitePercent, setBossHpWhitePercent] = useState(null)
  const [bossHpWhiteDurationMs, setBossHpWhiteDurationMs] = useState(1000)
  const [prevBossHp, setPrevBossHp] = useState(null)
  const [bossEmojiSizePx, setBossEmojiSizePx] = useState(220)
  const arenaLeftRef = useRef(null)
  const containerRef = useRef(null)
  const qteTimeoutRef = useRef(null)
  const bossHpWhiteTimerRef = useRef(null)
  const pendingClickPositionsRef = useRef(new Map())

  function getDamageFontSize(damage) {
    const value = Math.max(1, Number(damage) || 1)
    return Math.max(18, Math.min(54, Math.round(20 + Math.log2(value + 1) * 4)))
  }

  function addFloatingDamage({ x, y, damage, source = 'click' }) {
    const rect = containerRef.current?.getBoundingClientRect()
    const zoneWidth = Math.max(120, Math.floor(rect?.width || 220))
    const zoneHeight = Math.max(120, Math.floor(rect?.height || 220))
    const safeDamage = Math.max(1, Math.floor(Number(damage) || 1))
    const fontSize = getDamageFontSize(safeDamage)
    const textLength = String(safeDamage).length
    const halfWidth = Math.max(10, Math.round(fontSize * (0.2 + textLength * 0.35)))
    const halfHeight = Math.max(10, Math.round(fontSize * 0.55))
    const left = Math.round((Number(x) || 0) - halfWidth)
    const top = Math.round((Number(y) || 0) - halfHeight)
    const clampedX = Math.max(4, Math.min(zoneWidth - halfWidth * 2 - 4, left))
    const clampedY = Math.max(4, Math.min(zoneHeight - halfHeight * 2 - 4, top))
    const id = Date.now() + Math.random()
    setFloatingDamages(prev => [...prev, { id, x: clampedX, y: clampedY, damage: safeDamage, source }])
    setTimeout(() => {
      setFloatingDamages(prev => prev.filter(d => d.id !== id))
    }, 1500)
  }

  function getRandomBossEdgePosition() {
    const rect = containerRef.current?.getBoundingClientRect()
    const width = Math.max(120, Math.floor(rect?.width || 220))
    const height = Math.max(120, Math.floor(rect?.height || 220))
    const side = Math.floor(Math.random() * 4)
    const inset = 18

    if (side === 0) {
      return { x: Math.max(inset, Math.floor(Math.random() * Math.max(1, width - inset * 2))) + inset, y: inset }
    }
    if (side === 1) {
      return { x: width - inset, y: Math.max(inset, Math.floor(Math.random() * Math.max(1, height - inset * 2))) + inset }
    }
    if (side === 2) {
      return { x: Math.max(inset, Math.floor(Math.random() * Math.max(1, width - inset * 2))) + inset, y: height - inset }
    }
    return { x: inset, y: Math.max(inset, Math.floor(Math.random() * Math.max(1, height - inset * 2))) + inset }
  }

  function clearQteTimeout() {
    if (qteTimeoutRef.current) {
      clearTimeout(qteTimeoutRef.current)
      qteTimeoutRef.current = null
    }
  }

  function getBossQtePosition() {
    const bounds = containerRef.current?.getBoundingClientRect()
    const width = Math.max(220, Math.floor(bounds?.width || 320))
    const height = Math.max(220, Math.floor(bounds?.height || 320))
    const inset = 36
    const deadZoneHalfWidth = Math.max(24, Math.floor(width * 0.14))
    const deadZoneHalfHeight = Math.max(24, Math.floor(height * 0.14))
    const centerX = Math.floor(width / 2)
    const centerY = Math.floor(height / 2)

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const x = Math.max(inset, Math.min(width - inset, Math.floor(Math.random() * width)))
      const y = Math.max(inset, Math.min(height - inset, Math.floor(Math.random() * height)))
      const inCenterDeadZone = Math.abs(x - centerX) < deadZoneHalfWidth && Math.abs(y - centerY) < deadZoneHalfHeight
      if (!inCenterDeadZone) {
        return { x, y }
      }
    }

    const fallbackOffsets = [
      { x: -deadZoneHalfWidth * 2, y: -deadZoneHalfHeight * 2 },
      { x: deadZoneHalfWidth * 2, y: -deadZoneHalfHeight * 2 },
      { x: -deadZoneHalfWidth * 2, y: deadZoneHalfHeight * 2 },
      { x: deadZoneHalfWidth * 2, y: deadZoneHalfHeight * 2 }
    ]
    const offset = fallbackOffsets[Math.floor(Math.random() * fallbackOffsets.length)]
    return {
      x: Math.max(inset, Math.min(width - inset, centerX + offset.x)),
      y: Math.max(inset, Math.min(height - inset, centerY + offset.y))
    }
  }

  // Detect when other players deal damage
  useEffect(() => {
    const currentHp = state?.boss?.hp ?? 0
    if (prevBossHp !== null && currentHp < prevBossHp) {
      setIsLightShaking(true)
      setTimeout(() => setIsLightShaking(false), 150)
    }
    setPrevBossHp(currentHp)
  }, [state?.boss?.hp, prevBossHp])

  useEffect(() => {
    const currentPercent = Math.max(0, Math.min(100, Math.round(((state?.boss?.hp ?? 0) / Math.max(1, state?.boss?.maxHp ?? 1)) * 100)))

    if (bossHpRedPercent === null || bossHpWhitePercent === null) {
      setBossHpRedPercent(currentPercent)
      setBossHpWhitePercent(currentPercent)
      setBossHpWhiteDurationMs(1000)
      return
    }

    if (currentPercent < bossHpRedPercent) {
      const previousPercent = bossHpRedPercent
      const dropPercent = Math.max(0, previousPercent - currentPercent)
      const whiteDuration = Math.max(1000, Math.min(2500, Math.round(1000 + Math.max(0, 4 - dropPercent) * 375)))

      setBossHpRedPercent(currentPercent)
      setBossHpWhiteDurationMs(whiteDuration)
      setBossHpWhitePercent(previousPercent)

      if (bossHpWhiteTimerRef.current) {
        clearTimeout(bossHpWhiteTimerRef.current)
      }

      bossHpWhiteTimerRef.current = setTimeout(() => {
        setBossHpWhitePercent(currentPercent)
      }, 40)
      return
    }

    setBossHpRedPercent(currentPercent)
    setBossHpWhitePercent(currentPercent)
    setBossHpWhiteDurationMs(1000)
  }, [state?.boss?.hp, state?.boss?.maxHp, bossHpRedPercent, bossHpWhitePercent])

  useEffect(() => {
    if (!qteGrantEvent?.qteId) return

    const now = Date.now()
    const msLeft = Math.max(0, (qteGrantEvent.expiresAt || now) - now)
    if (msLeft <= 0) return

    const pos = getBossQtePosition()
    clearQteTimeout()
    setQteFeedback(null)
    setActiveQte({
      qteId: qteGrantEvent.qteId,
      tier: qteGrantEvent.tier,
      color: qteGrantEvent.color,
      x: pos.x,
      y: pos.y,
      expiresAt: qteGrantEvent.expiresAt
    })

    qteTimeoutRef.current = setTimeout(() => {
      setActiveQte((current) => {
        if (current && current.qteId === qteGrantEvent.qteId) {
          return null
        }
        return current
      })
    }, msLeft)
  }, [qteGrantEvent])

  useEffect(() => {
    if (!qteResultEvent) return

    const feedbackId = Date.now() + Math.random()

    if (qteResultEvent.ok) {
      setQteFeedback({
        kind: 'success',
        text: `QTE +${qteResultEvent.damage}`,
        id: feedbackId
      })

      const rect = containerRef.current?.getBoundingClientRect()
      const centerX = Math.max(0, Math.floor((rect?.width || 240) / 2))
      const centerY = Math.max(0, Math.floor((rect?.height || 240) / 2))
      addFloatingDamage({ x: centerX, y: centerY, damage: qteResultEvent.damage, source: 'qte' })
    } else {
      const reasonMap = {
        cooldown: 'Cooldown actif',
        expired: 'QTE expiré',
        invalid_qte_id: 'QTE invalide',
        no_active_qte: 'Aucun QTE actif'
      }
      setQteFeedback({
        kind: 'error',
        text: reasonMap[qteResultEvent.reason] || 'QTE refusé',
        id: feedbackId
      })
    }

    setActiveQte((current) => {
      if (!current) return current
      if (qteResultEvent.ok) return null
      return current
    })

    setTimeout(() => {
      setQteFeedback((current) => {
        if (!current) return null
        return current.id === feedbackId ? null : current
      })
    }, 1200)
  }, [qteResultEvent])

  useEffect(() => {
    return () => clearQteTimeout()
  }, [])

  useEffect(() => {
    return () => {
      if (bossHpWhiteTimerRef.current) {
        clearTimeout(bossHpWhiteTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateBossSize = () => {
      const rect = container.getBoundingClientRect()
      const nextSize = Math.max(120, Math.floor(Math.min(rect.width, rect.height) * 0.95))
      setBossEmojiSizePx(prev => (prev === nextSize ? prev : nextSize))
    }

    updateBossSize()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateBossSize)
      return () => window.removeEventListener('resize', updateBossSize)
    }

    const observer = new ResizeObserver(() => updateBossSize())
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!clickResultEvent?.receivedAt) return
    if (!clickResultEvent.ok || !state?.boss?.alive) return

    const clickPos = clickResultEvent.clickId ? pendingClickPositionsRef.current.get(clickResultEvent.clickId) : null
    if (clickResultEvent.clickId) {
      pendingClickPositionsRef.current.delete(clickResultEvent.clickId)
    }

    const fallback = { x: 120, y: 120 }
    const pos = clickPos || fallback
    addFloatingDamage({ x: pos.x, y: pos.y, damage: clickResultEvent.damage, source: 'click' })
  }, [clickResultEvent, state?.boss?.alive])

  useEffect(() => {
    if (!combatTickEvent?.receivedAt || !state?.boss?.alive) return
    const passiveDamage = Math.max(0, Math.floor(Number(combatTickEvent.passiveDamageTotal) || 0))
    if (passiveDamage <= 0) return

    const count = Math.max(1, Math.min(4, Math.ceil(passiveDamage / 12)))
    const perHit = Math.max(1, Math.round(passiveDamage / count))

    for (let i = 0; i < count; i += 1) {
      const pos = getRandomBossEdgePosition()
      const spread = i === count - 1 ? passiveDamage - perHit * (count - 1) : perHit
      addFloatingDamage({ x: pos.x, y: pos.y, damage: spread, source: 'passive' })
    }
  }, [combatTickEvent, state?.boss?.alive])

  const handleBossClick = (e) => {
    if (socket && state?.boss?.alive) {
      const clickId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      // Trigger flash animation
      setIsFlashing(true)
      setTimeout(() => setIsFlashing(false), 150)

      // Trigger shake animation
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 400)

      const rect = containerRef.current?.getBoundingClientRect()
      const x = e.clientX - (rect?.left || 0)
      const y = e.clientY - (rect?.top || 0)
      pendingClickPositionsRef.current.set(clickId, { x, y })
      if (pendingClickPositionsRef.current.size > 24) {
        const firstKey = pendingClickPositionsRef.current.keys().next().value
        if (firstKey) pendingClickPositionsRef.current.delete(firstKey)
      }

      socket.sendClick(playerId, clickId, x, y)
    }
  }

  const handleQteClick = (e) => {
    e.stopPropagation()
    if (!activeQte || !socket || !state?.boss?.alive) return
    socket.sendQteHit(activeQte.qteId)
    clearQteTimeout()
    setActiveQte(null)
  }

  const handleStructureBuild = (structureKey) => {
    if (!socket || !state?.boss?.alive) return
    socket.sendStructureBuild(structureKey)
  }

  const handleEmoteSelect = (emote) => {
    if (!socket || !playerId) return
    socket.sendEmote(emote, playerId)
  }

  const hp = Math.max(0, state?.boss?.hp ?? 0)
  const maxHp = Math.max(1, state?.boss?.maxHp ?? 1)
  const percent = Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)))
  const bossName = state?.boss?.name ?? 'Boss'
  const alive = state?.boss?.alive ?? false
  const targetCity = state?.boss?.targetCity ?? 'Ville cible'
  const bossAdvancePercent = Math.max(0, Math.min(100, Number(state?.boss?.progressPercent ?? (100 - percent))))
  const connectedPlayers = state?.connectedPlayers ?? []
  const playerEmotes = state?.playerEmotes || {}
  const currentPlayerEmote = playerEmotes[playerId] || '🪖'
  const emoteChoices = ['🤩', '🫡', '😁', '😎', '😰']
  const structures = state?.structures || {}
  const ammoByPlayer = state?.ammoByPlayer || {}
  const playerAmmo = Math.max(0, Math.floor(Number(ammoByPlayer[playerId] || 0)))
  const ammoFactory = structures.ammoFactory || {}
  const frontlineCamp = structures.frontlineCamp || {}
  const trainingCenter = structures.trainingCenter || {}
  const artilleryBattery = structures.artilleryBattery || {}
  const headquarters = structures.headquarters || {}
  const arenaBackground = getArenaBackgroundForBoss(state?.boss)
  const arenaPageStyle = arenaBackground
    ? {
      backgroundImage: `linear-gradient(rgba(10, 12, 24, 0.62), rgba(11, 18, 35, 0.78)), url(${arenaBackground})`
    }
    : undefined

  // Debug logging
  if (typeof window !== 'undefined' && connectedPlayers.length > 0) {
    console.log('Connected Players:', connectedPlayers);
  }

  // Get top 5 contributors
  const topContributors = Object.entries(state?.contributions || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const leftSoldiers = []
  const rightSoldiers = []
  const bottomSoldiers = []
  connectedPlayers.forEach((pid, index) => {
    if (index % 3 === 0) {
      bottomSoldiers.push(pid)
    } else if (index % 3 === 1) {
      leftSoldiers.push(pid)
    } else {
      rightSoldiers.push(pid)
    }
  })

  const structureIconEntries = [
    { key: 'ammoFactory', label: 'Usines', icon: '🏭', level: ammoFactory.level ?? 0 },
    { key: 'frontlineCamp', label: 'Camps', icon: '⛺', level: frontlineCamp.level ?? 0 },
    { key: 'trainingCenter', label: 'Acad.', icon: '🎯', level: trainingCenter.level ?? 0 },
    { key: 'artilleryBattery', label: 'Batteries', icon: '🧨', level: artilleryBattery.level ?? 0 },
    { key: 'headquarters', label: 'QG', icon: '🏛️', level: headquarters.level ?? 0 }
  ]

  return React.createElement(
    'div',
    { className: 'arena-page', style: arenaPageStyle },
    React.createElement(
      'div',
      { className: 'arena-main' },
      React.createElement(
        'div',
        { className: 'arena-grid', ref: arenaLeftRef },
        React.createElement(
          'div',
          { className: 'arena-ammo-corner' },
          React.createElement('i', { className: 'bi bi-bullseye ammo-icon', 'aria-hidden': 'true' }),
          React.createElement('div', { className: 'ammo-corner-value' }, `${playerAmmo}`)
        ),
        React.createElement(
          'div',
          { className: 'arena-cell-controls' },
          React.createElement(
            'button',
            { className: 'exit-btn redeploy-btn', onClick: onExit },
            React.createElement('i', { className: 'bi bi-backpack-fill redeploy-icon', 'aria-hidden': 'true' }),
            React.createElement('span', { className: 'redeploy-label' }, 'Redéploiement')
          )
        ),
        React.createElement(
          'div',
          { className: 'hp-section arena-top-hp' },
          React.createElement('div', { className: 'boss-name' }, bossName),
          // React.createElement('div', { className: 'hp-label-red' }, `${hp} / ${maxHp} HP`),
          React.createElement(
            'div',
            { className: 'hp-bar-large hp-bar-large-overlay' },
            React.createElement('div', { className: 'hp-fill-large-white', style: { width: `${bossHpWhitePercent ?? percent}%`, transitionDuration: `${bossHpWhiteDurationMs}ms` } }),
            React.createElement('div', { className: 'hp-fill-large-red', style: { width: `${bossHpRedPercent ?? percent}%` } })
            ,React.createElement('div', { className: 'hp-overlay-text' }, `${hp} / ${maxHp}`)
          )
        ),
        React.createElement(
          'div',
          { className: 'boss-path-panel' },
          React.createElement('div', { className: 'boss-path-title' }, 'Progression invasion'),
          React.createElement(
            'div',
            { className: 'boss-path-track' },
            React.createElement('div', { className: 'boss-path-fill', style: { width: `${bossAdvancePercent}%` } }),
            React.createElement('div', { className: 'boss-path-marker', style: { left: `${bossAdvancePercent}%` } }, '🦑')
          ),
          React.createElement(
            'div',
            { className: 'boss-path-labels' },
            React.createElement('span', null, 'Spawn'),
            React.createElement('span', null, targetCity)
          )
        ),
        React.createElement(
          'div',
          { className: 'arena-empty-cell-left emote-section' },
          React.createElement('div', { className: 'emote-title' }, 'Emote escouade'),
          React.createElement('div', { className: 'emote-current' }, `Actuel: ${currentPlayerEmote}`),
          React.createElement(
            'div',
            { className: 'emote-grid' },
            emoteChoices.map((emote) => {
              const active = currentPlayerEmote === emote
              return React.createElement(
                'button',
                {
                  key: emote,
                  className: `emote-btn ${active ? 'emote-btn-active' : ''}`,
                  onClick: () => handleEmoteSelect(emote),
                  title: `Choisir ${emote}`
                },
                emote
              )
            })
          )
        ),
        React.createElement(SoldierPanel, {
          title: 'Escouade gauche',
          playerIds: leftSoldiers,
          contributions: state?.contributions,
          playerEmotes,
          currentPlayerId: playerId,
          className: 'soldier-side-left'
        }),
        React.createElement(
          'div',
          { className: 'boss-stage' },
          React.createElement(
            'div',
            {
              className: `boss-container ${isFlashing ? 'boss-flash' : ''} ${isShaking ? 'shake' : ''} ${isLightShaking ? 'light-shake' : ''} ${alive ? 'boss-alive' : 'boss-dead'}`,
              onClick: handleBossClick,
              style: { cursor: alive ? 'pointer' : 'default' },
              ref: containerRef
            },
            React.createElement('div', { className: 'boss-emoji', style: { fontSize: `${bossEmojiSizePx}px` } }, alive ? '🦑' : '💀'),
            floatingDamages.map(dmg =>
              React.createElement(
                'div',
                {
                  key: dmg.id,
                  className: `floating-damage ${dmg.source === 'passive' ? 'floating-damage-passive' : 'floating-damage-click'}`,
                  style: {
                    left: dmg.x + 'px',
                    top: dmg.y + 'px',
                    fontSize: getDamageFontSize(dmg.damage) + 'px',
                    animation: 'float-up 1.5s ease-out forwards'
                  }
                },
                dmg.damage
              )
            )
          ),
          activeQte && React.createElement(
            'button',
            {
              className: `qte-reticle qte-${activeQte.tier || 'bronze'}`,
              style: {
                left: activeQte.x + 'px',
                top: activeQte.y + 'px',
                color: activeQte.color
              },
              onClick: handleQteClick,
              title: `QTE ${activeQte.tier || 'bronze'}`
            },
            '⊕'
          )
        ),
        React.createElement(SoldierPanel, {
          playerIds: rightSoldiers,
          contributions: state?.contributions,
          playerEmotes,
          currentPlayerId: playerId,
          className: 'soldier-side-right'
        }),
        React.createElement(SoldierPanel, {
          title: 'Escouade ligne de front',
          playerIds: bottomSoldiers,
          contributions: state?.contributions,
          playerEmotes,
          currentPlayerId: playerId,
          className: 'soldier-side-wide',
          center: true
        }),
        React.createElement(
          'div',
          { className: 'structures-wide' },
          React.createElement('div', { className: 'structures-wide-title' }, 'Structures deployees'),
          React.createElement(
            'div',
            { className: 'structures-icon-row' },
            structureIconEntries.map((entry) => {
              const isAmmoFactory = entry.key === 'ammoFactory'
              return React.createElement(
                'div',
                {
                  key: entry.key,
                  className: 'structure-icon-chip',
                  title: `${entry.label} niveau ${entry.level}${isAmmoFactory ? ` - ${playerAmmo} balles` : ''}`,
                  onClick: () => handleStructureBuild(entry.key)
                },
                React.createElement('div', { className: 'structure-icon' }, entry.icon),
                React.createElement('div', { className: 'structure-icon-label' }, entry.label),
                isAmmoFactory 
                  ? React.createElement('div', { className: 'structure-icon-ammo' }, `${playerAmmo}`)
                  : React.createElement('div', { className: 'structure-icon-level' }, `Niv. ${entry.level}`)
              )
            })
          )
        ),
      ),
      React.createElement(
        'aside',
        { className: 'arena-right-drawer' },
        React.createElement(
          'div',
          { className: 'upgrades-panel' },
          React.createElement(
            'div',
            { className: 'drawer-navbar' },
            React.createElement('div', { className: 'drawer-navbar-brand' }, 'Ameliorations structures')
          ),
          React.createElement('div', { className: 'upgrades-title' }, 'Actions partagees'),
          React.createElement(
            'div',
            { className: 'structures-list' },
            React.createElement(
              'div',
              {
                className: 'structure-card',
                style: { '--build-progress': `${ammoFactory.constructionPercent || 0}%` },
                onClick: () => handleStructureBuild('ammoFactory')
              },
              React.createElement('div', { className: 'structure-progress-badge' }, `${Math.round(ammoFactory.constructionPercent || 0)}%`),
              React.createElement(
                'div',
                { className: 'structure-name-row' },
                React.createElement('div', { className: 'structure-name' }, 'Usine a munitions'),
                React.createElement('button', { className: 'info-dot', title: 'Info structure', 'data-tooltip': 'Produit la ressource principale. Genere des munitions partagees; chaque joueur en recoit une part egale. Sans munitions, impossible d infliger des degats au clic.' }, 'i')
              ),
              React.createElement('div', { className: 'structure-stat' }, `Niveau: ${ammoFactory.level ?? 1}`),
              React.createElement('div', { className: 'structure-stat' }, `Production: ${ammoFactory.productionPerSec ?? 0} munitions/sec`),
              React.createElement('div', { className: 'structure-stat' }, `Construction: ${Math.round(ammoFactory.constructionProgress || 0)} / ${Math.max(1, Math.round(ammoFactory.nextLevelRequirement || 1))}`)
            ),
            React.createElement(
              'div',
              {
                className: 'structure-card',
                style: { '--build-progress': `${frontlineCamp.constructionPercent || 0}%` },
                onClick: () => handleStructureBuild('frontlineCamp')
              },
              React.createElement('div', { className: 'structure-progress-badge' }, `${Math.round(frontlineCamp.constructionPercent || 0)}%`),
              React.createElement(
                'div',
                { className: 'structure-name-row' },
                React.createElement('div', { className: 'structure-name' }, 'Camp de premiere ligne'),
                React.createElement('button', { className: 'info-dot', title: 'Info structure', 'data-tooltip': 'Genere les QTE locaux. Plus le camp est ameliore, plus les QTE apparaissent souvent et montent en qualite (Bronze vers Diamant).' }, 'i')
              ),
              React.createElement('div', { className: 'structure-stat' }, `Niveau: ${frontlineCamp.level ?? 1}`),
              React.createElement('div', { className: 'structure-stat' }, `QTE: ${frontlineCamp.enabled ? 'Actif' : 'Inactif'}`),
              React.createElement('div', { className: 'structure-stat' }, `Frequence x${Number(frontlineCamp.chanceMultiplier || 1).toFixed(2)} | Tier boost ${frontlineCamp.tierBoost ?? 0}`),
              React.createElement('div', { className: 'structure-stat' }, `Construction: ${Math.round(frontlineCamp.constructionProgress || 0)} / ${Math.max(1, Math.round(frontlineCamp.nextLevelRequirement || 1))}`)
            ),
            React.createElement(
              'div',
              {
                className: 'structure-card',
                style: { '--build-progress': `${trainingCenter.constructionPercent || 0}%` },
                onClick: () => handleStructureBuild('trainingCenter')
              },
              React.createElement('div', { className: 'structure-progress-badge' }, `${Math.round(trainingCenter.constructionPercent || 0)}%`),
              React.createElement(
                'div',
                { className: 'structure-name-row' },
                React.createElement('div', { className: 'structure-name' }, 'Academie de combat'),
                React.createElement('button', { className: 'info-dot', title: 'Info structure', 'data-tooltip': 'Ameliore les degats infliges a chaque clic de joueur. Plus le niveau monte, plus chaque munition est efficace.' }, 'i')
              ),
              React.createElement('div', { className: 'structure-stat' }, `Niveau: ${trainingCenter.level ?? 1}`),
              React.createElement('div', { className: 'structure-stat' }, `Degats/clic: ${trainingCenter.clickDamagePerClick ?? 1}`),
              React.createElement('div', { className: 'structure-stat' }, `Bonus clic: +${trainingCenter.clickDamageBonus ?? 0}`),
              React.createElement('div', { className: 'structure-stat' }, `Construction: ${Math.round(trainingCenter.constructionProgress || 0)} / ${Math.max(1, Math.round(trainingCenter.nextLevelRequirement || 1))}`)
            ),
            React.createElement(
              'div',
              {
                className: 'structure-card',
                style: { '--build-progress': `${artilleryBattery.constructionPercent || 0}%` },
                onClick: () => handleStructureBuild('artilleryBattery')
              },
              React.createElement('div', { className: 'structure-progress-badge' }, `${Math.round(artilleryBattery.constructionPercent || 0)}%`),
              React.createElement(
                'div',
                { className: 'structure-name-row' },
                React.createElement('div', { className: 'structure-name' }, 'Batterie de siege'),
                React.createElement('button', { className: 'info-dot', title: 'Info structure', 'data-tooltip': 'Lance des bombardements coordonnes sur le boss. Cette structure genere les degats passifs globaux de l armee.' }, 'i')
              ),
              React.createElement('div', { className: 'structure-stat' }, `Niveau: ${artilleryBattery.level ?? 1}`),
              React.createElement('div', { className: 'structure-stat' }, `DPS passif global: ${artilleryBattery.passiveDps ?? 0}`),
              React.createElement('div', { className: 'structure-stat' }, `Construction: ${Math.round(artilleryBattery.constructionProgress || 0)} / ${Math.max(1, Math.round(artilleryBattery.nextLevelRequirement || 1))}`)
            ),
            React.createElement(
              'div',
              {
                className: 'structure-card',
                style: { '--build-progress': `${headquarters.constructionPercent || 0}%` },
                onClick: () => handleStructureBuild('headquarters')
              },
              React.createElement('div', { className: 'structure-progress-badge' }, `${Math.round(headquarters.constructionPercent || 0)}%`),
              React.createElement(
                'div',
                { className: 'structure-name-row' },
                React.createElement('div', { className: 'structure-name' }, 'Quartier general (optionnel)'),
                React.createElement('button', { className: 'info-dot', title: 'Info structure', 'data-tooltip': 'Booste les QTE rares et prepare des effets globaux avances. Batiment reserve aux phases tardives.' }, 'i')
              ),
              React.createElement('div', { className: 'structure-stat' }, `Niveau: ${headquarters.level ?? 0}`),
              React.createElement('div', { className: 'structure-stat' }, `Construction: ${Math.round(headquarters.constructionProgress || 0)} / ${Math.max(1, Math.round(headquarters.nextLevelRequirement || 1))}`)
            )
          )
        )
      )
    ),
    qteFeedback && React.createElement(
      'div',
      {
        className: `qte-feedback qte-feedback-${qteFeedback.kind}`
      },
      qteFeedback.text
    )
  )
}
