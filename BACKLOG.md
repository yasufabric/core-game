# CORE — backlog

The `/loop` command pulls the first unchecked item, implements it, verifies it with the
`game-verify` skill, ticks it, and commits. One item per run.

Keep items small and verifiable. A good item names *what done looks like*.

## Up next
- [ ] Add a `crit` stat card: chance for auto-shots to deal double damage. Done = `crit`
      stat exists in `defaultStats`/`STAT_CARDS`, affects `derive`, has a test.
- [ ] Add a `Bomb` 1-tap skill: damages all enemies on screen, long cooldown. Done =
      entry in `SKILLS`, offerable via `rollOffers`, triggers in `index.html`.
- [ ] Add a boss enemy every 5th wave (bigger, much more hp, slow). Done = spawn logic +
      a `waveForTime`/spawn test asserting boss cadence.
- [ ] Persist best score (wave reached) in memory for the session and show it on the
      splash. Done = best updates on game over, shown on RETRY screen. (No localStorage.)
- [ ] Add a brief screen-shake on core hit. Rendering-only; no test needed.

## Done
<!-- the loop appends finished items here with a one-line note -->
