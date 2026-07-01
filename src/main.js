import {
  CONFIG, xpForLevel, gainXp, defaultStats, derive,
  rollOffers, applyStatCard, waveForTime, clamp, SKILLS,
  skillReady, executeSkill,
  stepCore, stepBossSpawn, stepSpawn, stepSpikeSpawn, stepNovaDet, stepAutoFire,
  stepShots, stepMissiles, stepEnemies, stepDrone,
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
const fastBtnEl   = document.getElementById('fast-btn');

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
let holdStartMs   = 0, holdX = 0, holdY = 0;
let lastWaveColored = -1;

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
    t: 0, waveTime: 0, lastSpawn: 0,
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
    flashUntil: 0,
    kills: 0,
    drone: { angle: 0, lastZap: 0 },
    bossFlashUntil: 0, pendingLevels: 0,
    reposLastAt: -CONFIG.reposCooldown, reposTarget: null, reposStart: null,
    autoShotCount: 0,
    firstBloodDone: false,
    lastSpikeAt: -CONFIG.spikeCooldown,
    lastSkillAt: 0, lastSkillId: null,
  };
  fastMode = false;
  fastBtnEl.classList.remove('on');
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
function onSkillTap(id, aimX, aimY) {
  if (!skillReady(G, id)) return;
  sfx.skill();
  executeSkill(G, id, aimX, aimY, W, H);
  applyXp(CONFIG.xpPerSkillUse);
  updateSkillBar();
}

// --- input -----------------------------------------------------------------
cv.addEventListener('pointerdown', (e) => {
  sfx.unlock();
  if (!G || !G.running || G.paused) return;
  const r = cv.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  if (G.aiming) {
    onSkillTap(G.aiming, x, y);
    setAiming(null);
    return;
  }
  holdX = x; holdY = y; holdStartMs = Date.now();
  cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointerup', () => {
  if (G && G.running && !G.paused && holdStartMs &&
      Date.now() - holdStartMs >= 200 &&
      G.t - G.reposLastAt >= CONFIG.reposCooldown) {
    G.reposTarget = { x: clamp(holdX, 40, W - 40), y: clamp(holdY, 40, H - 40) };
    G.reposStart  = { x: G.core.x, y: G.core.y, t: G.t };
    G.reposLastAt = G.t;
  }
  holdStartMs = 0;
});
cv.addEventListener('pointercancel', () => { holdStartMs = 0; });
cv.addEventListener('contextmenu',   e => e.preventDefault());

// --- HUD: skill bar --------------------------------------------------------
function renderSkillBar() {
  skillsEl.innerHTML = '';
  for (const id of G.unlocked) {
    const sk = SKILLS[id];
    if (sk.passive || sk.auto) continue;
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
        onSkillTap(id);
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
  const offers = rollOffers(G.unlocked, G.stats, Math.random);
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

// --- HUD update ------------------------------------------------------------
function updateHUD() {
  const c = G.core;
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
  if (!G.enemies.some(e => e.boss && e.hp > 0)) G.waveTime += dt;
  const nextWave = waveForTime(G.waveTime);
  if (nextWave !== G.wave) { G.wave = nextWave; announceWave(G.wave); }
  const d = derive(G.stats, G.wave);

  stepCore(G, dt);
  if (stepBossSpawn(G, d, W, H, Math.random)) {
    const e = G.enemies[G.enemies.length - 1];
    G.fx.push({ kind: 'ring', x: e.x, y: e.y, r: 0, max: 20, born: G.t, life: 0.15, color: '#ffffff' });
    sfx.bossSpawn();
  }
  if (stepSpawn(G, d, W, H, Math.random)) {
    const e = G.enemies[G.enemies.length - 1];
    G.fx.push({ kind: 'ring', x: e.x, y: e.y, r: 0, max: 20, born: G.t, life: 0.15, color: '#ffffff' });
  }
  if (stepSpikeSpawn(G, d, W, H, Math.random)) {
    const e = G.enemies[G.enemies.length - 1];
    G.fx.push({ kind: 'ring', x: e.x, y: e.y, r: 0, max: 20, born: G.t, life: 0.15, color: '#ffffff' });
  }
  stepNovaDet(G);
  stepAutoFire(G, d, Math.random);
  stepShots(G, dt, W, H);
  stepMissiles(G, d, dt, Math.random);

  const result = stepEnemies(G, d, dt);
  if (result.killCount > 0) {
    G.kills += result.killCount; applyXp(result.xpGained); sfx.kill();
    const amt = Math.round(result.xpGained);
    G.fx.push({ kind: 'xpPop', x: G.core.x + (Math.random() - 0.5) * 50, y: G.core.y - 10, amount: '+' + amt, born: G.t, life: 0.6 });
  }
  if (result.firstBlood)    {
    applyXp(CONFIG.firstBloodXp); G.firstBloodDone = true;
    G.fx.push({ kind: 'xpPop', x: G.core.x, y: G.core.y - 30, amount: '+' + CONFIG.firstBloodXp, born: G.t, life: 0.6 });
  }
  if (result.xpDrained > 0) { G.xp = Math.max(0, G.xp - result.xpDrained); }
  if (result.waveClear)     {
    applyXp(CONFIG.waveClearXp);
    G.fx.push({ kind: 'xpPop', x: G.core.x, y: G.core.y - 30, amount: '+' + CONFIG.waveClearXp, born: G.t, life: 0.6 });
    sfx.waveClear();
  }
  if (result.clutch)        { applyXp(CONFIG.clutchXp); }
  if (result.bomberExploded) sfx.bomberExplode();
  if (result.coreHit) {
    if (G.t + 0.2 > G.shakeUntil) G.shakeUntil = G.t + 0.2;
    G.fx.push({ kind: 'ring', x: G.core.x, y: G.core.y, r: CONFIG.coreRadius, max: CONFIG.coreRadius + 30, born: G.t, life: 0.25, color: '#ff4444' });
    sfx.hit();
  }

  for (const e of G.enemies) {
    if (e.boss && e.enraged && !e.enrageSfxDone) { e.enrageSfxDone = true; sfx.enrage(); }
  }

  const prevZap = G.drone.lastZap;
  stepDrone(G, dt);
  if (G.drone.lastZap !== prevZap) sfx.droneZap();

  G.fx = G.fx.filter(f => G.t - f.born < f.life);
  updateHUD();
  if (G.core.hp <= 0) gameOver();
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

// --- fast mode button ------------------------------------------------------
fastBtnEl.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  sfx.unlock();
  fastMode = !fastMode;
  fastBtnEl.classList.toggle('on', fastMode);
});

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
