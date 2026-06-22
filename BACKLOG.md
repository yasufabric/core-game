# CORE — backlog

The `/loop` command pulls the first unchecked item, implements it, verifies it with the
`game-verify` skill, ticks it, and commits. One item per run.

Keep items small and verifiable. A good item names *what done looks like*.

## Up next
- [x] Add a `crit` stat card: chance for auto-shots to deal double damage. Done = `crit`
      stat exists in `defaultStats`/`STAT_CARDS`, affects `derive`, has a test.
- [x] Add a `Bomb` 1-tap skill: damages all enemies on screen, long cooldown. Done =
      entry in `SKILLS`, offerable via `rollOffers`, triggers in `index.html`.
- [x] Add a boss enemy every 5th wave (bigger, much more hp, slow). Done = spawn logic +
      a `waveForTime`/spawn test asserting boss cadence.
- [ ] Persist best score (wave reached) in memory for the session and show it on the
      splash. Done = best updates on game over, shown on RETRY screen. (No localStorage.)
- [ ] Add a brief screen-shake on core hit. Rendering-only; no test needed.

## Done
<!-- the loop appends finished items here with a one-line note -->
- [x] crit stat: added `crit: 0` to defaultStats, `critChance` to derive, `+Crit` STAT_CARD, auto-shot rolls double damage on crit; crit shots render larger/white.
- [x] Bomb skill: `SKILLS.bomb` (1-tap, 20s cooldown), deals 15×power to all on-screen enemies, white screen-flash fx; 3 tests added.
- [x] Boss enemy: `isBossWave(wave)` exported, one 8-sided gold boss (r=28, 8×hp, 0.35×speed) spawns once per 5th wave; 4 tests asserting cadence.
