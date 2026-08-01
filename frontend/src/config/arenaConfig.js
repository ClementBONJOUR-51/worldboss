export const arenaConfig = {
  // Reglages des nombres de degats flottants affiches autour du boss.
  floatingDamage: {
    minZoneSizePx: 120,
    defaultZoneSizePx: 220,
    minFontSizePx: 18,
    maxFontSizePx: 54,
    baseFontSizePx: 20,
    // Plus la valeur est grande, plus les gros degats grossissent vite visuellement.
    logScaleFactor: 4,
    widthPaddingBase: 0.2,
    widthPaddingPerDigit: 0.35,
    minHalfWidthPx: 10,
    heightRatio: 0.55,
    edgePaddingPx: 4,
    // Duree de vie du texte de degat a l ecran.
    lifetimeMs: 1500,
    qteFeedbackDurationMs: 1200,
    // Hauteur totale de montee du texte avant disparition.
    floatDistancePx: 80,
    clickFallbackPosition: { x: 120, y: 120 }
  },

  // Feedback visuel quand le boss prend des degats ou quand le joueur n a plus de munitions.
  bossHit: {
    flashMs: 180,
    // A partir de ce montant de degats, on passe d une petite secousse a une grosse secousse.
    heavyShakeThreshold: 8,
    heavyShakeMs: 320,
    lightShakeMs: 180,
    clickFlashMs: 150,
    clickShakeMs: 400,
    noAmmoAlertMs: 1200
  },

  // Reglages du decalage visuel entre la barre rouge et la barre blanche des PV.
  hpBar: {
    initialWhiteDurationMs: 1000,
    minWhiteDurationMs: 1000,
    maxWhiteDurationMs: 2500,
    baseWhiteDurationMs: 1000,
    // Plus cette fenetre est grande, plus les petites pertes de PV trainent longtemps.
    dropWindow: 4,
    dropStepMs: 375,
    whiteSyncDelayMs: 40
  },

  // Parametres de placement des QTE autour du boss.
  qte: {
    minBoundsPx: 220,
    defaultBoundsPx: 320,
    insetPx: 36,
    // Zone morte au centre pour eviter qu un QTE apparaisse exactement sur le boss.
    deadZoneWidthRatio: 0.14,
    deadZoneHeightRatio: 0.14,
    deadZoneMinPx: 24,
    maxPlacementAttempts: 12,
    fallbackOffsetMultiplier: 2
  },

  // Taille minimale et proportion d occupation du boss dans sa scene.
  bossSize: {
    minEmojiPx: 120,
    stageCoverageRatio: 0.95
  },

  // Tous les reglages lies aux bombardements de la batterie de siege.
  artillery: {
    stageMinSizePx: 220,
    stageDefaultSizePx: 320,
    bossMinSizePx: 180,
    bossFallbackWidthRatio: 0.76,
    bossFallbackHeightRatio: 0.76,
    // Position verticale moyenne de l impact au pied du boss.
    impactMinYpx: 32,
    impactBottomInsetPx: 18,
    impactHeightRatio: 0.90,
    // Petite variation verticale pour que les bombes n impactent pas toutes a la meme hauteur.
    impactVerticalVariancePx: 50,
    horizontalInsetMinPx: 0,
    horizontalInsetRatio: 0.10,
    // Controle l amplitude horizontale aleatoire des impacts sur le boss.
    randomSpanMinPx: 18,
    randomSpanRatio: 0.35,
    // Hauteur de depart des bombes au-dessus de la scene.
    spawnHeightMinPx: 220,
    spawnHeightStageRatio: 0.5,
    spawnHeightVariancePx: 100,

    // Timing et repartition visuelle des bombes d un meme tick de degats passifs.
    fall: {
      baseDurationMs: 900,
      minDurationMs: 420,
      durationVarianceMs: 650,
      delayVarianceMs: 700,
      // Petit decalage ajoute entre les bombes successives d une meme salve.
      sequentialStaggerMs: 45,
      // Chance qu une bombe passe derriere le boss au lieu de devant.
      behindChance: 0.45
    },

    // Profondeur visuelle des bombes par rapport au boss.
    layers: {
      behindZIndex: 3,
      frontZIndex: 12,
      behindOpacity: 0.85
    }
  },

  // Liste d emotes proposees au joueur.
  emotes: {
    choices: ['🤩', '🫡', '😁', '😎', '😰']
  },

  // Couleurs du voile applique sur le fond de l arene.
  theme: {
    backgroundOverlayStart: 'rgba(10, 12, 24, 0.62)',
    backgroundOverlayEnd: 'rgba(11, 18, 35, 0.78)'
  },

  // Variables qui alimentent directement certaines animations CSS.
  css: {
    bossSwayDurationMs: 5000,
    bossSwayOffsetPx: 8,
    bossSwayRotateDeg: 2.2,
    hitFlashDurationMs: 180,
    heavyShakeDurationMs: 320,
    lightShakeDurationMs: 180
  },

  // Reglages visuels et de verrouillage pour les attaques actives du boss.
  bossAttack: {
    alertDismissDelayMs: 900,
    impactAnimationDurationMs: 1100,
    // Amplification visuelle de l attaque legere du boss.
    lightScalePeak: 1.15,
    // Amplification visuelle maximale de l attaque ultime du boss.
    ultimateScalePeak: 1.40,
    // Rebond secondaire apres l impact principal de l ultime.
    ultimateScaleRebound: 1.01,
    laneWarningPulseMs: 820,
    ghostBurstDurationMs: 1400,
    lockedOverlayMessage: 'Unite hors combat',
    injuredEmoji: '😵',
    ghostEmoji: '👻'
  }
}

export function getArenaCssVars() {
  // Pont entre la config JavaScript et les variables CSS utilisees dans styles.css.
  return {
    '--boss-sway-duration': `${arenaConfig.css.bossSwayDurationMs}ms`,
    '--boss-sway-offset': `${arenaConfig.css.bossSwayOffsetPx}px`,
    '--boss-sway-rotate': `${arenaConfig.css.bossSwayRotateDeg}deg`,
    '--boss-hit-flash-duration': `${arenaConfig.css.hitFlashDurationMs}ms`,
    '--boss-heavy-shake-duration': `${arenaConfig.css.heavyShakeDurationMs}ms`,
    '--boss-light-shake-duration': `${arenaConfig.css.lightShakeDurationMs}ms`,
    '--boss-attack-lane-pulse-duration': `${arenaConfig.bossAttack.laneWarningPulseMs}ms`,
    '--boss-attack-impact-duration': `${arenaConfig.bossAttack.impactAnimationDurationMs}ms`,
    '--boss-attack-light-scale-peak': arenaConfig.bossAttack.lightScalePeak,
    '--boss-attack-ultimate-scale-peak': arenaConfig.bossAttack.ultimateScalePeak,
    '--boss-attack-ultimate-scale-rebound': arenaConfig.bossAttack.ultimateScaleRebound,
    '--boss-ghost-burst-duration': `${arenaConfig.bossAttack.ghostBurstDurationMs}ms`,
    '--boss-bomb-behind-z': arenaConfig.artillery.layers.behindZIndex,
    '--boss-bomb-front-z': arenaConfig.artillery.layers.frontZIndex,
    '--boss-bomb-behind-opacity': arenaConfig.artillery.layers.behindOpacity,
    '--floating-damage-rise': `-${arenaConfig.floatingDamage.floatDistancePx}px`
  }
}