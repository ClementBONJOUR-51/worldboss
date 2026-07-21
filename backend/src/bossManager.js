const EventEmitter = require('events');

class BossManager extends EventEmitter {
  constructor() {
    super();
    this.bossPresets = [
      {
        id: 'boss-1',
        name: 'Leviathan',
        maxHp: 10000,
        spawn: { city: 'Atlantique Nord', lat: 60.0, lng: -30.0 },
        target: { city: 'Paris', lat: 48.8566, lng: 2.3522 },
        spawnOffsetMinutes: -3,
        travelMinutes: 20
      },
      {
        id: 'boss-2',
        name: 'Rift Serpent',
        maxHp: 16000,
        spawn: { city: 'Ocean Indien', lat: -18.0, lng: 64.0 },
        target: { city: 'Tokyo', lat: 35.6762, lng: 139.6503 },
        spawnOffsetMinutes: -1,
        travelMinutes: 24
      },
      {
        id: 'boss-3',
        name: 'Abyss Colossus',
        maxHp: 14000,
        spawn: { city: 'Atlantique Ouest', lat: 33.0, lng: -65.0 },
        target: { city: 'New York', lat: 40.7128, lng: -74.0060 },
        spawnOffsetMinutes: -2,
        travelMinutes: 18
      },
      {
        id: 'boss-4',
        name: 'Sable Maw',
        maxHp: 13000,
        spawn: { city: 'Mer Rouge', lat: 20.0, lng: 38.0 },
        target: { city: 'Cairo', lat: 30.0444, lng: 31.2357 },
        spawnOffsetMinutes: -2,
        travelMinutes: 16
      },
      {
        id: 'boss-5',
        name: 'Storm Kraken',
        maxHp: 17000,
        spawn: { city: 'Pacifique Sud', lat: -33.0, lng: 156.0 },
        target: { city: 'Sydney', lat: -33.8688, lng: 151.2093 },
        spawnOffsetMinutes: -1,
        travelMinutes: 22
      },
      {
        id: 'boss-6',
        name: 'Obsidian Eel',
        maxHp: 15000,
        spawn: { city: 'Atlantique Sud', lat: -20.0, lng: -15.0 },
        target: { city: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729 },
        spawnOffsetMinutes: -1,
        travelMinutes: 21
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
    this.structures = this._createStructuresState();
    this.playerAmmo = new Map();
    this.playerEmotes = new Map();
    this.playerNicknames = new Map();
    this.playerEmoteTimers = new Map();
    this.allowedEmotes = new Set(['🤩', '🫡', '😁', '😎', '😰']);
    this.resetBoss();
    this.pendingClicks = new Map(); // playerId -> clicks
    this.connectedPlayers = new Set(); // active players in arena
    this.chatHistory = [];
    this.chatMessageCounter = 0;
    this.damageTotals = { click: 0, passive: 0, qte: 0 };
    this.matchEnded = false;
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

  _createStructuresState() {
    return {
      ammoFactory: { level: 0, constructionProgress: 0 },
      frontlineCamp: { level: 0, constructionProgress: 0 },
      trainingCenter: { level: 0, constructionProgress: 0 },
      artilleryBattery: { level: 0, constructionProgress: 0 },
      headquarters: { level: 0, constructionProgress: 0 }
    };
  }

  _buildTimedPreset(template, now = Date.now()) {
    const spawnOffsetMinutes = Number(template.spawnOffsetMinutes || 0);
    const travelMinutes = Math.max(8, Number(template.travelMinutes || 20));
    const spawnAt = now + spawnOffsetMinutes * 60 * 1000;
    const arrivalAt = spawnAt + travelMinutes * 60 * 1000;

    return {
      ...template,
      spawnAt,
      arrivalAt
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
    const template = this.bossPresets[this.bossPresetIndex % this.bossPresets.length];
    const preset = this._buildTimedPreset(template, Date.now());
    this.bossPresetIndex += 1;
    this.boss = this._createBossFromPreset(preset);
    this.structures = this._createStructuresState();
    this._syncBossTimeline();
    this.contributions = {}; // playerId -> totalDamage
    if (this.pendingClicks && typeof this.pendingClicks.clear === 'function') {
      this.pendingClicks.clear();
    }
    this.damageTotals = { click: 0, passive: 0, qte: 0 };
    this.matchEnded = false;
    this.chatHistory = [];
  }

  registerPlayer(playerId) {
    this.connectedPlayers.add(playerId);
    if (!this.playerAmmo.has(playerId)) {
      this.playerAmmo.set(playerId, 10);
    }
    if (!this.playerEmotes.has(playerId)) {
      this.playerEmotes.set(playerId, null);
    }
    if (!this.playerNicknames.has(playerId)) {
      this.playerNicknames.set(playerId, null);
    }
  }

  unregisterPlayer(playerId) {
    this.connectedPlayers.delete(playerId);
    this.playerAmmo.delete(playerId);
    this.playerEmotes.delete(playerId);
    this.playerNicknames.delete(playerId);
    const timer = this.playerEmoteTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.playerEmoteTimers.delete(playerId);
    }
  }

  setPlayerNickname(playerId, nickname) {
    this.registerPlayer(playerId);
    const clean = String(nickname || '').trim().slice(0, 24);
    if (!clean) {
      return { ok: false, reason: 'invalid_nickname' };
    }

    this.playerNicknames.set(playerId, clean);
    this.emit('update', this.getState());
    return { ok: true, playerId, nickname: clean };
  }

  getPlayerNickname(playerId) {
    const nickname = this.playerNicknames.get(playerId);
    if (nickname && nickname.trim()) return nickname;
    return `Joueur-${String(playerId || '').slice(0, 6)}`;
  }

  addChatMessage(playerId, text) {
    const content = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 140);
    if (!content) {
      return { ok: false, reason: 'empty_message' };
    }

    const msg = {
      id: `m-${Date.now()}-${this.chatMessageCounter++}`,
      playerId,
      nickname: this.getPlayerNickname(playerId),
      text: content,
      createdAt: Date.now()
    };

    this.chatHistory.push(msg);
    if (this.chatHistory.length > 60) {
      this.chatHistory.shift();
    }

    return { ok: true, message: msg };
  }

  addSystemMessage(playerId, text, kind = 'system') {
    const content = String(text || '').trim().slice(0, 140);
    if (!content) {
      return { ok: false, reason: 'empty_message' };
    }

    const msg = {
      id: `m-${Date.now()}-${this.chatMessageCounter++}`,
      playerId,
      nickname: this.getPlayerNickname(playerId),
      text: content,
      kind,
      createdAt: Date.now()
    };

    this.chatHistory.push(msg);
    if (this.chatHistory.length > 60) {
      this.chatHistory.shift();
    }

    return { ok: true, message: msg };
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
    this.damageTotals.qte += safeDamage;
    this.boss.hp = Math.max(0, this.boss.hp - safeDamage);

    if (this.boss.hp === 0) {
      this._finalizeMatch('victory');
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
    if (!this.boss.alive || this.matchEnded) return;
    const timelineChanged = this._syncBossTimeline();
    const now = Date.now();

    if (now >= Number(this.boss.arrivalAt || 0)) {
      this._finalizeMatch('defeat');
      return;
    }

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
    this.damageTotals.click += clickDamageTotal;
    this.damageTotals.passive += passiveDamageTotal;
    this.pendingClicks.clear();

    if (totalDamage > 0) {
      this.boss.hp = Math.max(0, this.boss.hp - totalDamage);
      if (this.boss.hp === 0) {
        this._finalizeMatch('victory');
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

  _getTimeStats(now = Date.now()) {
    const spawnAt = Number(this.boss.spawnAt) || now;
    const arrivalAt = Number(this.boss.arrivalAt) || now;
    const totalDurationMs = Math.max(0, arrivalAt - spawnAt);
    const elapsedMs = Math.max(0, Math.min(totalDurationMs, now - spawnAt));
    const remainingMs = Math.max(0, arrivalAt - now);
    return { totalDurationMs, elapsedMs, remainingMs };
  }

  _buildMatchEndPayload(outcome, now = Date.now()) {
    const fullState = this.getState();
    return {
      outcome,
      endedAt: now,
      time: this._getTimeStats(now),
      damageTotals: {
        click: this.damageTotals.click,
        passive: this.damageTotals.passive,
        qte: this.damageTotals.qte,
        active: this.damageTotals.click + this.damageTotals.qte,
        total: this.damageTotals.click + this.damageTotals.passive + this.damageTotals.qte
      },
      state: fullState
    };
  }

  _finalizeMatch(outcome) {
    if (this.matchEnded) return;
    this.matchEnded = true;
    this.boss.alive = false;
    const payload = this._buildMatchEndPayload(outcome, Date.now());
    this.emit('match_end', payload);
    this.emit('dead', { boss: this.boss, contributions: this.contributions, outcome });
  }

  getState() {
    this._syncBossTimeline();
    const connectedPlayers = Array.from(this.connectedPlayers);
    const ammoByPlayer = {};
    const playerEmotes = {};
    const playerNicknames = {};
    connectedPlayers.forEach((pid) => {
      ammoByPlayer[pid] = Number(this.getAmmo(pid).toFixed(2));
      playerEmotes[pid] = this.playerEmotes.get(pid) || null;
      playerNicknames[pid] = this.playerNicknames.get(pid) || null;
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
      playerNicknames,
      chatHistory: this.chatHistory,
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
