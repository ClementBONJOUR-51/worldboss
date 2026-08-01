const backendConfig = require('./backendConfig');

const DEFAULT_QTE_DURATION_MS = backendConfig.qte.defaultDurationMs;

const qteConfig = {
  grantChance: Number(process.env.QTE_GRANT_CHANCE ?? backendConfig.qte.defaultGrantChance),
  durationMs: Number(process.env.QTE_DURATION_MS ?? DEFAULT_QTE_DURATION_MS),
  minDurationMs: Number(process.env.QTE_MIN_DURATION_MS ?? backendConfig.qte.minDurationMs),
  maxDurationMs: Number(process.env.QTE_MAX_DURATION_MS ?? backendConfig.qte.maxDurationMs),
  playerCooldownMs: Number(process.env.QTE_PLAYER_COOLDOWN_MS ?? backendConfig.qte.playerCooldownMs),
  tiers: {
    bronze: {
      color: backendConfig.qte.tiers.bronze.color,
      damage: Number(process.env.QTE_DAMAGE_BRONZE ?? backendConfig.qte.tiers.bronze.damage),
      weight: Number(process.env.QTE_WEIGHT_BRONZE ?? backendConfig.qte.tiers.bronze.weight)
    },
    argent: {
      color: backendConfig.qte.tiers.argent.color,
      damage: Number(process.env.QTE_DAMAGE_ARGENT ?? backendConfig.qte.tiers.argent.damage),
      weight: Number(process.env.QTE_WEIGHT_ARGENT ?? backendConfig.qte.tiers.argent.weight)
    },
    or: {
      color: backendConfig.qte.tiers.or.color,
      damage: Number(process.env.QTE_DAMAGE_OR ?? backendConfig.qte.tiers.or.damage),
      weight: Number(process.env.QTE_WEIGHT_OR ?? backendConfig.qte.tiers.or.weight)
    },
    diamant: {
      color: backendConfig.qte.tiers.diamant.color,
      damage: Number(process.env.QTE_DAMAGE_DIAMANT ?? backendConfig.qte.tiers.diamant.damage),
      weight: Number(process.env.QTE_WEIGHT_DIAMANT ?? backendConfig.qte.tiers.diamant.weight)
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
