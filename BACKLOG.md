# CORE — backlog

The `/loop` command pulls the first unchecked item, implements it, verifies it with the
`game-verify` skill, ticks it, and commits. One item per run.

Keep items small and verifiable. A good item names *what done looks like*.

## Up next

<!-- ── 2026-07-02 review batch ────────────────────────────────── -->
- [x] Scale kill XP with wave: add `wave` as a third parameter to `xpForKill` and multiply the return value by `1 + wave * 0.04`, threading `wave` through all call sites in `engine.js` and `stepEnemies`. Done = `CONFIG.waveXpScale = 0.04` exported from `engine.js` with a test pinning the value; a test confirms wave-10 kill yields more XP than wave-1 kill for the same enemy type; all existing xpForKill call sites pass wave correctly. Added CONFIG.waveXpScale=0.04; xpForKill takes wave param (default 0); both stepEnemies call sites pass G.wave; 2 new tests (160 total).

- [x] Scale wave-clear heal with wave: replace the flat `CONFIG.waveClearHeal = 5` with a dynamic formula — `Math.max(CONFIG.waveClearHealBase, Math.min(CONFIG.waveClearHealMax, Math.round(CONFIG.coreHp * 0.02 * Math.sqrt(wave))))` — evaluated inside `stepEnemies` where the wave-clear heal is applied. Done = `CONFIG.waveClearHealBase = 5` and `CONFIG.waveClearHealMax = 20` exported from `engine.js` with tests pinning both values; a test confirms wave-20 heal is greater than wave-1 heal. Added waveClearHealBase/Max; dynamic formula in stepEnemies using G.wave; 3 new tests replacing old waveClearHeal test (162 total).

- [x] Add phantom enemy type: a new enemy variant (`e.phantom = true`) spawning wave 10+, 6% chance, that cycles visible (2.3 s) / invisible (0.7 s) via `e.phantomUntil` timestamp; `stepShots` skips collision while `G.t < e.phantomUntil`; renderer draws at 25% opacity during hidden phase. Done = `CONFIG.phantomVisibleTime = 2.3` and `CONFIG.phantomHiddenTime = 0.7` exported from `engine.js` with tests pinning both values; a test confirms auto-shots do zero damage during the hidden phase and full damage during visible phase. Added CONFIG constants; phantom type in createEnemy; cycle logic in stepEnemies; pass-through in stepShots; 25% opacity in renderer; 4 new tests (166 total).

- [x] Add Fortify passive skill: `SKILLS.fortify` (`passive: true`) — while shield is active (`G.t < G.shieldUntil`), each auto-shot that hits an enemy deals `CONFIG.fortifyBonus = 0.5` × `stats.power` bonus damage (additive line in `stepShots`). Done = `SKILLS.fortify` defined in `engine.js`, offerable before unlock and not after (2 tests); `CONFIG.fortifyBonus = 0.5` exported with a test pinning the value; a test confirms bonus damage is applied when shield is active and not when inactive. Added SKILLS.fortify passive + CONFIG.fortifyBonus=0.5; bonus dmg in stepShots when shield active; 5 new tests (171 total).

- [x] Add skill-ready glow on cooldown expiry: when a skill button transitions from on-cooldown to ready, add the CSS class `skill-ready` for 350 ms then remove it; `@keyframes skill-ready-glow` animates `box-shadow` from `0 0 8px var(--core)` to none. Done = animation is visible in the browser when a skill's CD expires during play; gate the class add with a per-button `data-was-on-cd` attribute to prevent repeated triggers. Added @keyframes skill-ready-glow in index.html CSS; data-was-on-cd gate in updateSkillBar() triggers class for 350ms on CD expiry.

<!-- ── 2026-07-02 achievement batch ─────────────────────────────── -->
- [x] Add boss defeat fanfare: return a `bossKilled` boolean from `stepEnemies` (true when a boss enemy transitions from hp > 0 to hp ≤ 0 that frame, parallel to the `firstBlood` pattern); in `step()` when `result.bossKilled`, push a large gold burst FX at the boss position, trigger a gold-tinted screen flash (`kind: 'flash'` with gold color), and show "BOSS DOWN" via `#waveflash` for 1.2 s. Done = `stepEnemies` returns `bossKilled: true` exactly once when the boss dies (unit test); "BOSS DOWN" text and gold flash are visible in the browser when a boss is killed. Added bossKilled flag in stepEnemies + large gold burst/ring FX; flash renderer supports f.color; main.js shows "BOSS DOWN" gold text for 1.2s + gold screen flash; 2 new tests (173 total).

- [x] Grant a bonus card pick on boss defeat: in `step()`, when `result.bossKilled` is true, increment `G.pendingLevels` and call `openLevelUp()` with the overlay heading set to "BOSS CLEAR". Done = visible "BOSS CLEAR" card-pick overlay appears in the browser immediately after a boss is killed; existing pendingLevels queue logic means the overlay cannot stack with an in-progress level-up. Added heading param to openLevelUp(); pendingBossHeader state; bossKilled branch calls openLevelUp directly or queues via pendingLevels when already paused.

- [x] Add beat-your-best wave indicator: in `main.js`, track a `G.bestBannerShown` boolean (reset in `newGame()`); when `G.wave === bestWave && bestWave > 0 && !G.bestBannerShown`, flash the `#wave` element gold and show "= BEST" in `#waveflash` for 1.5 s; when `G.wave > bestWave && !G.bestBannerShown`, show "NEW BEST" in `#waveflash` for 2 s and set `G.bestBannerShown = true`. Done = "NEW BEST" banner is visible in the browser when the player surpasses their stored best wave; guard prevents re-triggering on the same wave; no spurious flash when `bestWave === 0`. Added bestBannerShown + waveGoldUntil state; wave change block checks best conditions; updateHUD overrides #wave color gold while waveGoldUntil > G.t.

- [x] Add milestone wave free card pick: export `CONFIG.milestoneInterval = 10` and `isMilestoneWave(wave)` (returns `true` when `wave % 10 === 0 && wave > 0`) from `engine.js`; in `main.js` `step()`, when `nextWave !== G.wave && isMilestoneWave(nextWave)`, increment `G.pendingLevels` and set the next `openLevelUp()` header to "MILESTONE — WAVE N". Done = `CONFIG.milestoneInterval = 10` and `isMilestoneWave` exported with a unit test confirming wave 10/20 return true and wave 5/15 return false; a "MILESTONE" card-pick overlay is visible in the browser when the player crosses wave 10. Added CONFIG.milestoneInterval=10 + isMilestoneWave() in engine.js; 4 new tests (177 total); wave change block in main.js queues or opens MILESTONE overlay using shared pendingBossHeader mechanism.

- [x] Show survival time on game-over splash: in `gameOver()`, before updating the DOM, compute `Math.round(G.t)` and display it as "TIME  Ns" in a new `<div id="gametime">` element on the RETRY splash (same style as `#killcount`). Done = survival time in whole seconds is visible on the game-over splash in the browser; the element is hidden (empty text) during play and on the start screen. Added #gametime div to splash HTML; gameOver() sets "TIME  Ns"; newGame() clears it.

<!-- ── 2026-07-02 skill-redesign batch ───────────────────────────── -->
- [x] Redesign Repulse into Vortex (pull + damage): rename `SKILLS.repulse` display name to `'Vortex'` and update desc in `engine.js`; in `executeSkill`, flip the repulse impulse from outward (`+220`) to inward (`-160`) toward the core, and deal `2 * stats.power` damage to each enemy before the position update. Done = `SKILLS.repulse.name === 'Vortex'` (test); a unit test confirms enemies move toward the core after activation; a unit test confirms each enemy takes `2 * power` damage; existing repulse impulse tests updated to reflect inward direction. SKILLS.repulse renamed to Vortex with pull+damage in executeSkill; stepCore freezes cooldowns during slow; SKILLS.autogun added; 8 new tests (188 total).

- [x] Add Autogun passive skill: add `SKILLS.autogun` (`passive: true, auto: true`) and `CONFIG.autogunInterval = 4` to `engine.js`; in `stepAutoFire`, when `autogun` is in `G.unlocked`, fire a 3-shot spread burst (angles ±15° around the nearest-enemy bearing) on a separate `G.autogunAt` timer every 4 seconds, independent of the main auto-fire cycle; reset `G.autogunAt` in `newGame()`. Done = `SKILLS.autogun` offerable before unlock and not after (2 tests); `CONFIG.autogunInterval = 4` exported with a test; 3-shot spread is visible in the browser when autogun is unlocked and enemies are present. Added in same commit as Vortex batch.

- [x] Redesign Slow into Time Warp (cooldown freeze): rename `SKILLS.slow` display name to `'Time Warp'` and update `desc` to reflect the new behaviour in `engine.js`; in `main.js` `updateSkillBar()`, skip computing cooldown advancement for all skill buttons while `G.t < G.slowUntil` (cooldowns do not tick while slowed). Done = `SKILLS.slow.name === 'Time Warp'` (test); a unit test confirms that calling `step()` while `G.slowUntil > G.t` leaves skill cooldown values unchanged; the skill button CD fills visibly pause during the slow window in the browser. Added in same commit as Vortex batch.

- [x] Add skill-unlock burst FX on card pick: in `choose()` in `main.js`, when the chosen card has `kind === 'skill'`, push a 10-dot cyan burst FX `{ kind: 'burst', x: W/2, y: H/2, color: '#7df9ff', born: G.t, life: 0.4, n: 10 }` and a ring FX `{ kind: 'ring', x: W/2, y: H/2, r: 20, max: 90, born: G.t, life: 0.45, color: '#7df9ff' }` into `G.fx` before setting `G.paused = false`. Done = cyan burst and expanding ring are visible in the browser immediately after picking a skill card; stat card picks produce no such FX. Rendering-only; no engine test needed. choose() pushes burst+ring FX on skill pick; added in same commit as skill-redesign batch.

- [x] Add skill activation punch animation: add `@keyframes skill-tap { 0% { transform: scale(1) } 60% { transform: scale(1.14) } 100% { transform: scale(1) } }` and `.skill.skill-tap { animation: skill-tap 120ms ease-out forwards }` to `index.html`; in `onSkillTap()`, after confirming the skill fired (not on cooldown), clear the button's `style.animation` then add the `skill-tap` class, removing it on `animationend`. Done = button springs back visibly in the browser when a skill fires successfully; does not trigger when the skill is on cooldown; does not race with `skill-ready-glow`. Rendering-only; no engine test needed. @keyframes skill-tap + class in index.html; onSkillTap adds class with animationend cleanup; added in same commit as skill-redesign batch.

<!-- ── 2026-06-29 review batch ────────────────────────────────── -->
- [x] Make the spawn interval floor tighten per wave: in `derive()`, change the spawn interval floor from a fixed `0.28` to `Math.max(0.28 - G.wave * 0.004, 0.18)` so density keeps scaling past wave 20. Done = `CONFIG.spawnFloorBase = 0.28` and `CONFIG.spawnFloorMin = 0.18` exported from `engine.js` with tests pinning both values; `derive()` test confirms floor at wave 25 is less than at wave 1. Added CONFIG.spawnFloorBase/Min; derive() uses wave-scaled floor; 4 tests updated/added.

- [x] Add boss enrage: when a boss drops below 30% HP, set `e.enraged = true` and multiply `e.spd` by 1.5 once (flag prevents repeat). Done = `CONFIG.bossEnrageThreshold = 0.3` and `CONFIG.bossEnrageSpeedMult = 1.5` exported from `engine.js` with tests pinning both values; `stepEnemies` sets flag and speed boost; enraged boss visually distinct (renderer tints it orange). Added CONFIG constants; enrage in stepEnemies; orange glow + tint in renderer; 4 tests pass.

- [x] Add bomber enemy type: spawns wave 5+, 4% chance per spawn; halts at 90px from core, then detonates after a 1.5s fuse dealing 12 damage to the core in a 120px radius. Done = `CONFIG.bomberFuseTime = 1.5`, `CONFIG.bomberRange = 90`, `CONFIG.bomberDamage = 12`, `CONFIG.bomberRadius = 120` exported with tests; `stepEnemies` handles halt + fuse countdown + AoE detonation; distinct renderer (red pentagon with shrinking fuse ring). 6 tests pass; fuse ring renders in renderer.js.

- [x] Float a "+N" XP pop text FX at the kill/event position rising 30px and fading over 0.6s whenever XP is awarded (kills, wave-clear, first-blood, synergy). Done = new `xpPop` FX kind pushed to `G.fx` with `{x, y, amount, born, life:0.6}`; `renderer.js` draws rising+fading gold text; visible at wave 1. Rendering-only; no engine test needed. xpPop pushed in step() on kill/firstBlood/waveClear; renderer draws gold rising text.

- [x] Lerp the core HP ring stroke color from white at 100% HP through amber (`#ffb347`) at 50% to red (`#ff4444`) at 30% and below. Done = `renderer.js` draws the HP arc with an interpolated `strokeStyle` computed from `c.hp / CONFIG.coreHp`; no engine test needed (rendering-only). Two-segment lerp in renderer.js; ring color smoothly shifts from white→amber→red as HP falls.

<!-- ── FIXES (highest priority) ───────────────────────────────── -->
- [x] Long-press to reposition: replace the tap-to-reposition trigger with a 200ms long-press.
      `pointerdown` records `G.holdStart = G.t`; `pointerup` only repositions when
      `G.t - G.holdStart >= 0.2` AND cooldown is ready AND `!G.blinkHome`. Quick taps (skills,
      accidental) are ignored. Update `tests/smoke.test.js` test 1 to use `mouse.down()` +
      `waitForTimeout(300)` + `mouse.up()` instead of `page.mouse.click()`. Rendering/input-only;
      no engine test needed. Changed pointerdown to record holdStartMs/holdX/holdY; pointerup checks Date.now() diff ≥ 200ms; smoke test updated to long-press.

- [x] Thorns redesign (currently a no-op): the existing `e.hp -= 4` fires immediately before
      `e.hp = 0`, so thorns damage is always overwritten. Replace with a passive aura: every
      frame, deal `CONFIG.thornsAura = 4` damage per second to all enemies within
      `CONFIG.coreRadius + 50` px of the core. Done = `CONFIG.thornsAura = 4` exported from
      `engine.js` with a test pinning the value; `step()` applies `e.hp -= CONFIG.thornsAura * dt`
      to nearby enemies when `'thorns'` is unlocked; remove the old dead-code hit line. Mixed; 1 engine test. Added CONFIG.thornsAura=4; aura loop in step() before enemyHitsCore check; dead-code hit line removed; 1 test added.

<!-- ── POLISH ──────────────────────────────────────────────────── -->
- [x] Enemy hit flash on damage: when any enemy takes a non-lethal hit, set `e.hitFlash = G.t`
      on the enemy object; in `src/renderer.js`, render the enemy white for the first 60ms after
      `e.hitFlash` (check `G.t - e.hitFlash < 0.06`). Makes high-HP tanky enemies and the boss
      feel responsive to fire. Rendering-only; no engine test needed. Added e.hitFlash=G.t at all 7 damage sites (auto-shot, pulse, lance, bomb, chain×2, nova, drone); renderer uses white fill for 60ms after hit.

- [x] Wave number color ramp: in `step()` where `textContent` of `#wave` is updated, also set
      its `style.color` — white for wave 1–9, linearly interpolate to amber `#ffb347` at wave
      10, then to red `#ff4444` at wave 20+; cache last wave to skip DOM write when unchanged.
      Rendering-only; no engine test needed. Added waveColor() helper and lastWaveColored cache; style.color set only on wave change.

<!-- ── CONTENT ─────────────────────────────────────────────────── -->
- [x] Siphon passive skill: killing an enemy within 60 px of the core restores 1 HP (capped
      at `CONFIG.coreHp`). Done = `SKILLS.siphon` (`passive: true`) in `engine.js`, test
      asserting it is offerable; `step()` checks `dist(e.x, e.y, c.x, c.y) < 60` on kill and
      heals when `'siphon'` is unlocked. Added SKILLS.siphon passive; heal on close kill in step(); 2 tests (offerable, not re-offered); nova fixture updated for 15-skill pool.

- [x] Speed-scaled enemy XP: in `xpForKill`, multiply by `Math.min(1.5, 1 + 0.1 * (enemy.spd /
      CONFIG.baseEnemySpeed - 1))` so faster enemies yield more XP (darts and high-wave normals);
      apply the multiplier after all existing multipliers. Done = 2 engine tests: dart XP is
      higher than normal enemy XP at the same wave, bonus is capped at 1.5×. Added speedMult to xpForKill; 2 tests confirm faster→more XP and 1.5× cap; existing type-mult tests unaffected.

- [x] Shielded enemy type: a new `shielded` variant spawns from wave 4 onward (8 % base
      chance + 0.5 % per wave). Its frontal arc (facing toward core, ±70°) blocks auto-shots
      — they deal 0 damage. Skill hits (pulse, lance, bomb, chain, nova, repulse) bypass the
      shield entirely. Done = `isShieldBlocked(shot, enemy, core)` exported from `engine.js`
      with tests: shot arriving from the core direction returns true, shot from behind returns
      false; shielded enemy spawned in `index.html` with a distinct visual arc indicator. Added isShieldBlocked; shielded flag in createEnemy (wave 4+); stepShots checks shield; renderer draws cyan arc + colors enemy light-blue; 2 tests pass.

- [x] Leech drain enemy: new enemy type (pentagon, dark green, wave 6+, 5% spawn chance) that
      does not deal HP damage but drains XP at `0.5 XP/s` while within 80px of the core
      (`G.xp -= 0.5 * dt`, clamped to 0). Done = `CONFIG.leechDrainRate = 0.5` and
      `CONFIG.leechRange = 80` exported from `engine.js` with tests; `spawnEnemy()` spawns
      leech enemies; `step()` applies drain; distinct pentagon shape + dark green in renderer.
      Mixed; 2 engine tests. Added CONFIG.leechDrainRate/Range; leech variant in createEnemy; drain in stepEnemies; no HP damage on hit; pentagon renderer; 3 tests pass.

- [x] Spawn one mini-boss spike enemy mid-wave every 7 seconds from wave 4 onward (+50% HP,
      +30% speed). Done = `CONFIG.spikeCooldown = 7`, `CONFIG.spikeHpMult = 1.5`, and
      `CONFIG.spikeSpeedMult = 1.3` exported from `engine.js`, each with a test pinning the
      value; `step()` in `index.html` spawns one spike enemy when
      `G.t - G.lastSpikeAt >= CONFIG.spikeCooldown` and `G.wave >= 4`; `G.lastSpikeAt` reset
      in `newGame()`. Mixed; 3 engine tests. Added CONFIG values; createSpike+stepSpikeSpawn in engine.js; called in main.js step(); orange 7-sided renderer; 3 tests pass.

- [x] Grant `CONFIG.synergyXp = 3` bonus XP when 2 different skills are activated within 1
      second of each other; track `G.lastSkillAt` (timestamp) and `G.lastSkillId` (skill name)
      in game state and reset both in `newGame()`. Done = `CONFIG.synergyXp = 3` in `engine.js`
      with a test pinning the value; `triggerSkill()` checks `G.t - G.lastSkillAt < 1 &&
      skillName !== G.lastSkillId` and calls `gainXp(CONFIG.synergyXp)` when met; 2 engine
      tests (config value pinned, synergy XP granted on eligible combo). Mixed. Added CONFIG.synergyXp=3; synergy check inside executeSkill returns bonus XP; 2 tests pass.

- [x] Add `SKILLS.leech` passive skill: when any active skill hits an enemy, restore
      `Math.round(0.3 * stats.power)` HP to the core (capped at `CONFIG.coreHp`). Done =
      `SKILLS.leech` (`passive: true`) in `engine.js`, offerable by `rollOffers` (test: leech
      appears in locked list before unlock, not after); `step()` in `index.html` applies HP
      restore per skill-hit when `G.unlocked` includes `'leech'`; 2 engine tests (skill defined
      and offerable, restore formula rounds correctly). Mixed. Added SKILLS.leech passive; executeSkill heals on activation when leech unlocked; 3 tests pass; nova fixture updated for 16-skill pool.

- [x] When a crit auto-shot fires and `'drone'` is in `G.unlocked`, reset `G.droneCd` to 0.
      Done = logic added to the auto-shot crit branch in `step()` in `index.html`;
      `G.droneCd = 0` set immediately after crit damage is applied when drone is unlocked;
      visible as drone firing immediately after a crit. Rendering/input-only; no engine test
      needed. Added isCrit && drone unlock check in stepAutoFire; G.drone.lastZap = 0 on crit.

- [x] Push a white ring-burst FX (radius 0→20, life=0.15s) at the spawn point each time an
      enemy enters the arena. Done = renderer in `index.html` pushes a `ring` FX entry at
      enemy spawn coordinates; ring visibly expands and fades within 0.15s at wave 3+.
      Rendering-only; no test needed. stepBossSpawn/stepSpawn/stepSpikeSpawn return values used in main.js to push ring FX at spawn coords on each successful spawn.

<!-- ── BALANCE (2026-06-28 review) ───────────────────────────── -->
- [x] Ease early waves: lower `CONFIG.baseSpawnInterval` 1.6 → 2.2 and `CONFIG.baseEnemyHp` 2 → 1. Done = updated constants in `engine.js` with tests pinning both values; existing difficulty-rises tests still pass. Changed baseEnemyHp 2→1, baseSpawnInterval 1.6→2.2; 3 tests updated to reflect new wave-1 values.

- [x] Collision knockback + stun: when an enemy damages the core, push all other enemies within 80 px outward by 60 px and set `e.stunUntil = G.t + 0.4` on each; `stepEnemies` skips movement while `G.t < e.stunUntil`. Done = `e.stunUntil` field respected in `stepEnemies`; 2 engine tests (nearby enemy gets stun flag, enemy outside 80 px is unaffected). Added stunUntil stun + 60px knockback in stepEnemies; 2 tests pass.

- [x] First-blood XP bonus: add `CONFIG.firstBloodXp = 5`; on the game's very first kill, award bonus XP once (`G.firstBloodDone` flag, initialised `false` in `newGame()`). Done = `CONFIG.firstBloodXp = 5` exported from `engine.js` with a test pinning the value; `stepEnemies` returns a `firstBlood` flag on the kill that triggers it; `newGame()` initialises `G.firstBloodDone = false`. Added CONFIG.firstBloodXp=5; stepEnemies returns firstBlood flag; main.js awards bonus and sets flag; 3 tests pass.

- [x] Replace Blink with Flash skill (1-tap, CD 12s): remove `SKILLS.blink` and add `SKILLS.flash` — while active (`G.flashUntil`, 1.5s duration), triple the auto-fire rate and emit a 12-shot radial burst at activation. Done = `SKILLS.flash` defined in `engine.js` with 2 tests (offerable, not offered when already unlocked); `SKILLS.blink` removed; `G.flashUntil` respected in `stepAutoFire`; blink references cleaned from `newGame()` and `stepCore`. Blink removed, Flash added as 1-tap with 12-shot burst + 3× autofire for 1.5s; all tests updated.

- [x] Core hit shake + red ring: on every core hit (not just shielded), update `G.shakeUntil = G.t + 0.2` (only when `G.t + 0.2 > G.shakeUntil`) and push a red ring FX at the core (r=coreRadius, max=coreRadius+30, life=0.25s, colour `#ff4444`). Done = shake triggered for every `coreHit` result in `main.js`; red ring FX visible in-game; no engine test needed (rendering + state flag only). Clamped shake update + red ring FX added to step() coreHit branch.

<!-- ── COMPLETED ───────────────────────────────────────────────── -->
- [x] Persist best score: `bestWave` loaded from `localStorage` on init; saved back on game over; RETRY splash unchanged; no engine change.

- [x] Drone damage boost: drone zap damage 1×power → 3×power so the drone stays relevant past wave 3; update the 1 test that checks drone power if one exists, or add one. Added CONFIG.droneDamageMult=3 in engine.js; index.html uses it; test pins value at 3.

- [x] Warmup grace period: first enemy spawns no earlier than 3s after `newGame()`; add a `CONFIG.warmupSec = 3` constant and gate `spawnEnemy` behind `G.t >= CONFIG.warmupSec`; 1 engine test pins the boundary. Added CONFIG.warmupSec=3 in engine.js; spawn gated in index.html; test pins value at 3.

<!-- ── POLISH ──────────────────────────────────────────────────── -->
- [x] Slow-active HUD indicator: while slowfield is active, show a small "SLOW" badge in the HUD topbar (purple, fades out when `G.t >= G.slowUntil`); renderer-only, no engine change. Added #slow-badge element in topbar; opacity toggled in step() HUD block; CSS transition fades it out.

- [x] Shield expiry flash: when the shield drops (`G.t` crosses `G.shieldUntil`), push a `ring` FX (white, r=coreRadius, max=coreRadius+30, life=0.3s) so the player sees the shield fall; renderer/step change only. Added crossing-detection in step() using G.t - dt < G.shieldUntil guard.

- [x] Cooldown countdown text: inside each skill button, show the integer seconds remaining (e.g. "3s") centred over the cooldown fill when cd > 0.5s; hide when ready; HUD-only change. Added .cd-text span in button HTML, styled absolute-centered, updated updateSkillBar() to set Math.ceil(remain)+'s' when remain > 0.5.

- [x] Kill counter in HUD: add `KILLS <b id="kills">0</b>` to the topbar and update it in `step()` alongside the existing wave/lv/hp updates; no engine change needed. Added stat div to topbar HTML; G.kills updated in step() HUD block.

<!-- ── CONTENT ─────────────────────────────────────────────────── -->
- [x] Heal skill: `SKILLS.heal` (1-tap, 22s cooldown), restores `min(20, CONFIG.coreHp - c.hp)` HP to the core, green ring FX; 2 engine tests (skill defined, not offered when unlocked). Added SKILLS.heal to engine.js; heal branch in triggerSkill() with green ring FX; 2 tests pass.

- [x] Fast enemy type ("dart"): starting wave 8, 8% chance per spawn of a dart (triangle, 1.8× speed, 0.4× HP, sides=3, magenta); add `dart` flag to enemy; `xpForKill` returns 0.8× for darts; 2 tests. Added CONFIG.dartChance=0.08; dart spawns from wave 8 in spawnEnemy(); magenta in renderer; xpForKill 0.8×; 2 tests pass.

- [x] Wave-clear bonus XP: when `G.enemies.length` drops to 0 and the wave is still active, award `CONFIG.waveClearXp = 3` bonus XP and push a brief gold ring FX at core; 1 engine test. Added CONFIG.waveClearXp=3; step() awards XP + gold ring on enemies→0 transition; 1 test passes.

- [x] Low-HP clutch bonus: when a wave is cleared with core HP at or below 10% of max
      (`c.hp <= CONFIG.coreHp * 0.1`), award `CONFIG.clutchXp = 8` bonus XP and flash a
      red-gold ring FX at the core. Done = `CONFIG.clutchXp = 8` exported from `engine.js`
      with a test pinning the value; `step()` checks the HP threshold when enemies drop to 0
      and only awards the bonus when the low-HP condition is met. Mixed; 1 engine test. Added CONFIG.clutchXp=8; step() awards +8 XP + red ring when c.hp ≤ 10% on clear; 1 test passes.

- [x] Wave-clear HP recovery: when all enemies are wiped out, restore `CONFIG.waveClearHeal = 5`
      HP to the core (capped at `CONFIG.coreHp`). Done = `CONFIG.waveClearHeal = 5` exported
      from `engine.js` with a test pinning the value; `step()` in `index.html` heals `c.hp` by
      `Math.min(CONFIG.waveClearHeal, CONFIG.coreHp - c.hp)` when enemies drop to 0; green ring
      FX pushed at core on heal. Mixed; 1 engine test. Added CONFIG.waveClearHeal=5; step() heals on clear + green ring FX; 1 test passes.

- [x] Tap-to-reposition: tapping the arena canvas (outside skill buttons) slides the core to
      that point over 0.8 s; a 12 s cooldown (stored in `CONFIG.reposCooldown`) prevents
      spamming; a radial arc ring drawn around the core shows remaining cooldown.
      Done = `CONFIG.reposCooldown = 12` exported from `engine.js` with a test asserting
      the value; canvas pointerdown in `index.html` starts a slide when cooldown is ready;
      repositioning radial ring visible while on cooldown; enemies re-target the new position. Added CONFIG.reposCooldown=12; pointerdown triggers 0.8s slide; arc ring shows CD; 1 test passes.

- [x] Thorns passive skill: enemies that deal damage to the core are themselves hit for 4
      points (before armor). Done = `SKILLS.thorns` (`passive: true`) in `engine.js`,
      offerable by `rollOffers` (test: thorns appears in locked list before unlock, not after);
      `step()` in `index.html` applies 4-damage retaliation when `G.unlocked` includes
      `'thorns'` and an enemy hits the core. Added SKILLS.thorns passive; step() applies -4 HP on core hit; 2 tests pass; nova fixture updated for 13-skill pool.

- [x] Overload passive skill: every 8th auto-shot fires an extra burst of 8 directional shots
      at half damage. Done = `SKILLS.overload` (`passive: true`) in `engine.js` with a test
      asserting it is offerable; `G.autoShotCount` tracked in state; when count % 8 === 0
      and `'overload'` is unlocked, 8 radial shots pushed in `step()`. Added SKILLS.overload passive; G.autoShotCount tracked; 8-way burst on count%8; 1 test; nova fixture updated for 14-skill pool.

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
