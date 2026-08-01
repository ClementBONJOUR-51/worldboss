export const AUDIO_STORAGE_KEY = 'wb.audioEnabled'
export const AUDIO_MUTED_STORAGE_KEY = 'wb.audioMuted'

const BASE_URL = import.meta.env.BASE_URL || '/'

function withBaseUrl(path) {
  const normalizedBase = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`
  const normalizedPath = String(path || '').replace(/^\/+/, '')
  return `${normalizedBase}${normalizedPath}`
}

const availableAudio = {
  enterArena: withBaseUrl('audio/ui/enter-arena.mp3'),
  returnMap: withBaseUrl('audio/ui/return-map.mp3'),
  artilleryImpact: withBaseUrl('audio/combat/artillery-impact.mp3'),
  bossClickFire: withBaseUrl('audio/combat/boss-click-fire.mp3'),
  bossWarningLight: withBaseUrl('audio/combat/boss-warning-light.mp3'),
  bossWarningUltimate: withBaseUrl('audio/combat/boss-warning-ultimate.mp3'),
  bossImpactLight: withBaseUrl('audio/combat/boss-impact-light.mp3'),
  bossImpactUltimate: withBaseUrl('audio/combat/boss-impact-ultimate.mp3'),
  noAmmo: withBaseUrl('audio/combat/no-ammo.mp3'),
  playerInjured: withBaseUrl('audio/combat/player-injured.mp3'),
  chatReceive: withBaseUrl('audio/social/chat-receive.mp3'),
  chatSend: withBaseUrl('audio/social/chat-send.mp3'),
  structureBuild: withBaseUrl('audio/combat/structure-build.mp3')

}

export const audioConfig = {
  // Volumes par categorie. Le volume final = master * categorie * son.
  masterVolume: 0.8,
  categories: {
    ui: 0.6,
    combat: 0.6,
    social: 0.5,
    ambient: 0.4,
    music: 0.5
  },

  // Tous les sons reconnus par le jeu, meme si le fichier n est pas encore present.
  sounds: {
    uiToggleOn: { url: null, category: 'ui', volume: 0.8, maxConcurrent: 1, cooldownMs: 80 },
    uiToggleOff: { url: null, category: 'ui', volume: 0.8, maxConcurrent: 1, cooldownMs: 80 },
    modalOpen: { url: null, category: 'ui', volume: 0.55, maxConcurrent: 2, cooldownMs: 80 },
    modalClose: { url: null, category: 'ui', volume: 0.5, maxConcurrent: 2, cooldownMs: 80 },
    nicknameSaved: { url: null, category: 'ui', volume: 0.62, maxConcurrent: 1, cooldownMs: 120 },
    enterArena: { url: availableAudio.enterArena, category: 'ui', volume: 0.7, maxConcurrent: 1, cooldownMs: 150 },
    returnMap: { url: availableAudio.returnMap, category: 'ui', volume: 0.66, maxConcurrent: 1, cooldownMs: 120 },
    endCountdown: { url: null, category: 'ui', volume: 0.6, maxConcurrent: 1, cooldownMs: 900 },

    bossClickFire: { url: availableAudio.bossClickFire, category: 'combat', volume: 0.1, maxConcurrent: 8, cooldownMs: 15 },
    bossClickImpact: { url: null, category: 'combat', volume: 0.2, maxConcurrent: 10, cooldownMs: 15 },
    noAmmo: { url: availableAudio.noAmmo, category: 'combat', volume: 0.7, maxConcurrent: 1, cooldownMs: 220 },
    qteReady: { url: null, category: 'combat', volume: 0.74, maxConcurrent: 1, cooldownMs: 120 },
    qteTap: { url: null, category: 'combat', volume: 0.55, maxConcurrent: 2, cooldownMs: 45 },
    qteSuccess: { url: null, category: 'combat', volume: 0.84, maxConcurrent: 2, cooldownMs: 90 },
    qteFail: { url: null, category: 'combat', volume: 0.72, maxConcurrent: 2, cooldownMs: 90 },
    artilleryIncoming: { url: null, category: 'combat', volume: 0.72, maxConcurrent: 8, cooldownMs: 0 },
    artilleryImpact: { url: availableAudio.artilleryImpact, category: 'combat', volume: 0.02, maxConcurrent: 10, cooldownMs: 100 },
    structureBuild: { url: availableAudio.structureBuild, category: 'combat', volume: 0.05, maxConcurrent: 3, cooldownMs: 70 },
    bossWarningLight: { url: availableAudio.bossWarningLight, category: 'combat', volume: 0.4, maxConcurrent: 1, cooldownMs: 120 },
    bossWarningUltimate: { url: availableAudio.bossWarningUltimate, category: 'combat', volume: 0.3, maxConcurrent: 1, cooldownMs: 120 },
    bossImpactLight: { url: availableAudio.bossImpactLight, category: 'combat', volume: 0.4, maxConcurrent: 2, cooldownMs: 80 },
    bossImpactUltimate: { url: availableAudio.bossImpactUltimate, category: 'combat', volume: 1, maxConcurrent: 2, cooldownMs: 80 },
    playerInjured: { url: availableAudio.playerInjured, category: 'combat', volume: 0.9, maxConcurrent: 2, cooldownMs: 120 },
    playerRecovered: { url: null, category: 'combat', volume: 0.68, maxConcurrent: 1, cooldownMs: 150 },
    bossDeath: { url: null, category: 'combat', volume: 0.95, maxConcurrent: 1, cooldownMs: 500 },

    emoteSelect: { url: null, category: 'social', volume: 0.6, maxConcurrent: 3, cooldownMs: 50 },
    chatSend: { url: availableAudio.chatSend, category: 'social', volume: 0.55, maxConcurrent: 3, cooldownMs: 50 },
    chatReceive: { url: availableAudio.chatReceive, category: 'social', volume: 0.62, maxConcurrent: 4, cooldownMs: 50 },

    matchVictory: { url: null, category: 'music', volume: 0.86, maxConcurrent: 1, cooldownMs: 500 },
    matchDefeat: { url: null, category: 'music', volume: 0.82, maxConcurrent: 1, cooldownMs: 500 },
    mapAmbient: { url: null, category: 'ambient', volume: 0.34, maxConcurrent: 1, cooldownMs: 500 },
    arenaAmbient: { url: null, category: 'ambient', volume: 0.42, maxConcurrent: 1, cooldownMs: 500 }
  }
}