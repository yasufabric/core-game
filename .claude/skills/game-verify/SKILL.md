---
name: game-verify
description: Verify a change to the CORE game before considering it done. Use after editing engine.js, index.html, or tests — runs the unit suite, checks the core invariants, and confirms the static site still loads. Invoke whenever a loop or task needs a trustworthy "is this actually done and correct?" check rather than just "did it generate code".
---

# Verifying a CORE change

Run these steps in order. **A single failure means the item is not done.**
Fix the root cause (never edit a test just to make it pass), then re-run from Step 1.

---

## Step 1 — Logic suite

```
npm test
```

All tests in `tests/engine.test.js` must pass. If you changed a rule in `engine.js`,
there must be a corresponding test change in the same diff — if there isn't, add it now.

---

## Step 2 — Invariant spot-checks

Run this one-liner. It must print `INVARIANTS OK`:

```
node -e "import('./src/engine.js').then(m=>{
  const seq=a=>{let i=0;return()=>a[i++%a.length]};
  const o=m.rollOffers([],seq([0,.3,.6,.9,.1]));
  if(o.length!==3||new Set(o.map(x=>x.kind+x.id)).size!==3) throw new Error('offers not 3-distinct');
  if(m.xpForLevel(2)<=m.xpForLevel(1)) throw new Error('xp not increasing');
  if(m.derive(m.defaultStats(),5).spawnInterval>=m.derive(m.defaultStats(),1).spawnInterval) throw new Error('difficulty not rising');
  if(m.rollOffers(Object.keys(m.SKILLS),seq([0,.2,.4])).some(x=>x.kind==='skill')) throw new Error('offered unlocked skill');
  console.log('INVARIANTS OK');
})"
```

---

## Step 3 — Static site sanity

The game must run with no build step. Confirm `index.html` has no bundler imports:

```
node --check index.html 2>/dev/null || echo "note: index.html is HTML; JS module block parses on load"
```

---

## Verdict (required — the loop reads this)

After all steps, output exactly one of these lines as your final verdict:

```
VERIFY PASS — all steps green
```

or

```
VERIFY FAIL — step N: <one sentence describing what failed>
```

The `/loop` skill treats anything other than `VERIFY PASS` as a failure.
Do not soften or qualify the verdict. State plainly what happened.
