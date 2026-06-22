// engine.js — pure game logic, no DOM. Everything here is unit-testable.
// The renderer (index.html) imports these and only handles canvas + input.

export const CONFIG = {
  coreHp: 100,
  coreRadius: 26,
  baseEnemyHp: 3,
  baseEnemySpeed: 28,        // px/sec at wave 1
  baseSpawnInterval: 1.1,    // sec between spawns at wave 1
  xpPerKill: 1,
  // XP needed for level N = round(base * growth^(N-1))
  xpBase: 5,
  xpGrowth: 1.35,
  waveSeconds: 20,           // each wave lasts this long, then difficulty ramps
};

// --- leveling -------------------------------------------------------------

export function xpForLevel(level) {
  return Math.round(CONFIG.xpBase * Math.pow(CONFIG.xpGrowth, level - 1));
}

// Returns { level, xp, xpNeeded, leveledUp } after gaining xp.
export function gainXp(state, amount) {
  let { level, xp } = state;
  let leveledUp = 0;
  xp += amount;
  let need = xpForLevel(level);
  while (xp >= need) {
    xp -= need;
    level += 1;
    leveledUp += 1;
    need = xpForLevel(level);
  }
  return { level, xp, xpNeeded: need, leveledUp };
}

// --- stats ----------------------------------------------------------------

export function defaultStats() {
  return {
    power: 1,      // damage multiplier
    rate: 1,       // auto-fire rate multiplier
    range: 1,      // auto-fire range multiplier
    regen: 0,      // core hp regenerated per second
    cooldown: 1,   // skill cooldown multiplier (lower = faster); applied as 1/cooldown
  };
}

// Derived numbers the renderer needs. Pure function of stats + wave.
export function derive(stats, wave) {
  return {
    autoDamage: 1 * stats.power,
    autoRate: 1.2 * stats.rate,        // shots/sec
    autoRange: 140 * stats.range,      // px
    regenPerSec: stats.regen,
    enemyHp: CONFIG.baseEnemyHp + Math.floor(wave * 1.5),
    enemySpeed: CONFIG.baseEnemySpeed + wave * 6,
    spawnInterval: Math.max(0.28, CONFIG.baseSpawnInterval - wave * 0.06),
  };
}

// --- upgrade / skill pool -------------------------------------------------
// Level-up offers 3 cards. Each card is either a stat bump or a skill unlock.

export const SKILLS = {
  pulse:   { id: 'pulse',   name: 'Pulse',    tap: 1, cooldown: 6,  desc: 'Ring of damage around the core' },
  slow:    { id: 'slow',    name: 'Slowfield', tap: 1, cooldown: 10, desc: 'Slow all enemies for 3s' },
  shield:  { id: 'shield',  name: 'Shield',   tap: 1, cooldown: 14, desc: 'Block all damage for 2.5s' },
  lance:   { id: 'lance',   name: 'Lance',    tap: 2, cooldown: 4,  desc: 'Aim, then fire a piercing beam' },
};

export const STAT_CARDS = [
  { id: 'power',  name: '+Power',  apply: s => ({ ...s, power: +(s.power + 0.25).toFixed(2) }),  desc: 'Auto damage +25%' },
  { id: 'rate',   name: '+Rate',   apply: s => ({ ...s, rate: +(s.rate + 0.2).toFixed(2) }),     desc: 'Fire rate +20%' },
  { id: 'range',  name: '+Range',  apply: s => ({ ...s, range: +(s.range + 0.2).toFixed(2) }),   desc: 'Range +20%' },
  { id: 'regen',  name: '+Regen',  apply: s => ({ ...s, regen: +(s.regen + 1).toFixed(2) }),     desc: 'Core regen +1/s' },
  { id: 'cooldn', name: '+Haste',  apply: s => ({ ...s, cooldown: +(Math.max(0.4, s.cooldown - 0.12)).toFixed(2) }), desc: 'Skill cooldown -12%' },
];

// Deterministic offer generation given an rng function (0..1).
// Avoids offering already-unlocked skills. Always returns 3 distinct cards.
export function rollOffers(unlockedSkillIds, rng) {
  const lockedSkills = Object.values(SKILLS)
    .filter(sk => !unlockedSkillIds.includes(sk.id))
    .map(sk => ({ kind: 'skill', id: sk.id, name: sk.name, desc: sk.desc, tap: sk.tap }));
  const stats = STAT_CARDS.map(c => ({ kind: 'stat', id: c.id, name: c.name, desc: c.desc }));
  const pool = [...lockedSkills, ...stats];

  const picks = [];
  const used = new Set();
  let guard = 0;
  while (picks.length < 3 && guard < 100) {
    guard++;
    const i = Math.floor(rng() * pool.length);
    const card = pool[i];
    if (used.has(card.kind + ':' + card.id)) continue;
    used.add(card.kind + ':' + card.id);
    picks.push(card);
  }
  return picks;
}

export function applyStatCard(stats, cardId) {
  const card = STAT_CARDS.find(c => c.id === cardId);
  if (!card) return stats;
  return card.apply(stats);
}

// --- collision / damage helpers ------------------------------------------

export function dist(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

// An enemy reaching the core deals damage and is consumed.
export function enemyHitsCore(enemy, core) {
  return dist(enemy.x, enemy.y, core.x, core.y) <= CONFIG.coreRadius + enemy.r;
}

export function waveForTime(elapsedSec) {
  return 1 + Math.floor(elapsedSec / CONFIG.waveSeconds);
}

// Clamp helper used by regen and shield logic.
export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
