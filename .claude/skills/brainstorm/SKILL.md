---
name: brainstorm
description: Run a parallel game-design brainstorm session for the CORE game. Spawns 3 designer agents simultaneously (Balance, Content, Feel), each generating 3–5 concrete feature ideas. Results are merged into CANDIDATES.md for the /review skill to evaluate. Use when the backlog is getting thin or you want a fresh batch of ideas.
---

# Brainstorm Session

Spawn **3 designer agents in parallel** using the Agent tool. Do NOT run them sequentially — launch all three in a single message with three Agent tool calls.

Each agent reads the game state and produces ideas. You collect their outputs and write `CANDIDATES.md`.

---

## Agent A — Balance & Progression Designer

**Prompt:**
```
You are a game balance designer reviewing CORE, a one-thumb survival browser game.

Read these files:
- /home/user/core-game/CLAUDE.md          (architecture + invariants)
- /home/user/core-game/BACKLOG.md         (what's already planned — do NOT duplicate)
- /home/user/core-game/src/engine.js      (current stats, skills, difficulty curve)

Generate exactly 5 ideas focused on: difficulty curve, XP economy, stat balance,
progression pacing, death/survival tension, wave design.

Rules:
- Each idea must be specific and implementable in < 1 day
- Do NOT duplicate anything already in BACKLOG.md
- Do NOT touch the one-thumb constraint or the no-build-step requirement
- Format each idea as:
  ### [A1] <Short title>
  **What:** one sentence
  **Why:** one sentence on player impact
  **Risk:** one sentence on what could go wrong

Return only the 5 ideas, no preamble.
```

---

## Agent B — Content & Mechanics Designer

**Prompt:**
```
You are a content and mechanics designer reviewing CORE, a one-thumb survival browser game.

Read these files:
- /home/user/core-game/CLAUDE.md          (architecture + invariants)
- /home/user/core-game/BACKLOG.md         (what's already planned — do NOT duplicate)
- /home/user/core-game/src/engine.js      (current skills, enemy types, skill pool)

Generate exactly 5 ideas focused on: new enemy types, new skills, new passive effects,
interesting interactions between existing systems, late-game content.

Rules:
- Each idea must be specific and implementable in < 1 day
- Do NOT duplicate anything already in BACKLOG.md
- Do NOT touch the one-thumb constraint or the no-build-step requirement
- Format each idea as:
  ### [B1] <Short title>
  **What:** one sentence
  **Why:** one sentence on player impact
  **Risk:** one sentence on what could go wrong

Return only the 5 ideas, no preamble.
```

---

## Agent C — Feel & Polish Designer

**Prompt:**
```
You are a game feel and UX designer reviewing CORE, a one-thumb survival browser game.

Read these files:
- /home/user/core-game/CLAUDE.md          (architecture + invariants)
- /home/user/core-game/BACKLOG.md         (what's already planned — do NOT duplicate)
- /home/user/core-game/index.html         (current HUD, FX, renderer)
- /home/user/core-game/src/renderer.js    (visual effects)

Generate exactly 5 ideas focused on: visual feedback, audio cues, HUD readability,
game feel (screenshake, particles, timing), onboarding, accessibility.

Rules:
- Each idea must be specific and implementable in < 1 day
- Do NOT duplicate anything already in BACKLOG.md
- Do NOT touch the one-thumb constraint or the no-build-step requirement
- Format each idea as:
  ### [C1] <Short title>
  **What:** one sentence
  **Why:** one sentence on player impact
  **Risk:** one sentence on what could go wrong

Return only the 5 ideas, no preamble.
```

---

## After all 3 agents complete

Collect all 15 ideas and write them to `CANDIDATES.md`:

```markdown
# CORE — Design Candidates

Generated: <date>

## A: Balance & Progression
<paste Agent A output>

## B: Content & Mechanics
<paste Agent B output>

## C: Feel & Polish
<paste Agent C output>
```

Then report: "Brainstorm complete — 15 candidates written to CANDIDATES.md. Run /review to greenlight items for the backlog."

Do NOT add anything to BACKLOG.md yourself — that is /review's job.
