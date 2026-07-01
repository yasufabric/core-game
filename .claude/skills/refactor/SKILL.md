---
name: refactor
description: Autonomous code-quality loop for the CORE game. An Engineering Leader agent analyzes the codebase and proposes one concrete refactoring; a second agent implements it; game-verify validates it; then commits to master and sends a push notification. Run on a schedule or on demand.
---

You are running a **3-phase autonomous refactoring pipeline**.
No human input is needed between steps. Charter below.

---

## STEP 0 — SYNC

```
git checkout master && git pull origin master
```

If this fails, **stop immediately** and report the error.
Never refactor on a stale working tree.

---

## STEP 1 — ENGINEERING LEADER ANALYSIS

Spawn **one Agent** with the following prompt (do not edit it):

```
You are an Engineering Leader reviewing the CORE game codebase.
Your job: identify exactly ONE concrete refactoring opportunity and write a plan.

Read these files in full:
- /home/user/core-game/CLAUDE.md           (architecture + invariants)
- /home/user/core-game/src/engine.js       (pure logic — most important)
- /home/user/core-game/src/main.js         (game loop + input)
- /home/user/core-game/src/renderer.js     (canvas rendering)
- /home/user/core-game/tests/engine.test.js (test suite)

Look for ONE opportunity from this priority list (stop at the first good one):
1. Magic number used in 2+ places that belongs in CONFIG (in engine.js)
2. Function longer than 40 lines that can be split into named pure helpers
3. Duplicated logic (same pattern repeated 3+ times) that can be extracted
4. Variable or function with a misleading/inconsistent name
5. Dead code: variable assigned but never read, unreachable branch
6. Existing game behavior with zero test coverage (add the missing test)

Hard rules:
- Pure refactor only — zero behavior change
- Do NOT add features, do NOT change CONFIG values
- If the best candidate is #6 (add a test), the "implementation" is just adding
  the test — no production code changes required
- If nothing compelling is found, write "SKIP: codebase is clean" and stop

Write your findings to /home/user/core-game/REFACTOR_PLAN.md in exactly this format:

---
## Category
<one of: magic-number | split-function | extract-helper | rename | dead-code | missing-test>

## Target
<file:line(s) — e.g. "src/engine.js:456-510">

## What
<one sentence describing what to change>

## Why
<one sentence on why this improves quality>

## Done when
<concrete verifiable condition — e.g. "npm test passes and the constant X only appears once in engine.js">
---

Return only "PLAN WRITTEN" or "SKIP: <reason>".
```

Wait for the agent to complete.

- If it returned **"SKIP: ..."** → stop, send a PushNotification: "Refactor skipped: <reason>", done.
- If it returned **"PLAN WRITTEN"** → read `REFACTOR_PLAN.md` and proceed to Step 2.

---

## STEP 2 — IMPLEMENT

Read `REFACTOR_PLAN.md`. Implement exactly what it describes.

Rules:
- Touch only the files mentioned in the plan's **Target** field.
- If the category is `missing-test`, only add to `tests/engine.test.js`; no production code.
- Do NOT widen the scope beyond what the plan says.
- Do NOT add comments explaining the refactor — the code should speak for itself.

After implementing, run `npm test` once to catch obvious errors.
If tests fail, attempt to fix. If still failing after 1 fix attempt → go to Step 3b.

---

## STEP 3 — VERIFY

Invoke the **game-verify** skill.

**PASS** → go to Step 4.

**FAIL** → attempt one targeted fix, then re-invoke game-verify.
If still FAIL → restore: `git checkout -- .` then go to Step 3b.

### Step 3b — Abort
- Delete `REFACTOR_PLAN.md`
- Send PushNotification: "Refactor ABORTED — verify failed: <what failed>"
- Stop. Do not commit anything.

---

## STEP 4 — COMMIT AND PUSH

1. Read the plan's **What** field for the commit message subject.
2. Commit all changed files together with REFACTOR_PLAN.md deleted:
   ```
   git rm REFACTOR_PLAN.md
   git add <changed files>
   git commit -m "refactor: <What field from plan>"
   ```
3. Push to master:
   ```
   git push origin master
   ```
   Retry up to 3 times on network error.

---

## STEP 5 — REPORT

Send a PushNotification with this format:
```
Refactor done ✓
Category: <category>
Changed: <target>
What: <what>
Tests: <N> passing
```
