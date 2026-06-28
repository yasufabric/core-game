import {
  CONFIG, xpForLevel, gainXp, defaultStats, derive,
  rollOffers, applyStatCard, dist, enemyHitsCore, coreDamageTaken,
  splitterChildren, xpForKill, waveForTime, clamp, SKILLS, isBossWave,
  pointSegDist, createEnemy, createBoss,
} from './engine.js';
import { draw as drawFrame } from './renderer.js';
import { sfx } from './sfx.js';

// --- canvas / resize -------------------------------------------------------
const cv  = document.getElementById('c');
const ctx = cv.getContext('2d');
const hudEl       = document.getElementById('hud');
const waveFlashEl = document.getElementById('waveflash');
const overlay     = document.getElementById('overlay');
const cardsEl     = document.getElementById('cards');
const skillsEl    = document.getElementById('skills');

let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  const r = cv.getBoundingClientRect();
  W = r.width; H = r.height;
  cv.width = W * DPR; cv.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);

// --- game state ------------------------------------------------------------
let G = null;
let bestWave      = parseInt(localStorage.getItem('bestWave') || '0', 10);
let waveFlashTimer = 0;
let fastMode      = false;
let fastTimer     = null;
let holdStartMs   = 0, holdX = 0, holdY = 0;
let lastWaveColored = -1;

function cancelFast() { clearTimeout(fastTimer); fastTimer = null; fastMode = false; }

function waveColor(w) {
  if (w <= 1)  return '#ffffff';
  if (w >= 20) return '#ff4444';
  if (w <= 10) { const t = (w - 1) / 9;  return `rgb(255,${Math.round(255 - 76 * t)},${Math.round(255 - 184 * t)})`; }
  const t = (w - 10) / 10; return `rgb(255,${Math.round(179 - 111 * t)},${Math.round(71 - 3 * t)})`;
}

function newGame() {
  resize();
  G = {
    running: true,
    t: 0, lastSpawn: 0,
    core: { x: W / 2, y: H * 0.46, hp: CONFIG.coreHp },
    stats: defaultStats(),
    level: 1, xp: 0, xpNeeded: xpForLevel(1),
    wave: 1,
    enemies: [], shots: [], fx: [], missiles: [],
    lastAuto: 0,
    unlocked: [],
    cooldowns: {},
    slowUntil: 0, shieldUntil: 0, shakeUntil: 0,
    aiming: null,
    paused: false,
    pageHidden: document.hidden,
    lastBossWave: 0,
    blinkHome: null, blinkReturn: 0,
    kills: 0,
    drone: { angle: 0, lastZap: 0 },
    bossFlashUntil: 0, pendingLevels: 0,
    reposLastAt: -CONFIG.reposCooldown, reposTarget: null, reposStart: null,
    autoShotCount: 0,
  };
  cancelFast();
  renderSkillBar();
  overlay.classList.remove('show');
  waveFlashEl.classList.remove('show');
  document.getElementById('splash').classList.add('hidden');
}

function announceWave(wave) {
  waveFlashEl.textContent = `WAVE ${wave}`;
  waveFlashEl.classList.add('show');
  clearTimeout(waveFlashTimer);
  waveFlashTimer = setTimeout(() => waveFlashEl.classList.remove('show'), 850);
}

// --- spawning --------------------------------------------------------------
function spawnEnemy() {
  G.enemies.push(createEnemy(derive(G.stats, G.wave), G.wave, W, H, Math.random));
  G.lastSpawn = G.t;
}

function spawnBoss() {
  G.enemies.push(createBoss(derive(G.stats, G.wave), W, H, Math.random));
}

// --- XP --------------------------------------------------------------------
function applyXp(amount) {
  const res = gainXp({ level: G.level, xp: G.xp }, amount);
  G.level = res.level; G.xp = res.xp; G.xpNeeded = res.xpNeeded;
  if (res.leveledUp > 0) {
    G.pendingLevels += res.leveledUp - 1;
    openLevelUp();
  }
}

// --- skills ----------------------------------------------------------------
function skillReady(id) {
  return (G.cooldowns[id] || 0) <= G.t;
}

function triggerSkill(id, aimX, aimY) {
  const sk = SKILLS[id];
  if (!skillReady(id)) return;
  G.cooldowns[id] = G.t + sk.cooldown * G.stats.cooldown;
  sfx.skill();
  const c = G.core;
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
      const dx = e.x - c.x, dy = e.y - c.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      e.x += (dx / d) * 220; e.y += (dy / d) * 220;
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
  } else if (id === 'blink') {
    G.blinkHome = { x: c.x, y: c.y };
    G.blinkReturn = G.t + 1.5;
    G.fx.push({ kind: 'ring', x: c.x, y: c.y, r: 0, max: 60, born: G.t, life: .4, color: '#b39dff' });
    c.x = clamp(aimX, 40, W - 40);
    c.y = clamp(aimY, 40, H - 40);
    G.fx.push({ kind: 'ring', x: c.x, y: c.y, r: 0, max: 60, born: G.t, life: .4, color: '#b39dff' });
  }
  applyXp(CONFIG.xpPerSkillUse);
  updateSkillBar();
}

// --- input -----------------------------------------------------------------
cv.addEventListener('pointerdown', (e) => {
  if (!G || !G.running || G.paused) return;
  const r = cv.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  if (G.aiming) {
    triggerSkill(G.aiming, x, y);
    setAiming(null);
    return;
  }
  holdX = x; holdY = y; holdStartMs = Date.now();
  cv.setPointerCapture(e.pointerId);
  fastTimer = setTimeout(() => { fastMode = true; }, 150);
});
cv.addEventListener('pointerup', () => {
  if (G && G.running && !G.paused && holdStartMs &&
      Date.now() - holdStartMs >= 200 &&
      G.t - G.reposLastAt >= CONFIG.reposCooldown && !G.blinkHome) {
    G.reposTarget = { x: clamp(holdX, 40, W - 40), y: clamp(holdY, 40, H - 40) };
    G.reposStart  = { x: G.core.x, y: G.core.y, t: G.t };
    G.reposLastAt = G.t;
  }
  holdStartMs = 0;
  cancelFast();
});
cv.addEventListener('pointercancel', () => { holdStartMs = 0; cancelFast(); });
cv.addEventListener('contextmenu',   e => e.preventDefault());

// --- HUD: skill bar --------------------------------------------------------
function renderSkillBar() {
  skillsEl.innerHTML = '';
  for (const id of G.unlocked) {
    if (id === 'missile') continue;
    if (id === 'drone')   continue;
    const sk = SKILLS[id];
    if (sk.passive) continue;
    const b = document.createElement('button');
    b.className = 'skill';
    b.dataset.id = id;
    b.innerHTML = `<span class="nm">${sk.name}</span><span class="tap">${sk.tap === 2 ? 'AIM·TAP' : 'TAP'}</span><i class="cd"></i><span class="cd-text"></span>`;
    b.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation();
      if (G.paused) return;
      if (sk.tap === 2) {
        setAiming(G.aiming === id ? null : id);
      } else {
        triggerSkill(id);
      }
    });
    skillsEl.appendChild(b);
  }
  updateSkillBar();
}

function setAiming(id) {
  G.aiming = id;
  [...skillsEl.children].forEach(b => b.classList.toggle('aiming', b.dataset.id === id));
}

function updateSkillBar() {
  [...skillsEl.children].forEach(b => {
    const id = b.dataset.id, sk = SKILLS[id];
    const cd     = b.querySelector('.cd');
    const cdText = b.querySelector('.cd-text');
    const total  = sk.cooldown * G.stats.cooldown;
    const remain = Math.max(0, (G.cooldowns[id] || 0) - G.t);
    cd.style.transform = `scaleY(${remain / total})`;
    if (cdText) cdText.textContent = remain > 0.5 ? Math.ceil(remain) + 's' : '';
  });
}

// --- level up --------------------------------------------------------------
function openLevelUp(picksRemaining) {
  if (picksRemaining === undefined) {
    picksRemaining = Math.random() < CONFIG.doublePickChance ? 2 : 1;
  }
  G.paused = true;
  setAiming(null);
  sfx.levelUp();
  const offers = rollOffers(G.unlocked, Math.random);
  cardsEl.innerHTML = '';
  overlay.querySelector('h2').textContent = picksRemaining === 2 ? 'DOUBLE PICK!' : 'LEVEL UP';
  for (const o of offers) {
    const el = document.createElement('button');
    el.className = 'pick ' + o.kind;
    const badge = o.kind === 'skill' ? (o.tap === 2 ? 'SKILL·AIM' : 'SKILL') : 'STAT';
    el.innerHTML = `<div class="h"><span class="name">${o.name}</span><span class="badge">${badge}</span></div><div class="d">${o.desc}</div>`;
    el.addEventListener('click', () => choose(o, picksRemaining));
    cardsEl.appendChild(el);
  }
  overlay.classList.add('show');
}

function choose(o, picksRemaining) {
  if (o.kind === 'stat') {
    G.stats = applyStatCard(G.stats, o.id);
  } else {
    if (!G.unlocked.includes(o.id)) G.unlocked.push(o.id);
    renderSkillBar();
  }
  const remaining = picksRemaining - 1;
  if (remaining > 0) { openLevelUp(remaining); return; }
  overlay.classList.remove('show');
  G.paused = false;
  if (G.pendingLevels > 0) { G.pendingLevels--; openLevelUp(); }
}

// --- main loop -------------------------------------------------------------
let prev = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (!G || !G.running) return;
  const dt = Math.min(0.05, (now - prev) / 1000 || 0) * (fastMode ? 2 : 1);
  prev = now;
  if (!G.paused && !G.pageHidden) step(dt);
  drawScene();
  if (fastMode) {
    ctx.save();
    ctx.font = 'bold 16px system-ui';
    ctx.fillStyle = 'rgba(255,220,50,0.9)';
    ctx.fillText('2×', 10, 28);
    ctx.restore();
  }
}

function step(dt) {
  G.t += dt;
  const nextWave = waveForTime(G.t);
  if (nextWave !== G.wave) {
    G.wave = nextWave;
    announceWave(G.wave);
  }
  const d = derive(G.stats, G.wave);
  const c = G.core;

  // regen
  if (G.stats.regen) c.hp = clamp(c.hp + G.stats.regen * dt, 0, CONFIG.coreHp);

  // blink snap-back
  if (G.blinkHome && G.t >= G.blinkReturn) {
    G.fx.push({ kind: 'ring', x: c.x, y: c.y, r: 0, max: 60, born: G.t, life: .4, color: '#b39dff' });
    c.x = G.blinkHome.x; c.y = G.blinkHome.y;
    G.blinkHome = null; G.blinkReturn = 0;
    G.fx.push({ kind: 'ring', x: c.x, y: c.y, r: 0, max: 60, born: G.t, life: .4, color: '#b39dff' });
  }

  // tap-to-reposition slide
  if (G.reposTarget) {
    const elapsed = G.t - G.reposStart.t;
    const frac = Math.min(1, elapsed / CONFIG.reposDuration);
    c.x = G.reposStart.x + (G.reposTarget.x - G.reposStart.x) * frac;
    c.y = G.reposStart.y + (G.reposTarget.y - G.reposStart.y) * frac;
    if (frac >= 1) G.reposTarget = null;
  }

  // shield expiry flash
  if (G.shieldUntil > 0 && G.t >= G.shieldUntil && G.t - dt < G.shieldUntil) {
    G.fx.push({ kind: 'ring', x: c.x, y: c.y, r: CONFIG.coreRadius, max: CONFIG.coreRadius + 30, born: G.t, life: .3, color: '#ffffff' });
  }

  // boss spawn
  if (isBossWave(G.wave) && G.wave > G.lastBossWave) {
    spawnBoss();
    G.lastBossWave = G.wave;
    G.bossFlashUntil = G.t + 2;
  }

  // regular enemy spawn (suppressed while boss is alive)
  const bossAlive = G.enemies.some(e => e.boss);
  if (G.t >= CONFIG.warmupSec && G.t - G.lastSpawn > d.spawnInterval && !bossAlive) spawnEnemy();

  // nova detonation
  for (const f of G.fx) {
    if (f.kind === 'nova' && !f.hit && G.t >= f.hitAt) {
      f.hit = true;
      for (const e of G.enemies) {
        if (dist(e.x, e.y, f.x, f.y) <= f.max + e.r) { e.hp -= f.damage; e.hitFlash = G.t; }
      }
      G.fx.push({ kind: 'ring', x: f.x, y: f.y, r: 24, max: f.max, born: G.t, life: .25, color: '#ffec99' });
    }
  }

  // auto-fire
  const slow = G.t < G.slowUntil ? 0.4 : 1;
  if (G.t - G.lastAuto > 1 / d.autoRate) {
    let best = null, bestD = d.autoRange;
    for (const e of G.enemies) {
      const dd = dist(e.x, e.y, c.x, c.y);
      if (dd < bestD) { bestD = dd; best = e; }
    }
    if (best) {
      const ang    = Math.atan2(best.y - c.y, best.x - c.x);
      const isCrit = Math.random() < d.critChance;
      G.shots.push({ x: c.x, y: c.y, vx: Math.cos(ang) * 420, vy: Math.sin(ang) * 420, dmg: isCrit ? d.autoDamage * 2 : d.autoDamage, crit: isCrit, life: 1.2 });
      G.autoShotCount++;
      if (G.unlocked.includes('overload') && G.autoShotCount % 8 === 0) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          G.shots.push({ x: c.x, y: c.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, dmg: d.autoDamage * 0.5, life: 1.2 });
        }
      }
      G.lastAuto = G.t;
    }
  }

  // move shots + collision
  for (const s of G.shots) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
  for (const s of G.shots) {
    for (const e of G.enemies) {
      if (e.hp > 0 && dist(s.x, s.y, e.x, e.y) < e.r + 3) {
        e.hp -= s.dmg; e.hitFlash = G.t; s.life = 0;
        G.fx.push({ kind: 'spark', x: s.x, y: s.y, born: G.t, life: .2 });
        break;
      }
    }
  }
  G.shots = G.shots.filter(s => s.life > 0 && s.x > -20 && s.x < W + 20 && s.y > -20 && s.y < H + 20);

  // missile auto-fire
  if (G.unlocked.includes('missile') && skillReady('missile') && G.enemies.length > 0) {
    let target = null, targetD = Infinity;
    for (const e of G.enemies) { const dd = dist(e.x, e.y, c.x, c.y); if (dd < targetD) { targetD = dd; target = e; } }
    G.missiles.push({ x: c.x, y: c.y, vx: 0, vy: -120, target, tail: [], life: 8 });
    G.cooldowns['missile'] = G.t + SKILLS.missile.cooldown * G.stats.cooldown;
  }

  // missiles homing
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

  // move enemies + collision with core
  let totalXp = 0;
  const survivors = [];
  const spawnedFromSplitters = [];
  for (const e of G.enemies) {
    if (e.hp <= 0) {
      totalXp += xpForKill(G.stats, e);
      if (G.unlocked.includes('siphon') && dist(e.x, e.y, c.x, c.y) < 60) {
        c.hp = Math.min(CONFIG.coreHp, c.hp + 1);
      }
      const col = e.boss ? '#ffd700' : e.tanky ? '#ff8a4d' : e.splitter ? '#f277ff' : getCss('--enemy');
      G.fx.push({ kind: 'burst', x: e.x, y: e.y, color: col, born: G.t, life: 0.4, n: 7 });
      spawnedFromSplitters.push(...splitterChildren(e));
      continue;
    }
    const ang = Math.atan2(c.y - e.y, c.x - e.x);
    e.x += Math.cos(ang) * e.spd * slow * dt;
    e.y += Math.sin(ang) * e.spd * slow * dt;
    if (G.unlocked.includes('thorns') && dist(e.x, e.y, c.x, c.y) <= CONFIG.coreRadius + 50) {
      e.hp -= CONFIG.thornsAura * dt;
    }
    if (enemyHitsCore(e, c)) {
      if (G.t >= G.shieldUntil) { c.hp -= coreDamageTaken(G.stats, e.tanky ? 14 : 7); G.shakeUntil = G.t + 0.25; sfx.hit(); }
      e.hp = 0; e.consumed = true;
      G.fx.push({ kind: 'ring', x: c.x, y: c.y, r: CONFIG.coreRadius, max: CONFIG.coreRadius + 18, born: G.t, life: .3, color: '#ff5d73' });
      continue;
    }
    survivors.push(e);
  }
  const removed    = G.enemies.length - survivors.length;
  const hadEnemies = G.enemies.length > 0;
  G.enemies = survivors;
  G.enemies.push(...spawnedFromSplitters);
  if (removed > 0) {
    G.kills += removed;
    applyXp(totalXp);
    sfx.kill();
  }
  if (hadEnemies && G.enemies.length === 0) {
    applyXp(CONFIG.waveClearXp);
    G.fx.push({ kind: 'ring', x: c.x, y: c.y, r: CONFIG.coreRadius, max: CONFIG.coreRadius + 40, born: G.t, life: 0.5, color: '#ffd700' });
    if (c.hp <= CONFIG.coreHp * 0.1) {
      applyXp(CONFIG.clutchXp);
      G.fx.push({ kind: 'ring', x: c.x, y: c.y, r: CONFIG.coreRadius, max: CONFIG.coreRadius + 55, born: G.t, life: 0.6, color: '#ff4400' });
    }
    const healed = Math.min(CONFIG.waveClearHeal, CONFIG.coreHp - c.hp);
    if (healed > 0) {
      c.hp += healed;
      G.fx.push({ kind: 'ring', x: c.x, y: c.y, r: CONFIG.coreRadius, max: CONFIG.coreRadius + 30, born: G.t, life: 0.4, color: '#4cff91' });
    }
  }

  // drone auto-zap
  if (G.unlocked.includes('drone')) {
    G.drone.angle += 1.4 * dt;
    const dr = CONFIG.coreRadius + 20;
    const dx = c.x + Math.cos(G.drone.angle) * dr;
    const dy = c.y + Math.sin(G.drone.angle) * dr;
    const zapInterval = SKILLS.drone.cooldown * G.stats.cooldown;
    if (G.t - G.drone.lastZap >= zapInterval) {
      let best = null, bestD = Infinity;
      for (const e of G.enemies) {
        if (e.hp <= 0) continue;
        const d = dist(dx, dy, e.x, e.y);
        if (d < 140 && d < bestD) { bestD = d; best = e; }
      }
      if (best) {
        best.hp -= CONFIG.droneDamageMult * G.stats.power; best.hitFlash = G.t;
        G.fx.push({ kind: 'arc', x1: dx, y1: dy, x2: best.x, y2: best.y, born: G.t, life: .25 });
        G.drone.lastZap = G.t;
      }
    }
  }

  // fx ttl
  G.fx = G.fx.filter(f => G.t - f.born < f.life);

  // HUD update
  hudEl.classList.toggle('lowcore', c.hp / CONFIG.coreHp < 0.3);
  const waveEl = document.getElementById('wave');
  waveEl.textContent = G.wave;
  if (G.wave !== lastWaveColored) { lastWaveColored = G.wave; waveEl.style.color = waveColor(G.wave); }
  document.getElementById('lv').textContent = G.level;
  document.getElementById('hp').textContent = Math.ceil(c.hp);
  document.getElementById('kills').textContent = G.kills;
  document.getElementById('slow-badge').style.opacity = G.t < G.slowUntil ? '1' : '0';
  document.getElementById('xpfill').style.width = (100 * G.xp / G.xpNeeded) + '%';
  updateSkillBar();

  if (c.hp <= 0) gameOver();
}

function gameOver() {
  G.running = false;
  sfx.over();
  overlay.classList.remove('show');
  if (G.wave > bestWave) { bestWave = G.wave; localStorage.setItem('bestWave', bestWave); }
  document.getElementById('deadmsg').textContent   = `CORE BREACHED · WAVE ${G.wave} · LV ${G.level}`;
  document.getElementById('killcount').textContent  = G.kills > 0 ? `KILLS  ${G.kills}` : '';
  document.getElementById('bestscore').textContent  = bestWave > 0 ? `BEST  WAVE ${bestWave}` : '';
  document.getElementById('start').textContent      = 'RETRY';
  document.getElementById('splash').classList.remove('hidden');
}

// --- render ----------------------------------------------------------------
const cssCache = {};
function getCss(v) {
  if (!cssCache[v]) cssCache[v] = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  return cssCache[v];
}

function drawScene() {
  drawFrame(G, ctx, W, H, DPR, getCss);
}

// --- bootstrap -------------------------------------------------------------
document.getElementById('start').addEventListener('click', () => { sfx.unlock(); newGame(); });
document.addEventListener('visibilitychange', () => {
  if (!G) return;
  G.pageHidden = document.hidden;
  if (!document.hidden) prev = performance.now();
});
requestAnimationFrame(frame);

window.__CORE = () => G;
window.__renderSkillBar = () => G && renderSkillBar();
