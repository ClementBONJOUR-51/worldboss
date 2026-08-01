export const AUDIO_STORAGE_KEY = 'wb.audioEnabled'
export const AUDIO_MUTED_STORAGE_KEY = 'wb.audioMuted'

const BASE_URL = import.meta.env.BASE_URL || '/'

function withBaseUrl(path) {
  const normalizedBase = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`
  const normalizedPath = String(path || '').replace(/^\/+/, '')
  return `${normalizedBase}${normalizedPath}`
}

export const audioConfig = {
  // Volumes par categorie. Le volume final = master * categorie * son.
  masterVolume: 0.8,
  categories: {
    ui: 0.6,
    combat: 0.8,
    social: 0.5,
    ambient: 0.4,
    music: 0.5
  },

  // Tous les sons reconnus par le jeu, meme si le fichier n est pas encore present.
  sounds: {
    uiToggleOn: { url: withBaseUrl('audio/ui/audio-toggle-on.mp3'), category: 'ui', volume: 0.8, maxConcurrent: 1, cooldownMs: 80 },
    uiToggleOff: { url: withBaseUrl('audio/ui/audio-toggle-off.mp3'), category: 'ui', volume: 0.8, maxConcurrent: 1, cooldownMs: 80 },
    modalOpen: { url: withBaseUrl('audio/ui/modal-open.mp3'), category: 'ui', volume: 0.55, maxConcurrent: 2, cooldownMs: 80 },
    modalClose: { url: withBaseUrl('audio/ui/modal-close.mp3'), category: 'ui', volume: 0.5, maxConcurrent: 2, cooldownMs: 80 },
    nicknameSaved: { url: withBaseUrl('audio/ui/nickname-saved.mp3'), category: 'ui', volume: 0.62, maxConcurrent: 1, cooldownMs: 120 },
    enterArena: { url: withBaseUrl('audio/ui/enter-arena.mp3'), category: 'ui', volume: 0.7, maxConcurrent: 1, cooldownMs: 150 },
    returnMap: { url: withBaseUrl('audio/ui/return-map.mp3'), category: 'ui', volume: 0.66, maxConcurrent: 1, cooldownMs: 120 },
    endCountdown: { url: withBaseUrl('audio/ui/end-countdown.mp3'), category: 'ui', volume: 0.6, maxConcurrent: 1, cooldownMs: 900 },

    bossClickFire: { url: withBaseUrl('audio/combat/boss-click-fire.mp3'), category: 'combat', volume: 0.1, maxConcurrent: 8, cooldownMs: 15 },
    bossClickImpact: { url: withBaseUrl('audio/combat/boss-click-impact.mp3'), category: 'combat', volume: 0.2, maxConcurrent: 10, cooldownMs: 15 },
    noAmmo: { url: withBaseUrl('audio/combat/no-ammo.mp3'), category: 'combat', volume: 0.7, maxConcurrent: 1, cooldownMs: 220 },
    qteReady: { url: withBaseUrl('audio/combat/qte-ready.mp3'), category: 'combat', volume: 0.74, maxConcurrent: 1, cooldownMs: 120 },
    qteTap: { url: withBaseUrl('audio/combat/qte-tap.mp3'), category: 'combat', volume: 0.55, maxConcurrent: 2, cooldownMs: 45 },
    qteSuccess: { url: withBaseUrl('audio/combat/qte-success.mp3'), category: 'combat', volume: 0.84, maxConcurrent: 2, cooldownMs: 90 },
    qteFail: { url: withBaseUrl('audio/combat/qte-fail.mp3'), category: 'combat', volume: 0.72, maxConcurrent: 2, cooldownMs: 90 },
    artilleryIncoming: { url: withBaseUrl('audio/combat/artillery-incoming.mp3'), category: 'combat', volume: 0.72, maxConcurrent: 8, cooldownMs: 0 },
    artilleryImpact: { url: withBaseUrl('audio/combat/artillery-impact.mp3'), category: 'combat', volume: 0.02, maxConcurrent: 10, cooldownMs: 100 },
    structureBuild: { url: withBaseUrl('audio/combat/structure-build.mp3'), category: 'combat', volume: 0.66, maxConcurrent: 3, cooldownMs: 70 },
    bossWarningLight: { url: withBaseUrl('audio/combat/boss-warning-light.mp3'), category: 'combat', volume: 0.4, maxConcurrent: 1, cooldownMs: 120 },
    bossWarningUltimate: { url: withBaseUrl('audio/combat/boss-warning-ultimate.mp3'), category: 'combat', volume: 0.3, maxConcurrent: 1, cooldownMs: 120 },
    bossImpactLight: { url: withBaseUrl('audio/combat/boss-impact-light.mp3'), category: 'combat', volume: 0.4, maxConcurrent: 2, cooldownMs: 80 },
    bossImpactUltimate: { url: withBaseUrl('audio/combat/boss-impact-ultimate.mp3'), category: 'combat', volume: 1, maxConcurrent: 2, cooldownMs: 80 },
    playerInjured: { url: withBaseUrl('audio/combat/player-injured.mp3'), category: 'combat', volume: 0.9, maxConcurrent: 2, cooldownMs: 120 },
    playerRecovered: { url: withBaseUrl('audio/combat/player-recovered.mp3'), category: 'combat', volume: 0.68, maxConcurrent: 1, cooldownMs: 150 },
    bossDeath: { url: withBaseUrl('audio/combat/boss-death.mp3'), category: 'combat', volume: 0.95, maxConcurrent: 1, cooldownMs: 500 },

    emoteSelect: { url: withBaseUrl('audio/social/emote-select.mp3'), category: 'social', volume: 0.6, maxConcurrent: 3, cooldownMs: 50 },
    chatSend: { url: withBaseUrl('audio/social/chat-send.mp3'), category: 'social', volume: 0.55, maxConcurrent: 3, cooldownMs: 50 },
    chatReceive: { url: withBaseUrl('audio/social/chat-receive.mp3'), category: 'social', volume: 0.62, maxConcurrent: 4, cooldownMs: 50 },

    matchVictory: { url: withBaseUrl('audio/music/match-victory.mp3'), category: 'music', volume: 0.86, maxConcurrent: 1, cooldownMs: 500 },
    matchDefeat: { url: withBaseUrl('audio/music/match-defeat.mp3'), category: 'music', volume: 0.82, maxConcurrent: 1, cooldownMs: 500 },
    mapAmbient: { url: withBaseUrl('audio/ambient/map-ambient.mp3'), category: 'ambient', volume: 0.34, maxConcurrent: 1, cooldownMs: 500 },
    arenaAmbient: { url: withBaseUrl('audio/ambient/arena-ambient.mp3'), category: 'ambient', volume: 0.42, maxConcurrent: 1, cooldownMs: 500 }
  }
}