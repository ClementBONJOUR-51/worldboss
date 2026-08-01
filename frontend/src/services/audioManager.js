import { audioConfig } from '../config/audioConfig'

const SILENT_WAV_DATA_URI = 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ4AAAAAAAAAAAAA'

class AudioManager {
  constructor() {
    this.muted = false
    this.unlocked = false
    this.baseAudioByKey = new Map()
    this.audioPoolByKey = new Map()
    this.lastPlayedAtByKey = new Map()
    this.warnedMissingKeys = new Set()
  }

  setMuted(muted) {
    this.muted = Boolean(muted)
    if (this.muted) {
      this.stopAll()
    }
    return this.muted
  }

  async unlock() {
    this.unlocked = true

    try {
      const probe = new Audio(SILENT_WAV_DATA_URI)
      probe.volume = 0
      await probe.play()
      probe.pause()
      probe.currentTime = 0
    } catch {
      // On garde l etat unlocked pour ne pas bloquer le reste du jeu.
    }

    this.preloadAll()
    return true
  }

  preloadAll() {
    Object.keys(audioConfig.sounds).forEach((soundKey) => {
      this.getBaseAudio(soundKey)
      this.ensurePool(soundKey)
    })
  }

  getBaseAudio(soundKey) {
    if (this.baseAudioByKey.has(soundKey)) {
      return this.baseAudioByKey.get(soundKey)
    }

    const sound = audioConfig.sounds[soundKey]
    if (!sound?.url) return null

    const baseAudio = new Audio(sound.url)
    baseAudio.preload = 'auto'
    baseAudio.load()
    baseAudio.addEventListener('error', () => {
      if (this.warnedMissingKeys.has(soundKey)) return
      this.warnedMissingKeys.add(soundKey)
      console.warn(`[audio] asset missing or unreadable for ${soundKey}: ${sound.url}`)
    })

    this.baseAudioByKey.set(soundKey, baseAudio)
    return baseAudio
  }

  createPooledAudio(soundKey) {
    const sound = audioConfig.sounds[soundKey]
    if (!sound?.url) return null

    const pooledAudio = new Audio(sound.url)
    pooledAudio.preload = 'auto'
    pooledAudio.load()
    pooledAudio.addEventListener('error', () => {
      if (this.warnedMissingKeys.has(soundKey)) return
      this.warnedMissingKeys.add(soundKey)
      console.warn(`[audio] asset missing or unreadable for ${soundKey}: ${sound.url}`)
    })

    return pooledAudio
  }

  ensurePool(soundKey) {
    if (this.audioPoolByKey.has(soundKey)) {
      return this.audioPoolByKey.get(soundKey)
    }

    const sound = audioConfig.sounds[soundKey]
    if (!sound) return []

    const maxConcurrent = Math.max(1, Number(sound.maxConcurrent || 1))
    const pool = Array.from({ length: maxConcurrent }, () => this.createPooledAudio(soundKey)).filter(Boolean)
    this.audioPoolByKey.set(soundKey, pool)
    return pool
  }

  resolveVolume(soundKey, overrideVolume = 1) {
    const sound = audioConfig.sounds[soundKey]
    if (!sound) return 0

    const categoryVolume = audioConfig.categories[sound.category] ?? 1
    const soundVolume = sound.volume ?? 1
    return Math.max(0, Math.min(1, audioConfig.masterVolume * categoryVolume * soundVolume * overrideVolume))
  }

  pickAudioFromPool(soundKey) {
    const pool = this.ensurePool(soundKey)
    if (!pool.length) return null

    const available = pool.find((audioElement) => audioElement.paused || audioElement.ended)
    if (available) return available

    return pool.reduce((oldest, current) => {
      if (!oldest) return current
      const oldestTime = Number.isFinite(oldest.currentTime) ? oldest.currentTime : 0
      const currentTime = Number.isFinite(current.currentTime) ? current.currentTime : 0
      return currentTime > oldestTime ? current : oldest
    }, null)
  }

  play(soundKey, options = {}) {
    const sound = audioConfig.sounds[soundKey]
    if (!sound || this.muted || !this.unlocked) return null

    const now = Date.now()
    const cooldownMs = Math.max(0, Number(sound.cooldownMs || 0))
    const lastPlayedAt = this.lastPlayedAtByKey.get(soundKey) || 0
    if (cooldownMs > 0 && now - lastPlayedAt < cooldownMs) {
      return null
    }

    const baseAudio = this.getBaseAudio(soundKey)
    if (!baseAudio) return null

    const audioElement = this.pickAudioFromPool(soundKey)
    if (!audioElement) return null

    try {
      audioElement.pause()
      audioElement.currentTime = 0
    } catch {
      // ignore reset failure
    }

    audioElement.volume = this.resolveVolume(soundKey, options.volume ?? 1)
    audioElement.loop = Boolean(options.loop)
    audioElement.preload = 'auto'
    this.lastPlayedAtByKey.set(soundKey, now)

    const playPromise = audioElement.play()
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        try {
          audioElement.pause()
          audioElement.currentTime = 0
        } catch {
          // ignore rollback failure
        }
      })
    }

    return audioElement
  }

  stopAll() {
    this.audioPoolByKey.forEach((entries) => {
      entries.forEach((entry) => {
        try {
          entry.pause()
          entry.currentTime = 0
        } catch {
          // ignore stop failure
        }
      })
    })
  }
}

const audioManager = new AudioManager()

export default audioManager