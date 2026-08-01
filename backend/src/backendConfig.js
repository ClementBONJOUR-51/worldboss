// Configuration backend centralisee.
//
// Ce fichier regroupe les valeurs qu un administrateur peut vouloir ajuster
// sans replonger dans la logique metier: presets de boss, structures,
// delais, limites de texte, cooldowns, valeurs par defaut, etc.

const backendConfig = {
  // Reglages reseau et serveur HTTP / WebSocket.
  server: {
    defaultPort: 3001,
    defaultHost: '0.0.0.0',
    matchResetDelayMs: 120000,
    chatCooldownMs: 600
  },

  // Reglages globaux du combat et de la boucle serveur.
  combat: {
    tickIntervalMs: 2000,
    minTravelMinutes: 8
  },

  // Reglages de vague multi-boss. Le frontend legacy continue d utiliser
  // `state.boss`, mais le backend expose aussi `state.bosses`.
  bossEncounter: {
    activeCount: 3,
    minActiveCount: 2,
    maxActiveCount: 5,
    defaultEmoji: '👾',
    // Si un boss vivant arrive a destination, la partie est perdue.
    defeatOnAnyArrival: false
  },

  // Presets de boss disponibles au fil des parties.
  // Tous les champs d un boss sont parametrables ici: emoji, vie,
  // difficulte, position de spawn, destination et duree du trajet.
  bosses: [
    {
      id: 'boss-1',
      name: 'Leviathan',
      emoji: '🦑',
      maxHp: 10000,
      difficultyLevel: 1,
      difficultyLabel: 'Menace cotiere',
      criticalLevel: 1,
      spawn: { city: 'Atlantique Nord', lat: 60.0, lng: -30.0 },
      target: { city: 'Paris', lat: 48.8566, lng: 2.3522 },
      spawnOffsetMinutes: -3,
      travelMinutes: 20
    },
    {
      id: 'boss-2',
      name: 'Rift Serpent',
      emoji: '🐍',
      maxHp: 16000,
      difficultyLevel: 2,
      difficultyLabel: 'Percée oceanique',
      criticalLevel: 2,
      spawn: { city: 'Ocean Indien', lat: -18.0, lng: 64.0 },
      target: { city: 'Tokyo', lat: 35.6762, lng: 139.6503 },
      spawnOffsetMinutes: -1,
      travelMinutes: 24
    },
    {
      id: 'boss-3',
      name: 'Abyss Colossus',
      emoji: '🗿',
      maxHp: 14000,
      difficultyLevel: 3,
      difficultyLabel: 'Cataclysme majeur',
      criticalLevel: 3,
      spawn: { city: 'Atlantique Ouest', lat: 33.0, lng: -65.0 },
      target: { city: 'New York', lat: 40.7128, lng: -74.0060 },
      spawnOffsetMinutes: -2,
      travelMinutes: 18
    },
    {
      id: 'boss-4',
      name: 'Sable Maw',
      emoji: '🦂',
      maxHp: 13000,
      difficultyLevel: 1,
      difficultyLabel: 'Incursion desertique',
      criticalLevel: 1,
      spawn: { city: 'Mer Rouge', lat: 20.0, lng: 38.0 },
      target: { city: 'Cairo', lat: 30.0444, lng: 31.2357 },
      spawnOffsetMinutes: -2,
      travelMinutes: 16
    },
    {
      id: 'boss-5',
      name: 'Storm Kraken',
      emoji: '🌩️',
      maxHp: 17000,
      difficultyLevel: 3,
      difficultyLabel: 'Tempete terminale',
      criticalLevel: 3,
      spawn: { city: 'Pacifique Sud', lat: -33.0, lng: 156.0 },
      target: { city: 'Sydney', lat: -33.8688, lng: 151.2093 },
      spawnOffsetMinutes: -1,
      travelMinutes: 22
    },
    {
      id: 'boss-6',
      name: 'Obsidian Eel',
      emoji: '🪱',
      maxHp: 15000,
      difficultyLevel: 2,
      difficultyLabel: 'Faille abyssale',
      criticalLevel: 2,
      spawn: { city: 'Atlantique Sud', lat: -20.0, lng: -15.0 },
      target: { city: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729 },
      spawnOffsetMinutes: -1,
      travelMinutes: 21
    }
  ],

  // Cout de progression des structures cote backend.
  structures: {
    difficulty: {
      ammoFactory: { base: 14, growth: 1.24 },
      frontlineCamp: { base: 18, growth: 1.28 },
      trainingCenter: { base: 22, growth: 1.3 },
      artilleryBattery: { base: 24, growth: 1.32 },
      headquarters: { base: 30, growth: 1.35 }
    },
    ammoFactoryProductionPerLevel: 2,
    artilleryBatteryDamagePerPlayerPerLevel: 0.6,
    qteChanceBonusPerCampLevelAfterOne: 0.15,
    qteTierBoostEveryCampLevels: 2,
    qteHeadquartersChanceBonusPerLevel: 0.1,
    qteHeadquartersTierBoostMax: 1,
    qteTierBoostMax: 3
  },

  // Valeurs par defaut des joueurs et de leurs actions.
  players: {
    initialAmmo: 10,
    allowedEmotes: ['🤩', '🫡', '😁', '😎', '😰'],
    emoteDurationMs: 3000,
    defaultNicknamePrefix: 'Joueur',
    nicknameMaxLength: 24
  },

  // Limites de texte et historique de chat.
  text: {
    chatMessageMaxLength: 140,
    systemMessageMaxLength: 140,
    chatHistoryMaxEntries: 60
  },

  // Reglages des QTE. Les variables d environnement gardent la priorite.
  qte: {
    defaultGrantChance: 0.35,
    defaultDurationMs: 1500,
    minDurationMs: 1000,
    maxDurationMs: 3000,
    playerCooldownMs: 10000,
    tiers: {
      bronze: { color: '#cd7f32', damage: 50, weight: 60 },
      argent: { color: '#c0c0c0', damage: 150, weight: 27 },
      or: { color: '#ffd700', damage: 500, weight: 10 },
      diamant: { color: '#00e5ff', damage: 2000, weight: 3 }
    }
  },

  // Reglages des attaques du boss et des blessures.
  bossAttack: {
    bossCriticalLabels: {
      1: '☠️',
      2: '☠️☠️',
      3: '☠️☠️☠️'
    },
    schedule: {
      minIntervalMs: 30000,
      maxIntervalMs: 60000
    },
    ultimateChance: {
      base: 0.12,
      progressScale: 0.42,
      criticalLevelBonus: 0.08,
      max: 0.92
    },
    attacks: {
      light: {
        label: 'Attaque legere',
        warningDurationMs: 2600,
        hitChanceBase: 0.18,
        hitChancePerCriticalLevel: 0.1,
        hitChanceProgressScale: 0.18,
        injuryDurationMs: 4500,
        animation: 'slam'
      },
      ultimate: {
        label: 'Attaque ultime',
        warningDurationMs: 3600,
        hitChanceBase: 0.38,
        hitChancePerCriticalLevel: 0.14,
        hitChanceProgressScale: 0.26,
        injuryDurationMs: 7000,
        animation: 'ultimate'
      }
    }
  }
}

module.exports = backendConfig