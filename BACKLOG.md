# CORE — backlog

The `/loop` command pulls the first unchecked item, implements it, verifies it with the
`game-verify` skill, ticks it, and commits. One item per run.

Keep items small and verifiable. A good item names *what done looks like*.

## Up next
- [x] Add an `armor` stat card: reduces core damage taken from enemies, capped so the
      core can never become invulnerable from stats alone. Done = `armor` exists in
      `defaultStats`/`STAT_CARDS`, a pure helper computes incoming core damage, renderer
      uses it on enemy contact, and tests cover the cap.

- [x] Fix level-up card width bug: `.pick skill` cards are 72px wide instead of full
      width because the `.skill { width: 72px }` rule (for the skill bar) also matches
      pick cards with class `pick skill`. Scope the `.skill` CSS rule to `#skills .skill`
      so it no longer applies to pick cards.
      Done = `.pick` buttons have `offsetWidth >= 260px` in the overlay; Playwright
      1280×800 check injects 3 pick cards, shows overlay, and confirms each `.pick`
      `getBoundingClientRect().width` is ≥ 260px (not the current 72px).
      Rendering-only; no test needed.

- [x] Add a `Chain` 1-tap skill: zaps the nearest enemy, then jumps to a few nearby
      enemies for reduced damage. Done = entry in `SKILLS`, offerable via `rollOffers`,
      implemented in `index.html`, with a small visual arc effect.

- [ ] Add a `magnet` stat card: increases XP pickup radius once pickups exist, but for
      now boosts kill XP by a small percentage as a temporary pure rule. Done = stat
      exists in `defaultStats`/`STAT_CARDS`, `xpForKill(stats)` helper exists, kill XP
      uses it, and tests pin default/boosted values.

- [ ] Add wave announcement feedback when a new wave starts. Done = renderer detects
      wave changes, shows a short centered "WAVE N" flash, and does not pause gameplay.
      Rendering-only; no test needed.

- [ ] Add enemy splitters: a medium enemy can split into two small fast enemies when
      killed. Done = pure helper defines splitter child stats, spawn/render logic uses
      it, and tests assert child count, hp, radius, and speed.

- [ ] Add a `Nova` 2-tap skill: aim point selects a blast center, then damages enemies
      in that radius after a short delay. Done = entry in `SKILLS`, two-tap handling
      reuses the existing aim flow, cooldown applies on cast, and the blast has a clear
      warning ring.

- [ ] Add a low-core warning pulse. Done = when core hp is below 30%, the core/HUD gets
      a subtle red pulse; pulse stops after healing above the threshold. Rendering-only;
      no test needed.

- [ ] Add pause/resume on page visibility change. Done = hidden tab pauses simulation
      without accumulating a giant `dt`, visible tab resumes cleanly, and manual gameplay
      state is unchanged. Rendering/input-only; no test needed.

- [x] Add a `crit` stat card: chance for auto-shots to deal double damage. Done = `crit`
      stat exists in `defaultStats`/`STAT_CARDS`, affects `derive`, has a test.
- [x] Add a `Bomb` 1-tap skill: damages all enemies on screen, long cooldown. Done =
      entry in `SKILLS`, offerable via `rollOffers`, triggers in `index.html`.
- [x] Add a boss enemy every 5th wave (bigger, much more hp, slow). Done = spawn logic +
      a `waveForTime`/spawn test asserting boss cadence.
- [x] Persist best score (wave reached) in memory for the session and show it on the
      splash. Done = best updates on game over, shown on RETRY screen. (No localStorage.)
- [x] Add a brief screen-shake on core hit. Rendering-only; no test needed.

- [x] Fix iPhone top-of-screen clipping: HUD is cut off by the notch / Dynamic Island.
      Done = `.topbar` top padding includes `env(safe-area-inset-top)`, `.xpbar` top
      position also accounts for the safe area; top HUD is fully visible on iPhone with
      `viewport-fit=cover`. Rendering-only; no test needed.

- [x] Top HUD still clips on iPhone 17 Dynamic Island: WAVE/LV/CORE text is half-obscured
      even after the safe-area-inset-top fix. Harden the offset with CSS max() so that
      clearance is guaranteed regardless of whether env() resolves correctly.
      Done = `.topbar` padding-top is `max(78px, calc(14px + env(safe-area-inset-top)))`;
      `.xpbar` top is `max(112px, calc(48px + env(safe-area-inset-top)))`; Playwright
      device-emulation check (iPhone 12 viewport) confirms topbar paddingTop ≥ 78px.
      Rendering-only; no test needed.

- [x] Level-up card overlay sometimes clips or overflows on small/notched screens — not
      all 3 pick cards are reachable. Make the overlay scrollable and safe-area-aware.
      Done = `#overlay` gains `overflow-y: auto` and safe-area padding on all sides;
      `.cards` has a `max-height` that keeps it within the visible viewport; Playwright
      iPhone 12 viewport check confirms all 3 `.pick` buttons are within `scrollHeight`.
      Rendering-only; no test needed.

- [x] Enemies are too strong in early waves — players die before reaching LV 3. Soften
      the initial difficulty so new players can survive to wave 2–3 and level up twice.
      Done = `CONFIG.baseEnemyHp` lowered and/or `CONFIG.baseSpawnInterval` raised in
      `engine.js`; `derive(defaultStats(), 1).enemyHp` and `spawnInterval` tests updated
      to assert the new values; `derive(defaultStats(), 5)` still harder than wave 1
      (existing invariant must hold).

- [x] Wave-2 enemy HP spike is still too steep: hp jumps from 3 to 5 between wave 1 and
      wave 2 because the hardcoded `1.5` scaling factor uses `floor(wave * 1.5)`.
      Introduce `CONFIG.enemyHpScale` (replaces the hardcoded `1.5` in `derive`) and
      set it to `1.0`, so wave-2 hp drops to 4 and the ramp is smoother.
      Done = `CONFIG.enemyHpScale` exists in `engine.js`; `derive` uses
      `CONFIG.baseEnemyHp + Math.floor(wave * CONFIG.enemyHpScale)`; test asserting
      `derive(defaultStats(), 2).enemyHp` equals 4; difficulty-rises invariant still
      holds (`derive(defaultStats(), 5).enemyHp > derive(defaultStats(), 1).enemyHp`).

## Done
<!-- the loop appends finished items here with a one-line note -->
- [x] Armor stat: added capped `armor` upgrades plus `coreDamageTaken`; enemy core hits now use the helper and tests cover default, upgrade, reduction, and cap behavior.
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
