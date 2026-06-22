# CORE — Codex working notes

A one-thumb survival-defense browser game. You protect a hexagonal core at screen
center; geometric enemies converge from the edges; killing them grants XP; leveling
up offers 3 cards (stat boost or skill unlock); skills are one-tap (or aim+tap).

## Architecture (keep this split — it's why the loop can verify itself)

- `src/engine.js` — **pure logic only, no DOM.** Leveling, stats, difficulty curve,
  upgrade/skill pool, collision math. Everything here must be unit-testable.
- `index.html` — renderer + input only. Imports from `engine.js`. Canvas drawing,
  pointer handling, HUD, the level-up overlay. No game *rules* live here.
- `tests/engine.test.js` — the verification spine. Every rule in `engine.js` has a test.

When you add a game rule (new stat, new enemy behavior, new XP curve), put the rule in
`engine.js` and add a test for it in the same change. Rendering-only tweaks don't need tests.

## Commands

- `npm run dev` — serve locally at http://localhost:8080 (open on a phone via LAN IP)
- `npm test` — run vitest once (this is `npm run verify` too)
- `npm run test:watch` — watch mode while iterating

## Invariants (do not break these)

- One-thumb only. The player never moves the core; all interaction is tapping skill
  buttons in the bottom thumb zone, plus one aim-tap for 2-tap skills.
- `rollOffers` always returns exactly 3 distinct cards and never offers an
  already-unlocked skill.
- `xpForLevel` is strictly increasing. `gainXp` carries remainder and can multi-level.
- Difficulty rises with wave: enemy hp/speed up, spawn interval down (with a floor).
- The game stays a single static site — no build step, no server logic. It must run by
  opening `index.html` over http.

## House style

- Vanilla JS modules, no framework, no bundler. Keep it dependency-light.
- Prefer small pure functions in `engine.js`; the renderer calls them.
- Run a single test file when iterating, not the whole suite, for speed.

## When you (Codex) make a mistake

If a change breaks a test or an invariant and a review catches it, add a line to this
file or a test so it can't happen again. Keep this file short — if a rule here is never
load-bearing, delete it.
