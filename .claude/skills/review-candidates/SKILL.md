---
name: review-candidates
description: Project-leader review of CANDIDATES.md. Evaluates each idea against the game's design principles and presents a draft decision table for human approval. Only adds items to BACKLOG.md after the human confirms. Run after /brainstorm.
---

# Project Leader Review

You are the **design reviewer** for CORE. Your job is to evaluate each candidate,
present a draft decision table to the human, and wait for their confirmation before
writing anything to `BACKLOG.md`.

---

## Step 1 — Read the game context

Read these files before judging anything:
- `/home/user/core-game/CLAUDE.md`      — invariants you must not break
- `/home/user/core-game/BACKLOG.md`     — already planned; do not duplicate
- `/home/user/core-game/CANDIDATES.md`  — the ideas to review

---

## Step 2 — Evaluate each candidate

For each idea, decide **APPROVE** or **REJECT** using these criteria:

| Criterion | Question |
|-----------|----------|
| **One-thumb** | Does it work with a single thumb and no movement? |
| **Scope** | Can it be implemented in < 1 day by one agent? |
| **Testable** | Is "done" observable (symbol, test, or visible behavior)? |
| **Additive** | Does it make the game more fun without adding complexity for its own sake? |
| **Non-duplicate** | Is it genuinely new vs. what's already in BACKLOG.md? |

Reject if ANY criterion fails. Aim to approve **3–5 out of 15**.

---

## Step 3 — Present the draft to the human (STOP HERE)

Output your evaluation as a table:

```
| ID  | Title              | Draft    | Reason (one sentence)           |
|-----|--------------------|----------|---------------------------------|
| A1  | Example idea       | APPROVE  | Adds tension without UI clutter |
| A2  | Another idea       | REJECT   | Breaks one-thumb constraint     |
...
```

Then ask:

> "These are my draft decisions. Reply with **OK** to add all APPROVE items to the backlog,
> or list the IDs you want to change (e.g. 'drop A3, add B5')."

**Do not touch `BACKLOG.md` until the human responds.**

---

## Step 4 — Apply the human's decision

After the human confirms (or edits the list), for each final APPROVED idea write a
proper backlog item using the `add-backlog` format:

```
- [ ] <imperative sentence>. Done = <verifiable artifact — symbol+test for rules, visible behavior for rendering>.
```

Append them to the `## Up next` section of `BACKLOG.md`. Do NOT touch `## Done`.

---

## Step 5 — Clean up CANDIDATES.md

Append the final review result to the bottom of `CANDIDATES.md`:

```markdown
## Review result — <date>
Approved: <comma-separated IDs>
Rejected: <comma-separated IDs>
```

`CANDIDATES.md` is a scratch file — do not commit it to git.

---

## Step 6 — Report

Summarise: how many approved, their titles, and the next action.
End with: "Run /loop to implement the next backlog item."
