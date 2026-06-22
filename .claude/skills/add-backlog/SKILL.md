# Adding an item to the CORE backlog

Use this skill whenever you (or the user) want to add a new item to `BACKLOG.md`.
Its only job is to make sure every item is written so the `/loop` skill can implement
and verify it without ambiguity.

---

## Step 1 — Classify the item

Decide which category the change falls into. This determines what "done" must include.

| Category | Where the code lives | Test required? |
|---|---|---|
| **Game rule** | `src/engine.js` | **Yes** — new/changed rule → new/changed test in `tests/engine.test.js` in the same commit |
| **Rendering / input** | `index.html` only | No — pure visual/input changes are verified by the E2E browser check |
| **Mixed** | both files | Yes — the engine-side rule gets a test; the renderer does not |

This mirrors the CLAUDE.md policy:
> "When you add a game rule … put the rule in `engine.js` and add a test for it in the
> same change. Rendering-only tweaks don't need tests."

---

## Step 2 — Write the item

Each backlog line must follow this template:

```
- [ ] <imperative sentence describing the feature>. Done = <verifiable conditions, comma-separated>.
```

The `Done =` clause is mandatory. It must name **observable artifacts**, not intentions:

**For game-rule items** — name the symbols and tests:
```
Done = `<functionOrConst>` exists in `engine.js`, affects `<derivedValue>`,
has a test in `engine.test.js` covering <what the test asserts>.
```

**For rendering-only items** — name the visual/DOM artifact:
```
Done = <what a human or Playwright check can see/measure>. Rendering-only; no test needed.
```

**For mixed items** — combine both:
```
Done = <engine symbol> in `engine.js` with a test; <visible behavior> in `index.html`.
```

---

## Step 3 — Check against the bad-item list

Reject (rewrite) the item if its `Done =` clause:

- Uses vague language: "works correctly", "feels good", "is implemented" — rewrite to name a symbol or observable.
- Names only a file, not a symbol: "added to engine.js" — name the function/constant.
- Omits the test requirement for a rule change — add it.
- Is so large it touches more than one independent concern — split it.

---

## Step 4 — Place it in `BACKLOG.md`

Append to the `## Up next` section. Indent continuation lines by 6 spaces to match the
existing style:

```markdown
- [ ] Add a `foo` stat: increases bar by N%. Done = `foo` in `defaultStats` and
      `STAT_CARDS`, `fooRate` in `derive`, test asserting value scales with stat.
```

Do **not** touch the `## Done` section — the `/loop` skill manages that.

---

## Examples

### Good — game rule
```
- [ ] Add a `multishot` stat: auto-fire shoots 2 projectiles at once above a threshold.
      Done = `multishot` in `defaultStats`/`STAT_CARDS`, `shotCount` in `derive`,
      has a test asserting shotCount is 1 at default and 2 when stat is upgraded.
```

### Good — rendering only
```
- [ ] Tint the core cyan→red as HP falls below 30%. Rendering-only; no test needed.
      Done = core fill color shifts to red tint when `c.hp / CONFIG.coreHp < 0.3`.
```

### Good — mixed
```
- [ ] Add a `Freeze` skill: stops all enemies for 2s. Done = `freeze` in `SKILLS`
      (engine.js), offerable via `rollOffers`, test asserting enemy speed is 0 during
      freeze; trigger logic and visual ring in `index.html`.
```

### Bad — rewrite these
```
- [ ] Make enemies harder in later waves.          ← no Done clause, no symbols
- [ ] Add shield skill to the game.               ← "to the game" is vague
- [ ] Improve the level-up screen. Done = looks nicer.  ← unobservable
```
