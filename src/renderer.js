import { CONFIG } from './engine.js';

export function draw(G, ctx, W, H, DPR, getCss) {
  const c = G.core;

  // screen shake
  let sx = 0, sy = 0;
  if (G.t < G.shakeUntil) {
    const k = (G.shakeUntil - G.t) / 0.25;
    const mag = 7 * k;
    sx = (Math.random() - 0.5) * 2 * mag;
    sy = (Math.random() - 0.5) * 2 * mag;
  }
  ctx.setTransform(DPR, 0, 0, DPR, sx * DPR, sy * DPR);
  ctx.clearRect(-10, -10, W + 20, H + 20);

  // grid
  ctx.strokeStyle = getCss('--grid'); ctx.lineWidth = 1;
  const gs = 36;
  ctx.beginPath();
  for (let x = (W / 2 % gs); x < W; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = (c.y % gs); y < H; y += gs) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();

  // aiming guide
  if (G.aiming) {
    ctx.strokeStyle = 'rgba(125,249,255,.25)'; ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.arc(c.x, c.y, 60, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }

  // fx
  for (const f of G.fx) {
    const k = (G.t - f.born) / f.life;
    if (f.kind === 'ring') {
      ctx.strokeStyle = f.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r + (f.max - f.r) * k, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (f.kind === 'beam') {
      ctx.strokeStyle = '#7df9ff'; ctx.globalAlpha = 1 - k; ctx.lineWidth = 6 * (1 - k) + 1;
      ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (f.kind === 'spark') {
      ctx.fillStyle = '#fff'; ctx.globalAlpha = 1 - k;
      ctx.beginPath(); ctx.arc(f.x, f.y, 3 * (1 - k) + 1, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    } else if (f.kind === 'flash') {
      ctx.fillStyle = '#fff'; ctx.globalAlpha = (1 - k) * 0.28;
      ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    } else if (f.kind === 'arc') {
      ctx.strokeStyle = '#ffe066'; ctx.globalAlpha = (1 - k) * 0.9; ctx.lineWidth = 2.5 * (1 - k) + 0.5;
      ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (f.kind === 'nova') {
      const armed = f.hit ? 1 : Math.min(1, (G.t - f.born) / (f.hitAt - f.born));
      ctx.strokeStyle = f.hit ? '#ffec99' : 'rgba(255,236,153,.72)';
      ctx.globalAlpha = f.hit ? Math.max(0, 1 - k) : 0.45 + armed * 0.45;
      ctx.lineWidth = f.hit ? 3 : 2;
      ctx.setLineDash(f.hit ? [] : [6, 8]);
      ctx.beginPath(); ctx.arc(f.x, f.y, f.max * (f.hit ? 1 : armed), 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    } else if (f.kind === 'burst') {
      ctx.fillStyle = f.color;
      for (let i = 0; i < f.n; i++) {
        const ang = (i / f.n) * Math.PI * 2;
        const spd = 28 + (i % 3) * 14;
        const px = f.x + Math.cos(ang) * spd * k;
        const py = f.y + Math.sin(ang) * spd * k;
        ctx.globalAlpha = (1 - k) * 0.85;
        ctx.beginPath(); ctx.arc(px, py, 2.5 * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  // enemies
  for (const e of G.enemies) {
    ctx.save(); ctx.translate(e.x, e.y);
    ctx.fillStyle = e.boss ? '#ffd700' : (e.tanky ? '#ff8a4d' : e.splitter ? '#f277ff' : getCss('--enemy'));
    if (e.boss) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 16; }
    ctx.beginPath();
    const sides = e.boss ? 8 : (e.tanky ? 6 : e.splitter ? 4 : 3);
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 2 + G.t * (e.boss ? .3 : e.tanky ? .5 : 1.5);
      const px = Math.cos(a) * e.r, py = Math.sin(a) * e.r;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    if (e.hp < e.maxHp) {
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.fillRect(-e.r, e.r + 4, e.r * 2, 2);
      ctx.fillStyle = e.boss ? '#ffd700' : '#fff';
      ctx.fillRect(-e.r, e.r + 4, e.r * 2 * (e.hp / e.maxHp), 2);
    }
    ctx.restore();
  }

  // shots
  for (const s of G.shots) {
    ctx.fillStyle = s.crit ? '#fff' : getCss('--core');
    ctx.beginPath(); ctx.arc(s.x, s.y, s.crit ? 4 : 2.5, 0, Math.PI * 2); ctx.fill();
  }

  // missiles
  for (const m of G.missiles) {
    for (let i = 0; i < m.tail.length; i++) {
      const k = (i + 1) / (m.tail.length + 1);
      ctx.globalAlpha = k * 0.6;
      ctx.fillStyle = '#ff4dff';
      ctx.beginPath(); ctx.arc(m.tail[i].x, m.tail[i].y, 2 * k, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ff4dff';
    ctx.shadowColor = '#ff4dff'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(m.x, m.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // drone
  if (G.unlocked.includes('drone')) {
    const dr = CONFIG.coreRadius + 20;
    const dx = c.x + Math.cos(G.drone.angle) * dr;
    const dy = c.y + Math.sin(G.drone.angle) * dr;
    ctx.fillStyle = '#7df9ff';
    ctx.shadowColor = '#7df9ff'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(dx, dy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // core
  const shielded = G.t < G.shieldUntil;
  ctx.save(); ctx.translate(c.x, c.y);
  ctx.shadowColor = getCss('--core');
  ctx.shadowBlur = shielded ? 18 : (19 + 9 * Math.sin(G.t * 1.8));
  ctx.strokeStyle = shielded ? '#fff' : getCss('--core'); ctx.lineWidth = shielded ? 3 : 2;
  ctx.fillStyle = 'rgba(125,249,255,.08)';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + G.t * .3;
    const px = Math.cos(a) * CONFIG.coreRadius, py = Math.sin(a) * CONFIG.coreRadius;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  if (!shielded) {
    ctx.strokeStyle = getCss('--core');
    ctx.globalAlpha = 0.3 + 0.15 * Math.sin(G.t * 1.8 + 1);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - G.t * 0.2;
      const px = Math.cos(a) * (CONFIG.coreRadius + 12), py = Math.sin(a) * (CONFIG.coreRadius + 12);
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // hp ring
  ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, CONFIG.coreRadius + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (c.hp / CONFIG.coreHp)); ctx.stroke();
  if (c.hp / CONFIG.coreHp < 0.3) {
    const pulse = 0.5 + 0.5 * Math.sin(G.t * 10);
    ctx.strokeStyle = `rgba(255,93,115,${0.25 + pulse * 0.35})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, CONFIG.coreRadius + 14 + pulse * 4, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();

  // boss HP bar
  const boss = G.enemies.find(e => e.boss && e.hp > 0);
  if (boss) {
    const bw = W * 0.5, bh = 6, bx = (W - bw) / 2, by = 148;
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(bx, by, bw * (boss.hp / boss.maxHp), bh);
    ctx.fillStyle = '#fff';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('BOSS', W / 2, by - 4);
  }
}
