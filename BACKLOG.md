# CORE — backlog

The `/loop` command pulls the first unchecked item, implements it, verifies it with the
`game-verify` skill, ticks it, and commits. One item per run.

Keep items small and verifiable. A good item names *what done looks like*.

## Up next
- [x] Make the Missile skill auto-fire: once unlocked, it launches a homing missile at
      the nearest enemy automatically whenever its cooldown is ready, with no tap
      required. Done = in `index.html` `step()`, if `missile` is in `G.unlocked` and
      its cooldown has expired and at least one enemy exists, a missile is pushed to
      `G.missiles` and the cooldown reset — identical projectile behaviour to the manual
      trigger; the Missile skill button is hidden from the thumb zone (not rendered in
      `#skills`) so it doesn't take up a slot. Rendering/input-only; no test needed.

- [x] Show enemy HP bars: render a small bar above each enemy that shrinks as HP drops,
      so the player can see which enemies are nearly dead. Done = `draw()` draws a 1px
      tall bar (enemy width × hp/maxHp) above each enemy in red; bar is hidden when
      hp === maxHp (freshly spawned); boss bar is proportionally wider matching its
      larger radius. Rendering-only; no test needed.

- [x] Enemy death burst: when an enemy's hp drops to 0, push 5–8 tiny particle FX that
      scatter outward and fade over 0.4s, matching the enemy's colour. Done = kill
      detection in `step()` pushes `{ kind: 'burst', x, y, color }` entries to `G.fx`;
      `draw()` renders each burst as several small circles spreading from origin with
      `globalAlpha` fading to 0 over the particle lifetime. Rendering-only; no test needed.

- [x] Boss HP bar at top of screen: when a boss is alive (enemy with `boss: true` in
      `G.enemies`), render a wide red bar near the top of the canvas labelled "BOSS"
      showing its remaining HP fraction. Done = `draw()` detects any enemy with
      `boss === true`, renders a centred bar `(canvas width × 0.5)` wide below the
      wave/level HUD that scales with `hp / maxHp`; bar disappears when no boss exists.
      Rendering-only; no test needed.

- [ ] Kill counter: track total enemies killed in `G.kills` (increment on each enemy
      death in `step()`), display it on the game-over / RETRY screen alongside wave.
      Done = `G.kills` is initialised to 0 in `newGame()` and incremented each time an
      enemy is removed as dead; the RETRY splash shows "KILLS  N" beneath "WAVE N".
      Rendering/input-only; no test needed.

- [ ] Add a `Drone` passive skill: once unlocked an orbiting satellite rotates around
      the core and zaps the nearest enemy within 140px every 1.5s for 1×power damage.
      Done = `SKILLS.drone` exists in `engine.js` (tap: 1, cooldown: 0, desc mentions
      orbit); test asserting `SKILLS.drone` is defined and not offered when unlocked;
      `index.html` tracks `G.drone = { angle, lastZap }` in game state, advances angle
      in `step()`, zaps the closest in-range enemy on interval, renders as a small cyan
      dot orbiting at `coreRadius + 20`; skill button hidden (passive, like missile).
      Mixed — engine entry + test; rendering in `index.html`.

- [ ] Add a `Repulse` 1-tap skill: instantly pushes all enemies outward from the core,
      buying breathing room without dealing damage. Done = `SKILLS.repulse` exists in
      `engine.js` (tap: 1, cooldown: 18); test asserting it is defined and not offered
      when unlocked; `index.html` trigger applies an outward velocity impulse
      `(enemy position − core) normalised × 220` to every enemy, shown with a brief
      white ring FX. Mixed — engine entry + test; impulse logic in `index.html`.

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
