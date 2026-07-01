// engine.js — pure game logic, no DOM. Everything here is unit-testable.
// The renderer (index.html) imports these and only handles canvas + input.

export const CONFIG = {
  coreHp: 100,
  coreRadius: 26,
  baseEnemyHp: 1,
  enemyHpScale: 0.6,         // hp added per wave number
  baseEnemySpeed: 22,        // px/sec at wave 1
  enemySpeedScale: 4,        // px/sec added per wave number
  baseSpawnInterval: 2.2,    // sec between spawns at wave 1
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
  firstBloodXp: 5,           // bonus XP awarded on the very first kill of each game
  leechDrainRate: 0.5,       // XP drained per second while leech is within leechRange
  leechRange: 80,            // px from core within which leech drains XP
  spikeCooldown: 7,          // seconds between spike mini-boss spawns (wave 4+)
  spikeHpMult: 1.5,          // HP multiplier for spike relative to base wave HP
  spikeSpeedMult: 1.3,       // speed multiplier for spike relative to base wave speed
  synergyXp: 3,              // bonus XP when 2 different skills are used within 1 second
  spawnFloorBase: 0.28,      // starting value for the spawn interval floor
  spawnFloorMin: 0.18,       // absolute minimum spawn interval (reached ~wave 25)
  bossEnrageThreshold: 0.3,  // boss enrages when HP drops below this fraction
  bossEnrageSpeedMult: 1.5,  // speed multiplier applied once when boss enrages
  bomberChance: 0.04,        // spawn probability for bomber enemies (wave 5+)
  bomberRange: 90,           // px from core at which bomber halts and starts fuse
  bomberFuseTime: 1.5,       // seconds from halt to detonation
  bomberDamage: 12,          // HP damage to core on detonation
  bomberRadius: 120,         // px AoE radius of bomber explosion
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
    spawnInterval: Math.max(Math.max(CONFIG.spawnFloorBase - wave * 0.004, CONFIG.spawnFloorMin), CONFIG.baseSpawnInterval - wave * 0.06),
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
  flash:   { id: 'flash',   name: 'Flash',   tap: 1, cooldown: 12, desc: '12-shot burst + 3× auto-fire rate for 1.5s' },
  missile: { id: 'missile', name: 'Missile', tap: 1, cooldown: 6,   auto: true, desc: 'Fire a homing missile that tracks the nearest enemy' },
  drone:   { id: 'drone',   name: 'Drone',   tap: 1, cooldown: 1.5, auto: true, desc: 'Orbiting satellite that auto-zaps the nearest enemy in range' },
  repulse:  { id: 'repulse',  name: 'Repulse',  tap: 1, cooldown: 18, desc: 'Blast all enemies outward from the core' },
  heal:     { id: 'heal',     name: 'Heal',     tap: 1, cooldown: 22, desc: 'Restore up to 20 HP to the core' },
  thorns:   { id: 'thorns',   name: 'Thorns',   passive: true,       desc: 'Enemies within range of the core take 4 damage/sec' },
  overload: { id: 'overload', name: 'Overload', passive: true,       desc: 'Every 8th auto-shot fires a burst of 8 radial shots at half damage' },
  siphon:   { id: 'siphon',   name: 'Siphon',   passive: true,       desc: 'Killing an enemy within 60px of the core restores 1 HP' },
  leech:    { id: 'leech',    name: 'Leech',    passive: true,       desc: 'Every skill activation restores Math.round(0.3×power) HP to the core' },
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

export function pointSegDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = clamp(t, 0, 1);
  return dist(px, py, ax + t * dx, ay + t * dy);
}

// Returns true when a shielded enemy's frontal arc (±70° facing the core) blocks the shot.
export function isShieldBlocked(shot, enemy, core) {
  const facingAng = Math.atan2(core.y - enemy.y, core.x - enemy.x);
  const shotAng   = Math.atan2(shot.y - enemy.y, shot.x - enemy.x);
  let diff = shotAng - facingAng;
  while (diff > Math.PI)  diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) < (70 * Math.PI / 180);
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

// --- enemy factories (pure: no DOM, no random side effects) --------------

export function createEnemy(d, wave, W, H, rng) {
  const edge = Math.floor(rng() * 4);
  const m = 20;
  let x, y;
  if (edge === 0)      { x = rng() * W; y = -m; }
  else if (edge === 1) { x = W + m;     y = rng() * H; }
  else if (edge === 2) { x = rng() * W; y = H + m; }
  else                 { x = -m;        y = rng() * H; }
  const bomber   = wave >= 5 && rng() < CONFIG.bomberChance;
  const dart     = !bomber && wave >= 8 && rng() < CONFIG.dartChance;
  const tanky    = !bomber && !dart && rng() < 0.12 + wave * 0.01;
  const splitter = !bomber && !dart && !tanky && rng() < 0.1 + wave * 0.005;
  const shielded = !bomber && !dart && !tanky && !splitter && wave >= 4 && rng() < 0.08 + 0.005 * wave;
  const leech    = !bomber && !dart && !tanky && !splitter && !shielded && wave >= 6 && rng() < 0.05;
  const hp = d.enemyHp * (tanky ? 2.4 : splitter ? 1.5 : dart ? 0.4 : bomber ? 0.8 : 1);
  return {
    x, y,
    r:   tanky ? 13 : splitter ? 11 : bomber ? 10 : 8,
    hp, maxHp: hp,
    spd: d.enemySpeed * (tanky ? 0.7 : splitter ? 0.9 : dart ? 1.8 : bomber ? 0.8 : 1),
    tanky, splitter, dart, shielded, leech, bomber,
    fuseAt: null,
  };
}

export function createBoss(d, W, H, rng) {
  const edge = Math.floor(rng() * 4);
  const m = 40;
  let x, y;
  if (edge === 0)      { x = rng() * W; y = -m; }
  else if (edge === 1) { x = W + m;     y = rng() * H; }
  else if (edge === 2) { x = rng() * W; y = H + m; }
  else                 { x = -m;        y = rng() * H; }
  const hp = d.enemyHp * 8;
  return { x, y, r: 28, hp, maxHp: hp, spd: d.enemySpeed * 0.35, tanky: false, boss: true };
}

export function createSpike(d, W, H, rng) {
  const edge = Math.floor(rng() * 4);
  const m = 20;
  let x, y;
  if (edge === 0)      { x = rng() * W; y = -m; }
  else if (edge === 1) { x = W + m;     y = rng() * H; }
  else if (edge === 2) { x = rng() * W; y = H + m; }
  else                 { x = -m;        y = rng() * H; }
  const hp = d.enemyHp * CONFIG.spikeHpMult;
  return { x, y, r: 11, hp, maxHp: hp, spd: d.enemySpeed * CONFIG.spikeSpeedMult, spike: true };
}

// --- skill readiness ----------------------------------------------------------

export function skillReady(G, id) {
  return (G.cooldowns[id] || 0) <= G.t;
}

// --- skill execution ----------------------------------------------------------
// Executes a skill's game-state effect on G. Caller must verify skillReady first.
// Modifies G in place (enemies, fx, core position, cooldowns).
// Returns the XP amount to award to the caller.
export function executeSkill(G, id, aimX, aimY, W, H) {
  const sk = SKILLS[id];
  const c = G.core;
  G.cooldowns[id] = G.t + sk.cooldown * G.stats.cooldown;

  const synergy = G.lastSkillAt && G.t - G.lastSkillAt < 1 && G.lastSkillId !== id;
  G.lastSkillAt = G.t;
  G.lastSkillId = id;

  if (id === 'pulse') {
    for (const e of G.enemies) {
      if (dist(e.x, e.y, c.x, c.y) < 150) { e.hp -= 6 * G.stats.power; e.hitFlash = G.t; }
    }
    G.fx.push({ kind: 'ring', x: c.x, y: c.y, r: 0, max: 150, born: G.t, life: .45, color: '#7df9ff' });
  } else if (id === 'slow') {
    G.slowUntil = G.t + 3;
    G.fx.push({ kind: 'ring', x: c.x, y: c.y, r: 0, max: Math.max(W, H), born: G.t, life: .6, color: '#9d7bff' });
  } else if (id === 'shield') {
    G.shieldUntil = G.t + 2.5;
  } else if (id === 'lance') {
    const ang = Math.atan2(aimY - c.y, aimX - c.x);
    const len = Math.max(W, H);
    const ex = c.x + Math.cos(ang) * len, ey = c.y + Math.sin(ang) * len;
    for (const e of G.enemies) {
      if (pointSegDist(e.x, e.y, c.x, c.y, ex, ey) < e.r + 14) { e.hp -= 20 * G.stats.power; e.hitFlash = G.t; }
    }
    G.fx.push({ kind: 'beam', x1: c.x, y1: c.y, x2: ex, y2: ey, born: G.t, life: .25 });
  } else if (id === 'bomb') {
    for (const e of G.enemies) { e.hp -= 15 * G.stats.power; e.hitFlash = G.t; }
    G.fx.push({ kind: 'flash', born: G.t, life: .35 });
  } else if (id === 'repulse') {
    for (const e of G.enemies) {
      const edx = e.x - c.x, edy = e.y - c.y;
      const len = Math.sqrt(edx * edx + edy * edy) || 1;
      e.x += (edx / len) * 220; e.y += (edy / len) * 220;
    }
    G.fx.push({ kind: 'ring', x: c.x, y: c.y, r: 0, max: Math.max(W, H) * 0.6, born: G.t, life: .45, color: '#fff' });
  } else if (id === 'heal') {
    c.hp = Math.min(CONFIG.coreHp, c.hp + Math.min(20, CONFIG.coreHp - c.hp));
    G.fx.push({ kind: 'ring', x: c.x, y: c.y, r: 0, max: CONFIG.coreRadius + 40, born: G.t, life: .5, color: '#4cff91' });
  } else if (id === 'chain') {
    let first = null, firstD = Infinity;
    for (const e of G.enemies) {
      const dd = dist(e.x, e.y, c.x, c.y);
      if (dd < firstD) { firstD = dd; first = e; }
    }
    if (first) {
      first.hp -= 10 * G.stats.power; first.hitFlash = G.t;
      G.fx.push({ kind: 'arc', x1: c.x, y1: c.y, x2: first.x, y2: first.y, born: G.t, life: .3 });
      const chained = new Set([first]);
      let prev = first;
      for (let i = 0; i < 3; i++) {
        let next = null, nextD = 120;
        for (const e of G.enemies) {
          if (chained.has(e)) continue;
          const dd = dist(e.x, e.y, prev.x, prev.y);
          if (dd < nextD) { nextD = dd; next = e; }
        }
        if (!next) break;
        next.hp -= 6 * G.stats.power; next.hitFlash = G.t;
        G.fx.push({ kind: 'arc', x1: prev.x, y1: prev.y, x2: next.x, y2: next.y, born: G.t, life: .3 });
        chained.add(next);
        prev = next;
      }
    }
  } else if (id === 'nova') {
    G.fx.push({ kind: 'nova', x: aimX, y: aimY, r: 0, max: 120, born: G.t, life: .85, hitAt: G.t + .45, hit: false, damage: 18 * G.stats.power });
  } else if (id === 'missile') {
    let target = null, targetD = Infinity;
    for (const e of G.enemies) {
      const dd = dist(e.x, e.y, c.x, c.y);
      if (dd < targetD) { targetD = dd; target = e; }
    }
    G.missiles.push({ x: c.x, y: c.y, vx: 0, vy: -120, target, tail: [], life: 8 });
  } else if (id === 'flash') {
    G.flashUntil = G.t + 1.5;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      G.shots.push({ x: c.x, y: c.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, dmg: G.stats.power, life: 1.2 });
    }
    G.fx.push({ kind: 'ring', x: c.x, y: c.y, r: 0, max: 120, born: G.t, life: .5, color: '#ffe066' });
  }

  if (G.unlocked.includes('leech')) {
    const restore = Math.round(0.3 * G.stats.power);
    c.hp = Math.min(CONFIG.coreHp, c.hp + restore);
  }

  return CONFIG.xpPerSkillUse + (synergy ? CONFIG.synergyXp : 0);
}

// --- per-frame step functions -------------------------------------------------
// Each function handles one game subsystem. They mutate G directly.
// Call them in order from main.js's step().

// Handles regen, blink snap-back, reposition slide, shield-expiry flash.
export function stepCore(G, dt) {
  const c = G.core;
  if (G.stats.regen) c.hp = clamp(c.hp + G.stats.regen * dt, 0, CONFIG.coreHp);

  if (G.reposTarget) {
    const elapsed = G.t - G.reposStart.t;
    const frac = Math.min(1, elapsed / CONFIG.reposDuration);
    c.x = G.reposStart.x + (G.reposTarget.x - G.reposStart.x) * frac;
    c.y = G.reposStart.y + (G.reposTarget.y - G.reposStart.y) * frac;
    if (frac >= 1) G.reposTarget = null;
  }

  if (G.shieldUntil > 0 && G.t >= G.shieldUntil && G.t - dt < G.shieldUntil) {
    G.fx.push({ kind: 'ring', x: c.x, y: c.y, r: CONFIG.coreRadius, max: CONFIG.coreRadius + 30, born: G.t, life: .3, color: '#ffffff' });
  }
}

// Spawns a boss if this is a boss wave and one hasn't been spawned yet.
// Returns true if a boss was spawned.
export function stepBossSpawn(G, d, W, H, rng) {
  if (isBossWave(G.wave) && G.wave > G.lastBossWave) {
    G.enemies.push(createBoss(d, W, H, rng));
    G.lastBossWave = G.wave;
    G.bossFlashUntil = G.t + 2;
    return true;
  }
  return false;
}

// Spawns a regular enemy when the interval has elapsed (suppressed during boss fights).
// Returns true if an enemy was spawned.
export function stepSpawn(G, d, W, H, rng) {
  const bossAlive = G.enemies.some(e => e.boss);
  if (G.t >= CONFIG.warmupSec && G.t - G.lastSpawn > d.spawnInterval && !bossAlive) {
    G.enemies.push(createEnemy(d, G.wave, W, H, rng));
    G.lastSpawn = G.t;
    return true;
  }
  return false;
}

// Spawns a spike mini-boss every CONFIG.spikeCooldown seconds from wave 4 onward.
export function stepSpikeSpawn(G, d, W, H, rng) {
  if (G.wave < 4) return false;
  if (G.enemies.some(e => e.boss)) return false;
  if (G.t - (G.lastSpikeAt || -CONFIG.spikeCooldown) < CONFIG.spikeCooldown) return false;
  G.enemies.push(createSpike(d, W, H, rng));
  G.lastSpikeAt = G.t;
  return true;
}

// Detonates nova FX that have passed their trigger time.
export function stepNovaDet(G) {
  for (const f of G.fx) {
    if (f.kind === 'nova' && !f.hit && G.t >= f.hitAt) {
      f.hit = true;
      for (const e of G.enemies) {
        if (dist(e.x, e.y, f.x, f.y) <= f.max + e.r) { e.hp -= f.damage; e.hitFlash = G.t; }
      }
      G.fx.push({ kind: 'ring', x: f.x, y: f.y, r: 24, max: f.max, born: G.t, life: .25, color: '#ffec99' });
    }
  }
}

// Fires auto-shots toward the nearest enemy in range.
// rng: random source (Math.random in game, seeded fn in tests).
export function stepAutoFire(G, d, rng) {
  const c = G.core;
  const effectiveRate = (G.flashUntil && G.t < G.flashUntil) ? d.autoRate * 3 : d.autoRate;
  if (G.t - G.lastAuto > 1 / effectiveRate) {
    let best = null, bestD = d.autoRange;
    for (const e of G.enemies) {
      const dd = dist(e.x, e.y, c.x, c.y);
      if (dd < bestD) { bestD = dd; best = e; }
    }
    if (best) {
      const ang    = Math.atan2(best.y - c.y, best.x - c.x);
      const isCrit = rng() < d.critChance;
      G.shots.push({ x: c.x, y: c.y, vx: Math.cos(ang) * 420, vy: Math.sin(ang) * 420, dmg: isCrit ? d.autoDamage * 2 : d.autoDamage, crit: isCrit, life: 1.2 });
      G.autoShotCount++;
      if (isCrit && G.unlocked.includes('drone')) {
        G.drone.lastZap = 0; // reset drone cooldown on crit so it fires immediately
      }
      if (G.unlocked.includes('overload') && G.autoShotCount % 8 === 0) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          G.shots.push({ x: c.x, y: c.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, dmg: d.autoDamage * 0.5, life: 1.2 });
        }
      }
      G.lastAuto = G.t;
    }
  }
}

// Moves shots and resolves hits against enemies.
export function stepShots(G, dt, W, H) {
  for (const s of G.shots) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
  for (const s of G.shots) {
    for (const e of G.enemies) {
      if (e.hp > 0 && dist(s.x, s.y, e.x, e.y) < e.r + 3) {
        if (e.shielded && isShieldBlocked(s, e, G.core)) {
          s.life = 0; // absorbed by shield
        } else {
          e.hp -= s.dmg; e.hitFlash = G.t; s.life = 0;
          G.fx.push({ kind: 'spark', x: s.x, y: s.y, born: G.t, life: .2 });
        }
        break;
      }
    }
  }
  G.shots = G.shots.filter(s => s.life > 0 && s.x > -20 && s.x < W + 20 && s.y > -20 && s.y < H + 20);
}

// Auto-launches missiles when ready, and homes active missiles toward their target.
export function stepMissiles(G, d, dt, rng) {
  const c = G.core;
  if (G.unlocked.includes('missile') && skillReady(G, 'missile') && G.enemies.length > 0) {
    let target = null, targetD = Infinity;
    for (const e of G.enemies) { const dd = dist(e.x, e.y, c.x, c.y); if (dd < targetD) { targetD = dd; target = e; } }
    G.missiles.push({ x: c.x, y: c.y, vx: 0, vy: -120, target, tail: [], life: 8 });
    G.cooldowns['missile'] = G.t + SKILLS.missile.cooldown * G.stats.cooldown;
  }
  for (const m of G.missiles) {
    m.life -= dt;
    if (!m.target || m.target.hp <= 0) {
      let best = null, bestD = Infinity;
      for (const e of G.enemies) { if (e.hp > 0) { const dd = dist(m.x, m.y, e.x, e.y); if (dd < bestD) { bestD = dd; best = e; } } }
      m.target = best;
    }
    if (m.target) {
      const ang  = Math.atan2(m.target.y - m.y, m.target.x - m.x);
      const curr = Math.atan2(m.vy, m.vx);
      let diff = ang - curr;
      while (diff > Math.PI)  diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const newAng = curr + Math.sign(diff) * Math.min(Math.abs(diff), 3.5 * dt);
      const spd = 140;
      m.vx = Math.cos(newAng) * spd; m.vy = Math.sin(newAng) * spd;
    }
    m.tail.push({ x: m.x, y: m.y });
    if (m.tail.length > 4) m.tail.shift();
    m.x += m.vx * dt; m.y += m.vy * dt;
    if (m.target && m.target.hp > 0 && dist(m.x, m.y, m.target.x, m.target.y) < m.target.r + 10) {
      m.target.hp -= 25 * G.stats.power;
      G.fx.push({ kind: 'ring', x: m.x, y: m.y, r: 0, max: 40, born: G.t, life: .3, color: '#ff4dff' });
      m.life = 0;
    }
  }
  G.missiles = G.missiles.filter(m => m.life > 0);
}

// Moves enemies toward the core, applies thorns, resolves core collisions, handles deaths.
// Returns { xpGained, killCount, waveClear, clutch, coreHit }
// coreHit signals main.js to trigger screen-shake and hit sfx.
export function stepEnemies(G, d, dt) {
  const c = G.core;
  const slow = G.t < G.slowUntil ? 0.4 : 1;
  let totalXp = 0, xpDrained = 0, coreHit = false, bomberExploded = false;
  const survivors = [], spawnedFromSplitters = [];

  for (const e of G.enemies) {
    if (e.hp <= 0) {
      totalXp += xpForKill(G.stats, e);
      if (G.unlocked.includes('siphon') && dist(e.x, e.y, c.x, c.y) < 60) {
        c.hp = Math.min(CONFIG.coreHp, c.hp + 1);
      }
      const col = e.boss ? '#ffd700' : e.tanky ? '#ff8a4d' : e.splitter ? '#f277ff' : '#ff5d73';
      G.fx.push({ kind: 'burst', x: e.x, y: e.y, color: col, born: G.t, life: 0.4, n: 7 });
      spawnedFromSplitters.push(...splitterChildren(e));
      continue;
    }
    if (e.boss && !e.enraged && e.hp / e.maxHp < CONFIG.bossEnrageThreshold) {
      e.enraged = true;
      e.spd *= CONFIG.bossEnrageSpeedMult;
    }
    if (e.vx || e.vy) {
      e.x += (e.vx || 0) * dt;
      e.y += (e.vy || 0) * dt;
      const decay = Math.pow(0.001, dt);
      e.vx = (e.vx || 0) * decay;
      e.vy = (e.vy || 0) * decay;
    }
    const ang = Math.atan2(c.y - e.y, c.x - e.x);
    if (G.t < (e.stunUntil || 0)) {
      // stunned — skip movement this frame
    } else {
      e.x += Math.cos(ang) * e.spd * slow * dt;
      e.y += Math.sin(ang) * e.spd * slow * dt;
    }
    if (e.leech && dist(e.x, e.y, c.x, c.y) <= CONFIG.leechRange) {
      xpDrained += CONFIG.leechDrainRate * dt;
    }
    if (G.unlocked.includes('thorns') && dist(e.x, e.y, c.x, c.y) <= CONFIG.coreRadius + 50) {
      e.hp -= CONFIG.thornsAura * dt;
    }
    if (e.bomber) {
      const dCore = dist(e.x, e.y, c.x, c.y);
      if (dCore <= CONFIG.bomberRange) {
        if (!e.fuseAt) e.fuseAt = G.t + CONFIG.bomberFuseTime;
        e.spd = 0; // halt
        if (G.t >= e.fuseAt) {
          // detonate
          if (G.t >= G.shieldUntil) { c.hp -= coreDamageTaken(G.stats, CONFIG.bomberDamage); coreHit = true; }
          for (const other of G.enemies) {
            if (other === e || other.hp <= 0) continue;
            if (dist(other.x, other.y, e.x, e.y) <= CONFIG.bomberRadius) { other.hp -= CONFIG.bomberDamage * 0.5; other.hitFlash = G.t; }
          }
          G.fx.push({ kind: 'ring', x: e.x, y: e.y, r: 0, max: CONFIG.bomberRadius, born: G.t, life: 0.4, color: '#ff4400' });
          e.hp = 0; e.consumed = true; bomberExploded = true;
          continue;
        }
      }
    }
    if (enemyHitsCore(e, c)) {
      if (G.t >= G.shieldUntil && !e.leech) { c.hp -= coreDamageTaken(G.stats, e.tanky ? 14 : 7); coreHit = true; }
      for (const other of G.enemies) {
        if (other === e || other.hp <= 0) continue;
        if (dist(other.x, other.y, c.x, c.y) <= 80) {
          const dx = other.x - c.x, dy = other.y - c.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          other.vx = (dx / len) * 200;
          other.vy = (dy / len) * 200;
          other.stunUntil = G.t + 0.4;
        }
      }
      e.hp = 0; e.consumed = true;
      G.fx.push({ kind: 'ring', x: c.x, y: c.y, r: CONFIG.coreRadius, max: CONFIG.coreRadius + 18, born: G.t, life: .3, color: '#ff5d73' });
      continue;
    }
    survivors.push(e);
  }

  const killCount = G.enemies.length - survivors.length;
  const firstBlood = !G.firstBloodDone && killCount > 0;
  const hadEnemies = G.enemies.length > 0;
  G.enemies = survivors;
  G.enemies.push(...spawnedFromSplitters);

  let waveClear = false, clutch = false;
  if (hadEnemies && G.enemies.length === 0) {
    waveClear = true;
    G.fx.push({ kind: 'ring', x: c.x, y: c.y, r: CONFIG.coreRadius, max: CONFIG.coreRadius + 40, born: G.t, life: 0.5, color: '#ffd700' });
    if (c.hp <= CONFIG.coreHp * 0.1) {
      clutch = true;
      G.fx.push({ kind: 'ring', x: c.x, y: c.y, r: CONFIG.coreRadius, max: CONFIG.coreRadius + 55, born: G.t, life: 0.6, color: '#ff4400' });
    }
    const healed = Math.min(CONFIG.waveClearHeal, CONFIG.coreHp - c.hp);
    if (healed > 0) {
      c.hp += healed;
      G.fx.push({ kind: 'ring', x: c.x, y: c.y, r: CONFIG.coreRadius, max: CONFIG.coreRadius + 30, born: G.t, life: 0.4, color: '#4cff91' });
    }
  }

  return { xpGained: totalXp, xpDrained, killCount, firstBlood, waveClear, clutch, coreHit, bomberExploded };
}

// Orbits the drone and zaps the nearest in-range enemy.
export function stepDrone(G, dt) {
  if (!G.unlocked.includes('drone')) return;
  const c = G.core;
  G.drone.angle += 1.4 * dt;
  const dr = CONFIG.coreRadius + 20;
  const dx = c.x + Math.cos(G.drone.angle) * dr;
  const dy = c.y + Math.sin(G.drone.angle) * dr;
  const zapInterval = SKILLS.drone.cooldown * G.stats.cooldown;
  if (G.t - G.drone.lastZap >= zapInterval) {
    let best = null, bestD = Infinity;
    for (const e of G.enemies) {
      if (e.hp <= 0) continue;
      const dd = dist(dx, dy, e.x, e.y);
      if (dd < 140 && dd < bestD) { bestD = dd; best = e; }
    }
    if (best) {
      best.hp -= CONFIG.droneDamageMult * G.stats.power; best.hitFlash = G.t;
      G.fx.push({ kind: 'arc', x1: dx, y1: dy, x2: best.x, y2: best.y, born: G.t, life: .25 });
      G.drone.lastZap = G.t;
    }
  }
}
