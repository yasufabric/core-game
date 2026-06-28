// engine.js — pure game logic, no DOM. Everything here is unit-testable.
// The renderer (index.html) imports these and only handles canvas + input.

export const CONFIG = {
  coreHp: 100,
  coreRadius: 26,
  baseEnemyHp: 2,
  enemyHpScale: 0.6,         // hp added per wave number
  baseEnemySpeed: 22,        // px/sec at wave 1
  enemySpeedScale: 4,        // px/sec added per wave number
  baseSpawnInterval: 1.6,    // sec between spawns at wave 1
  xpPerKill: 1,
  // XP needed for level N = round(base * growth^(N-1))
  xpBase: 5,
  xpGrowth: 1.35,
  waveSeconds: 20,           // each wave lasts this long, then difficulty ramps
  doublePickChance: 0.15,    // probability per level-up of choosing two cards
  xpPerSkillUse: 2,          // XP awarded each time any skill is activated
  droneDamageMult: 3,        // drone zap = droneDamageMult × power
  warmupSec: 3,              // no enemies spawn before this many seconds after newGame()
  dartChance: 0.08,          // probability per spawn of a dart enemy (wave 8+)
  waveClearXp: 3,            // bonus XP awarded when all enemies are wiped
  clutchXp: 8,               // bonus XP for wave-clear at ≤10% HP
  waveClearHeal: 5,          // HP restored when all enemies are wiped
  reposCooldown: 12,         // seconds between tap-to-reposition uses
  reposDuration: 0.8,        // seconds to slide core to new position
  thornsAura: 4,             // damage per second dealt to enemies within coreRadius+50px when thorns unlocked
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
    crit: 0,       // probability per auto-shot to deal double damage (0–1)
    armor: 0,      // fraction of incoming core damage prevented (0–0.75)
    magnet: 0,     // bonus XP per kill until physical pickups exist
  };
}

// Derived numbers the renderer needs. Pure function of stats + wave.
export function derive(stats, wave) {
  return {
    autoDamage: 1 * stats.power,
    autoRate: 1.2 * stats.rate,        // shots/sec
    autoRange: 140 * stats.range,      // px
    regenPerSec: stats.regen,
    enemyHp: CONFIG.baseEnemyHp + Math.floor(wave * CONFIG.enemyHpScale),
    enemySpeed: CONFIG.baseEnemySpeed + wave * CONFIG.enemySpeedScale,
    spawnInterval: Math.max(0.28, CONFIG.baseSpawnInterval - wave * 0.06),
    critChance: stats.crit,
  };
}

// --- upgrade / skill pool -------------------------------------------------
// Level-up offers 3 cards. Each card is either a stat bump or a skill unlock.

export const SKILLS = {
  pulse:   { id: 'pulse',   name: 'Pulse',    tap: 1, cooldown: 6,  desc: 'Ring of damage around the core' },
  slow:    { id: 'slow',    name: 'Slowfield', tap: 1, cooldown: 10, desc: 'Slow all enemies for 3s' },
  shield:  { id: 'shield',  name: 'Shield',   tap: 1, cooldown: 14, desc: 'Block all damage for 2.5s' },
  lance:   { id: 'lance',   name: 'Lance',    tap: 2, cooldown: 4,  desc: 'Aim, then fire a piercing beam' },
  bomb:    { id: 'bomb',    name: 'Bomb',     tap: 1, cooldown: 20, desc: 'Damage all enemies on screen' },
  chain:   { id: 'chain',  name: 'Chain',    tap: 1, cooldown: 8,  desc: 'Zap nearest enemy, arc to 3 nearby foes' },
  nova:    { id: 'nova',   name: 'Nova',     tap: 2, cooldown: 12, desc: 'Aim a delayed area blast' },
  blink:   { id: 'blink',   name: 'Blink',   tap: 2, cooldown: 12, desc: 'Teleport core to aim point for 1.5s, then snap back' },
  missile: { id: 'missile', name: 'Missile', tap: 1, cooldown: 6,  desc: 'Fire a homing missile that tracks the nearest enemy' },
  drone:    { id: 'drone',    name: 'Drone',    tap: 1, cooldown: 1.5, desc: 'Orbiting satellite that auto-zaps the nearest enemy in range' },
  repulse:  { id: 'repulse',  name: 'Repulse',  tap: 1, cooldown: 18, desc: 'Blast all enemies outward from the core' },
  heal:     { id: 'heal',     name: 'Heal',     tap: 1, cooldown: 22, desc: 'Restore up to 20 HP to the core' },
  thorns:   { id: 'thorns',   name: 'Thorns',   passive: true,       desc: 'Enemies within range of the core take 4 damage/sec' },
  overload: { id: 'overload', name: 'Overload', passive: true,       desc: 'Every 8th auto-shot fires a burst of 8 radial shots at half damage' },
  siphon:   { id: 'siphon',   name: 'Siphon',   passive: true,       desc: 'Killing an enemy within 60px of the core restores 1 HP' },
};

export const STAT_CARDS = [
  { id: 'power',  name: '+Power',  apply: s => ({ ...s, power: +(s.power + 0.25).toFixed(2) }),  desc: 'Auto damage +25%' },
  { id: 'rate',   name: '+Rate',   apply: s => ({ ...s, rate: +(s.rate + 0.2).toFixed(2) }),     desc: 'Fire rate +20%' },
  { id: 'range',  name: '+Range',  apply: s => ({ ...s, range: +(s.range + 0.2).toFixed(2) }),   desc: 'Range +20%' },
  { id: 'regen',  name: '+Regen',  apply: s => ({ ...s, regen: +(s.regen + 1).toFixed(2) }),     desc: 'Core regen +1/s' },
  { id: 'cooldn', name: '+Haste',  apply: s => ({ ...s, cooldown: +(Math.max(0.4, s.cooldown - 0.12)).toFixed(2) }), desc: 'Skill cooldown -12%' },
  { id: 'crit',   name: '+Crit',   apply: s => ({ ...s, crit: +(Math.min(0.9, s.crit + 0.12)).toFixed(2) }),          desc: 'Crit chance +12% (double damage)' },
  { id: 'armor',  name: '+Armor',  apply: s => ({ ...s, armor: +(Math.min(0.75, s.armor + 0.15)).toFixed(2) }),       desc: 'Core damage -15% (max 75%)' },
  { id: 'magnet', name: '+Magnet', apply: s => ({ ...s, magnet: +(s.magnet + 0.2).toFixed(2) }),                     desc: 'XP from kills +20%' },
];

// Offer generation: always 1 locked skill + 2 stat cards (when skills remain),
// or 3 stat cards when all skills are unlocked.
export function rollOffers(unlockedSkillIds, rng) {
  const lockedSkills = Object.values(SKILLS)
    .filter(sk => !unlockedSkillIds.includes(sk.id))
    .map(sk => ({ kind: 'skill', id: sk.id, name: sk.name, desc: sk.desc, tap: sk.tap }));
  const stats = STAT_CARDS.map(c => ({ kind: 'stat', id: c.id, name: c.name, desc: c.desc }));

  const picks = [];
  const used = new Set();

  if (lockedSkills.length > 0) {
    const sk = lockedSkills[Math.floor(rng() * lockedSkills.length)];
    used.add(sk.kind + ':' + sk.id);
    picks.push(sk);
  }

  let guard = 0;
  while (picks.length < 3 && guard < 100) {
    guard++;
    const card = stats[Math.floor(rng() * stats.length)];
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

export function coreDamageTaken(stats, baseDamage) {
  const armor = clamp(stats.armor || 0, 0, 0.75);
  return baseDamage * (1 - armor);
}

export function splitterChildren(enemy) {
  if (!enemy.splitter || enemy.consumed) return [];
  const childHp = Math.max(1, enemy.maxHp * 0.35);
  const childR = Math.max(5, enemy.r * 0.55);
  const childSpd = enemy.spd * 1.35;
  return [
    { x: enemy.x - childR, y: enemy.y, r: childR, hp: childHp, maxHp: childHp, spd: childSpd, tanky: false },
    { x: enemy.x + childR, y: enemy.y, r: childR, hp: childHp, maxHp: childHp, spd: childSpd, tanky: false },
  ];
}

export function xpForKill(stats, enemy) {
  const typeMult = enemy
    ? (enemy.boss ? 5 : enemy.tanky ? 2 : enemy.splitter ? 1.5 : enemy.dart ? 0.8 : 1)
    : 1;
  const speedMult = (enemy && enemy.spd)
    ? Math.min(1.5, 1 + 0.1 * (enemy.spd / CONFIG.baseEnemySpeed - 1))
    : 1;
  return CONFIG.xpPerKill * typeMult * speedMult * (1 + (stats.magnet || 0));
}

export function waveForTime(elapsedSec) {
  return 1 + Math.floor(elapsedSec / CONFIG.waveSeconds);
}

// Returns true for waves where a boss should spawn (every 5th wave, starting wave 5).
export function isBossWave(wave) {
  return wave > 0 && wave % 5 === 0;
}

// Clamp helper used by regen and shield logic.
export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
