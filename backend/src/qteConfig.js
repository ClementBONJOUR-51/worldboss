const DEFAULT_QTE_DURATION_MS = 1500;

const qteConfig = {
  grantChance: Number(process.env.QTE_GRANT_CHANCE ?? 0.35),
  durationMs: Number(process.env.QTE_DURATION_MS ?? DEFAULT_QTE_DURATION_MS),
  minDurationMs: Number(process.env.QTE_MIN_DURATION_MS ?? 1000),
  maxDurationMs: Number(process.env.QTE_MAX_DURATION_MS ?? 3000),
  playerCooldownMs: Number(process.env.QTE_PLAYER_COOLDOWN_MS ?? 10000),
  tiers: {
    bronze: {
      color: '#cd7f32',
      damage: Number(process.env.QTE_DAMAGE_BRONZE ?? 50),
      weight: Number(process.env.QTE_WEIGHT_BRONZE ?? 60)
    },
    argent: {
      color: '#c0c0c0',
      damage: Number(process.env.QTE_DAMAGE_ARGENT ?? 150),
      weight: Number(process.env.QTE_WEIGHT_ARGENT ?? 27)
    },
    or: {
      color: '#ffd700',
      damage: Number(process.env.QTE_DAMAGE_OR ?? 500),
      weight: Number(process.env.QTE_WEIGHT_OR ?? 10)
    },
    diamant: {
      color: '#00e5ff',
      damage: Number(process.env.QTE_DAMAGE_DIAMANT ?? 2000),
      weight: Number(process.env.QTE_WEIGHT_DIAMANT ?? 3)
    }
  }
};

function clampDuration(ms) {
  return Math.max(qteConfig.minDurationMs, Math.min(qteConfig.maxDurationMs, ms));
}

function resolveQteDurationMs() {
  return clampDuration(qteConfig.durationMs);
}

module.exports = {
  qteConfig,
  resolveQteDurationMs
};
