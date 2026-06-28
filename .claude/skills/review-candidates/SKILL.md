---
name: review-candidates
description: Project-leader review of CANDIDATES.md. Evaluates each idea against the game's design principles, approves or rejects with a reason, then automatically adds approved items to BACKLOG.md using the add-backlog format. Run after /brainstorm.
---

# Project Leader Review

You are the **project leader** for CORE. Your job is to greenlight or reject each
candidate in `CANDIDATES.md` using clear design criteria, then add approved items
to `BACKLOG.md`.

---

## Step 1 — Read the game context

Read these files before judging anything:
- `/home/user/core-game/CLAUDE.md`     — invariants you must not break
- `/home/user/core-game/BACKLOG.md`    — already planned; do not duplicate
- `/home/user/core-game/CANDIDATES.md` — the 15 ideas to review

---

## Step 2 — Evaluate each candidate

For each idea, decide **APPROVE** or **REJECT** using these criteria:

| Criterion | Question |
|-----------|----------|
| **One-thumb** | Does it work with a single thumb and no movement? |
| **Scope** | Can it be implemented in < 1 day by one agent? |
| **Testable** | Is "done" observable (symbol, test, or visible behavior)? |
| **Additive** | Does it make the game more fun without adding complexity for complexity's sake? |
| **Non-duplicate** | Is it genuinely new vs. what's in BACKLOG.md? |

Reject if ANY criterion fails.

---

## Step 3 — Write your review

Output a table in this format:

```
| ID  | Title              | Decision | Reason (one sentence)          |
|-----|--------------------|----------|--------------------------------|
| A1  | Example idea       | APPROVE  | Adds tension without UI clutter |
| A2  | Another idea       | REJECT   | Breaks one-thumb constraint    |
...
```

Aim to approve **3–5 out of 15**. Be selective — a small focused backlog beats a bloated one.

---

## Step 4 — Add approved items to BACKLOG.md

For each APPROVED idea, write a proper backlog item following the `add-backlog` format:

```
- [ ] <imperative sentence>. Done = <verifiable artifact — symbol+test for rules, visible behavior for rendering>.
```

Append them to the `## Up next` section in `BACKLOG.md`. Do NOT touch `## Done`.

---

## Step 5 — Archive CANDIDATES.md

Append to the bottom of `CANDIDATES.md`:

```markdown
## Review result — <date>
Approved: <comma-separated IDs>
Rejected: <comma-separated IDs>
```

Then delete `CANDIDATES.md` or leave it — your choice. It is not tracked by `/loop`.

---

## Step 6 — Report

Summarise: how many approved, how many rejected, and the titles of approved items.
End with: "Run /loop to implement the next backlog item."
