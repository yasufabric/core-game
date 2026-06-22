---
name: game-verify
description: Verify a change to the CORE game before considering it done. Use after editing engine.js, index.html, or tests — runs the unit suite, checks the core invariants, and confirms the static site still loads. Invoke whenever a loop or task needs a trustworthy "is this actually done and correct?" check rather than just "did it generate code".
---

# Verifying a CORE change

Run these in order. Do not declare a task done until every step passes. If a step fails,
fix the cause (not the test) and re-run from the top.

## 1. Logic suite

```
npm test
```

All tests in `tests/engine.test.js` must pass. If you changed a rule in `engine.js`,
there must be a corresponding test change in the same diff — if there isn't, the task
is not done; add the test.

## 2. Invariant spot-checks (cheap, catches the common regressions)

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

## 3. Static site sanity

The game must run with no build step. Confirm `index.html` imports only from
`./src/engine.js`, contains no `import` of a bundler/npm package, and that
`npm run dev` serves it. A quick check that it boots without a JS parse error:

```
node --check index.html 2>/dev/null || echo "note: index.html is HTML; verify the <script type=module> block parses by loading it in a browser"
```

For real UI/E2E verification, load http://localhost:8080 in a headless browser
(Playwright) and assert `window.__CORE()` returns a state object after pressing START.
This is the right place to grow E2E coverage later.

## 4. Report

State plainly: which steps passed, what you changed, and whether any invariant in
`AGENTS.md` was touched. If anything is uncertain, say so — do not paper over a failure.
