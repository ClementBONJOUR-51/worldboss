const { qteConfig, resolveQteDurationMs } = require('./qteConfig');

function pickTier(weightsOverride = null) {
  const tierEntries = Object.entries(qteConfig.tiers).map(([name, tier]) => {
    const override = weightsOverride && typeof weightsOverride[name] === 'number' ? weightsOverride[name] : tier.weight;
    return [name, { ...tier, weight: override }];
  });
  const totalWeight = tierEntries.reduce((sum, [, tier]) => sum + Math.max(0, tier.weight), 0);
  if (totalWeight <= 0) {
    return 'bronze';
  }

  let cursor = Math.random() * totalWeight;
  for (const [tierName, tier] of tierEntries) {
    cursor -= Math.max(0, tier.weight);
    if (cursor <= 0) return tierName;
  }

  return 'bronze';
}

function getBoostedWeights(tierBoost = 0) {
  if (!tierBoost) return null;

  const base = {
    bronze: qteConfig.tiers.bronze.weight,
    argent: qteConfig.tiers.argent.weight,
    or: qteConfig.tiers.or.weight,
    diamant: qteConfig.tiers.diamant.weight
  };

  const shiftUnit = 6 * Math.max(0, tierBoost);
  const bronzeShift = Math.min(base.bronze, shiftUnit);
  base.bronze -= bronzeShift;
  base.argent += bronzeShift * 0.65;
  base.or += bronzeShift * 0.25;
  base.diamant += bronzeShift * 0.1;
  return base;
}

class QteService {
  constructor() {
    this.activeByPlayer = new Map();
    this.cooldownByPlayer = new Map();
  }

  isOnCooldown(playerId, now = Date.now()) {
    const cooldownUntil = this.cooldownByPlayer.get(playerId) || 0;
    return cooldownUntil > now;
  }

  getCooldownRemainingMs(playerId, now = Date.now()) {
    const cooldownUntil = this.cooldownByPlayer.get(playerId) || 0;
    return Math.max(0, cooldownUntil - now);
  }

  setCooldown(playerId, durationMs = qteConfig.playerCooldownMs, now = Date.now()) {
    this.cooldownByPlayer.set(playerId, now + durationMs);
  }

  clearPlayer(playerId) {
    this.activeByPlayer.delete(playerId);
    this.cooldownByPlayer.delete(playerId);
  }

  canGrantQte(playerId, now = Date.now()) {
    if (this.isOnCooldown(playerId, now)) return false;

    const active = this.activeByPlayer.get(playerId);
    if (!active) return true;

    if (active.expiresAt <= now) {
      this.activeByPlayer.delete(playerId);
      this.setCooldown(playerId, qteConfig.playerCooldownMs, now);
      return false;
    }

    return false;
  }

  maybeGrantQte(playerId, now = Date.now(), options = {}) {
    if (!this.canGrantQte(playerId, now)) {
      return null;
    }

    if (options.enabled === false) {
      return null;
    }

    const chanceMultiplier = Number(options.chanceMultiplier || 1);
    const effectiveChance = Math.max(0, Math.min(1, qteConfig.grantChance * chanceMultiplier));

    if (Math.random() > effectiveChance) {
      return null;
    }

    const tier = pickTier(getBoostedWeights(Number(options.tierBoost || 0)));
    const durationMs = resolveQteDurationMs();
    const qte = {
      id: `${playerId}-${now}-${Math.floor(Math.random() * 1e6)}`,
      playerId,
      tier,
      damage: qteConfig.tiers[tier].damage,
      color: qteConfig.tiers[tier].color,
      createdAt: now,
      expiresAt: now + durationMs
    };

    this.activeByPlayer.set(playerId, qte);
    return qte;
  }

  validateHit(playerId, qteId, now = Date.now()) {
    const active = this.activeByPlayer.get(playerId);

    if (!active) {
      return { ok: false, reason: 'no_active_qte', damage: 0 };
    }

    if (active.id !== qteId) {
      return { ok: false, reason: 'invalid_qte_id', damage: 0 };
    }

    if (active.expiresAt < now) {
      this.activeByPlayer.delete(playerId);
      this.setCooldown(playerId, qteConfig.playerCooldownMs, now);
      return { ok: false, reason: 'expired', damage: 0 };
    }

    this.activeByPlayer.delete(playerId);
    this.setCooldown(playerId, qteConfig.playerCooldownMs, now);

    return {
      ok: true,
      reason: 'success',
      damage: active.damage,
      tier: active.tier
    };
  }
}

module.exports = new QteService();
