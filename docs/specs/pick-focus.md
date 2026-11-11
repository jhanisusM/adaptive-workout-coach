# Focus picker

The start screen lets you pick what to work on, then Start runs a guided
session built from that choice. This is the adult app spec
(adaptive-workout-coach). The kids app has its own theme-picker spec in
the same folder.

## Goal

You should be able to choose Mix, Upper body, Lower body, Arms, or Knee
recovery before the timer starts, instead of always getting a mixed
session. Mix stays the default and stays a 35-minute session. A
single-focus session can run shorter, about 20 to 30 minutes, and the
start screen shows the honest estimate.

## Start screen

- A native `<select>` sits on the start screen, before Start, labeled
  "What do you want to work on?"
- Options, in this order:
  - Mix (upper, lower, arms, and knee recovery)
  - Upper body
  - Lower body
  - Arms
  - Knee recovery
- Changing the select rebuilds the preview at once: title, "About N
  minutes.", exercise count, phase breakdown, and the folded move list.
- Start uses the currently selected focus. New mix redraws within that
  focus, not back to Mix.
- The last picked focus is stored in `awc-demo-v1` and restored on load.
  The default is Mix.
- The picker is hidden during a session (same as other idle-only
  content) and is visible without scrolling at 390x844, along with Start.

## Session rules

These rules stay the same in every focus: a warm-up, then main, then a
cool-down; 45 seconds rest after lower-body sets and 30 seconds after
other main sets; 10 seconds in the warm-up and cool-down; no rest after
the last move; "Stop if you feel sharp pain." on every knee main screen;
no jumping, and no deep or loaded knee bends, in the knee group.

- **Mix.** Unchanged from the guided 35-minute program.
  `SESSION_MINUTES` stays 35. Five warm-up moves, eight main moves (2
  Lower, 2 Upper, 2 Knee, 2 Arms, in that order), five cool-down moves.
  Lower-body moves are 3 sets, or 2 if the estimate would pass 36
  minutes. Every Mix session uses dumbbells and bands. Estimates land
  between about 33 and 37 minutes.
- **Single focus (Upper body, Lower body, Arms, Knee recovery).** The
  main block uses only that group's main moves, covering both patterns
  in the group (squat and hinge, push and pull, quad and stabilizer, or
  biceps and triceps). Warm-up and cool-down stay in place and may lean
  toward the focus (for example, sit-to-stand rather than a squat when
  the focus is knee recovery). Sets stay sensible (2 or 3). The builder
  trims or fills so the honest estimate is about 20 to 30 minutes. The
  title names the focus. Dumbbells-and-bands is required only for Mix;
  a lower-body session may use dumbbells without bands, and a knee
  session stays bodyweight and bands, with no dumbbells.

## Data

Store `awc-demo-v1` moves to version 5:

```
{ version: 5, lastFocus: 'mix' | 'Upper' | 'Lower' | 'Arms' | 'Knee',
  completions: { 'YYYY-MM-DD': true },
  focusLog: { 'YYYY-MM-DD': ['Upper', ...] } }
```

- `lastFocus` updates when you pick a focus, and defaults to Mix.
- Finishing a session with at least one exercise done marks the day and
  appends that session's focus to `focusLog` for the day. The week grid
  still marks the day; when a focus was logged it is shown on that day.
- Older saves (phase era, workout-type era, and guided v4) keep their
  trained days with no notice. Missing `lastFocus` becomes Mix. Missing
  `focusLog` starts empty. An unknown focus value is treated as Mix,
  with no notice. Only malformed trained days trigger the partial
  notice.

The plan passed to the engine includes `focus` so the finish log records
what was actually done, not a later change of the select.

## Out of scope

Changing the shared session engine or screens, adding a second session
length constant for Mix, accounts, and audio cues.

## Acceptance

- Default load shows Mix, a 35-minute title, and an estimate of about
  33 to 37 minutes, with main moves from all four groups.
- Picking each single focus updates the estimate and move list at once;
  every main move belongs to that group; the estimate is about 20 to 30
  minutes; Start runs that session.
- Knee recovery main screens still show "Stop if you feel sharp pain."
  and use no jumps, no dumbbells, and no deep or loaded knee bends.
- Reloading the start screen restores the last focus. Old saves load
  quietly with their days kept and Mix selected.
- The day log records the focus of each finished session.
- Existing guided-session tests stay green, with Mix coverage kept and
  single-focus coverage added. Tests walk 5,000 seeds per focus.
