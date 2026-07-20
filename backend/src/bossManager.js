const EventEmitter = require('events');

class BossManager extends EventEmitter {
  constructor() {
    super();
    const now = Date.now();
    this.bossPresets = [
      {
        id: 'boss-1',
        name: 'Leviathan',
        maxHp: 10000,
        spawn: { city: 'Atlantique Nord', lat: 60.0, lng: -30.0 },
        target: { city: 'Paris', lat: 48.8566, lng: 2.3522 },
        spawnAt: now - 5 * 60 * 1000,
        arrivalAt: now + 20 * 60 * 1000
      },
      {
        id: 'boss-2',
        name: 'Rift Serpent',
        maxHp: 16000,
        spawn: { city: 'Nairobi', lat: -1.2921, lng: 36.8219 },
        target: { city: 'Tokyo', lat: 35.6762, lng: 139.6503 },
        spawnAt: now + 3 * 60 * 1000,
        arrivalAt: now + 28 * 60 * 1000
      }
    ];
    this.bossPresetIndex = 0;
    this.structureDifficulty = {
      ammoFactory: { base: 14, growth: 1.24 },
      frontlineCamp: { base: 18, growth: 1.28 },
      trainingCenter: { base: 22, growth: 1.3 },
      artilleryBattery: { base: 24, growth: 1.32 },
      headquarters: { base: 30, growth: 1.35 }
    };
    this.structures = {
      ammoFactory: { level: 1, constructionProgress: 0 },
      frontlineCamp: { level: 1, constructionProgress: 0 },
      trainingCenter: { level: 1, constructionProgress: 0 },
      artilleryBattery: { level: 1, constructionProgress: 0 },
      headquarters: { level: 0, constructionProgress: 0 }
    };
    this.playerAmmo = new Map();
    this.playerEmotes = new Map();
    this.playerEmoteTimers = new Map();
    this.allowedEmotes = new Set(['🤩', '🫡', '😁', '😎', '😰']);
    this.resetBoss();
    this.pendingClicks = new Map(); // playerId -> clicks
    this.connectedPlayers = new Set(); // active players in arena
    this.tickIntervalMs = 2000;
    this._tickHandle = null;
  }

  _createBossFromPreset(preset) {
    return {
      id: preset.id,
      name: preset.name,
      maxHp: preset.maxHp,
      hp: preset.maxHp,
      alive: true,
      spawn: { ...preset.spawn },
      target: { ...preset.target },
      targetCity: preset.target?.city || 'Ville cible',
      spawnAt: preset.spawnAt,
      arrivalAt: preset.arrivalAt,
      progressPercent: 0,
      currentPosition: {
        lat: preset.spawn.lat,
        lng: preset.spawn.lng
      }
    };
  }

  _computeTimeline(now = Date.now()) {
    const spawnAt = Number(this.boss.spawnAt) || now;
    const arrivalAt = Number(this.boss.arrivalAt) || now;
    const duration = Math.max(1, arrivalAt - spawnAt);
    const ratio = Math.max(0, Math.min(1, (now - spawnAt) / duration));

    const startLat = Number(this.boss.spawn?.lat) || 0;
    const startLng = Number(this.boss.spawn?.lng) || 0;
    const targetLat = Number(this.boss.target?.lat) || startLat;
    const targetLng = Number(this.boss.target?.lng) || startLng;

    const lat = startLat + (targetLat - startLat) * ratio;
    const lng = startLng + (targetLng - startLng) * ratio;

    return {
      progressPercent: Number((ratio * 100).toFixed(2)),
      currentPosition: {
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6))
      }
    };
  }

  _syncBossTimeline(now = Date.now()) {
    if (!this.boss) return false;
    const timeline = this._computeTimeline(now);
    const prevProgress = Number(this.boss.progressPercent) || 0;
    const prevLat = Number(this.boss.currentPosition?.lat || 0);
    const prevLng = Number(this.boss.currentPosition?.lng || 0);

    this.boss.progressPercent = timeline.progressPercent;
    this.boss.currentPosition = timeline.currentPosition;

    return (
      Math.abs(prevProgress - timeline.progressPercent) > 0.01 ||
      Math.abs(prevLat - timeline.currentPosition.lat) > 0.000001 ||
      Math.abs(prevLng - timeline.currentPosition.lng) > 0.000001
    );
  }

  resetBoss() {
    const preset = this.bossPresets[this.bossPresetIndex % this.bossPresets.length];
    this.bossPresetIndex += 1;
    this.boss = this._createBossFromPreset(preset);
    this._syncBossTimeline();
    this.contributions = {}; // playerId -> totalDamage
  }

  registerPlayer(playerId) {
    this.connectedPlayers.add(playerId);
    if (!this.playerAmmo.has(playerId)) {
      this.playerAmmo.set(playerId, 10);
    }
    if (!this.playerEmotes.has(playerId)) {
      this.playerEmotes.set(playerId, null);
    }
  }

  unregisterPlayer(playerId) {
    this.connectedPlayers.delete(playerId);
    this.playerAmmo.delete(playerId);
    this.playerEmotes.delete(playerId);
    const timer = this.playerEmoteTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.playerEmoteTimers.delete(playerId);
    }
  }

  setPlayerEmote(playerId, emote) {
    this.registerPlayer(playerId);
    if (typeof emote !== 'string' || !this.allowedEmotes.has(emote)) {
      return { ok: false, reason: 'invalid_emote' };
    }

    const previousTimer = this.playerEmoteTimers.get(playerId);
    if (previousTimer) {
      clearTimeout(previousTimer);
    }

    this.playerEmotes.set(playerId, emote);
    const timer = setTimeout(() => {
      if (this.playerEmotes.get(playerId) === emote) {
        this.playerEmotes.set(playerId, null);
        this.playerEmoteTimers.delete(playerId);
        this.emit('update', this.getState());
      }
    }, 3000);

    this.playerEmoteTimers.set(playerId, timer);
    this.emit('update', this.getState());
    return { ok: true, playerId, emote };
  }

  _getStructureRequirement(structureKey, level) {
    const tuning = this.structureDifficulty[structureKey] || { base: 20, growth: 1.25 };
    const safeLevel = Math.max(0, Number(level) || 0);
    return Math.max(1, Math.round(tuning.base * Math.pow(tuning.growth, safeLevel)));
  }

  getStructureProgress(structureKey) {
    const structure = this.structures[structureKey];
    if (!structure) {
      return {
        level: 0,
        constructionProgress: 0,
        nextLevelRequirement: 1,
        constructionPercent: 0
      };
    }

    const nextLevelRequirement = this._getStructureRequirement(structureKey, structure.level);
    const constructionProgress = Math.max(0, Number(structure.constructionProgress) || 0);
    const constructionPercent = Math.max(0, Math.min(100, (constructionProgress / nextLevelRequirement) * 100));

    return {
      level: structure.level,
      constructionProgress,
      nextLevelRequirement,
      constructionPercent: Number(constructionPercent.toFixed(2))
    };
  }

  registerStructureBuild(structureKey, amount = 1) {
    const structure = this.structures[structureKey];
    if (!structure) {
      return { ok: false, reason: 'invalid_structure' };
    }

    const safeAmount = Math.max(1, Math.floor(Number(amount) || 1));
    structure.constructionProgress = (structure.constructionProgress || 0) + safeAmount;

    let leveledUp = 0;
    let requirement = this._getStructureRequirement(structureKey, structure.level);
    while (structure.constructionProgress >= requirement) {
      structure.constructionProgress -= requirement;
      structure.level += 1;
      leveledUp += 1;
      requirement = this._getStructureRequirement(structureKey, structure.level);
    }

    this.emit('update', this.getState());
    return {
      ok: true,
      structureKey,
      leveledUp,
      ...this.getStructureProgress(structureKey)
    };
  }

  getAmmo(playerId) {
    return this.playerAmmo.get(playerId) || 0;
  }

  consumeAmmo(playerId, amount = 1) {
    const safeAmount = Math.max(0, Number(amount) || 0);
    if (safeAmount <= 0) return true;

    const current = this.getAmmo(playerId);
    if (current < safeAmount) {
      return false;
    }

    this.playerAmmo.set(playerId, current - safeAmount);
    return true;
  }

  isFrontlineCampActive() {
    return (this.structures.frontlineCamp?.level || 0) > 0;
  }

  getQteModifiers() {
    const campLevel = this.structures.frontlineCamp?.level || 0;
    const hqLevel = this.structures.headquarters?.level || 0;
    const chanceMultiplier = Math.max(0, 1 + Math.max(0, campLevel - 1) * 0.15 + hqLevel * 0.1);
    const tierBoost = Math.min(3, Math.floor(Math.max(0, campLevel - 1) / 2) + Math.min(1, hqLevel));
    return { chanceMultiplier, tierBoost };
  }

  _getAmmoProductionPerSec() {
    const level = this.structures.ammoFactory?.level || 0;
    return level * 8;
  }

  _getPassiveDpsPerSec() {
    const level = this.structures.artilleryBattery?.level || 0;
    const players = Math.max(0, this.connectedPlayers.size);
    return level * players * 0.6;
  }

  getClickDamagePerClick() {
    const level = this.structures.trainingCenter?.level || 1;
    return Math.max(1, Math.floor(level));
  }

  getClickDamageBonus() {
    return Math.max(0, this.getClickDamagePerClick() - 1);
  }

  _distributeAmmoForTick() {
    const players = Array.from(this.connectedPlayers);
    if (players.length === 0) return;

    const tickSeconds = this.tickIntervalMs / 1000;
    const totalAmmo = this._getAmmoProductionPerSec() * tickSeconds;
    if (totalAmmo <= 0) return;

    const share = totalAmmo / players.length;
    players.forEach((pid) => {
      const current = this.getAmmo(pid);
      this.playerAmmo.set(pid, current + share);
    });
  }

  _applyPassiveDamageForTick() {
    const tickSeconds = this.tickIntervalMs / 1000;
    const rawDamage = this._getPassiveDpsPerSec() * tickSeconds;
    const damage = Math.max(0, Math.floor(rawDamage));
    if (damage <= 0) return 0;

    const players = Array.from(this.connectedPlayers);
    if (players.length === 0) return 0;

    const baseShare = Math.floor(damage / players.length);
    let remainder = damage % players.length;
    players.forEach((pid, idx) => {
      const extra = idx < remainder ? 1 : 0;
      const playerDamage = baseShare + extra;
      if (playerDamage > 0) {
        this.contributions[pid] = (this.contributions[pid] || 0) + playerDamage;
      }
    });

    return damage;
  }

  registerClick(playerId, power = 1) {
    if (!this.boss.alive) return;
    this.registerPlayer(playerId); // ensure player is registered
    const prev = this.pendingClicks.get(playerId) || 0;
    this.pendingClicks.set(playerId, prev + power);
  }

  applyInstantDamage(playerId, damage) {
    if (!this.boss.alive) {
      return { applied: false, reason: 'boss_dead' };
    }

    const safeDamage = Math.max(0, Math.floor(Number(damage) || 0));
    if (safeDamage <= 0) {
      return { applied: false, reason: 'invalid_damage' };
    }

    this.registerPlayer(playerId);
    this.contributions[playerId] = (this.contributions[playerId] || 0) + safeDamage;
    this.boss.hp = Math.max(0, this.boss.hp - safeDamage);

    if (this.boss.hp === 0) {
      this.boss.alive = false;
      this.emit('dead', { boss: this.boss, contributions: this.contributions });
    }

    this.emit('update', this.getState());
    return { applied: true, damage: safeDamage };
  }

  start() {
    if (this._tickHandle) return;
    this._tickHandle = setInterval(() => this._tick(), this.tickIntervalMs);
  }

  stop() {
    if (this._tickHandle) clearInterval(this._tickHandle);
    this._tickHandle = null;
  }

  _tick() {
    if (!this.boss.alive) return;
    const timelineChanged = this._syncBossTimeline();
    this._distributeAmmoForTick();

    let totalDamage = 0;
    let clickDamageTotal = 0;
    for (const [pid, clicks] of this.pendingClicks.entries()) {
      const dmg = Math.max(0, Math.floor(clicks));
      totalDamage += dmg;
      clickDamageTotal += dmg;
      this.contributions[pid] = (this.contributions[pid] || 0) + dmg;
    }

    const passiveDamageTotal = this._applyPassiveDamageForTick();
    totalDamage += passiveDamageTotal;
    this.pendingClicks.clear();

    if (totalDamage > 0) {
      this.boss.hp = Math.max(0, this.boss.hp - totalDamage);
      if (this.boss.hp === 0) {
        this.boss.alive = false;
        this.emit('dead', { boss: this.boss, contributions: this.contributions });
      }
      this.emit('combat_tick', {
        clickDamageTotal,
        passiveDamageTotal,
        totalDamage
      });
      this.emit('update', this.getState());
      return;
    }

    if (timelineChanged) {
      this.emit('update', this.getState());
    }
  }

  getState() {
    this._syncBossTimeline();
    const connectedPlayers = Array.from(this.connectedPlayers);
    const ammoByPlayer = {};
    const playerEmotes = {};
    connectedPlayers.forEach((pid) => {
      ammoByPlayer[pid] = Number(this.getAmmo(pid).toFixed(2));
      playerEmotes[pid] = this.playerEmotes.get(pid) || null;
    });

    const passiveDpsPerSec = Number(this._getPassiveDpsPerSec().toFixed(2));
    const ammoProductionPerSec = Number(this._getAmmoProductionPerSec().toFixed(2));
    const clickDamagePerClick = this.getClickDamagePerClick();

    const contributions = {};
    Object.entries(this.contributions).forEach(([pid, value]) => {
      contributions[pid] = Math.max(0, Math.floor(Number(value) || 0));
    });

    return {
      boss: this.boss,
      contributions,
      connectedPlayers,
      ammoByPlayer,
      playerEmotes,
      structures: {
        ammoFactory: {
          ...this.getStructureProgress('ammoFactory'),
          productionPerSec: ammoProductionPerSec
        },
        frontlineCamp: {
          ...this.getStructureProgress('frontlineCamp'),
          enabled: this.isFrontlineCampActive(),
          ...this.getQteModifiers()
        },
        trainingCenter: {
          ...this.getStructureProgress('trainingCenter'),
          clickDamagePerClick,
          clickDamageBonus: this.getClickDamageBonus()
        },
        artilleryBattery: {
          ...this.getStructureProgress('artilleryBattery'),
          passiveDps: passiveDpsPerSec
        },
        headquarters: {
          ...this.getStructureProgress('headquarters')
        }
      }
    };
  }
}

module.exports = new BossManager();
