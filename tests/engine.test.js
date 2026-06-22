// engine.test.js — pure-logic tests. These are the loop's verification spine.
// Run: npm test
import { describe, it, expect } from 'vitest';
import {
  xpForLevel, gainXp, defaultStats, derive, rollOffers,
  applyStatCard, dist, enemyHitsCore, waveForTime, clamp, SKILLS, CONFIG,
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
});

describe('offers', () => {
  const seq = (arr) => { let i = 0; return () => arr[i++ % arr.length]; };

  it('rollOffers returns exactly 3 distinct cards', () => {
    const offers = rollOffers([], seq([0.0, 0.3, 0.6, 0.9, 0.1]));
    expect(offers).toHaveLength(3);
    const keys = offers.map(o => o.kind + ':' + o.id);
    expect(new Set(keys).size).toBe(3);
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
