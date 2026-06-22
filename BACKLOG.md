# CORE — backlog

The `/loop` command pulls the first unchecked item, implements it, verifies it with the
`game-verify` skill, ticks it, and commits. One item per run.

Keep items small and verifiable. A good item names *what done looks like*.

## Up next
<!-- no items pending -->

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
- [x] Repulse skill: `SKILLS.repulse` (1-tap, 18s cooldown), normalised outward impulse ×220 to all enemies + white ring FX; 2 tests; nova fixture updated for 11-skill pool.
