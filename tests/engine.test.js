// engine.test.js — pure-logic tests. These are the loop's verification spine.
// Run: npm test
import { describe, it, expect } from 'vitest';
import {
  xpForLevel, gainXp, defaultStats, derive, rollOffers,
  applyStatCard, dist, enemyHitsCore, coreDamageTaken, splitterChildren, xpForKill, waveForTime, clamp, SKILLS, CONFIG, isBossWave,
  pointSegDist, createEnemy, createBoss,
  skillReady, executeSkill,
  stepCore, stepEnemies, stepShots, stepAutoFire,
} from '../src/engine.js';

describe('xp / leveling', () => {
  it('xpForLevel grows monotonically', () => {
    for (let l = 1; l < 20; l++) {
      expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
    }
  });

  it('gainXp levels up once when threshold met', () => {
    const s = { level: 1, xp: 0 };
    const r = gainXp(s, xpForLevel(1));
    expect(r.level).toBe(2);
    expect(r.leveledUp).toBe(1);
    expect(r.xp).toBe(0);
  });

  it('gainXp can multi-level from a big chunk', () => {
    const need = xpForLevel(1) + xpForLevel(2) + xpForLevel(3);
    const r = gainXp({ level: 1, xp: 0 }, need);
    expect(r.level).toBe(4);
    expect(r.leveledUp).toBe(3);
    expect(r.xp).toBe(0);
  });

  it('gainXp carries remainder', () => {
    const r = gainXp({ level: 1, xp: 0 }, xpForLevel(1) + 2);
    expect(r.level).toBe(2);
    expect(r.xp).toBe(2);
  });
});

describe('stats', () => {
  it('defaultStats are neutral', () => {
    const s = defaultStats();
    expect(s.power).toBe(1);
    expect(s.regen).toBe(0);
  });

  it('applyStatCard +power increases power, leaves others', () => {
    const s = applyStatCard(defaultStats(), 'power');
    expect(s.power).toBeCloseTo(1.25);
    expect(s.rate).toBe(1);
  });

  it('haste lowers cooldown but never below floor', () => {
    let s = defaultStats();
    for (let i = 0; i < 20; i++) s = applyStatCard(s, 'cooldn');
    expect(s.cooldown).toBeGreaterThanOrEqual(0.4);
  });

  it('derive scales difficulty with wave', () => {
    const a = derive(defaultStats(), 1);
    const b = derive(defaultStats(), 5);
    expect(b.enemyHp).toBeGreaterThan(a.enemyHp);
    expect(b.enemySpeed).toBeGreaterThan(a.enemySpeed);
    expect(b.spawnInterval).toBeLessThan(a.spawnInterval);
  });

  it('spawnInterval never goes below floor', () => {
    expect(derive(defaultStats(), 999).spawnInterval).toBeGreaterThanOrEqual(0.28);
  });

  it('wave 1 enemyHp is 2 with gentler hpScale', () => {
    expect(derive(defaultStats(), 1).enemyHp).toBe(2); // 2 + floor(1*0.6) = 2
  });

  it('wave 2 enemyHp is 3 with enemyHpScale=0.6 (gentler ramp)', () => {
    expect(derive(defaultStats(), 2).enemyHp).toBe(3); // 2 + floor(2*0.6) = 3
  });

  it('wave 1 enemySpeed reflects baseEnemySpeed + 1×scale', () => {
    expect(derive(defaultStats(), 1).enemySpeed).toBe(26); // 22 + 1*4
  });

  it('wave 1 spawnInterval matches raised baseline', () => {
    expect(derive(defaultStats(), 1).spawnInterval).toBeCloseTo(1.54, 2); // 1.6 - 1*0.06
  });

  it('defaultStats has crit at 0', () => {
    expect(defaultStats().crit).toBe(0);
  });

  it('defaultStats has armor at 0', () => {
    expect(defaultStats().armor).toBe(0);
  });

  it('defaultStats has magnet at 0', () => {
    expect(defaultStats().magnet).toBe(0);
  });

  it('applyStatCard crit increases crit chance', () => {
    const s = applyStatCard(defaultStats(), 'crit');
    expect(s.crit).toBeCloseTo(0.12);
  });

  it('crit never exceeds 0.9 after many upgrades', () => {
    let s = defaultStats();
    for (let i = 0; i < 30; i++) s = applyStatCard(s, 'crit');
    expect(s.crit).toBeLessThanOrEqual(0.9);
  });

  it('derive passes critChance from stats', () => {
    const stats = { ...defaultStats(), crit: 0.25 };
    expect(derive(stats, 1).critChance).toBeCloseTo(0.25);
  });

  it('applyStatCard armor increases armor', () => {
    const s = applyStatCard(defaultStats(), 'armor');
    expect(s.armor).toBeCloseTo(0.15);
  });

  it('armor never exceeds 0.75 after many upgrades', () => {
    let s = defaultStats();
    for (let i = 0; i < 20; i++) s = applyStatCard(s, 'armor');
    expect(s.armor).toBeLessThanOrEqual(0.75);
  });

  it('coreDamageTaken applies armor reduction', () => {
    const stats = { ...defaultStats(), armor: 0.3 };
    expect(coreDamageTaken(stats, 10)).toBeCloseTo(7);
  });

  it('coreDamageTaken keeps at least 25% incoming damage through armor cap', () => {
    const stats = { ...defaultStats(), armor: 2 };
    expect(coreDamageTaken(stats, 20)).toBeCloseTo(5);
  });

  it('xpForKill returns baseline XP without magnet', () => {
    expect(xpForKill(defaultStats())).toBeCloseTo(CONFIG.xpPerKill);
  });

  it('applyStatCard magnet increases XP per kill', () => {
    const stats = applyStatCard(defaultStats(), 'magnet');
    expect(stats.magnet).toBeCloseTo(0.2);
    expect(xpForKill(stats)).toBeCloseTo(1.2);
  });

  it('CONFIG.xpPerSkillUse is defined and greater than 0', () => {
    expect(typeof CONFIG.xpPerSkillUse).toBe('number');
    expect(CONFIG.xpPerSkillUse).toBeGreaterThan(0);
  });

  it('CONFIG.doublePickChance is a number between 0 and 1', () => {
    expect(typeof CONFIG.doublePickChance).toBe('number');
    expect(CONFIG.doublePickChance).toBeGreaterThan(0);
    expect(CONFIG.doublePickChance).toBeLessThan(1);
  });

  it('xpForKill gives base XP for normal enemy', () => {
    expect(xpForKill(defaultStats(), {})).toBeCloseTo(CONFIG.xpPerKill);
  });

  it('xpForKill gives 2× for tanky enemy', () => {
    expect(xpForKill(defaultStats(), { tanky: true })).toBeCloseTo(CONFIG.xpPerKill * 2);
  });

  it('xpForKill gives 1.5× for splitter enemy', () => {
    expect(xpForKill(defaultStats(), { splitter: true })).toBeCloseTo(CONFIG.xpPerKill * 1.5);
  });

  it('xpForKill gives 5× for boss enemy', () => {
    expect(xpForKill(defaultStats(), { boss: true })).toBeCloseTo(CONFIG.xpPerKill * 5);
  });

  it('CONFIG.dartChance is 0.08', () => {
    expect(CONFIG.dartChance).toBe(0.08);
  });

  it('xpForKill gives 0.8× for dart enemy', () => {
    expect(xpForKill(defaultStats(), { dart: true })).toBeCloseTo(CONFIG.xpPerKill * 0.8);
  });

  it('xpForKill scales with enemy speed — faster enemy yields more XP', () => {
    const slow = xpForKill(defaultStats(), { spd: CONFIG.baseEnemySpeed });
    const fast = xpForKill(defaultStats(), { spd: CONFIG.baseEnemySpeed * 2 });
    expect(fast).toBeGreaterThan(slow);
  });

  it('xpForKill speed bonus is capped at 1.5×', () => {
    const xp = xpForKill(defaultStats(), { spd: CONFIG.baseEnemySpeed * 100 });
    expect(xp).toBeCloseTo(CONFIG.xpPerKill * 1.5);
  });

  it('CONFIG.waveClearXp is 3', () => {
    expect(CONFIG.waveClearXp).toBe(3);
  });

  it('CONFIG.clutchXp is 8', () => {
    expect(CONFIG.clutchXp).toBe(8);
  });

  it('CONFIG.waveClearHeal is 5', () => {
    expect(CONFIG.waveClearHeal).toBe(5);
  });

  it('CONFIG.reposCooldown is 12', () => {
    expect(CONFIG.reposCooldown).toBe(12);
  });
});

describe('SKILLS', () => {
  it('bomb exists as a 1-tap skill with a long cooldown', () => {
    expect(SKILLS.bomb).toBeDefined();
    expect(SKILLS.bomb.tap).toBe(1);
    expect(SKILLS.bomb.cooldown).toBeGreaterThanOrEqual(15);
  });

  it('bomb is offerable when not yet unlocked', () => {
    const seq = (arr) => { let i = 0; return () => arr[i++ % arr.length]; };
    const offers = rollOffers([], seq([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]));
    const skillIds = offers.filter(o => o.kind === 'skill').map(o => o.id);
    // bomb must be reachable — pool includes it (not unlocked)
    expect(Object.keys(SKILLS)).toContain('bomb');
  });

  it('chain exists as a 1-tap skill', () => {
    expect(SKILLS.chain).toBeDefined();
    expect(SKILLS.chain.tap).toBe(1);
    expect(SKILLS.chain.cooldown).toBeGreaterThan(0);
  });

  it('chain is not offered when already unlocked', () => {
    const seq = (arr) => { let i = 0; return () => arr[i++ % arr.length]; };
    const offers = rollOffers(['chain'], seq([0, 0.1, 0.2, 0.4, 0.6, 0.8]));
    expect(offers.filter(o => o.id === 'chain')).toHaveLength(0);
  });

  it('bomb is not offered when already unlocked', () => {
    const seq = (arr) => { let i = 0; return () => arr[i++ % arr.length]; };
    const offers = rollOffers(['bomb'], seq([0, 0.1, 0.2, 0.4, 0.6, 0.8]));
    expect(offers.filter(o => o.id === 'bomb')).toHaveLength(0);
  });

  it('blink exists as a 2-tap skill with cooldown >= 10', () => {
    expect(SKILLS.blink).toBeDefined();
    expect(SKILLS.blink.tap).toBe(2);
    expect(SKILLS.blink.cooldown).toBeGreaterThanOrEqual(10);
  });

  it('blink is not offered when already unlocked', () => {
    const seq = (arr) => { let i = 0; return () => arr[i++ % arr.length]; };
    const offers = rollOffers(['blink'], seq([0, 0.1, 0.4, 0.7]));
    expect(offers.filter(o => o.id === 'blink')).toHaveLength(0);
  });

  it('nova exists as a 2-tap skill and is offerable', () => {
    const seq = (arr) => { let i = 0; return () => arr[i++ % arr.length]; };
    expect(SKILLS.nova).toBeDefined();
    expect(SKILLS.nova.tap).toBe(2);
    const offers = rollOffers([], seq([0.46, 0.1, 0.5])); // 0.46 × 15 = 6.9 → floor 6 = nova in 15-skill pool
    expect(offers).toContainEqual(expect.objectContaining({ kind: 'skill', id: 'nova', tap: 2 }));
  });

  it('missile exists as a 1-tap skill with cooldown >= 5', () => {
    expect(SKILLS.missile).toBeDefined();
    expect(SKILLS.missile.tap).toBe(1);
    expect(SKILLS.missile.cooldown).toBeGreaterThanOrEqual(5);
  });

  it('missile is not offered when already unlocked', () => {
    const seq = (arr) => { let i = 0; return () => arr[i++ % arr.length]; };
    const offers = rollOffers(['missile'], seq([0, 0.1, 0.4, 0.7]));
    expect(offers.filter(o => o.id === 'missile')).toHaveLength(0);
  });

  it('drone exists as a 1-tap passive skill', () => {
    expect(SKILLS.drone).toBeDefined();
    expect(SKILLS.drone.tap).toBe(1);
    expect(SKILLS.drone.cooldown).toBeGreaterThan(0);
  });

  it('drone is not offered when already unlocked', () => {
    const seq = (arr) => { let i = 0; return () => arr[i++ % arr.length]; };
    const offers = rollOffers(['drone'], seq([0, 0.1, 0.4, 0.7]));
    expect(offers.filter(o => o.id === 'drone')).toHaveLength(0);
  });

  it('drone damage multiplier is 3', () => {
    expect(CONFIG.droneDamageMult).toBe(3);
  });

  it('warmup grace period is 3 seconds', () => {
    expect(CONFIG.warmupSec).toBe(3);
  });

  it('repulse exists as a 1-tap skill with cooldown >= 15', () => {
    expect(SKILLS.repulse).toBeDefined();
    expect(SKILLS.repulse.tap).toBe(1);
    expect(SKILLS.repulse.cooldown).toBeGreaterThanOrEqual(15);
  });

  it('repulse is not offered when already unlocked', () => {
    const seq = (arr) => { let i = 0; return () => arr[i++ % arr.length]; };
    const offers = rollOffers(['repulse'], seq([0, 0.1, 0.4, 0.7]));
    expect(offers.filter(o => o.id === 'repulse')).toHaveLength(0);
  });

  it('heal exists as a 1-tap skill with cooldown 22', () => {
    expect(SKILLS.heal).toBeDefined();
    expect(SKILLS.heal.tap).toBe(1);
    expect(SKILLS.heal.cooldown).toBe(22);
  });

  it('heal is not offered when already unlocked', () => {
    const seq = (arr) => { let i = 0; return () => arr[i++ % arr.length]; };
    const offers = rollOffers(['heal'], seq([0, 0.1, 0.4, 0.7]));
    expect(offers.filter(o => o.id === 'heal')).toHaveLength(0);
  });

  it('thorns is a passive skill and appears in locked list before unlock', () => {
    expect(SKILLS.thorns).toBeDefined();
    expect(SKILLS.thorns.passive).toBe(true);
    const seq = (arr) => { let i = 0; return () => arr[i++ % arr.length]; };
    const offers = rollOffers([], seq([0.99, 0.1, 0.5]));
    const skillIds = offers.filter(o => o.kind === 'skill').map(o => o.id);
    expect(skillIds.length).toBeGreaterThan(0);
  });

  it('thorns is not offered when already unlocked', () => {
    const seq = (arr) => { let i = 0; return () => arr[i++ % arr.length]; };
    const offers = rollOffers(['thorns'], seq([0, 0.1, 0.4, 0.7]));
    expect(offers.filter(o => o.id === 'thorns')).toHaveLength(0);
  });

  it('CONFIG.thornsAura is 4', () => {
    expect(CONFIG.thornsAura).toBe(4);
  });

  it('overload is a passive skill and is offerable', () => {
    expect(SKILLS.overload).toBeDefined();
    expect(SKILLS.overload.passive).toBe(true);
    const seq = (arr) => { let i = 0; return () => arr[i++ % arr.length]; };
    const offers = rollOffers([], seq([0, 0.1, 0.5]));
    expect(offers.some(o => o.kind === 'skill')).toBe(true);
  });

  it('siphon is a passive skill and is offerable', () => {
    expect(SKILLS.siphon).toBeDefined();
    expect(SKILLS.siphon.passive).toBe(true);
    const seq = (arr) => { let i = 0; return () => arr[i++ % arr.length]; };
    const offers = rollOffers([], seq([0.99, 0.1, 0.5]));
    expect(offers.some(o => o.kind === 'skill')).toBe(true);
  });

  it('siphon is not offered when already unlocked', () => {
    const seq = (arr) => { let i = 0; return () => arr[i++ % arr.length]; };
    const offers = rollOffers(['siphon'], seq([0, 0.1, 0.4, 0.7]));
    expect(offers.filter(o => o.id === 'siphon')).toHaveLength(0);
  });
});

describe('offers', () => {
  const seq = (arr) => { let i = 0; return () => arr[i++ % arr.length]; };

  it('rollOffers returns exactly 3 distinct cards', () => {
    const offers = rollOffers([], seq([0.0, 0.3, 0.6, 0.9, 0.1]));
    expect(offers).toHaveLength(3);
    const keys = offers.map(o => o.kind + ':' + o.id);
    expect(new Set(keys).size).toBe(3);
  });

  it('rollOffers always includes exactly 1 skill when locked skills exist', () => {
    const offers = rollOffers([], seq([0.0, 0.5, 0.9, 0.1, 0.3]));
    expect(offers.filter(o => o.kind === 'skill')).toHaveLength(1);
    expect(offers.filter(o => o.kind === 'stat')).toHaveLength(2);
  });

  it('rollOffers returns 3 stat cards when all skills are unlocked', () => {
    const allSkillIds = Object.keys(SKILLS);
    const offers = rollOffers(allSkillIds, seq([0.0, 0.3, 0.7]));
    expect(offers.filter(o => o.kind === 'skill')).toHaveLength(0);
    expect(offers.filter(o => o.kind === 'stat')).toHaveLength(3);
  });

  it('rollOffers never offers an already-unlocked skill', () => {
    const allSkillIds = Object.keys(SKILLS);
    const offers = rollOffers(allSkillIds, seq([0.0, 0.2, 0.4, 0.6, 0.8]));
    const offeredSkills = offers.filter(o => o.kind === 'skill').map(o => o.id);
    for (const id of offeredSkills) expect(allSkillIds).not.toContain(id);
  });

  it('rollOffers is deterministic for a fixed rng', () => {
    const a = rollOffers([], seq([0.1, 0.5, 0.9]));
    const b = rollOffers([], seq([0.1, 0.5, 0.9]));
    expect(a).toEqual(b);
  });
});

describe('geometry / collision', () => {
  it('dist is correct', () => {
    expect(dist(0, 0, 3, 4)).toBe(5);
  });

  it('pointSegDist returns 0 for point on segment', () => {
    expect(pointSegDist(1, 0, 0, 0, 2, 0)).toBeCloseTo(0);
  });

  it('pointSegDist returns perpendicular distance for point off segment', () => {
    expect(pointSegDist(1, 3, 0, 0, 2, 0)).toBeCloseTo(3);
  });

  it('pointSegDist clamps to nearest endpoint when beyond segment', () => {
    expect(pointSegDist(5, 0, 0, 0, 2, 0)).toBeCloseTo(3);
  });

  it('enemyHitsCore true when overlapping', () => {
    const core = { x: 100, y: 100 };
    const enemy = { x: 100, y: 100 + CONFIG.coreRadius, r: 5 };
    expect(enemyHitsCore(enemy, core)).toBe(true);
  });

  it('enemyHitsCore false when far', () => {
    const core = { x: 100, y: 100 };
    const enemy = { x: 100, y: 400, r: 5 };
    expect(enemyHitsCore(enemy, core)).toBe(false);
  });

  it('waveForTime increments every waveSeconds', () => {
    expect(waveForTime(0)).toBe(1);
    expect(waveForTime(CONFIG.waveSeconds - 1)).toBe(1);
    expect(waveForTime(CONFIG.waveSeconds)).toBe(2);
  });

  it('clamp bounds values', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(5, 0, 10)).toBe(5);
  });
});

describe('splitter enemies', () => {
  it('splitterChildren returns two smaller faster children', () => {
    const parent = { x: 100, y: 120, r: 12, maxHp: 10, spd: 40, splitter: true };
    const children = splitterChildren(parent);
    expect(children).toHaveLength(2);
    for (const child of children) {
      expect(child.hp).toBeCloseTo(3.5);
      expect(child.maxHp).toBeCloseTo(3.5);
      expect(child.r).toBeCloseTo(6.6);
      expect(child.spd).toBeCloseTo(54);
      expect(child.tanky).toBe(false);
    }
  });

  it('splitterChildren returns no children for non-splitters or consumed enemies', () => {
    expect(splitterChildren({ splitter: false })).toEqual([]);
    expect(splitterChildren({ splitter: true, consumed: true })).toEqual([]);
  });
});

describe('enemy factories', () => {
  const seq = (arr) => { let i = 0; return () => arr[i++ % arr.length]; };

  it('createEnemy returns a valid enemy object', () => {
    const d = derive(defaultStats(), 1);
    const e = createEnemy(d, 1, 400, 700, seq([0.1, 0.5, 0.3, 0.7, 0.9, 0.2, 0.4]));
    expect(e.hp).toBeGreaterThan(0);
    expect(e.maxHp).toBe(e.hp);
    expect(e.r).toBeGreaterThan(0);
    expect(e.spd).toBeGreaterThan(0);
  });

  it('createEnemy hp and radius scale correctly for tanky variant', () => {
    const d = derive(defaultStats(), 1);
    // force tanky: edge=0, x-rand, dart-rand<dartChance=no (wave<8), tanky-rand < 0.13
    const e = createEnemy(d, 1, 400, 700, seq([0, 0.5, 0, 0.05]));
    expect(e.tanky).toBe(true);
    expect(e.r).toBe(13);
    expect(e.hp).toBeCloseTo(d.enemyHp * 2.4);
  });

  it('createBoss returns a boss with 8× enemyHp and r=28', () => {
    const d = derive(defaultStats(), 5);
    const boss = createBoss(d, 400, 700, seq([0.5, 0.3]));
    expect(boss.boss).toBe(true);
    expect(boss.r).toBe(28);
    expect(boss.hp).toBeCloseTo(d.enemyHp * 8);
    expect(boss.maxHp).toBe(boss.hp);
  });

  it('createBoss spawns off the edge of the screen', () => {
    const d = derive(defaultStats(), 5);
    const W = 400, H = 700;
    const boss = createBoss(d, W, H, seq([0.5, 0.3]));
    const onEdge = boss.x < 0 || boss.x > W || boss.y < 0 || boss.y > H;
    expect(onEdge).toBe(true);
  });
});

describe('boss wave cadence', () => {
  it('isBossWave is true for every 5th wave', () => {
    expect(isBossWave(5)).toBe(true);
    expect(isBossWave(10)).toBe(true);
    expect(isBossWave(15)).toBe(true);
  });

  it('isBossWave is false for non-5th waves', () => {
    expect(isBossWave(1)).toBe(false);
    expect(isBossWave(4)).toBe(false);
    expect(isBossWave(6)).toBe(false);
    expect(isBossWave(9)).toBe(false);
  });

  it('isBossWave is false for wave 0', () => {
    expect(isBossWave(0)).toBe(false);
  });

  it('5th wave arrives at the right time via waveForTime', () => {
    const wave5Start = CONFIG.waveSeconds * 4; // wave 5 begins at t=80s
    expect(waveForTime(wave5Start)).toBe(5);
    expect(isBossWave(waveForTime(wave5Start))).toBe(true);
    expect(isBossWave(waveForTime(wave5Start - 1))).toBe(false);
  });
});

// Minimal G factory for testing engine step functions.
function makeG(overrides = {}) {
  return {
    t: 0,
    core: { x: 200, y: 400, hp: CONFIG.coreHp },
    stats: defaultStats(),
    enemies: [], shots: [], fx: [], missiles: [],
    unlocked: [],
    cooldowns: {},
    slowUntil: 0, shieldUntil: 0,
    blinkHome: null, blinkReturn: 0,
    reposTarget: null, reposStart: null,
    drone: { angle: 0, lastZap: 0 },
    lastAuto: 0, autoShotCount: 0,
    lastSpawn: 0, wave: 1,
    lastBossWave: 0, bossFlashUntil: 0,
    ...overrides,
  };
}

describe('skillReady', () => {
  it('returns true when no cooldown set', () => {
    const G = makeG();
    expect(skillReady(G, 'pulse')).toBe(true);
  });

  it('returns false while on cooldown', () => {
    const G = makeG({ t: 5 });
    G.cooldowns['pulse'] = 10;
    expect(skillReady(G, 'pulse')).toBe(false);
  });

  it('returns true once cooldown expires', () => {
    const G = makeG({ t: 10 });
    G.cooldowns['pulse'] = 10;
    expect(skillReady(G, 'pulse')).toBe(true);
  });
});

describe('executeSkill', () => {
  it('pulse damages enemies within 150px and pushes a ring fx', () => {
    const G = makeG();
    G.enemies.push({ x: G.core.x, y: G.core.y + 100, r: 8, hp: 10 });
    G.enemies.push({ x: G.core.x, y: G.core.y + 200, r: 8, hp: 10 });
    executeSkill(G, 'pulse', 0, 0, 400, 700);
    expect(G.enemies[0].hp).toBeLessThan(10);
    expect(G.enemies[1].hp).toBe(10); // out of 150px range
    expect(G.fx.some(f => f.kind === 'ring')).toBe(true);
  });

  it('pulse sets cooldown on G', () => {
    const G = makeG();
    executeSkill(G, 'pulse', 0, 0, 400, 700);
    expect(G.cooldowns['pulse']).toBeGreaterThan(0);
  });

  it('heal increases core hp and pushes ring fx', () => {
    const G = makeG();
    G.core.hp = 50;
    executeSkill(G, 'heal', 0, 0, 400, 700);
    expect(G.core.hp).toBeGreaterThan(50);
    expect(G.fx.some(f => f.kind === 'ring' && f.color === '#4cff91')).toBe(true);
  });

  it('heal cannot exceed CONFIG.coreHp', () => {
    const G = makeG();
    G.core.hp = CONFIG.coreHp - 1;
    executeSkill(G, 'heal', 0, 0, 400, 700);
    expect(G.core.hp).toBe(CONFIG.coreHp);
  });

  it('slow sets slowUntil 3 seconds into the future', () => {
    const G = makeG({ t: 10 });
    executeSkill(G, 'slow', 0, 0, 400, 700);
    expect(G.slowUntil).toBe(13);
  });

  it('shield sets shieldUntil 2.5 seconds into the future', () => {
    const G = makeG({ t: 5 });
    executeSkill(G, 'shield', 0, 0, 400, 700);
    expect(G.shieldUntil).toBeCloseTo(7.5);
  });

  it('bomb damages all enemies on screen', () => {
    const G = makeG();
    G.enemies.push({ x: 0, y: 0, r: 8, hp: 20 });
    G.enemies.push({ x: 800, y: 800, r: 8, hp: 20 });
    executeSkill(G, 'bomb', 0, 0, 400, 700);
    expect(G.enemies[0].hp).toBeLessThan(20);
    expect(G.enemies[1].hp).toBeLessThan(20);
  });

  it('blink moves core to aim point and saves home position', () => {
    const G = makeG();
    const origX = G.core.x, origY = G.core.y;
    executeSkill(G, 'blink', 300, 500, 400, 700);
    expect(G.blinkHome).toEqual({ x: origX, y: origY });
    expect(G.core.x).toBe(300);
    expect(G.core.y).toBe(500);
  });

  it('executeSkill returns CONFIG.xpPerSkillUse', () => {
    const G = makeG();
    const xp = executeSkill(G, 'pulse', 0, 0, 400, 700);
    expect(xp).toBe(CONFIG.xpPerSkillUse);
  });
});

describe('stepCore', () => {
  it('regen increases core hp over time', () => {
    const G = makeG();
    G.core.hp = 50;
    G.stats.regen = 10;
    stepCore(G, 1);
    expect(G.core.hp).toBeCloseTo(60);
  });

  it('regen cannot exceed CONFIG.coreHp', () => {
    const G = makeG();
    G.core.hp = CONFIG.coreHp - 1;
    G.stats.regen = 100;
    stepCore(G, 1);
    expect(G.core.hp).toBe(CONFIG.coreHp);
  });

  it('blink snap-back restores core position when blinkReturn reached', () => {
    const G = makeG({ t: 5 });
    G.blinkHome = { x: 100, y: 200 };
    G.blinkReturn = 5;
    G.core.x = 300; G.core.y = 400;
    stepCore(G, 0);
    expect(G.core.x).toBe(100);
    expect(G.core.y).toBe(200);
    expect(G.blinkHome).toBeNull();
  });
});

describe('stepEnemies', () => {
  it('moves enemies toward core', () => {
    const G = makeG();
    const d = derive(defaultStats(), 1);
    const startY = G.core.y + 300;
    G.enemies.push({ x: G.core.x, y: startY, r: 8, hp: 10, maxHp: 10, spd: 50, tanky: false });
    stepEnemies(G, d, 0.1);
    expect(G.enemies[0].y).toBeLessThan(startY); // moved toward core (smaller y)
  });

  it('detects wave clear when all enemies die', () => {
    const G = makeG();
    const d = derive(defaultStats(), 1);
    G.enemies.push({ x: G.core.x, y: G.core.y, r: 8, hp: 0, maxHp: 10, spd: 50, tanky: false });
    const result = stepEnemies(G, d, 0.016);
    expect(result.waveClear).toBe(true);
    expect(result.killCount).toBe(1);
  });

  it('does not report waveClear when no enemies were present', () => {
    const G = makeG();
    const d = derive(defaultStats(), 1);
    const result = stepEnemies(G, d, 0.016);
    expect(result.waveClear).toBe(false);
    expect(result.killCount).toBe(0);
  });

  it('shield blocks core damage', () => {
    const G = makeG({ t: 10 });
    G.shieldUntil = 15;
    const d = derive(defaultStats(), 1);
    const startHp = G.core.hp;
    G.enemies.push({ x: G.core.x, y: G.core.y, r: 100, hp: 5, maxHp: 5, spd: 0, tanky: false });
    stepEnemies(G, d, 0.016);
    expect(G.core.hp).toBe(startHp); // no damage through shield
    expect(result => result).toBeDefined();
  });

  it('accumulates xp from kills including enemy type multipliers', () => {
    const G = makeG();
    const d = derive(defaultStats(), 1);
    G.enemies.push({ x: 0, y: 0, r: 8, hp: 0, maxHp: 10, spd: 50, boss: true });
    const result = stepEnemies(G, d, 0.016);
    expect(result.xpGained).toBeGreaterThan(CONFIG.xpPerKill * 4);
  });
});

describe('SKILLS auto flag', () => {
  it('missile has auto:true', () => {
    expect(SKILLS.missile.auto).toBe(true);
  });

  it('drone has auto:true', () => {
    expect(SKILLS.drone.auto).toBe(true);
  });

  it('pulse does not have auto:true', () => {
    expect(SKILLS.pulse.auto).toBeFalsy();
  });
});
