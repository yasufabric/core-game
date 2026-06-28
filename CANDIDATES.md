# CORE — Design Candidates

Generated: 2026-06-28

## A: Balance & Progression

### [A1] Mid-Wave Difficulty Spike
**What:** Every 7 seconds in-wave, spawn a single enemy with +50% HP and +30% speed to create a mini-boss moment.
**Why:** Breaks the monotonous grinding feel and forces players to activate skills reactively instead of passively holding down fire.
**Risk:** Could feel cheap if spawn timing overlaps with player's cooldown drought; mitigate by gating spike spawns until wave 4+.

### [A2] XP Drought Timer
**What:** If the player hasn't killed an enemy for 4 seconds, grant +1 bonus XP per second of drought (capped at +5) when the next kill lands, with a "HUNGER" bar filling up.
**Why:** Punishes passive play styles and rewards aggressive positioning; makes skill uptime decisions more tactical.
**Risk:** Could feel unfair if spawns are randomized away; track only after first enemy in wave, not from wave start.

### [A3] Armor Breakpoint Softening
**What:** Cap armor at 0.60 (down from 0.75) and reduce each +Armor card from +0.15 to +0.12; add a +Regen variant (+2/s) to redirect tanking builds toward active healing.
**Why:** Keeps end-game cores mortal, forcing players to use shield/blink for clutch survival rather than passive invulnerability.
**Risk:** May feel weaker in late-game; test by confirming boss pressure still stings even with heavy armor.

### [A4] Cooldown Synergy Bonus
**What:** Grant bonus XP whenever the player fires 2+ different skills within 1 second of each other.
**Why:** Rewards skill sequencing (e.g., slow→chain→repulse) over mono-spamming one button, creating build diversity.
**Risk:** Complexity; mitigate by only checking on activation (not per-tick), keeping logic to a few lines in `triggerSkill()`.

### [A5] Enemy Density Inflation Curve
**What:** Increase spawn density from wave 6 and compress spawn interval floor from 0.28s to 0.20s only past wave 12.
**Why:** Frontloads medium-game (waves 6–10) with manageable but noticeable density increase that forces aggression.
**Risk:** May make early-game feel too slow in comparison; offset by adjusting baseSpawnInterval.

---

## B: Content & Mechanics

### [B1] Scatter Enemy Type
**What:** Starting wave 6, small critter enemies (triangle, 1.3× speed, 0.5× HP) spawn in groups of 2–3 to reward AoE skill usage.
**Why:** Encourages players to invest in skills like bomb/nova/chain rather than only auto-fire, creating variety in viable builds.
**Risk:** Could feel spammy without careful spawn group tuning, or trivialise non-AoE builds if they grant too much XP.

### [B2] Leech Passive Skill
**What:** When a skill hits an enemy, restore `0.3 × skill power` (rounded) as core HP, capped at max.
**Why:** Makes skill-focused builds self-sustaining and less punishing when the player relies on cooldowns for survival.
**Risk:** Could over-heal and trivialise late-game waves if power scaling gets too high; needs cap enforcement.

### [B3] Armor-Piercing Enemy Variant
**What:** 20% chance per shielded enemy spawn to be a "piercer" variant (gold outline) that bypasses its own shield vs. auto-shots.
**Why:** Gives reward-seeking players counterplay against shielded enemies and creates late-game tension.
**Risk:** May confuse players about which shields they're breaking; needs strong visual clarity.

### [B4] Crit → Drone Cooldown Reset
**What:** When a crit auto-shot triggers (25%+ crit chance), reset drone cooldown to 0 if drone is unlocked.
**Why:** Creates a satisfying late-game synergy that rewards crit investment without adding a new card.
**Risk:** Needs careful test coverage to avoid unexpected multi-zap cascades.

### [B5] Resonance Passive Skill
**What:** Every 4 consecutive skill uses trigger a free pulse at the core (same damage as pulse skill + ring FX).
**Why:** Gives players a rhythm-based mastery curve and passive reward for frequent skill rotations.
**Risk:** Counter logic could drift in edge cases (skill cancels, simultaneous triggers); needs 2+ tests.

---

## C: Feel & Polish

### [C1] Enemy Spawn Pop-In Effect
**What:** When an enemy enters screen, add a brief 0.15s white ring-burst at spawn point.
**Why:** Spawn is currently silent; pop-in makes waves feel energetic and telegraphs new threats.
**Risk:** Could feel jittery at high wave density; test with wave 3+ to ensure clarity over noise.

### [C2] Cooldown Button Pulse When Ready
**What:** When a skill cooldown expires, the button briefly glows cyan (0.3s pulse) to signal it's ready.
**Why:** Players get a hard visual cue to use ready skills instead of guessing, especially for high-cooldown abilities.
**Risk:** May encourage button-mashing if pulse is too aggressive; keep animation subtle.

### [C3] XP Gain Number Popups
**What:** When XP is awarded (kill, skill use, wave-clear bonus), show a brief floating `+N` text in purple near the source, rising and fading over 0.6s.
**Why:** Teaches players what grants XP; makes progression visible and satisfying in real time.
**Risk:** Popups at high enemy density could clutter; limit to 3 concurrent, cull oldest first.

### [C4] Between-Wave Lull Indicator
**What:** When no enemies exist on-screen for 1.5s, flash the core ring at half opacity to signal that the next spawn is coming.
**Why:** Prevents dead-time confusion; telegraphs that the wave is still active.
**Risk:** Flash could look like a bug; keep it subtle and slow.

### [C5] Shield Break Starburst FX
**What:** When `G.t >= G.shieldUntil`, push a 0.4s gold starburst FX (8 radial lines spinning outward) instead of silent drop.
**Why:** Shield expiry is currently invisible; audio + visual cue signals the vulnerability window clearly.
**Risk:** Timing collision with enemy hit could cause dual FX clutter; z-order shield break on top.

## Review result — 2026-06-28
Approved: A1, A4, B2, B4, C1
Rejected: A2, A3, A5, B1, B3, B5, C2, C3, C4, C5
