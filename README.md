# CORE

A one-thumb survival-defense game for the phone. You protect a hexagonal **core** at the
center of the screen. Geometric enemies converge from every edge. Your core auto-fires at
the nearest one. Killing enemies grants XP; each **level-up** offers three cards — boost a
**stat** or unlock a **skill**. Skills sit in the bottom thumb zone: most are **one tap**,
one (`Lance`) is **aim then tap**. You never move. It's all one thumb.

Built to be **grown by an agent loop**, not just played: the game rules live in pure,
unit-tested functions so Claude Code can verify its own changes.

## Play

Play the hosted version:

https://yasufabric.github.io/core-game/

No build step. Serve the folder and open it on your phone (same Wi-Fi):

```
npm install      # only needed for the dev server + tests
npm run dev      # http://localhost:8080  → open <your-LAN-IP>:8080 on the phone
```

Or just open `index.html` over any static host.

## Project shape

```
index.html              renderer + input only (canvas, HUD, level-up overlay)
src/engine.js           pure game logic — leveling, stats, difficulty, skills, collision
tests/engine.test.js    the verification spine (vitest)
CLAUDE.md               working notes + invariants for Claude Code
BACKLOG.md              the queue the loop pulls from
.claude/commands/       /loop and /goal
.claude/skills/         game-verify (how to check a change is really done)
.github/workflows/      @claude on GitHub Actions
```

## Develop it with a loop (the whole point)

Local, with Claude Code:

- `/loop` — pulls the next item from `BACKLOG.md`, implements it, runs **game-verify**,
  ticks the box, and makes one focused commit. One item per run, then it stops.
- `/goal "all engine tests pass and a Bomb skill exists"` — iterates until that condition
  is verifiably true, with the `game-verify` skill acting as the judge so the code that
  was written isn't the thing grading itself.

On GitHub (after pushing):

1. Add `ANTHROPIC_API_KEY` to the repo's Actions secrets.
2. Open an issue or PR comment like `@claude add a crit stat card (see BACKLOG.md)`.
3. The workflow runs Claude Code, which implements it, verifies, and opens a PR. It never
   pushes to the default branch and never installs new runtime deps.

## Verify by hand

```
npm test
```
