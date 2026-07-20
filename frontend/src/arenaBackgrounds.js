const ARENA_BACKGROUNDS = [
  '/arena-backgrounds/bg-01.png'
];

const DEFAULT_ARENA_BACKGROUND = '/arena-backgrounds/bg-01.png';

function stableHash(input) {
  const text = String(input || 'default-boss');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getArenaBackgroundForBoss(boss) {
  if (!Array.isArray(ARENA_BACKGROUNDS) || ARENA_BACKGROUNDS.length === 0) {
    return DEFAULT_ARENA_BACKGROUND;
  }

  const key = boss?.id || boss?.name || 'default-boss';
  const index = stableHash(key) % ARENA_BACKGROUNDS.length;
  return ARENA_BACKGROUNDS[index] || DEFAULT_ARENA_BACKGROUND;
}

export { ARENA_BACKGROUNDS };
