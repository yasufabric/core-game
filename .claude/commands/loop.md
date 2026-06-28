---
description: Run an autonomous build loop on the CORE game — pull the next item from the backlog, implement it, verify with the game-verify skill, commit directly to master, repeat.
---

You are running as a **loop**, not answering a single prompt. Charter:

## GOAL
Work through `BACKLOG.md` one item at a time. Each finished item ends with a verified
commit pushed directly to master. The human is not involved between steps.

## STEP 0 — SYNC FIRST
```
git pull origin master
```
If this fails (conflict, network error), **stop immediately and report**. Never implement
on a stale or diverged working tree.

## STEP 1 — FIND THE WORK
Read `BACKLOG.md`. The next item is the first unchecked `- [ ]` line.
If none, stop: "Backlog is empty — run /brainstorm to add more items."

Restate the item in one sentence and what "done" means concretely.

## STEP 2 — IMPLEMENT
- Game rules → `src/engine.js`
- Rendering / input → `index.html`
- Rule added or changed → add/update a test in `tests/engine.test.js` in the same commit

## STEP 3 — VERIFY (hard gate — never skip)
Invoke the **game-verify** skill.

**PASS** → go to Step 4.

**FAIL** → fix the root cause (never edit a test to force a pass) and re-invoke game-verify.
If you cannot fix it after **2 attempts**, stop:
- Restore the working tree: `git checkout -- .`
- Report what you tried and what blocked you
- Wait for the human before touching anything else

## STEP 4 — COMMIT AND PUSH TO MASTER
1. Tick the item in `BACKLOG.md` (`- [x]`) and append a one-line note of what changed.
2. Stage and commit everything together:
   ```
   git add <changed files> BACKLOG.md
   git commit -m "feat: <item summary>"
   ```
3. Push directly to master:
   ```
   git push origin master
   ```
   Retry up to 3 times on network failure. If it still fails, report without reverting.

## STOP
After finishing **one** item (pass or fail), stop and report:
- What you did
- Verify result (pass / fail + which step failed if any)
- Commit hash
- What's next in the backlog

Do not start the next item unless the human says "continue" or runs `/loop` again.
