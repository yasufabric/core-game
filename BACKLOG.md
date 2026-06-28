# CORE — backlog

The `/loop` command pulls the first unchecked item, implements it, verifies it with the
`game-verify` skill, ticks it, and commits. One item per run.

Keep items small and verifiable. A good item names *what done looks like*.

## Up next

<!-- ── FIXES ──────────────────────────────────────────────────── -->
- [x] Persist best score: `bestWave` loaded from `localStorage` on init; saved back on game over; RETRY splash unchanged; no engine change.

- [x] Drone damage boost: drone zap damage 1×power → 3×power so the drone stays relevant past wave 3; update the 1 test that checks drone power if one exists, or add one. Added CONFIG.droneDamageMult=3 in engine.js; index.html uses it; test pins value at 3.

- [ ] Warmup grace period: first enemy spawns no earlier than 3s after `newGame()`; add a `CONFIG.warmupSec = 3` constant and gate `spawnEnemy` behind `G.t >= CONFIG.warmupSec`; 1 engine test pins the boundary.

<!-- ── POLISH ──────────────────────────────────────────────────── -->
- [ ] Slow-active HUD indicator: while slowfield is active, show a small "SLOW" badge in the HUD topbar (purple, fades out when `G.t >= G.slowUntil`); renderer-only, no engine change.

- [ ] Shield expiry flash: when the shield drops (`G.t` crosses `G.shieldUntil`), push a `ring` FX (white, r=coreRadius, max=coreRadius+30, life=0.3s) so the player sees the shield fall; renderer/step change only.

- [ ] Cooldown countdown text: inside each skill button, show the integer seconds remaining (e.g. "3s") centred over the cooldown fill when cd > 0.5s; hide when ready; HUD-only change.

- [ ] Kill counter in HUD: add `KILLS <b id="kills">0</b>` to the topbar and update it in `step()` alongside the existing wave/lv/hp updates; no engine change needed.

<!-- ── CONTENT ─────────────────────────────────────────────────── -->
- [ ] Heal skill: `SKILLS.heal` (1-tap, 22s cooldown), restores `min(20, CONFIG.coreHp - c.hp)` HP to the core, green ring FX; 2 engine tests (skill defined, not offered when unlocked).

- [ ] Fast enemy type ("dart"): starting wave 8, 8% chance per spawn of a dart (triangle, 1.8× speed, 0.4× HP, sides=3, magenta); add `dart` flag to enemy; `xpForKill` returns 0.8× for darts; 2 tests.

- [ ] Wave-clear bonus XP: when `G.enemies.length` drops to 0 and the wave is still active, award `CONFIG.waveClearXp = 3` bonus XP and push a brief gold ring FX at core; 1 engine test.

- [ ] Low-HP clutch bonus: when a wave is cleared with core HP at or below 10% of max
      (`c.hp <= CONFIG.coreHp * 0.1`), award `CONFIG.clutchXp = 8` bonus XP and flash a
      red-gold ring FX at the core. Done = `CONFIG.clutchXp = 8` exported from `engine.js`
      with a test pinning the value; `step()` checks the HP threshold when enemies drop to 0
      and only awards the bonus when the low-HP condition is met. Mixed; 1 engine test.

- [ ] Wave-clear HP recovery: when all enemies are wiped out, restore `CONFIG.waveClearHeal = 5`
      HP to the core (capped at `CONFIG.coreHp`). Done = `CONFIG.waveClearHeal = 5` exported
      from `engine.js` with a test pinning the value; `step()` in `index.html` heals `c.hp` by
      `Math.min(CONFIG.waveClearHeal, CONFIG.coreHp - c.hp)` when enemies drop to 0; green ring
      FX pushed at core on heal. Mixed; 1 engine test.

- [ ] Tap-to-reposition: tapping the arena canvas (outside skill buttons) slides the core to
      that point over 0.8 s; a 12 s cooldown (stored in `CONFIG.reposCooldown`) prevents
      spamming; a radial arc ring drawn around the core shows remaining cooldown.
      Done = `CONFIG.reposCooldown = 12` exported from `engine.js` with a test asserting
      the value; canvas pointerdown in `index.html` starts a slide when cooldown is ready;
      repositioning radial ring visible while on cooldown; enemies re-target the new position.

- [ ] Thorns passive skill: enemies that deal damage to the core are themselves hit for 4
      points (before armor). Done = `SKILLS.thorns` (`passive: true`) in `engine.js`,
      offerable by `rollOffers` (test: thorns appears in locked list before unlock, not after);
      `step()` in `index.html` applies 4-damage retaliation when `G.unlocked` includes
      `'thorns'` and an enemy hits the core.

- [ ] Overload passive skill: every 8th auto-shot fires an extra burst of 8 directional shots
      at half damage. Done = `SKILLS.overload` (`passive: true`) in `engine.js` with a test
      asserting it is offerable; `G.autoShotCount` tracked in state; when count % 8 === 0
      and `'overload'` is unlocked, 8 radial shots pushed in `step()`.

- [ ] Siphon passive skill: killing an enemy within 60 px of the core restores 1 HP (capped
      at `CONFIG.coreHp`). Done = `SKILLS.siphon` (`passive: true`) in `engine.js`, test
      asserting it is offerable; `step()` checks `dist(e.x, e.y, c.x, c.y) < 60` on kill and
      heals when `'siphon'` is unlocked.

- [ ] Shielded enemy type: a new `shielded` variant spawns from wave 4 onward (8 % base
      chance + 0.5 % per wave). Its frontal arc (facing toward core, ±70°) blocks auto-shots
      — they deal 0 damage. Skill hits (pulse, lance, bomb, chain, nova, repulse) bypass the
      shield entirely. Done = `isShieldBlocked(shot, enemy, core)` exported from `engine.js`
      with tests: shot arriving from the core direction returns true, shot from behind returns
      false; shielded enemy spawned in `index.html` with a distinct visual arc indicator.

## Done
<!-- the loop appends finished items here with a one-line note -->
- [x] Armor stat: added capped `armor` upgrades plus `coreDamageTaken`; enemy core hits now use the helper and tests cover default, upgrade, reduction, and cap behavior.
- [x] Magnet stat: added `magnet` upgrades and `xpForKill(stats)`; kill XP now routes through the helper with tests for baseline and boosted XP.
- [x] Wave announcement: renderer now flashes centered "WAVE N" text on wave changes without pausing gameplay; Playwright confirmed wave 2 flash.
- [x] Enemy splitters: added pure `splitterChildren`, random medium splitter spawns, two fast children on kill, distinct rendering, and tests for child stats/consumed enemies.
- [x] Nova skill: added `SKILLS.nova` as a 2-tap offer, delayed warning-ring blast, area damage after arming, and tests for offerability.
- [x] Low-core warning: HUD/core now pulse red below 30% hp and clear above threshold; Playwright confirmed the class toggles off after healing.
- [x] Visibility pause/resume: hidden tabs set a separate `pageHidden` flag so simulation time freezes without changing manual pause state; visible tabs reset timing and resume cleanly.
- [x] crit stat: added `crit: 0` to defaultStats, `critChance` to derive, `+Crit` STAT_CARD, auto-shot rolls double damage on crit; crit shots render larger/white.
- [x] Bomb skill: `SKILLS.bomb` (1-tap, 20s cooldown), deals 15×power to all on-screen enemies, white screen-flash fx; 3 tests added.
- [x] Boss enemy: `isBossWave(wave)` exported, one 8-sided gold boss (r=28, 8×hp, 0.35×speed) spawns once per 5th wave; 4 tests asserting cadence.
- [x] Best score: `bestWave` session variable updated on game over; `#bestscore` element shows "BEST  WAVE N" on RETRY splash (empty on first load).
- [x] Screen shake: `G.shakeUntil` set on shielded core hit; `draw()` applies decaying random translate via `setTransform` for 0.25s.
- [x] iPhone safe-area fix: `.topbar` padding-top and `.xpbar` top now use `calc(N + env(safe-area-inset-top))`; mirrors existing bottom safe-area pattern.
- [x] iPhone 17 max() hardening: `.topbar` padding-top `max(78px, …)`, `.xpbar` top `max(112px, …)`; Playwright iPhone 12 check confirms paddingTop ≥ 78px.
- [x] Level-up overlay fix: `#overlay` gets `overflow-y: auto` + safe-area padding + `justify-content: safe center`; `.cards` gets `max-height` bounded to viewport; Playwright confirms all 3 picks within scrollHeight.
- [x] Early difficulty balance: `baseEnemyHp` 3→2, `baseSpawnInterval` 1.1→1.4; wave-1 hp=3, interval≈1.34 pinned in new tests; difficulty-rises invariant still holds.
- [x] Wave-2 hp spike fix: `CONFIG.enemyHpScale` 1.5→1.0; wave-2 hp 5→4; new test pins wave-2 hp=4; difficulty-rises invariant holds.
- [x] Level-up card width fix: scoped `.skill` CSS rule to `#skills .skill` so pick cards in the overlay are no longer forced to 72px; rendering-only.
- [x] Core idle animation: outer hex ring counter-rotates at `-G.t * 0.2`; glow pulses via `shadowBlur = 19 + 9*sin(G.t*1.8)`; rendering-only.
- [x] Chain skill: `SKILLS.chain` (1-tap, 8s cooldown), zaps nearest enemy then arcs to 3 nearby foes at 60% damage, yellow arc FX; engine test added.
- [x] rollOffers guarantee: `rollOffers` now always picks 1 locked skill first then fills 2 stat cards; falls back to 3 stats when all skills unlocked; tests cover both cases.
- [x] Blink skill: `SKILLS.blink` (2-tap, 12s cooldown), teleports core to aim point for 1.5s then snaps back; `G.blinkHome`/`G.blinkReturn` in step(); ring FX on departure and return; 2 engine tests added.
- [x] Missile skill: `SKILLS.missile` (1-tap, 6s cooldown), homing steering with turn-rate cap, 25×power on impact, magenta dot + fading tail; 2 engine tests added; nova fixture updated for 9-skill pool.
- [x] Wave 2–3 difficulty pass: `enemyHpScale` 1.0→0.6, `baseEnemySpeed` 28→22; wave-1 hp=2, wave-2 hp=3; hp/speed tests updated; difficulty-rises invariant holds.
- [x] Missile auto-fire: skips skill button, fires automatically in `step()` whenever cooldown ready and enemies exist; identical homing/damage logic retained.
- [x] Enemy HP bars: already present — 2px bar below each enemy visible when hp < maxHp; gold for boss, white for others.
- [x] Death burst particles: 7-dot colour-matched burst FX pushed on enemy death, scatter+fade over 0.4s; new 'burst' fx kind in draw().
- [x] Boss HP bar: gold 50%-width bar at y=148 with 'BOSS' label; appears while boss alive, disappears on death.
- [x] Kill counter: `G.kills` incremented per removed enemy; RETRY splash shows 'KILLS N'.
- [x] Drone passive skill: `SKILLS.drone` (1-tap, 1.5s cooldown), cyan orbiting dot zaps nearest enemy within 140px; no button; 2 tests; nova fixture updated for 10-skill pool.
- [x] Renderer extraction: `draw()` moved to `src/renderer.js` as `draw(G,ctx,W,H,DPR,getCss)`; index.html reduced by ~175 lines; all tests pass.
- [x] Repulse skill: `SKILLS.repulse` (1-tap, 18s cooldown), normalised outward impulse ×220 to all enemies + white ring FX; 2 tests; nova fixture updated for 11-skill pool.
- [x] Boss arrival announcement: `G.bossFlashUntil` set on first boss frame; renderer shows fading gold '⚠ BOSS' + red tint for 2s; resets on newGame().
- [x] Enemy XP scaling: `xpForKill(stats, enemy)` — boss×5, tanky×2, splitter×1.5, normal×1; kill XP now per-enemy; 4 tests.
- [x] Double-pick level-up: `CONFIG.doublePickChance=0.15`; `openLevelUp()` rolls chance, re-opens with fresh offers for 2nd pick; h2 shows 'DOUBLE PICK!'; 1 test.
- [x] Skill-use XP: `CONFIG.xpPerSkillUse=2`; `triggerSkill()` calls `gainXp` after each activation; 1 test.
