import React, { useState, useRef, useEffect } from 'react'
import { getArenaBackgroundForBoss } from '../arenaBackgrounds'
import { arenaConfig, getArenaCssVars } from '../config/arenaConfig'
import SoldierPanel from '../components/SoldierPanel'
import TerminalChat from '../components/TerminalChat'
import audioManager from '../services/audioManager'

export default function ArenaPage({ state, playerId, audioMuted, onToggleAudioMute, onExit, socket, qteGrantEvent, qteResultEvent, clickResultEvent, structureBuildResultEvent, combatTickEvent, bossAttackWarningEvent, bossAttackResolvedEvent, chatMessages }) {
  const [isFlashing, setIsFlashing] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [isLightShaking, setIsLightShaking] = useState(false)
  const [noAmmoAlert, setNoAmmoAlert] = useState(false)
  const [floatingDamages, setFloatingDamages] = useState([])
  const [bombStrikes, setBombStrikes] = useState([])
  const [attackUiState, setAttackUiState] = useState(null)
  const [ghostBurstsByPlayer, setGhostBurstsByPlayer] = useState({})
  const [activeQte, setActiveQte] = useState(null)
  const [qteFeedback, setQteFeedback] = useState(null)
  const [bossHpRedPercent, setBossHpRedPercent] = useState(null)
  const [bossHpWhitePercent, setBossHpWhitePercent] = useState(null)
  const [bossHpWhiteDurationMs, setBossHpWhiteDurationMs] = useState(1000)
  const [prevBossHp, setPrevBossHp] = useState(null)
  const [bossEmojiSizePx, setBossEmojiSizePx] = useState(220)
  const [emoteMenuOpen, setEmoteMenuOpen] = useState(false)
  const arenaLeftRef = useRef(null)
  const bossStageRef = useRef(null)
  const containerRef = useRef(null)
  const qteTimeoutRef = useRef(null)
  const bossHpWhiteTimerRef = useRef(null)
  const pendingClickPositionsRef = useRef(new Map())
  const attackUiTimerRef = useRef(null)
  const ghostBurstTimersRef = useRef(new Map())
  const playedQteGrantRef = useRef(null)
  const playedBossWarningRef = useRef(null)
  const playedBossResolvedRef = useRef(null)
  const previousLocalInjuredRef = useRef(false)
  const activeQteRef = useRef(null)
  const currentBoss = state?.boss || null

  function getDamageFontSize(damage) {
    const value = Math.max(1, Number(damage) || 1)
    return Math.max(
      arenaConfig.floatingDamage.minFontSizePx,
      Math.min(
        arenaConfig.floatingDamage.maxFontSizePx,
        Math.round(arenaConfig.floatingDamage.baseFontSizePx + Math.log2(value + 1) * arenaConfig.floatingDamage.logScaleFactor)
      )
    )
  }

  function getStructureLabel(structureKey) {
    const labels = {
      ammoFactory: 'Usine a munitions',
      frontlineCamp: 'Camp de front',
      trainingCenter: 'Centre d entrainement',
      artilleryBattery: 'Batterie de siege',
      headquarters: 'Quartier general'
    }

    return labels[structureKey] || 'Structure'
  }

  function addFloatingDamage({ x, y, damage, source = 'click' }) {
    const rect = containerRef.current?.getBoundingClientRect()
    const zoneWidth = Math.max(arenaConfig.floatingDamage.minZoneSizePx, Math.floor(rect?.width || arenaConfig.floatingDamage.defaultZoneSizePx))
    const zoneHeight = Math.max(arenaConfig.floatingDamage.minZoneSizePx, Math.floor(rect?.height || arenaConfig.floatingDamage.defaultZoneSizePx))
    const safeDamage = Math.max(1, Math.floor(Number(damage) || 1))
    const fontSize = getDamageFontSize(safeDamage)
    const textLength = String(safeDamage).length
    const halfWidth = Math.max(arenaConfig.floatingDamage.minHalfWidthPx, Math.round(fontSize * (arenaConfig.floatingDamage.widthPaddingBase + textLength * arenaConfig.floatingDamage.widthPaddingPerDigit)))
    const halfHeight = Math.max(arenaConfig.floatingDamage.minHalfWidthPx, Math.round(fontSize * arenaConfig.floatingDamage.heightRatio))
    const left = Math.round((Number(x) || 0) - halfWidth)
    const top = Math.round((Number(y) || 0) - halfHeight)
    const clampedX = Math.max(arenaConfig.floatingDamage.edgePaddingPx, Math.min(zoneWidth - halfWidth * 2 - arenaConfig.floatingDamage.edgePaddingPx, left))
    const clampedY = Math.max(arenaConfig.floatingDamage.edgePaddingPx, Math.min(zoneHeight - halfHeight * 2 - arenaConfig.floatingDamage.edgePaddingPx, top))
    const id = Date.now() + Math.random()
    setFloatingDamages(prev => [...prev, { id, x: clampedX, y: clampedY, damage: safeDamage, source }])
    setTimeout(() => {
      setFloatingDamages(prev => prev.filter(d => d.id !== id))
    }, arenaConfig.floatingDamage.lifetimeMs)
  }

  function getBossFootImpactPosition(index = 0, total = 1) {
    const stageRect = bossStageRef.current?.getBoundingClientRect()
    const bossRect = containerRef.current?.getBoundingClientRect()
    const stageWidth = Math.max(arenaConfig.artillery.stageMinSizePx, Math.floor(stageRect?.width || bossRect?.width || arenaConfig.artillery.stageDefaultSizePx))
    const stageHeight = Math.max(arenaConfig.artillery.stageMinSizePx, Math.floor(stageRect?.height || bossRect?.height || arenaConfig.artillery.stageDefaultSizePx))
    const bossLeft = Math.max(0, Math.floor((bossRect?.left || 0) - (stageRect?.left || 0)))
    const bossTop = Math.max(0, Math.floor((bossRect?.top || 0) - (stageRect?.top || 0)))
    const bossWidth = Math.max(arenaConfig.artillery.bossMinSizePx, Math.floor(bossRect?.width || stageWidth * arenaConfig.artillery.bossFallbackWidthRatio))
    const bossHeight = Math.max(arenaConfig.artillery.bossMinSizePx, Math.floor(bossRect?.height || stageHeight * arenaConfig.artillery.bossFallbackHeightRatio))
    const impactBaseY = Math.max(
      arenaConfig.artillery.impactMinYpx,
      Math.min(stageHeight - arenaConfig.artillery.impactBottomInsetPx, bossTop + Math.floor(bossHeight * arenaConfig.artillery.impactHeightRatio))
    )
    const impactY = Math.max(
      arenaConfig.artillery.impactMinYpx,
      Math.min(
        stageHeight - arenaConfig.artillery.impactBottomInsetPx,
        impactBaseY + Math.round((Math.random() - 0.5) * arenaConfig.artillery.impactVerticalVariancePx * 2)
      )
    )
    const horizontalInset = Math.max(arenaConfig.artillery.horizontalInsetMinPx, Math.floor(bossWidth * arenaConfig.artillery.horizontalInsetRatio))
    const minImpactX = bossLeft + horizontalInset
    const maxImpactX = bossLeft + Math.max(horizontalInset + 1, bossWidth - horizontalInset)
    const laneBias = total > 1 ? ((index + 1) / (total + 1)) : 0.5
    const laneX = minImpactX + Math.round((maxImpactX - minImpactX) * laneBias)
    const randomSpan = Math.max(arenaConfig.artillery.randomSpanMinPx, Math.floor((maxImpactX - minImpactX) * arenaConfig.artillery.randomSpanRatio))
    const varianceX = Math.round((Math.random() - 0.5) * randomSpan * 2)
    const impactX = Math.max(18, Math.min(stageWidth - 18, laneX + varianceX))
    const startY = -Math.max(
      arenaConfig.artillery.spawnHeightMinPx,
      Math.floor(stageHeight * arenaConfig.artillery.spawnHeightStageRatio) + Math.floor(Math.random() * arenaConfig.artillery.spawnHeightVariancePx)
    )

    return { x: impactX, y: impactY, startY }
  }

  function addBombStrike({ x, y, startY, damage, layer, delayMs, durationMs }) {
    const safeDamage = Math.max(0, Math.floor(Number(damage) || 0))
    const id = Date.now() + Math.random()
    const safeDelayMs = Math.max(0, Math.floor(Number(delayMs) || 0))
    const safeDurationMs = Math.max(arenaConfig.artillery.fall.minDurationMs, Math.floor(Number(durationMs) || arenaConfig.artillery.fall.baseDurationMs))

    setBombStrikes((prev) => [...prev, { id, x, y, startY, layer: layer || 'front', delayMs: safeDelayMs, durationMs: safeDurationMs }])

    setTimeout(() => {
      audioManager.play('artilleryIncoming')
    }, Math.max(0, safeDelayMs - 160))

    setTimeout(() => {
      setBombStrikes((prev) => prev.filter((strike) => strike.id !== id))
      audioManager.play('artilleryImpact')
      if (safeDamage > 0) {
        addFloatingDamage({ x, y, damage: safeDamage, source: 'passive' })
      }
    }, safeDelayMs + safeDurationMs)
  }

  function clearQteTimeout() {
    if (qteTimeoutRef.current) {
      clearTimeout(qteTimeoutRef.current)
      qteTimeoutRef.current = null
    }
  }

  function getBossQtePosition() {
    const bounds = containerRef.current?.getBoundingClientRect()
    const width = Math.max(arenaConfig.qte.minBoundsPx, Math.floor(bounds?.width || arenaConfig.qte.defaultBoundsPx))
    const height = Math.max(arenaConfig.qte.minBoundsPx, Math.floor(bounds?.height || arenaConfig.qte.defaultBoundsPx))
    const inset = arenaConfig.qte.insetPx
    const deadZoneHalfWidth = Math.max(arenaConfig.qte.deadZoneMinPx, Math.floor(width * arenaConfig.qte.deadZoneWidthRatio))
    const deadZoneHalfHeight = Math.max(arenaConfig.qte.deadZoneMinPx, Math.floor(height * arenaConfig.qte.deadZoneHeightRatio))
    const centerX = Math.floor(width / 2)
    const centerY = Math.floor(height / 2)

    for (let attempt = 0; attempt < arenaConfig.qte.maxPlacementAttempts; attempt += 1) {
      const x = Math.max(inset, Math.min(width - inset, Math.floor(Math.random() * width)))
      const y = Math.max(inset, Math.min(height - inset, Math.floor(Math.random() * height)))
      const inCenterDeadZone = Math.abs(x - centerX) < deadZoneHalfWidth && Math.abs(y - centerY) < deadZoneHalfHeight
      if (!inCenterDeadZone) {
        return { x, y }
      }
    }

    const fallbackOffsets = [
      { x: -deadZoneHalfWidth * arenaConfig.qte.fallbackOffsetMultiplier, y: -deadZoneHalfHeight * arenaConfig.qte.fallbackOffsetMultiplier },
      { x: deadZoneHalfWidth * arenaConfig.qte.fallbackOffsetMultiplier, y: -deadZoneHalfHeight * arenaConfig.qte.fallbackOffsetMultiplier },
      { x: -deadZoneHalfWidth * arenaConfig.qte.fallbackOffsetMultiplier, y: deadZoneHalfHeight * arenaConfig.qte.fallbackOffsetMultiplier },
      { x: deadZoneHalfWidth * arenaConfig.qte.fallbackOffsetMultiplier, y: deadZoneHalfHeight * arenaConfig.qte.fallbackOffsetMultiplier }
    ]
    const offset = fallbackOffsets[Math.floor(Math.random() * fallbackOffsets.length)]
    return {
      x: Math.max(inset, Math.min(width - inset, centerX + offset.x)),
      y: Math.max(inset, Math.min(height - inset, centerY + offset.y))
    }
  }

  useEffect(() => {
    const currentHp = state?.boss?.hp ?? 0
    if (prevBossHp !== null && currentHp < prevBossHp) {
      const damageTaken = prevBossHp - currentHp

      setIsFlashing(true)
      setTimeout(() => setIsFlashing(false), arenaConfig.bossHit.flashMs)

      if (damageTaken >= arenaConfig.bossHit.heavyShakeThreshold) {
        setIsShaking(true)
        setTimeout(() => setIsShaking(false), arenaConfig.bossHit.heavyShakeMs)
      } else {
        setIsLightShaking(true)
        setTimeout(() => setIsLightShaking(false), arenaConfig.bossHit.lightShakeMs)
      }
    }
    setPrevBossHp(currentHp)
  }, [state?.boss?.hp, prevBossHp])

  useEffect(() => {
    setPrevBossHp(currentBoss?.hp ?? null)
    const currentPercent = Math.max(0, Math.min(100, Math.round((((currentBoss?.hp ?? 0) / Math.max(1, currentBoss?.maxHp ?? 1)) * 100))))
    setBossHpRedPercent(currentPercent)
    setBossHpWhitePercent(currentPercent)
    setBossHpWhiteDurationMs(arenaConfig.hpBar.initialWhiteDurationMs)
  }, [currentBoss?.id])

  useEffect(() => {
    const currentPercent = Math.max(0, Math.min(100, Math.round(((state?.boss?.hp ?? 0) / Math.max(1, state?.boss?.maxHp ?? 1)) * 100)))

    if (bossHpRedPercent === null || bossHpWhitePercent === null) {
      setBossHpRedPercent(currentPercent)
      setBossHpWhitePercent(currentPercent)
      setBossHpWhiteDurationMs(arenaConfig.hpBar.initialWhiteDurationMs)
      return
    }

    if (currentPercent < bossHpRedPercent) {
      const previousPercent = bossHpRedPercent
      const dropPercent = Math.max(0, previousPercent - currentPercent)
      const whiteDuration = Math.max(
        arenaConfig.hpBar.minWhiteDurationMs,
        Math.min(
          arenaConfig.hpBar.maxWhiteDurationMs,
          Math.round(
            arenaConfig.hpBar.baseWhiteDurationMs + Math.max(0, arenaConfig.hpBar.dropWindow - dropPercent) * arenaConfig.hpBar.dropStepMs
          )
        )
      )

      setBossHpRedPercent(currentPercent)
      setBossHpWhiteDurationMs(whiteDuration)
      setBossHpWhitePercent(previousPercent)

      if (bossHpWhiteTimerRef.current) {
        clearTimeout(bossHpWhiteTimerRef.current)
      }

      bossHpWhiteTimerRef.current = setTimeout(() => {
        setBossHpWhitePercent(currentPercent)
      }, arenaConfig.hpBar.whiteSyncDelayMs)
      return
    }

    setBossHpRedPercent(currentPercent)
    setBossHpWhitePercent(currentPercent)
    setBossHpWhiteDurationMs(arenaConfig.hpBar.initialWhiteDurationMs)
  }, [state?.boss?.hp, state?.boss?.maxHp, bossHpRedPercent, bossHpWhitePercent])

  useEffect(() => {
    activeQteRef.current = activeQte
  }, [activeQte])

  useEffect(() => {
    if (!qteGrantEvent?.qteId) return
    if (qteGrantEvent.playerId && qteGrantEvent.playerId !== playerId) return

    const now = Date.now()
    const msLeft = Math.max(0, (qteGrantEvent.expiresAt || now) - now)
    if (msLeft <= 0) return
    if (playedQteGrantRef.current !== qteGrantEvent.qteId) {
      playedQteGrantRef.current = qteGrantEvent.qteId
      audioManager.play('qteReady')
    }

    const currentQte = activeQteRef.current
    const currentPos = currentQte && currentQte.qteId === qteGrantEvent.qteId
      ? { x: currentQte.x, y: currentQte.y }
      : getBossQtePosition()
    clearQteTimeout()
    setQteFeedback(null)
    setActiveQte({
      qteId: qteGrantEvent.qteId,
      tier: qteGrantEvent.tier,
      color: qteGrantEvent.color,
      x: currentPos.x,
      y: currentPos.y,
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
  }, [qteGrantEvent, playerId])

  useEffect(() => {
    if (!qteResultEvent) return

    const feedbackId = Date.now() + Math.random()
    audioManager.play(qteResultEvent.ok ? 'qteSuccess' : 'qteFail')

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
    }, arenaConfig.floatingDamage.qteFeedbackDurationMs)
  }, [qteResultEvent])

  useEffect(() => {
    if (!structureBuildResultEvent?.receivedAt) return

    const feedbackId = Date.now() + Math.random()
    if (structureBuildResultEvent.ok) {
      audioManager.play('structureBuild')
      const leveledUp = Math.max(0, Number(structureBuildResultEvent.leveledUp || 0))
      const structureLabel = getStructureLabel(structureBuildResultEvent.structureKey)
      setQteFeedback({
        kind: 'success',
        text: leveledUp > 0 ? `${structureLabel} niveau +${leveledUp}` : `${structureLabel} construit`,
        id: feedbackId
      })
    } else {
      setQteFeedback({
        kind: 'error',
        text: 'Construction refusee',
        id: feedbackId
      })
    }

    setTimeout(() => {
      setQteFeedback((current) => {
        if (!current) return null
        return current.id === feedbackId ? null : current
      })
    }, arenaConfig.floatingDamage.qteFeedbackDurationMs)
  }, [structureBuildResultEvent])

  useEffect(() => {
    return () => clearQteTimeout()
  }, [])

  useEffect(() => {
    return () => {
      if (bossHpWhiteTimerRef.current) {
        clearTimeout(bossHpWhiteTimerRef.current)
      }
      if (attackUiTimerRef.current) {
        clearTimeout(attackUiTimerRef.current)
      }
      ghostBurstTimersRef.current.forEach((timer) => clearTimeout(timer))
      ghostBurstTimersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    if (!bossAttackWarningEvent?.attackId) return
    if (playedBossWarningRef.current !== bossAttackWarningEvent.attackId) {
      playedBossWarningRef.current = bossAttackWarningEvent.attackId
      audioManager.play(bossAttackWarningEvent.attackType === 'ultimate' ? 'bossWarningUltimate' : 'bossWarningLight')
    }

    if (attackUiTimerRef.current) {
      clearTimeout(attackUiTimerRef.current)
    }

    setAttackUiState({
      attackId: bossAttackWarningEvent.attackId,
      bossName: bossAttackWarningEvent.bossName,
      bossEmoji: bossAttackWarningEvent.bossEmoji,
      attackType: bossAttackWarningEvent.attackType,
      attackLabel: bossAttackWarningEvent.attackLabel,
      criticalLabel: bossAttackWarningEvent.criticalLabel,
      phase: 'warning'
    })
  }, [bossAttackWarningEvent])

  useEffect(() => {
    if (!bossAttackResolvedEvent?.attackId) return
    if (playedBossResolvedRef.current !== bossAttackResolvedEvent.attackId) {
      playedBossResolvedRef.current = bossAttackResolvedEvent.attackId
      audioManager.play(bossAttackResolvedEvent.attackType === 'ultimate' ? 'bossImpactUltimate' : 'bossImpactLight')
    }

    if (attackUiTimerRef.current) {
      clearTimeout(attackUiTimerRef.current)
    }

    setAttackUiState({
      attackId: bossAttackResolvedEvent.attackId,
      bossName: bossAttackResolvedEvent.bossName,
      bossEmoji: bossAttackResolvedEvent.bossEmoji,
      attackType: bossAttackResolvedEvent.attackType,
      attackLabel: bossAttackResolvedEvent.attackLabel,
      criticalLabel: bossAttackResolvedEvent.criticalLabel,
      phase: 'impact'
    })

    const hitPlayerIds = Array.isArray(bossAttackResolvedEvent.hitPlayerIds) ? bossAttackResolvedEvent.hitPlayerIds : []
    if (playerId && hitPlayerIds.includes(playerId)) {
      audioManager.play('playerInjured')
    }
    hitPlayerIds.forEach((targetPlayerId) => {
      setGhostBurstsByPlayer((prev) => ({
        ...prev,
        [targetPlayerId]: {
          id: `${bossAttackResolvedEvent.attackId}-${targetPlayerId}`,
          attackId: bossAttackResolvedEvent.attackId
        }
      }))

      const existingTimer = ghostBurstTimersRef.current.get(targetPlayerId)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      const timer = setTimeout(() => {
        setGhostBurstsByPlayer((prev) => {
          const next = { ...prev }
          delete next[targetPlayerId]
          return next
        })
        ghostBurstTimersRef.current.delete(targetPlayerId)
      }, arenaConfig.bossAttack.ghostBurstDurationMs)

      ghostBurstTimersRef.current.set(targetPlayerId, timer)
    })

    attackUiTimerRef.current = setTimeout(() => {
      setAttackUiState((current) => (current?.attackId === bossAttackResolvedEvent.attackId ? null : current))
    }, arenaConfig.bossAttack.impactAnimationDurationMs + arenaConfig.bossAttack.alertDismissDelayMs)
  }, [bossAttackResolvedEvent])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateBossSize = () => {
      const rect = container.getBoundingClientRect()
      const nextSize = Math.max(arenaConfig.bossSize.minEmojiPx, Math.floor(Math.min(rect.width, rect.height) * arenaConfig.bossSize.stageCoverageRatio))
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
    if (!clickResultEvent.ok || !state?.boss?.alive) {
      if (clickResultEvent.reason === 'no_ammo') {
        audioManager.play('noAmmo')
        setNoAmmoAlert(true)
        setTimeout(() => setNoAmmoAlert(false), arenaConfig.bossHit.noAmmoAlertMs)
      }
      return
    }

    audioManager.play('bossClickImpact')

    setIsFlashing(true)
    setTimeout(() => setIsFlashing(false), arenaConfig.bossHit.clickFlashMs)
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), arenaConfig.bossHit.clickShakeMs)

    const clickPos = clickResultEvent.clickId ? pendingClickPositionsRef.current.get(clickResultEvent.clickId) : null
    if (clickResultEvent.clickId) {
      pendingClickPositionsRef.current.delete(clickResultEvent.clickId)
    }

    const fallback = arenaConfig.floatingDamage.clickFallbackPosition
    const pos = clickPos || fallback
    addFloatingDamage({ x: pos.x, y: pos.y, damage: clickResultEvent.damage, source: 'click' })
  }, [clickResultEvent, state?.boss?.alive])

  useEffect(() => {
    if (!combatTickEvent?.receivedAt || !state?.boss?.alive) return
    const passiveDamage = Math.max(0, Math.floor(Number(combatTickEvent.passiveDamageTotal) || 0))
    const artilleryLevel = Math.max(0, Math.floor(Number(state?.structures?.artilleryBattery?.level || 0)))
    if (artilleryLevel <= 0 || passiveDamage <= 0) return

    const count = artilleryLevel
    const baseDamage = Math.floor(passiveDamage / count)
    let remainder = passiveDamage % count

    for (let i = 0; i < count; i += 1) {
      const spread = baseDamage + (remainder > 0 ? 1 : 0)
      if (remainder > 0) remainder -= 1
      const pos = getBossFootImpactPosition(i, count)
      const delayMs = Math.floor(Math.random() * arenaConfig.artillery.fall.delayVarianceMs) + i * arenaConfig.artillery.fall.sequentialStaggerMs
      const durationMs = arenaConfig.artillery.fall.baseDurationMs + Math.floor(Math.random() * arenaConfig.artillery.fall.durationVarianceMs)
      addBombStrike({
        x: pos.x,
        y: pos.y,
        startY: pos.startY,
        damage: spread,
        layer: Math.random() < arenaConfig.artillery.fall.behindChance ? 'behind' : 'front',
        delayMs,
        durationMs
      })
    }
  }, [combatTickEvent, state?.boss?.alive, state?.structures?.artilleryBattery?.level])

  const handleBossClick = (e) => {
    if (localPlayerInjured) return
    if (socket && state?.boss?.alive) {
      audioManager.play('bossClickFire')
      const clickId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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
    if (localPlayerInjured) return
    if (!activeQte || !socket || !state?.boss?.alive) return
    audioManager.play('qteTap')
    socket.sendQteHit(activeQte.qteId)
    clearQteTimeout()
    setActiveQte(null)
  }

  const handleStructureBuild = (structureKey) => {
    if (localPlayerInjured) return
    if (!socket || !state?.boss?.alive) return
    socket.sendStructureBuild(structureKey)
  }

  const handleEmoteSelect = (emote) => {
    if (localPlayerInjured) return
    if (!socket || !playerId) return
    audioManager.play('emoteSelect')
    socket.sendEmote(emote, playerId)
    setEmoteMenuOpen(false)
  }

  const handleSendChat = (text) => {
    if (localPlayerInjured) return
    if (!socket || !playerId) return
    audioManager.play('chatSend')
    socket.sendChatMessage(text, playerId)
  }

  const hp = Math.max(0, currentBoss?.hp ?? 0)
  const maxHp = Math.max(1, currentBoss?.maxHp ?? 1)
  const percent = Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)))
  const bossName = currentBoss?.name ?? 'Boss'
  const bossEmoji = currentBoss?.emoji ?? '👾'
  const alive = currentBoss?.alive ?? false
  const targetCity = currentBoss?.targetCity ?? currentBoss?.target?.city ?? 'Ville cible'
  const spawnCity = currentBoss?.spawn?.city ?? 'Spawn'
  const bossDifficultyLabel = currentBoss?.difficultyLabel ?? `Niveau ${currentBoss?.difficultyLevel ?? 1}`
  const bossCriticalLabel = currentBoss?.criticalLabel ?? ''
  const bossAdvancePercent = Math.max(0, Math.min(100, Number(currentBoss?.progressPercent ?? (100 - percent))))
  const connectedPlayers = state?.connectedPlayers ?? []
  const playerStates = state?.playerStates || {}
  const localPlayerState = playerStates[playerId] || null
  const localPlayerInjured = localPlayerState?.status === 'injured'
  const playerEmotes = state?.playerEmotes || {}
  const currentPlayerEmote = playerEmotes[playerId] || '🪖'
  const emoteChoices = arenaConfig.emotes.choices
  const structures = state?.structures || {}
  const ammoByPlayer = state?.ammoByPlayer || {}
  const playerAmmo = Math.max(0, Math.floor(Number(ammoByPlayer[playerId] || 0)))
  const ammoFactory = structures.ammoFactory || {}
  const frontlineCamp = structures.frontlineCamp || {}
  const trainingCenter = structures.trainingCenter || {}
  const artilleryBattery = structures.artilleryBattery || {}
  const headquarters = structures.headquarters || {}
  const arenaBackground = getArenaBackgroundForBoss(currentBoss)
  const arenaCssVars = getArenaCssVars()
  const arenaPageStyle = arenaBackground
    ? {
      ...arenaCssVars,
      backgroundImage: `linear-gradient(${arenaConfig.theme.backgroundOverlayStart}, ${arenaConfig.theme.backgroundOverlayEnd}), url(${arenaBackground})`
    }
    : arenaCssVars

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
  const rearBombStrikes = bombStrikes.filter((strike) => strike.layer === 'behind')
  const frontBombStrikes = bombStrikes.filter((strike) => strike.layer !== 'behind')
  const warningActive = attackUiState?.phase === 'warning'
  const impactActive = attackUiState?.phase === 'impact'
  const arenaClassName = `arena-page ${localPlayerInjured ? 'arena-page-locked' : ''}`.trim()
  const attackAlertText = attackUiState
    ? `${attackUiState.bossEmoji || bossEmoji} ${attackUiState.bossName || bossName} ${attackUiState.criticalLabel || ''} ${attackUiState.attackLabel || 'Attaque du boss'}${warningActive ? ' imminente' : ' en cours'}`.trim()
    : ''

  useEffect(() => {
    if (previousLocalInjuredRef.current && !localPlayerInjured) {
      audioManager.play('playerRecovered')
    }

    previousLocalInjuredRef.current = Boolean(localPlayerInjured)
  }, [localPlayerInjured])

  return React.createElement(
    'div',
    { className: arenaClassName, style: arenaPageStyle },
    attackUiState && React.createElement(
      'div',
      {
        className: `arena-boss-alert ${warningActive ? 'arena-boss-alert-warning' : 'arena-boss-alert-impact'}`.trim(),
        role: 'status'
      },
      React.createElement('div', { className: 'arena-boss-alert-kicker' }, warningActive ? 'Alerte boss' : 'Impact boss'),
      React.createElement('div', { className: 'arena-boss-alert-text' }, attackAlertText)
    ),
    localPlayerInjured && React.createElement(
      'div',
      { className: 'arena-lock-banner', role: 'status' },
      `${arenaConfig.bossAttack.lockedOverlayMessage} // retour dans ${Math.max(1, Math.ceil(Number(localPlayerState?.remainingMs || 0) / 1000))}s`
    ),
    React.createElement(
      'div',
      { className: 'arena-main' },
      React.createElement(
        'div',
        { className: 'arena-grid', ref: arenaLeftRef },
        React.createElement(
          'div',
          { className: `arena-ammo-corner ${noAmmoAlert ? 'arena-ammo-corner-alert' : ''}`.trim() },
          React.createElement('i', { className: 'bi bi-bullseye ammo-icon', 'aria-hidden': 'true' }),
          React.createElement('div', { className: 'ammo-corner-value' }, `${playerAmmo}`)
        ),
        React.createElement(
          'div',
          { className: 'arena-cell-controls' },
          React.createElement(
            'button',
            {
              className: `audio-toggle-btn arena-audio-toggle ${audioMuted ? '' : 'audio-toggle-enabled'}`.trim(),
              type: 'button',
              onClick: onToggleAudioMute
            },
            audioMuted ? '🔇 Son coupe' : '🔊 Son actif'
          ),
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
          React.createElement('div', { className: 'boss-path-title' }, `${bossEmoji} ${bossDifficultyLabel}${bossCriticalLabel ? ` • ${bossCriticalLabel}` : ''}`),
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
            React.createElement('div', { className: 'boss-path-marker', style: { left: `${bossAdvancePercent}%` } }, bossEmoji)
          ),
          React.createElement(
            'div',
            { className: 'boss-path-labels' },
            React.createElement('span', null, spawnCity),
            React.createElement('span', null, targetCity)
          )
        ),
        React.createElement(
          'div',
          { className: 'arena-empty-cell-left' },
          React.createElement(TerminalChat, {
            messages: chatMessages,
            playerId,
            onSend: handleSendChat,
            disabled: localPlayerInjured,
            disabledMessage: 'Transmission coupee pendant les soins'
          })
        ),
        React.createElement(SoldierPanel, {
          title: 'Escouade gauche',
          playerIds: leftSoldiers,
          contributions: state?.contributions,
          playerEmotes,
          playerStates,
          currentPlayerId: playerId,
          className: 'soldier-side-left',
          onSelfClick: () => !localPlayerInjured && setEmoteMenuOpen((prev) => !prev),
          emoteMenuOpen,
          emoteChoices,
          currentPlayerEmote,
          onSelectEmote: handleEmoteSelect,
          warningActive,
          ghostBurstsByPlayer,
          injuredEmoji: arenaConfig.bossAttack.injuredEmoji,
          ghostEmoji: arenaConfig.bossAttack.ghostEmoji
        }),
        React.createElement(
          'div',
          { className: `boss-stage ${warningActive ? 'boss-stage-warning' : ''} ${impactActive ? `boss-stage-impact boss-stage-impact-${attackUiState?.attackType || 'light'}` : ''}`.trim(), ref: bossStageRef },
          rearBombStrikes.map((strike) =>
            React.createElement(
              'div',
              {
                key: strike.id,
                className: 'boss-bomb-strike boss-bomb-strike-behind',
                style: {
                  left: `${strike.x}px`,
                  top: `${strike.startY}px`,
                  '--bomb-impact-y': `${Math.max(0, strike.y - strike.startY)}px`,
                  animationDuration: `${strike.durationMs}ms`,
                  animationDelay: `${strike.delayMs}ms`
                }
              },
              '🧨'
            )
          ),
          React.createElement(
            'div',
            {
              className: `boss-container ${alive ? 'boss-alive' : 'boss-dead'} ${impactActive ? `boss-container-attack boss-container-attack-${attackUiState?.attackType || 'light'}` : ''}`.trim(),
              onClick: handleBossClick,
              style: { cursor: alive && !localPlayerInjured ? 'pointer' : 'default' },
              ref: containerRef
            },
            React.createElement(
              'div',
              {
                className: `boss-hit-actor ${isFlashing ? 'boss-flash' : ''} ${isShaking ? 'shake' : ''} ${isLightShaking ? 'light-shake' : ''}`.trim()
              },
              React.createElement(
                'div',
                {
                  className: `boss-advance-sway ${alive ? 'boss-advance-sway-alive' : ''}`.trim()
                },
                React.createElement('div', { className: 'boss-emoji', style: { fontSize: `${bossEmojiSizePx}px` } }, alive ? bossEmoji : '💀')
              )
            ),
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
          frontBombStrikes.map((strike) =>
            React.createElement(
              'div',
              {
                key: strike.id,
                className: 'boss-bomb-strike boss-bomb-strike-front',
                style: {
                  left: `${strike.x}px`,
                  top: `${strike.startY}px`,
                  '--bomb-impact-y': `${Math.max(0, strike.y - strike.startY)}px`,
                  animationDuration: `${strike.durationMs}ms`,
                  animationDelay: `${strike.delayMs}ms`
                }
              },
              '🧨'
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
          playerStates,
          currentPlayerId: playerId,
          className: 'soldier-side-right',
          onSelfClick: () => !localPlayerInjured && setEmoteMenuOpen((prev) => !prev),
          emoteMenuOpen,
          emoteChoices,
          currentPlayerEmote,
          onSelectEmote: handleEmoteSelect,
          warningActive,
          ghostBurstsByPlayer,
          injuredEmoji: arenaConfig.bossAttack.injuredEmoji,
          ghostEmoji: arenaConfig.bossAttack.ghostEmoji
        }),
        React.createElement(SoldierPanel, {
          title: 'Escouade ligne de front',
          playerIds: bottomSoldiers,
          contributions: state?.contributions,
          playerEmotes,
          playerStates,
          currentPlayerId: playerId,
          className: 'soldier-side-wide',
          center: true,
          onSelfClick: () => !localPlayerInjured && setEmoteMenuOpen((prev) => !prev),
          emoteMenuOpen,
          emoteChoices,
          currentPlayerEmote,
          onSelectEmote: handleEmoteSelect,
          warningActive,
          ghostBurstsByPlayer,
          injuredEmoji: arenaConfig.bossAttack.injuredEmoji,
          ghostEmoji: arenaConfig.bossAttack.ghostEmoji
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
                  ? React.createElement('div', { className: `structure-icon-ammo ${noAmmoAlert ? 'structure-icon-ammo-alert' : ''}`.trim() }, `${playerAmmo}`)
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
