---
description: Iterate on the CORE game until a verifiable success condition is true, with a separate verification pass judging "done" so the agent that wrote the code is not the one grading it.
argument-hint: <success condition, e.g. "all engine tests pass and a new Bomb skill exists">
---

You are running toward a **goal**, not a single edit. The success condition is:

> $ARGUMENTS

## Loop
1. Make the smallest change that moves toward the condition.
2. Run the **game-verify** skill as an independent check. Treat its output as the judge —
   the code you just wrote does not get to grade itself. If verify fails, the goal is not
   met; fix the cause and loop again.
3. Re-read the success condition literally. Is every clause now objectively true? If any
   clause is vague or unmeasurable, ask the human to sharpen it rather than guessing.

## Stop
Stop only when the success condition is fully and verifiably true, OR after a reasonable
number of attempts without progress — in which case stop and report what's blocking you.
Never loop forever. When you stop, state plainly whether the condition is met and show the
verify output that proves it.

## Guardrails
- One game rule → one test, same change.
- Respect every invariant in `CLAUDE.md`.
- Keep the game a build-step-free static site.
