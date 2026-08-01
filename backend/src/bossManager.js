const EventEmitter = require('events');
const backendConfig = require('./backendConfig');
const bossAttackConfig = require('./bossAttackConfig');

class BossManager extends EventEmitter {
  constructor() {
    super();
    this.bossPresets = backendConfig.bosses;
    this.bossEncounterConfig = backendConfig.bossEncounter || {};
    this.bossPresetIndex = 0;
    this.structureDifficulty = backendConfig.structures.difficulty;
    this.structures = this._createStructuresState();
    this.playerAmmo = new Map();
    this.playerEmotes = new Map();
    this.playerNicknames = new Map();
    this.playerStates = new Map();
    this.playerEmoteTimers = new Map();
    this.allowedEmotes = new Set(backendConfig.players.allowedEmotes);
    this.bosses = [];
    this.primaryBossId = null;
    this.boss = null;
    this.resetBoss();
    this.pendingClicks = new Map();
    this.connectedPlayers = new Set();
    this.chatHistory = [];
    this.chatMessageCounter = 0;
    this.damageTotals = { click: 0, passive: 0, qte: 0 };
    this.matchEnded = false;
    this.currentBossAttack = null;
    this.nextBossAttackAt = 0;
    this.tickIntervalMs = backendConfig.combat.tickIntervalMs;
    this._tickHandle = null;
  }

  _createBossFromPreset(preset) {
    const criticalLevel = Math.max(1, Math.min(3, Number(preset.criticalLevel) || 1));
    const difficultyLevel = Math.max(1, Number(preset.difficultyLevel || criticalLevel) || criticalLevel);

    return {
      id: preset.id,
      name: preset.name,
      emoji: preset.emoji || this.bossEncounterConfig.defaultEmoji || '👾',
      maxHp: preset.maxHp,
      difficultyLevel,
      difficultyLabel: preset.difficultyLabel || `Niveau ${difficultyLevel}`,
      criticalLevel,
      criticalLabel: bossAttackConfig.bossCriticalLabels[criticalLevel] || bossAttackConfig.bossCriticalLabels[1],
      hp: preset.maxHp,
      alive: true,
      spawn: { ...preset.spawn },
      target: { ...preset.target },
      targetCity: preset.target?.city || 'Ville cible',
      spawnAt: preset.spawnAt,
      arrivalAt: preset.arrivalAt,
      progressPercent: 0,
      structures: this._createStructuresState(),
      nextBossAttackAt: this._rollNextBossAttackAt(Date.now()),
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

  _getConfiguredActiveBossCount() {
    const rosterSize = Math.max(1, this.bossPresets.length || 1);
    const minCount = Math.max(1, Number(this.bossEncounterConfig.minActiveCount) || 1);
    const maxCount = Math.max(minCount, Number(this.bossEncounterConfig.maxActiveCount) || minCount);
    const desiredCount = Math.max(minCount, Number(this.bossEncounterConfig.activeCount) || minCount);
    return Math.min(rosterSize, Math.max(minCount, Math.min(maxCount, desiredCount)));
  }

  _buildTimedPreset(template, now = Date.now()) {
    const spawnOffsetMinutes = Number(template.spawnOffsetMinutes || 0);
    const travelMinutes = Math.max(Number(backendConfig.combat.minTravelMinutes) || 8, Number(template.travelMinutes || 20));
    const spawnAt = now + spawnOffsetMinutes * 60 * 1000;
    const arrivalAt = spawnAt + travelMinutes * 60 * 1000;

    return {
      ...template,
      spawnAt,
      arrivalAt
    };
  }

  _buildEncounterPresets(now = Date.now()) {
    const encounterCount = this._getConfiguredActiveBossCount();
    const presets = [];

    for (let index = 0; index < encounterCount; index += 1) {
      const presetTemplate = this.bossPresets[(this.bossPresetIndex + index) % this.bossPresets.length];
      presets.push(this._buildTimedPreset(presetTemplate, now));
    }

    this.bossPresetIndex = (this.bossPresetIndex + encounterCount) % this.bossPresets.length;
    return presets;
  }

  _computeTimeline(boss, now = Date.now()) {
    const spawnAt = Number(boss?.spawnAt) || now;
    const arrivalAt = Number(boss?.arrivalAt) || now;
    const duration = Math.max(1, arrivalAt - spawnAt);
    const ratio = Math.max(0, Math.min(1, (now - spawnAt) / duration));

    const startLat = Number(boss?.spawn?.lat) || 0;
    const startLng = Number(boss?.spawn?.lng) || 0;
    const targetLat = Number(boss?.target?.lat) || startLat;
    const targetLng = Number(boss?.target?.lng) || startLng;

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

  _syncBossTimeline(boss, now = Date.now()) {
    if (!boss) return false;
    const timeline = this._computeTimeline(boss, now);
    const prevProgress = Number(boss.progressPercent) || 0;
    const prevLat = Number(boss.currentPosition?.lat || 0);
    const prevLng = Number(boss.currentPosition?.lng || 0);

    boss.progressPercent = timeline.progressPercent;
    boss.currentPosition = timeline.currentPosition;

    return (
      Math.abs(prevProgress - timeline.progressPercent) > 0.01 ||
      Math.abs(prevLat - timeline.currentPosition.lat) > 0.000001 ||
      Math.abs(prevLng - timeline.currentPosition.lng) > 0.000001
    );
  }

  _syncBossesTimeline(now = Date.now()) {
    let changed = false;
    this.bosses.forEach((boss) => {
      changed = this._syncBossTimeline(boss, now) || changed;
    });
    this._refreshPrimaryBossReference();
    return changed;
  }

  _getBossById(bossId) {
    return this.bosses.find((boss) => boss.id === bossId) || null;
  }

  _getAliveBosses() {
    return this.bosses.filter((boss) => boss.alive);
  }

  _getPrimaryBoss() {
    const preferredBoss = this.primaryBossId ? this._getBossById(this.primaryBossId) : null;
    if (preferredBoss?.alive) {
      return preferredBoss;
    }

    const firstAliveBoss = this.bosses.find((boss) => boss.alive) || null;
    if (firstAliveBoss) {
      this.primaryBossId = firstAliveBoss.id;
      return firstAliveBoss;
    }

    return preferredBoss || this.bosses[0] || null;
  }

  _refreshPrimaryBossReference() {
    this.boss = this._getPrimaryBoss();
    this.primaryBossId = this.boss?.id || this.primaryBossId || null;
    this.structures = this.boss?.structures || this._createStructuresState();
    return this.boss;
  }

  selectPrimaryBoss(bossId) {
    const requestedBoss = this._getBossById(bossId);
    if (!requestedBoss) {
      return { ok: false, reason: 'invalid_boss' };
    }

    if (!requestedBoss.alive) {
      return { ok: false, reason: 'boss_dead' };
    }

    this.primaryBossId = requestedBoss.id;
    this.currentBossAttack = null;
    requestedBoss.nextBossAttackAt = this._rollNextBossAttackAt(Date.now());
    this._refreshPrimaryBossReference();
    this.emit('update', this.getState());
    return { ok: true, bossId: requestedBoss.id };
  }

  _getBossStructures(boss = this._getPrimaryBoss()) {
    if (!boss) {
      return this._createStructuresState();
    }

    if (!boss.structures) {
      boss.structures = this._createStructuresState();
    }

    return boss.structures;
  }

  _createPlayerState() {
    return {
      status: 'healthy',
      injuredUntil: 0,
      lastHitAt: 0,
      lastAttackType: null
    };
  }

  _ensurePlayerState(playerId) {
    if (!this.playerStates.has(playerId)) {
      this.playerStates.set(playerId, this._createPlayerState());
    }
    return this.playerStates.get(playerId);
  }

  _rollNextBossAttackAt(now = Date.now()) {
    const minInterval = Math.max(2000, Number(bossAttackConfig.schedule.minIntervalMs) || 12000);
    const maxInterval = Math.max(minInterval, Number(bossAttackConfig.schedule.maxIntervalMs) || minInterval);
    const variance = maxInterval - minInterval;
    return now + minInterval + Math.floor(Math.random() * (variance + 1));
  }

  _getBossCriticalLevel(boss = this._getPrimaryBoss()) {
    return Math.max(1, Math.min(3, Number(boss?.criticalLevel) || 1));
  }

  _getBossAttackType(progressRatio = 0, boss = this._getPrimaryBoss()) {
    const criticalLevel = this._getBossCriticalLevel(boss);
    const ultimateChanceConfig = bossAttackConfig.ultimateChance;
    const chance = Math.max(
      0,
      Math.min(
        Number(ultimateChanceConfig.max) || 1,
        Number(ultimateChanceConfig.base || 0) + progressRatio * Number(ultimateChanceConfig.progressScale || 0) + (criticalLevel - 1) * Number(ultimateChanceConfig.criticalLevelBonus || 0)
      )
    );

    return {
      type: Math.random() < chance ? 'ultimate' : 'light',
      ultimateChance: Number(chance.toFixed(3))
    };
  }

  _createBossAttack(now = Date.now()) {
    const activeBoss = this._getPrimaryBoss();
    if (!activeBoss?.alive) return null;

    const progressRatio = Math.max(0, Math.min(1, Number(activeBoss.progressPercent || 0) / 100));
    const criticalLevel = this._getBossCriticalLevel(activeBoss);
    const attackTypeData = this._getBossAttackType(progressRatio, activeBoss);
    const attackConfig = bossAttackConfig.attacks[attackTypeData.type] || bossAttackConfig.attacks.light;
    const hitChance = Math.max(
      0,
      Math.min(
        1,
        Number(attackConfig.hitChanceBase || 0) + (criticalLevel - 1) * Number(attackConfig.hitChancePerCriticalLevel || 0) + progressRatio * Number(attackConfig.hitChanceProgressScale || 0)
      )
    );
    const warningDurationMs = Math.max(800, Number(attackConfig.warningDurationMs) || 2600);

    return {
      attackId: `atk-${now}-${Math.random().toString(36).slice(2, 8)}`,
      bossId: activeBoss.id,
      bossName: activeBoss.name,
      bossEmoji: activeBoss.emoji,
      attackType: attackTypeData.type,
      attackLabel: attackConfig.label,
      animation: attackConfig.animation || attackTypeData.type,
      criticalLevel,
      criticalLabel: activeBoss.criticalLabel || bossAttackConfig.bossCriticalLabels[criticalLevel],
      progressPercent: Number(activeBoss.progressPercent || 0),
      warningAt: now,
      resolveAt: now + warningDurationMs,
      warningDurationMs,
      injuryDurationMs: Math.max(1000, Number(attackConfig.injuryDurationMs) || 4500),
      hitChance: Number(hitChance.toFixed(3)),
      ultimateChance: attackTypeData.ultimateChance,
      lane: 'all',
      status: 'warning'
    };
  }

  _scheduleBossAttack(now = Date.now()) {
    const activeBoss = this._getPrimaryBoss();
    if (!activeBoss?.alive || this.matchEnded) return false;
    if (this.currentBossAttack || this.connectedPlayers.size === 0) return false;
    const nextBossAttackAt = Number(activeBoss.nextBossAttackAt || 0);
    if (now < nextBossAttackAt) return false;

    this.currentBossAttack = this._createBossAttack(now);
    if (!this.currentBossAttack) return false;

    activeBoss.nextBossAttackAt = this._rollNextBossAttackAt(this.currentBossAttack.resolveAt);
    this.emit('boss_attack_warning', this.currentBossAttack);
    return true;
  }

  _resolveBossAttack(now = Date.now()) {
    if (!this.currentBossAttack || now < Number(this.currentBossAttack.resolveAt || 0)) return null;

    const resolvedAttack = this.currentBossAttack;
    const hitPlayers = [];
    const injuredUntilByPlayer = {};
    const connectedPlayers = Array.from(this.connectedPlayers);

    connectedPlayers.forEach((playerId) => {
      const state = this._ensurePlayerState(playerId);
      const wasAlreadyInjured = Number(state.injuredUntil || 0) > now;
      const wasHit = Math.random() < Number(resolvedAttack.hitChance || 0);
      if (!wasHit) return;

      const nextInjuredUntil = now + Number(resolvedAttack.injuryDurationMs || 0);
      state.status = 'injured';
      state.injuredUntil = Math.max(nextInjuredUntil, Number(state.injuredUntil || 0));
      state.lastHitAt = now;
      state.lastAttackType = resolvedAttack.attackType;

      hitPlayers.push(playerId);
      injuredUntilByPlayer[playerId] = state.injuredUntil;

      this.emit('player_injured', {
        attackId: resolvedAttack.attackId,
        bossId: resolvedAttack.bossId,
        playerId,
        attackType: resolvedAttack.attackType,
        criticalLevel: resolvedAttack.criticalLevel,
        injuredUntil: state.injuredUntil,
        injuryDurationMs: Number(resolvedAttack.injuryDurationMs || 0),
        wasAlreadyInjured
      });
    });

    this.currentBossAttack = null;
    const payload = {
      ...resolvedAttack,
      status: 'resolved',
      resolvedAt: now,
      hitPlayerIds: hitPlayers,
      injuredUntilByPlayer
    };
    this.emit('boss_attack_resolved', payload);
    return payload;
  }

  _refreshPlayerStates(now = Date.now()) {
    let changed = false;
    this.playerStates.forEach((state) => {
      if (state.status === 'injured' && Number(state.injuredUntil || 0) <= now) {
        state.status = 'healthy';
        state.injuredUntil = 0;
        state.lastAttackType = null;
        changed = true;
      }
    });
    return changed;
  }

  getPlayerState(playerId, now = Date.now()) {
    const state = this._ensurePlayerState(playerId);
    const injuredUntil = Number(state.injuredUntil || 0);
    if (injuredUntil > now) {
      return {
        status: 'injured',
        injuredUntil,
        remainingMs: injuredUntil - now,
        lastHitAt: Number(state.lastHitAt || 0),
        lastAttackType: state.lastAttackType || null
      };
    }

    return {
      status: 'healthy',
      injuredUntil: 0,
      remainingMs: 0,
      lastHitAt: Number(state.lastHitAt || 0),
      lastAttackType: state.lastAttackType || null
    };
  }

  getActionBlockStatus(playerId, now = Date.now()) {
    const playerState = this.getPlayerState(playerId, now);
    if (playerState.status === 'injured') {
      return {
        blocked: true,
        reason: 'injured',
        injuredUntil: playerState.injuredUntil,
        remainingMs: playerState.remainingMs,
        lastAttackType: playerState.lastAttackType
      };
    }

    return { blocked: false, reason: null, injuredUntil: 0, remainingMs: 0, lastAttackType: null };
  }

  resetBoss() {
    const presets = this._buildEncounterPresets(Date.now());
    this.bosses = presets.map((preset) => this._createBossFromPreset(preset));
    this.primaryBossId = this.bosses[0]?.id || null;
    this.boss = this._getPrimaryBoss();
    this._syncBossesTimeline();
    this.contributions = {};
    if (this.pendingClicks && typeof this.pendingClicks.clear === 'function') {
      this.pendingClicks.clear();
    }
    this.damageTotals = { click: 0, passive: 0, qte: 0 };
    this.matchEnded = false;
    this.chatHistory = [];
    this.currentBossAttack = null;
    this.playerStates.forEach((state) => {
      state.status = 'healthy';
      state.injuredUntil = 0;
      state.lastHitAt = 0;
      state.lastAttackType = null;
    });
  }

  registerPlayer(playerId) {
    this.connectedPlayers.add(playerId);
    if (!this.playerAmmo.has(playerId)) {
      this.playerAmmo.set(playerId, backendConfig.players.initialAmmo);
    }
    if (!this.playerEmotes.has(playerId)) {
      this.playerEmotes.set(playerId, null);
    }
    if (!this.playerNicknames.has(playerId)) {
      this.playerNicknames.set(playerId, null);
    }
    this._ensurePlayerState(playerId);
  }

  unregisterPlayer(playerId) {
    this.connectedPlayers.delete(playerId);
    this.playerAmmo.delete(playerId);
    this.playerEmotes.delete(playerId);
    this.playerNicknames.delete(playerId);
    this.playerStates.delete(playerId);
    const timer = this.playerEmoteTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.playerEmoteTimers.delete(playerId);
    }
  }

  setPlayerNickname(playerId, nickname) {
    this.registerPlayer(playerId);
    const clean = String(nickname || '').trim().slice(0, backendConfig.players.nicknameMaxLength);
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
    return `${backendConfig.players.defaultNicknamePrefix}-${String(playerId || '').slice(0, 6)}`;
  }

  addChatMessage(playerId, text) {
    const content = String(text || '').replace(/\s+/g, ' ').trim().slice(0, backendConfig.text.chatMessageMaxLength);
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
    if (this.chatHistory.length > backendConfig.text.chatHistoryMaxEntries) {
      this.chatHistory.shift();
    }

    return { ok: true, message: msg };
  }

  addSystemMessage(playerId, text, kind = 'system') {
    const content = String(text || '').trim().slice(0, backendConfig.text.systemMessageMaxLength);
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
    if (this.chatHistory.length > backendConfig.text.chatHistoryMaxEntries) {
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
    }, backendConfig.players.emoteDurationMs);

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
    const structures = this._getBossStructures();
    const structure = structures[structureKey];
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
    const structures = this._getBossStructures();
    const structure = structures[structureKey];
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
    const structures = this._getBossStructures();
    return (structures.frontlineCamp?.level || 0) > 0;
  }

  getQteModifiers() {
    const structures = this._getBossStructures();
    const campLevel = structures.frontlineCamp?.level || 0;
    const hqLevel = structures.headquarters?.level || 0;
    const chanceMultiplier = Math.max(
      0,
      1 + Math.max(0, campLevel - 1) * backendConfig.structures.qteChanceBonusPerCampLevelAfterOne + hqLevel * backendConfig.structures.qteHeadquartersChanceBonusPerLevel
    );
    const tierBoost = Math.min(
      backendConfig.structures.qteTierBoostMax,
      Math.floor(Math.max(0, campLevel - 1) / backendConfig.structures.qteTierBoostEveryCampLevels) + Math.min(backendConfig.structures.qteHeadquartersTierBoostMax, hqLevel)
    );
    return { chanceMultiplier, tierBoost };
  }

  _getAmmoProductionPerSec() {
    const structures = this._getBossStructures();
    const level = structures.ammoFactory?.level || 0;
    return level * backendConfig.structures.ammoFactoryProductionPerLevel;
  }

  _getPassiveDpsPerSec() {
    const structures = this._getBossStructures();
    const level = structures.artilleryBattery?.level || 0;
    const players = Math.max(0, this.connectedPlayers.size);
    return level * players * backendConfig.structures.artilleryBatteryDamagePerPlayerPerLevel;
  }

  getClickDamagePerClick() {
    const structures = this._getBossStructures();
    const level = structures.trainingCenter?.level || 1;
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
    const remainder = damage % players.length;
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
    const activeBoss = this._getPrimaryBoss();
    if (!activeBoss?.alive) return;
    this.registerPlayer(playerId);
    if (this.getActionBlockStatus(playerId).blocked) return;
    const prev = this.pendingClicks.get(playerId) || 0;
    this.pendingClicks.set(playerId, prev + power);
  }

  _applyDamageToBosses(totalDamage) {
    let remainingDamage = Math.max(0, Math.floor(Number(totalDamage) || 0));
    const killedBossIds = [];

    while (remainingDamage > 0) {
      const activeBoss = this._getPrimaryBoss();
      if (!activeBoss?.alive) break;

      const appliedDamage = Math.min(remainingDamage, Math.max(0, Math.floor(Number(activeBoss.hp) || 0)));
      activeBoss.hp = Math.max(0, activeBoss.hp - appliedDamage);
      remainingDamage -= appliedDamage;

      if (activeBoss.hp === 0) {
        activeBoss.alive = false;
        killedBossIds.push(activeBoss.id);
        this.primaryBossId = activeBoss.id;
        if (this.currentBossAttack?.bossId === activeBoss.id) {
          this.currentBossAttack = null;
        }
        this._refreshPrimaryBossReference();
      }
    }

    this._refreshPrimaryBossReference();
    return {
      appliedDamage: Math.max(0, Math.floor(Number(totalDamage) || 0)) - remainingDamage,
      killedBossIds,
      allBossesDefeated: this._getAliveBosses().length === 0
    };
  }

  applyInstantDamage(playerId, damage) {
    const activeBoss = this._getPrimaryBoss();
    if (!activeBoss?.alive) {
      return { applied: false, reason: 'boss_dead' };
    }

    const safeDamage = Math.max(0, Math.floor(Number(damage) || 0));
    if (safeDamage <= 0) {
      return { applied: false, reason: 'invalid_damage' };
    }

    this.registerPlayer(playerId);
    if (this.getActionBlockStatus(playerId).blocked) {
      return { applied: false, reason: 'injured' };
    }

    this.contributions[playerId] = (this.contributions[playerId] || 0) + safeDamage;
    this.damageTotals.qte += safeDamage;
    const damageResult = this._applyDamageToBosses(safeDamage);

    if (damageResult.allBossesDefeated) {
      this._finalizeMatch('victory');
    }

    this.emit('update', this.getState());
    return { applied: true, damage: safeDamage, killedBossIds: damageResult.killedBossIds };
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
    const activeBoss = this._getPrimaryBoss();
    if (!activeBoss?.alive || this.matchEnded) return;

    const now = Date.now();
    const timelineChanged = this._syncBossesTimeline(now);
    const recoveredPlayers = this._refreshPlayerStates(now);

    const arrivedBoss = this._getAliveBosses().find((boss) => now >= Number(boss.arrivalAt || 0));
    if (arrivedBoss && this.bossEncounterConfig.defeatOnAnyArrival !== false) {
      this.primaryBossId = arrivedBoss.id;
      this._refreshPrimaryBossReference();
      this._finalizeMatch('defeat');
      return;
    }

    const resolvedBossAttack = this._resolveBossAttack(now);
    const warnedBossAttack = this._scheduleBossAttack(now);

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
      const damageResult = this._applyDamageToBosses(totalDamage);
      if (damageResult.allBossesDefeated) {
        this._finalizeMatch('victory');
      }
      this.emit('combat_tick', {
        clickDamageTotal,
        passiveDamageTotal,
        totalDamage,
        killedBossIds: damageResult.killedBossIds,
        bossAttackResolved: resolvedBossAttack
      });
      this.emit('update', this.getState());
      return;
    }

    if (timelineChanged || recoveredPlayers || resolvedBossAttack || warnedBossAttack) {
      this.emit('update', this.getState());
    }
  }

  _getTimeStats(now = Date.now()) {
    const referenceBoss = this._getPrimaryBoss();
    const spawnAt = Number(referenceBoss?.spawnAt) || now;
    const arrivalAt = Number(referenceBoss?.arrivalAt) || now;
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
    if (outcome === 'defeat') {
      const primaryBoss = this._getPrimaryBoss();
      if (primaryBoss) {
        primaryBoss.alive = false;
      }
    }
    const payload = this._buildMatchEndPayload(outcome, Date.now());
    this.emit('match_end', payload);
    this.emit('dead', { boss: this._getPrimaryBoss(), bosses: this.bosses, contributions: this.contributions, outcome });
  }

  getState() {
    this._syncBossesTimeline();
    const connectedPlayers = Array.from(this.connectedPlayers);
    const ammoByPlayer = {};
    const playerEmotes = {};
    const playerNicknames = {};
    const playerStates = {};
    connectedPlayers.forEach((pid) => {
      ammoByPlayer[pid] = Number(this.getAmmo(pid).toFixed(2));
      playerEmotes[pid] = this.playerEmotes.get(pid) || null;
      playerNicknames[pid] = this.playerNicknames.get(pid) || null;
      playerStates[pid] = this.getPlayerState(pid);
    });

    const passiveDpsPerSec = Number(this._getPassiveDpsPerSec().toFixed(2));
    const ammoProductionPerSec = Number(this._getAmmoProductionPerSec().toFixed(2));
    const clickDamagePerClick = this.getClickDamagePerClick();

    const contributions = {};
    Object.entries(this.contributions).forEach(([pid, value]) => {
      contributions[pid] = Math.max(0, Math.floor(Number(value) || 0));
    });

    const primaryBoss = this._getPrimaryBoss();

    return {
      boss: primaryBoss,
      bosses: this.bosses,
      bossEncounter: {
        activeCount: this._getConfiguredActiveBossCount(),
        aliveCount: this._getAliveBosses().length,
        primaryBossId: primaryBoss?.id || null
      },
      contributions,
      connectedPlayers,
      ammoByPlayer,
      playerEmotes,
      playerNicknames,
      playerStates,
      chatHistory: this.chatHistory,
      bossAttack: this.currentBossAttack,
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
