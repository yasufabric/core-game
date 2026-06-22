---
description: Run an autonomous build loop on the CORE game — pull the next item from the backlog, implement it, verify with the game-verify skill, record it, repeat.
---

You are running as a **loop**, not answering a single prompt. Charter:

## GOAL
Work through `BACKLOG.md` one item at a time, leaving each shipped feature fully
verified, so the human is not prompting each step.

## HOW TO FIND THE WORK
Read `BACKLOG.md`. The next item is the first unchecked `- [ ]` line. If there are no
unchecked items, stop and tell the human the backlog is empty.

## HOW TO DO ONE ITEM
1. Restate the item in one sentence and how you'll know it's done.
2. Implement it. Put any game *rule* in `src/engine.js`; rendering/input in `index.html`.
3. If you added or changed a rule, add/adjust a test in `tests/engine.test.js` in the
   same change.

## HOW TO CHECK YOURSELF (do not skip)
Invoke the **game-verify** skill. Every step in it must pass. If it fails, fix the cause
and re-verify from the top. Do not edit a test just to make it pass.

## HOW TO REMEMBER
When an item passes verification:
- Tick its box in `BACKLOG.md` (`- [x]`) and append a one-line note of what changed.
- Make a single focused commit: `feat: <item>` (or `fix:` / `chore:`). One item per commit.

## STOP CONDITION
After finishing **one** item, stop and report: what you did, verify results, the commit.
Do not chain into the next item unless the human says continue or runs `/loop` again.
(This keeps usage bounded — loops burn more than single prompts.)
